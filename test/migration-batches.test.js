import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { getAddress, parseUnits } from "ethers";

import {
  buildMintBatches,
  loadMintBatches,
  selectMintBatchRange,
  summarizeMintBatchProgress,
} from "../scripts/lib/migration-batches.js";

describe("migration mint batch builder", function () {
  it("chunks allocations while preserving order and totals", function () {
    const allocations = [
      {
        recipient: "0x1111111111111111111111111111111111111111",
        amount: parseUnits("10", 18),
      },
      {
        recipient: "0x2222222222222222222222222222222222222222",
        amount: parseUnits("20.5", 18),
      },
      {
        recipient: "0x3333333333333333333333333333333333333333",
        amount: parseUnits("30", 18),
      },
    ];

    const result = buildMintBatches({ allocations, batchSize: 2 });

    assert.equal(result.batchCount, 2);
    assert.equal(result.recipientCount, 3);
    assert.equal(result.totalRawAmount, parseUnits("60.5", 18));
    assert.equal(result.largestBatchRecipientCount, 2);
    assert.equal(result.smallestBatchRecipientCount, 1);
    assert.deepEqual(result.batches, [
      {
        batchNumber: 1,
        startIndex: 1,
        endIndex: 2,
        recipientCount: 2,
        totalAmount: "30.5",
        totalRawAmount: parseUnits("30.5", 18).toString(),
        recipients: [
          getAddress("0x1111111111111111111111111111111111111111"),
          getAddress("0x2222222222222222222222222222222222222222"),
        ],
        amounts: ["10.0", "20.5"],
        rawAmounts: [
          parseUnits("10", 18).toString(),
          parseUnits("20.5", 18).toString(),
        ],
      },
      {
        batchNumber: 2,
        startIndex: 3,
        endIndex: 3,
        recipientCount: 1,
        totalAmount: "30.0",
        totalRawAmount: parseUnits("30", 18).toString(),
        recipients: [getAddress("0x3333333333333333333333333333333333333333")],
        amounts: ["30.0"],
        rawAmounts: [parseUnits("30", 18).toString()],
      },
    ]);
  });

  it("rejects an empty allocation list", function () {
    assert.throws(
      () => buildMintBatches({ allocations: [], batchSize: 50 }),
      /non-empty array/
    );
  });

  it("loads normalized mint batches from disk and selects a batch range", function () {
    const filePath = path.join(
      os.tmpdir(),
      `kingpulse-mint-batches-${process.pid}-${Date.now()}.json`
    );

    fs.writeFileSync(
      filePath,
      JSON.stringify([
        {
          batchNumber: 1,
          recipients: [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
          ],
          rawAmounts: [
            parseUnits("10", 18).toString(),
            parseUnits("20", 18).toString(),
          ],
          totalRawAmount: parseUnits("30", 18).toString(),
        },
        {
          batchNumber: 2,
          recipients: ["0x3333333333333333333333333333333333333333"],
          rawAmounts: [parseUnits("5.5", 18).toString()],
          totalRawAmount: parseUnits("5.5", 18).toString(),
        },
      ])
    );

    const loaded = loadMintBatches(filePath);
    const selection = selectMintBatchRange({
      batches: loaded.batches,
      startBatch: 2,
      endBatch: 2,
    });

    assert.equal(loaded.batches.length, 2);
    assert.equal(loaded.totalRawAmount, parseUnits("35.5", 18));
    assert.deepEqual(loaded.batches[0].recipients, [
      getAddress("0x1111111111111111111111111111111111111111"),
      getAddress("0x2222222222222222222222222222222222222222"),
    ]);
    assert.deepEqual(selection, {
      startBatch: 2,
      endBatch: 2,
      selectedBatches: [loaded.batches[1]],
      batchCount: 1,
      recipientCount: 1,
      totalRawAmount: parseUnits("5.5", 18),
      totalAmount: "5.5",
    });

    fs.unlinkSync(filePath);
  });

  it("rejects duplicate recipients across batches", function () {
    const filePath = path.join(
      os.tmpdir(),
      `kingpulse-mint-batches-duplicate-${process.pid}-${Date.now()}.json`
    );

    fs.writeFileSync(
      filePath,
      JSON.stringify([
        {
          batchNumber: 1,
          recipients: ["0x1111111111111111111111111111111111111111"],
          rawAmounts: [parseUnits("1", 18).toString()],
          totalRawAmount: parseUnits("1", 18).toString(),
        },
        {
          batchNumber: 2,
          recipients: ["0x1111111111111111111111111111111111111111"],
          rawAmounts: [parseUnits("2", 18).toString()],
          totalRawAmount: parseUnits("2", 18).toString(),
        },
      ])
    );

    assert.throws(() => loadMintBatches(filePath), /Duplicate recipient across mint batches/);

    fs.unlinkSync(filePath);
  });

  it("summarizes exact and partial mint progress against batch totals", function () {
    const batches = [
      {
        batchNumber: 1,
        recipientCount: 2,
        totalRawAmount: parseUnits("30", 18),
      },
      {
        batchNumber: 2,
        recipientCount: 1,
        totalRawAmount: parseUnits("5.5", 18),
      },
      {
        batchNumber: 3,
        recipientCount: 4,
        totalRawAmount: parseUnits("1", 18),
      },
    ];

    const exact = summarizeMintBatchProgress({
      batches,
      currentTotalSupply: parseUnits("35.5", 18),
    });
    const partial = summarizeMintBatchProgress({
      batches,
      currentTotalSupply: parseUnits("30.25", 18),
    });

    assert.equal(exact.fullyDistributed, false);
    assert.equal(exact.completedBatchCount, 2);
    assert.equal(exact.nextBatchNumber, 3);
    assert.equal(exact.remainingTargetAmount, "1.0");
    assert.equal(exact.exactBatchBoundary, true);

    assert.equal(partial.fullyDistributed, false);
    assert.equal(partial.completedBatchCount, 1);
    assert.equal(partial.nextBatchNumber, 2);
    assert.equal(partial.inProgressBatchNumber, 2);
    assert.equal(partial.partialAmountInCurrentBatch, "0.25");
    assert.equal(partial.remainingAmountInCurrentBatch, "5.25");
    assert.equal(partial.exactBatchBoundary, false);
  });
});
