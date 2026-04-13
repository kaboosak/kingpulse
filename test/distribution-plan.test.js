import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertDeploymentDistributionReady,
  assertRetainedBalanceWithinLimit,
  loadDistributionPlan,
} from "../scripts/lib/distribution.js";

describe("distribution plan loader", function () {
  it("loads and normalizes a valid distribution plan", function () {
    const filePath = path.join(
      os.tmpdir(),
      `kingpulse-distribution-${process.pid}-${Date.now()}.json`
    );

    fs.writeFileSync(
      filePath,
      JSON.stringify([
        {
          recipient: "0x1111111111111111111111111111111111111111",
          amount: "400000",
        },
        {
          recipient: "0x2222222222222222222222222222222222222222",
          amount: "600000",
        },
      ])
    );

    const { allocations, total, sourcePath } = loadDistributionPlan(filePath);

    assert.equal(allocations.length, 2);
    assert.equal(
      allocations[0].recipient,
      "0x1111111111111111111111111111111111111111"
    );
    assert.equal(allocations[0].amount, 400000n * 10n ** 18n);
    assert.equal(total, 1000000n * 10n ** 18n);
    assert.equal(sourcePath, filePath);

    fs.unlinkSync(filePath);
  });

  it("rejects duplicate recipients", function () {
    const filePath = path.join(
      os.tmpdir(),
      `kingpulse-distribution-duplicate-${process.pid}-${Date.now()}.json`
    );

    fs.writeFileSync(
      filePath,
      JSON.stringify([
        {
          recipient: "0x1111111111111111111111111111111111111111",
          amount: "1",
        },
        {
          recipient: "0x1111111111111111111111111111111111111111",
          amount: "2",
        },
      ])
    );

    assert.throws(
      () => loadDistributionPlan(filePath),
      /Duplicate recipient/
    );

    fs.unlinkSync(filePath);
  });

  it("rejects retained balances above the default concentration guard", function () {
    assert.throws(
      () =>
        assertRetainedBalanceWithinLimit(
          300000n * 10n ** 18n,
          1000000n * 10n ** 18n
        ),
      /Launch concentration guard triggered/
    );
  });

  it("allows retained balances within the default concentration guard", function () {
    assert.doesNotThrow(() =>
      assertRetainedBalanceWithinLimit(
        250000n * 10n ** 18n,
        1000000n * 10n ** 18n
      )
    );
  });

  it("rejects live deployment without a distribution plan before broadcast", function () {
    assert.throws(
      () =>
        assertDeploymentDistributionReady({
          distributionFile: "",
          networkName: "monad",
          totalSupply: 1000000n * 10n ** 18n,
        }),
      /Refusing concentrated live deployment without a distribution plan/
    );
  });

  it("allows hardhat deployment without a distribution plan", function () {
    const plan = assertDeploymentDistributionReady({
      distributionFile: "",
      networkName: "hardhat",
      totalSupply: 1000000n * 10n ** 18n,
    });

    assert.equal(plan.allocations.length, 0);
    assert.equal(plan.total, 0n);
  });

  it("rejects distribution plans that exceed total supply", function () {
    const filePath = path.join(
      os.tmpdir(),
      `kingpulse-distribution-overflow-${process.pid}-${Date.now()}.json`
    );

    fs.writeFileSync(
      filePath,
      JSON.stringify([
        {
          recipient: "0x1111111111111111111111111111111111111111",
          amount: "900000",
        },
        {
          recipient: "0x2222222222222222222222222222222222222222",
          amount: "200000",
        },
      ])
    );

    assert.throws(
      () =>
        assertDeploymentDistributionReady({
          distributionFile: filePath,
          networkName: "monad",
          totalSupply: 1000000n * 10n ** 18n,
        }),
      /exceeds total supply/
    );

    fs.unlinkSync(filePath);
  });
});
