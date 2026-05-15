import assert from "node:assert/strict";
import path from "node:path";

import { parseEther } from "ethers";

import {
  buildDefaultOutputPath,
  buildTopUpRows,
  summarizeTopUpRows,
} from "../scripts/vesting-gas-topup.js";

describe("vesting gas top-up", function () {
  it("builds only the shortfalls needed to reach the report minimum plus buffer", function () {
    const rows = buildTopUpRows({
      rows: [
        {
          category: "ready_holder",
          currentHolder: "0x1111111111111111111111111111111111111111",
          beneficiary: "0x1111111111111111111111111111111111111111",
          amount: "1000",
          signerKeyEnv: "READY_PRIVATE_KEY",
        },
        {
          category: "needs_holder",
          currentHolder: "0x2222222222222222222222222222222222222222",
          beneficiary: "0x2222222222222222222222222222222222222222",
          amount: "1000",
          signerKeyEnv: "NEEDS_PRIVATE_KEY",
        },
      ],
      minRequiredWei: parseEther("0.15"),
      bufferWei: parseEther("0.05"),
      liveBalanceByHolder: new Map([
        ["0x1111111111111111111111111111111111111111", parseEther("0.25")],
        ["0x2222222222222222222222222222222222222222", parseEther("0.02")],
      ]),
    });

    assert.equal(rows[0].status, "ready");
    assert.equal(rows[0].transferMon, "0.0");
    assert.equal(rows[1].status, "needs_topup");
    assert.equal(rows[1].targetBalanceMon, "0.2");
    assert.equal(rows[1].transferMon, "0.18");

    const summary = summarizeTopUpRows(
      rows.map((row, index) => ({
        ...row,
        estimationStatus: index === 0 ? "skip" : "ready",
      }))
    );
    assert.equal(summary.entryCount, 2);
    assert.equal(summary.fundedCount, 1);
    assert.equal(summary.needsTopUpCount, 1);
    assert.equal(summary.fundableCount, 1);
    assert.equal(summary.blockedCount, 0);
    assert.equal(summary.totalTransferMon, "0.18");
    assert.equal(summary.fundableTransferMon, "0.18");
    assert.equal(summary.blockedTransferMon, "0.0");
  });

  it("derives a deterministic top-up output path from the report file name", function () {
    assert.equal(
      buildDefaultOutputPath("vesting.execution-ready.remaining.gas-audit.json"),
      path.join("", "vesting.execution-ready.remaining.gas-audit.topup-plan.json")
    );
  });

  it("separates blocked recipients from fundable recipients in the summary", function () {
    const summary = summarizeTopUpRows([
      {
        transferWei: parseEther("0.2").toString(),
        estimationStatus: "ready",
      },
      {
        transferWei: parseEther("0.3").toString(),
        estimationStatus: "blocked",
      },
      {
        transferWei: "0",
        estimationStatus: "skip",
      },
    ]);

    assert.equal(summary.entryCount, 3);
    assert.equal(summary.fundedCount, 1);
    assert.equal(summary.needsTopUpCount, 2);
    assert.equal(summary.fundableCount, 1);
    assert.equal(summary.blockedCount, 1);
    assert.equal(summary.totalTransferMon, "0.5");
    assert.equal(summary.fundableTransferMon, "0.2");
    assert.equal(summary.blockedTransferMon, "0.3");
  });
});
