import assert from "node:assert/strict";
import path from "node:path";

import { parseEther } from "ethers";

import {
  buildAuditRows,
  buildDefaultOutputPath,
  summarizeAuditRows,
} from "../scripts/vesting-gas-audit.js";

describe("vesting gas audit", function () {
  it("flags holders below the MON target and summarizes shortfall", function () {
    const minRequiredWei = parseEther("0.15");
    const rows = buildAuditRows(
      [
        {
          category: "ready_holder",
          currentHolder: "0x1111111111111111111111111111111111111111",
          beneficiary: "0x1111111111111111111111111111111111111111",
          amountDisplay: "10.0",
          signerKeyEnv: "READY_PRIVATE_KEY",
        },
        {
          category: "needs_funding",
          currentHolder: "0x2222222222222222222222222222222222222222",
          beneficiary: "0x2222222222222222222222222222222222222222",
          amountDisplay: "20.0",
          signerKeyEnv: "NEEDS_PRIVATE_KEY",
        },
      ],
      new Map([
        ["0x1111111111111111111111111111111111111111", parseEther("0.3")],
        ["0x2222222222222222222222222222222222222222", parseEther("0.02")],
      ]),
      minRequiredWei
    );

    assert.equal(rows[0].status, "ready");
    assert.equal(rows[1].status, "needs_mon");
    assert.equal(rows[1].shortfallMon, "0.13");

    const summary = summarizeAuditRows(rows);
    assert.equal(summary.entryCount, 2);
    assert.equal(summary.fundedCount, 1);
    assert.equal(summary.needsFundingCount, 1);
    assert.equal(summary.totalShortfallMon, "0.13");
  });

  it("derives a report path from the plan file name", function () {
    assert.equal(
      buildDefaultOutputPath("vesting.execution-ready.remaining.json"),
      path.join("", "vesting.execution-ready.remaining.gas-audit.json")
    );
  });
});
