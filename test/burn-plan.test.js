import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parseUnits } from "ethers";

import {
  buildProportionalBurnPlan,
  loadBurnPlan,
  serializeBurnPlan,
} from "../scripts/lib/burn-plan.js";

describe("burn plan builder", function () {
  it("allocates an exact proportional target with deterministic rounding", function () {
    const result = buildProportionalBurnPlan({
      sourceEntries: [
        {
          category: "alpha",
          currentHolder: "0x1111111111111111111111111111111111111111",
          beneficiary: "0x1111111111111111111111111111111111111111",
          amountDisplay: "10.0",
          signerKeyEnv: "ALPHA_PRIVATE_KEY",
          policy: "alpha",
        },
        {
          category: "beta",
          currentHolder: "0x2222222222222222222222222222222222222222",
          beneficiary: "0x2222222222222222222222222222222222222222",
          amountDisplay: "20.0",
          signerKeyEnv: "BETA_PRIVATE_KEY",
          policy: "beta",
        },
        {
          category: "gamma",
          currentHolder: "0x3333333333333333333333333333333333333333",
          beneficiary: "0x3333333333333333333333333333333333333333",
          amountDisplay: "30.0",
          signerKeyEnv: "GAMMA_PRIVATE_KEY",
          policy: "gamma",
        },
      ],
      targetRawAmount: parseUnits("35", 18),
    });

    assert.equal(result.totalSourceAmount, "60.0");
    assert.equal(result.totalBurnAmount, "35.0");
    assert.deepEqual(
      result.entries.map((entry) => entry.burnAmount),
      ["5.833333333333333333", "11.666666666666666667", "17.5"]
    );
    assert.deepEqual(
      result.entries.map((entry) => entry.retainedAmount),
      ["4.166666666666666667", "8.333333333333333333", "12.5"]
    );
  });

  it("serializes and reloads a burn plan with reconciled totals", function () {
    const serialized = serializeBurnPlan({
      sourcePlan: "/tmp/source.json",
      plan: {
        entryCount: 1,
        totalSourceAmount: "10.0",
        targetAmount: "7.0",
        entries: [
          {
            category: "alpha",
            current_holder: "0x1111111111111111111111111111111111111111",
            beneficiary: "0x1111111111111111111111111111111111111111",
            holderAmount: "10.0",
            burnAmount: "7.0",
            retainedAmount: "3.0",
            signerKeyEnv: "ALPHA_PRIVATE_KEY",
            policy: "alpha",
          },
        ],
      },
    });
    const filePath = path.join(
      os.tmpdir(),
      `kingpulse-burn-plan-${process.pid}-${Date.now()}.json`
    );

    fs.writeFileSync(filePath, `${JSON.stringify(serialized, null, 2)}\n`);

    const loaded = loadBurnPlan(filePath);

    assert.equal(loaded.totalBurnAmount, "7.0");
    assert.equal(loaded.entries[0].burnAmountDisplay, "7.0");
    assert.equal(loaded.entries[0].retainedAmountDisplay, "3.0");

    fs.unlinkSync(filePath);
  });
});
