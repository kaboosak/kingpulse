import fs from "node:fs";
import path from "node:path";

import { formatUnits, getAddress, isAddress } from "ethers";

function parsePositiveInteger(value, label) {
  const normalized = String(value ?? "").trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a positive integer.`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a safe positive integer.`);
  }

  return parsed;
}

function parseBigIntString(value, label) {
  const normalized = String(value ?? "").trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a non-negative integer string.`);
  }

  return BigInt(normalized);
}

function parseAddress(value, label) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (!isAddress(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return getAddress(value);
}

function parseBooleanEnvFlag(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseBatchArgs(argv, env = process.env) {
  const options = {
    distributionFile:
      env.KINGPULSE_MIGRATION_DISTRIBUTION_FILE ||
      env.KINGPULSE_SNAPSHOT_OUTPUT ||
      "distribution.migration.snapshot.json",
    batchSize: env.KINGPULSE_MIGRATION_BATCH_SIZE || "50",
    outputPath:
      env.KINGPULSE_MIGRATION_BATCH_OUTPUT || "distribution.migration.batches.json",
    summaryPath:
      env.KINGPULSE_MIGRATION_BATCH_SUMMARY ||
      "distribution.migration.batches.summary.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input") {
      options.distributionFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--batch-size") {
      options.batchSize = next || "";
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputPath = next || "";
      index += 1;
      continue;
    }

    if (arg === "--summary") {
      options.summaryPath = next || "";
      index += 1;
      continue;
    }

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.distributionFile) {
    throw new Error(
      "Distribution file is required. Pass --input or set KINGPULSE_MIGRATION_DISTRIBUTION_FILE."
    );
  }

  return {
    help: false,
    distributionFile: options.distributionFile,
    batchSize: parsePositiveInteger(options.batchSize, "batch size"),
    outputPath: path.resolve(process.cwd(), options.outputPath),
    summaryPath: path.resolve(process.cwd(), options.summaryPath),
  };
}

function parseBroadcastArgs(argv, env = process.env) {
  const options = {
    batchFile:
      env.KINGPULSE_MIGRATION_BATCH_INPUT ||
      env.KINGPULSE_MIGRATION_BATCH_OUTPUT ||
      "distribution.migration.batches.json",
    contractAddress:
      env.KINGPULSE_MIGRATION_ADDRESS || env.KINGPULSE_REPLACEMENT_ADDRESS || "",
    startBatch: env.KINGPULSE_MIGRATION_START_BATCH || "1",
    endBatch: env.KINGPULSE_MIGRATION_END_BATCH || "",
    dryRun: parseBooleanEnvFlag(env.KINGPULSE_MIGRATION_DRY_RUN),
    allowNonZeroSupply: parseBooleanEnvFlag(
      env.KINGPULSE_MIGRATION_ALLOW_NONZERO_SUPPLY
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input") {
      options.batchFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--contract") {
      options.contractAddress = next || "";
      index += 1;
      continue;
    }

    if (arg === "--start-batch") {
      options.startBatch = next || "";
      index += 1;
      continue;
    }

    if (arg === "--end-batch") {
      options.endBatch = next || "";
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--allow-nonzero-supply") {
      options.allowNonZeroSupply = true;
      continue;
    }

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.batchFile) {
    throw new Error(
      "Batch file is required. Pass --input or set KINGPULSE_MIGRATION_BATCH_INPUT."
    );
  }

  if (!options.contractAddress) {
    throw new Error(
      "Migration contract address is required. Pass --contract or set KINGPULSE_MIGRATION_ADDRESS."
    );
  }

  return {
    help: false,
    batchFile: path.resolve(process.cwd(), options.batchFile),
    contractAddress: parseAddress(options.contractAddress, "migration contract address"),
    startBatch: parsePositiveInteger(options.startBatch, "start batch"),
    endBatch: options.endBatch
      ? parsePositiveInteger(options.endBatch, "end batch")
      : null,
    dryRun: Boolean(options.dryRun),
    allowNonZeroSupply: Boolean(options.allowNonZeroSupply),
  };
}

function buildMintBatches({ allocations, batchSize, decimals = 18 }) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new Error("Allocations must be a non-empty array.");
  }

  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a safe positive integer.");
  }

  const batches = [];

  for (let index = 0; index < allocations.length; index += batchSize) {
    const slice = allocations.slice(index, index + batchSize);
    const totalRawAmount = slice.reduce((sum, entry) => sum + BigInt(entry.amount), 0n);

    batches.push({
      batchNumber: batches.length + 1,
      startIndex: index + 1,
      endIndex: index + slice.length,
      recipientCount: slice.length,
      totalAmount: formatUnits(totalRawAmount, decimals),
      totalRawAmount: totalRawAmount.toString(),
      recipients: slice.map((entry) => entry.recipient),
      amounts: slice.map((entry) => formatUnits(entry.amount, decimals)),
      rawAmounts: slice.map((entry) => entry.amount.toString()),
    });
  }

  const totalRawAmount = batches.reduce(
    (sum, batch) => sum + BigInt(batch.totalRawAmount),
    0n
  );
  const largestBatch = batches.reduce((largest, batch) =>
    batch.recipientCount > largest.recipientCount ? batch : largest
  );
  const smallestBatch = batches.reduce((smallest, batch) =>
    batch.recipientCount < smallest.recipientCount ? batch : smallest
  );

  return {
    batches,
    totalRawAmount,
    batchCount: batches.length,
    recipientCount: allocations.length,
    largestBatchRecipientCount: largestBatch.recipientCount,
    smallestBatchRecipientCount: smallestBatch.recipientCount,
  };
}

function loadMintBatches(batchFile) {
  const sourcePath = path.resolve(process.cwd(), batchFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Mint batch file not found: ${sourcePath}`);
  }

  let rawBatches;
  try {
    rawBatches = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse mint batch file ${sourcePath}: ${error.message}`);
  }

  if (!Array.isArray(rawBatches) || rawBatches.length === 0) {
    throw new Error(
      `Mint batch file ${sourcePath} must contain a non-empty JSON array.`
    );
  }

  const seenRecipients = new Set();
  const batches = rawBatches.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Mint batch entry #${index + 1} must be an object.`);
    }

    const batchNumber = parsePositiveInteger(
      entry.batchNumber ?? index + 1,
      `batch number #${index + 1}`
    );

    if (batchNumber !== index + 1) {
      throw new Error(
        `Mint batch file must use sequential batch numbers. Expected ${index + 1}, received ${batchNumber}.`
      );
    }

    if (!Array.isArray(entry.recipients) || !Array.isArray(entry.rawAmounts)) {
      throw new Error(
        `Batch #${batchNumber} must contain recipients and rawAmounts arrays.`
      );
    }

    if (entry.recipients.length === 0) {
      throw new Error(`Batch #${batchNumber} cannot be empty.`);
    }

    if (entry.recipients.length !== entry.rawAmounts.length) {
      throw new Error(`Batch #${batchNumber} recipients/rawAmounts length mismatch.`);
    }

    const recipients = entry.recipients.map((recipient, recipientIndex) => {
      const normalized = parseAddress(
        recipient,
        `batch #${batchNumber} recipient #${recipientIndex + 1}`
      );

      if (seenRecipients.has(normalized)) {
        throw new Error(`Duplicate recipient across mint batches: ${normalized}`);
      }

      seenRecipients.add(normalized);
      return normalized;
    });

    const rawAmounts = entry.rawAmounts.map((amount, amountIndex) => {
      const parsed = parseBigIntString(
        amount,
        `batch #${batchNumber} raw amount #${amountIndex + 1}`
      );

      if (parsed <= 0n) {
        throw new Error(`Batch #${batchNumber} raw amounts must be greater than zero.`);
      }

      return parsed;
    });

    const totalRawAmount = rawAmounts.reduce((sum, amount) => sum + amount, 0n);
    const expectedTotalRawAmount =
      entry.totalRawAmount === undefined
        ? totalRawAmount
        : parseBigIntString(entry.totalRawAmount, `batch #${batchNumber} totalRawAmount`);

    if (expectedTotalRawAmount !== totalRawAmount) {
      throw new Error(`Batch #${batchNumber} totalRawAmount does not match its rawAmounts.`);
    }

    return {
      batchNumber,
      startIndex: Number(entry.startIndex ?? 0) || null,
      endIndex: Number(entry.endIndex ?? 0) || null,
      recipientCount: recipients.length,
      recipients,
      rawAmounts,
      totalRawAmount,
      totalAmount: formatUnits(totalRawAmount, 18),
    };
  });

  const totalRawAmount = batches.reduce((sum, batch) => sum + batch.totalRawAmount, 0n);

  return {
    batches,
    totalRawAmount,
    sourcePath,
  };
}

function selectMintBatchRange({ batches, startBatch = 1, endBatch = null }) {
  if (!Array.isArray(batches) || batches.length === 0) {
    throw new Error("Batches must be a non-empty array.");
  }

  const normalizedStart = parsePositiveInteger(startBatch, "start batch");
  const normalizedEnd = endBatch === null
    ? batches.length
    : parsePositiveInteger(endBatch, "end batch");

  if (normalizedStart > normalizedEnd) {
    throw new Error(
      `Start batch ${normalizedStart} cannot be greater than end batch ${normalizedEnd}.`
    );
  }

  if (normalizedEnd > batches.length) {
    throw new Error(
      `End batch ${normalizedEnd} exceeds available batch count ${batches.length}.`
    );
  }

  const selectedBatches = batches.filter(
    (batch) => batch.batchNumber >= normalizedStart && batch.batchNumber <= normalizedEnd
  );
  const totalRawAmount = selectedBatches.reduce(
    (sum, batch) => sum + batch.totalRawAmount,
    0n
  );
  const recipientCount = selectedBatches.reduce(
    (sum, batch) => sum + batch.recipientCount,
    0
  );

  return {
    startBatch: normalizedStart,
    endBatch: normalizedEnd,
    selectedBatches,
    batchCount: selectedBatches.length,
    recipientCount,
    totalRawAmount,
    totalAmount: formatUnits(totalRawAmount, 18),
  };
}

function summarizeMintBatchProgress({ batches, currentTotalSupply }) {
  if (!Array.isArray(batches) || batches.length === 0) {
    throw new Error("Batches must be a non-empty array.");
  }

  const normalizedCurrentSupply = BigInt(currentTotalSupply);
  const totalTargetRawAmount = batches.reduce(
    (sum, batch) => sum + batch.totalRawAmount,
    0n
  );
  const targetRecipientCount = batches.reduce(
    (sum, batch) => sum + batch.recipientCount,
    0
  );

  let cumulativeRawAmount = 0n;
  let completedBatchCount = 0;
  let completedRecipientCount = 0;
  let nextBatchNumber = batches[0].batchNumber;
  let inProgressBatchNumber = null;
  let partialRawAmountInCurrentBatch = 0n;
  let remainingRawAmountInCurrentBatch = 0n;
  let exactBatchBoundary = normalizedCurrentSupply === 0n;

  for (const batch of batches) {
    const nextCumulativeRawAmount = cumulativeRawAmount + batch.totalRawAmount;

    if (normalizedCurrentSupply < nextCumulativeRawAmount) {
      if (normalizedCurrentSupply === cumulativeRawAmount) {
        nextBatchNumber = batch.batchNumber;
        exactBatchBoundary = true;
      } else if (normalizedCurrentSupply > cumulativeRawAmount) {
        inProgressBatchNumber = batch.batchNumber;
        nextBatchNumber = batch.batchNumber;
        partialRawAmountInCurrentBatch = normalizedCurrentSupply - cumulativeRawAmount;
        remainingRawAmountInCurrentBatch =
          nextCumulativeRawAmount - normalizedCurrentSupply;
        exactBatchBoundary = false;
      }

      break;
    }

    cumulativeRawAmount = nextCumulativeRawAmount;
    completedBatchCount = batch.batchNumber;
    completedRecipientCount += batch.recipientCount;
    nextBatchNumber =
      batch.batchNumber === batches.length ? null : batch.batchNumber + 1;
    exactBatchBoundary = normalizedCurrentSupply === cumulativeRawAmount;
  }

  if (normalizedCurrentSupply > totalTargetRawAmount) {
    nextBatchNumber = null;
    exactBatchBoundary = false;
  }

  const remainingTargetRawAmount =
    normalizedCurrentSupply >= totalTargetRawAmount
      ? 0n
      : totalTargetRawAmount - normalizedCurrentSupply;

  return {
    totalTargetRawAmount,
    targetAmount: formatUnits(totalTargetRawAmount, 18),
    targetRecipientCount,
    completedBatchCount,
    completedRecipientCount,
    completedRawAmount: cumulativeRawAmount,
    completedAmount: formatUnits(cumulativeRawAmount, 18),
    nextBatchNumber,
    inProgressBatchNumber,
    partialRawAmountInCurrentBatch,
    partialAmountInCurrentBatch: formatUnits(partialRawAmountInCurrentBatch, 18),
    remainingRawAmountInCurrentBatch,
    remainingAmountInCurrentBatch: formatUnits(remainingRawAmountInCurrentBatch, 18),
    currentTotalSupply: normalizedCurrentSupply,
    currentAmount: formatUnits(normalizedCurrentSupply, 18),
    remainingTargetRawAmount,
    remainingTargetAmount: formatUnits(remainingTargetRawAmount, 18),
    exactBatchBoundary,
    fullyDistributed: normalizedCurrentSupply === totalTargetRawAmount,
    overDistributed: normalizedCurrentSupply > totalTargetRawAmount,
    underDistributed: normalizedCurrentSupply < totalTargetRawAmount,
    excessRawAmount:
      normalizedCurrentSupply > totalTargetRawAmount
        ? normalizedCurrentSupply - totalTargetRawAmount
        : 0n,
    excessAmount:
      normalizedCurrentSupply > totalTargetRawAmount
        ? formatUnits(normalizedCurrentSupply - totalTargetRawAmount, 18)
        : "0.0",
  };
}

export {
  buildMintBatches,
  loadMintBatches,
  parseBatchArgs,
  parseBroadcastArgs,
  parseBigIntString,
  parsePositiveInteger,
  selectMintBatchRange,
  summarizeMintBatchProgress,
};
