import fs from "node:fs";
import path from "node:path";

import { formatUnits } from "ethers";

import {
  getSigner,
  getTransactionOverrides,
  parseAddress,
  sendContractTransaction,
} from "./lib/kingpulse.js";
import {
  loadMintBatches,
  summarizeMintBatchProgress,
} from "./lib/migration-batches.js";

function printHelp() {
  console.log(`Usage: npm run migration:finalize -- [options]

Options:
  --contract <address>        Migration token address.
  --input <path>              Mint batch file. Defaults to distribution.migration.batches.json.
  --dry-run                   Estimate finalizeMigration() without broadcasting.
  --allow-incomplete          Bypass local batch-file completeness checks.
  --help                      Show this message.

Environment:
  KINGPULSE_MIGRATION_ADDRESS
  KINGPULSE_REPLACEMENT_ADDRESS
  KINGPULSE_MIGRATION_BATCH_INPUT
  KINGPULSE_MIGRATION_BATCH_OUTPUT
  KINGPULSE_MIGRATION_ALLOW_INCOMPLETE_FINALIZE
  KINGPULSE_SIGNER
  MONAD_RPC_URL
`);
}

function parseBooleanFlag(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseArgs(argv, env = process.env) {
  const options = {
    contractAddress:
      env.KINGPULSE_MIGRATION_ADDRESS || env.KINGPULSE_REPLACEMENT_ADDRESS || "",
    batchFile:
      env.KINGPULSE_MIGRATION_BATCH_INPUT ||
      env.KINGPULSE_MIGRATION_BATCH_OUTPUT ||
      "distribution.migration.batches.json",
    dryRun: false,
    allowIncomplete: parseBooleanFlag(
      env.KINGPULSE_MIGRATION_ALLOW_INCOMPLETE_FINALIZE
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--contract") {
      options.contractAddress = next || "";
      index += 1;
      continue;
    }

    if (arg === "--input") {
      options.batchFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--allow-incomplete") {
      options.allowIncomplete = true;
      continue;
    }

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.contractAddress) {
    throw new Error(
      "Migration contract address is required. Pass --contract or set KINGPULSE_MIGRATION_ADDRESS."
    );
  }

  return {
    help: false,
    contractAddress: parseAddress(options.contractAddress, "migration contract address"),
    batchFile: path.resolve(process.cwd(), options.batchFile),
    dryRun: Boolean(options.dryRun),
    allowIncomplete: Boolean(options.allowIncomplete),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const { ethers, networkName, signer } = await getSigner();
  const contract = await ethers.getContractAt(
    "KingPulseMigrationToken",
    options.contractAddress,
    signer
  );
  const [owner, migrationFinalized, totalSupply, maxSupply] = await Promise.all([
    contract.owner(),
    contract.migrationFinalized(),
    contract.totalSupply(),
    contract.maxSupply(),
  ]);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      [
        "Configured signer is not the migration contract owner.",
        `Owner: ${owner}`,
        `Signer: ${signer.address}`,
      ].join(" ")
    );
  }

  if (migrationFinalized) {
    throw new Error("Migration minting is already finalized on this contract.");
  }

  let progress = null;
  if (!options.allowIncomplete) {
    if (!fs.existsSync(options.batchFile)) {
      throw new Error(
        [
          `Mint batch file not found: ${options.batchFile}`,
          "Generate it with `npm run migration:batches` or rerun with --allow-incomplete to bypass local batch verification.",
        ].join(" ")
      );
    }

    const batchFile = loadMintBatches(options.batchFile);
    progress = summarizeMintBatchProgress({
      batches: batchFile.batches,
      currentTotalSupply: totalSupply,
    });

    if (progress.overDistributed) {
      throw new Error(
        [
          "On-chain total supply exceeds the local batch file target.",
          `Current supply: ${progress.currentAmount} KPL.`,
          `Batch target: ${progress.targetAmount} KPL.`,
        ].join(" ")
      );
    }

    if (!progress.fullyDistributed) {
      if (progress.inProgressBatchNumber !== null) {
        throw new Error(
          [
            "Current total supply is mid-batch and does not align with a completed mint range.",
            `In-progress batch: ${progress.inProgressBatchNumber}.`,
            `Remaining in current batch: ${progress.remainingAmountInCurrentBatch} KPL.`,
          ].join(" ")
        );
      }

      throw new Error(
        [
          "Refusing to finalize before the replacement distribution is fully minted.",
          `Current supply: ${progress.currentAmount} KPL.`,
          `Target supply from batch file: ${progress.targetAmount} KPL.`,
          progress.nextBatchNumber === null
            ? "No next batch could be inferred from the batch file."
            : `Resume with --start-batch ${progress.nextBatchNumber}.`,
        ].join(" ")
      );
    }
  }

  const txRequest = await contract.finalizeMigration.populateTransaction();

  console.log(`Network: ${networkName}`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Migration contract: ${options.contractAddress}`);
  console.log(`Current supply: ${formatUnits(totalSupply, 18)} KPL`);
  console.log(`Max supply: ${formatUnits(maxSupply, 18)} KPL`);

  if (progress) {
    console.log(`Verified local batch target: ${progress.targetAmount} KPL`);
  } else {
    console.log("Batch verification: bypassed");
  }

  if (options.dryRun) {
    const overrides = await getTransactionOverrides(signer, txRequest);
    console.log(`Estimated gas limit: ${overrides.gasLimit.toString()}`);
    console.log(`Max fee per gas: ${formatUnits(overrides.maxFeePerGas, "gwei")} gwei`);
    console.log(
      `Max upfront gas cost: ${formatUnits(
        overrides.gasLimit * overrides.maxFeePerGas,
        18
      )} MON`
    );
    console.log("Dry run complete. No transaction was broadcast.");
    return;
  }

  await sendContractTransaction(signer, txRequest);

  console.log(`Migration finalized: ${await contract.migrationFinalized()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
