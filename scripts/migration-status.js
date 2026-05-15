import fs from "node:fs";
import path from "node:path";

import { formatUnits } from "ethers";

import { getMigrationReadOnlyContract, parseAddress } from "./lib/kingpulse.js";
import {
  loadMintBatches,
  summarizeMintBatchProgress,
} from "./lib/migration-batches.js";

function printHelp() {
  console.log(`Usage: npm run migration:status -- [options]

Options:
  --contract <address>   Migration token address.
  --input <path>         Mint batch file. Defaults to distribution.migration.batches.json.
  --help                 Show this message.

Environment:
  KINGPULSE_MIGRATION_ADDRESS
  KINGPULSE_REPLACEMENT_ADDRESS
  KINGPULSE_MIGRATION_BATCH_INPUT
  KINGPULSE_MIGRATION_BATCH_OUTPUT
  MONAD_RPC_URL
`);
}

function parseArgs(argv, env = process.env) {
  const options = {
    contractAddress:
      env.KINGPULSE_MIGRATION_ADDRESS || env.KINGPULSE_REPLACEMENT_ADDRESS || "",
    batchFile:
      env.KINGPULSE_MIGRATION_BATCH_INPUT ||
      env.KINGPULSE_MIGRATION_BATCH_OUTPUT ||
      "distribution.migration.batches.json",
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
  };
}

function printBatchProgress(progress) {
  console.log(`Target migration supply from batch file: ${progress.targetAmount} KPL`);
  console.log(`Completed batches: ${progress.completedBatchCount}`);
  console.log(`Completed recipients: ${progress.completedRecipientCount}`);
  console.log(`Remaining target supply: ${progress.remainingTargetAmount} KPL`);

  if (progress.overDistributed) {
    console.log(
      `Warning: on-chain total supply exceeds the batch file target by ${progress.excessAmount} KPL.`
    );
    return;
  }

  if (progress.fullyDistributed) {
    console.log("Distribution target reached.");
    return;
  }

  if (progress.inProgressBatchNumber !== null) {
    console.log(
      `Warning: total supply is mid-batch at batch ${progress.inProgressBatchNumber}.`
    );
    console.log(
      `Current partial fill in that batch: ${progress.partialAmountInCurrentBatch} KPL`
    );
    console.log(
      `Remaining amount to finish that batch: ${progress.remainingAmountInCurrentBatch} KPL`
    );
    return;
  }

  if (progress.nextBatchNumber !== null) {
    console.log(`Next batch to mint: ${progress.nextBatchNumber}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  process.env.KINGPULSE_MIGRATION_ADDRESS = options.contractAddress;

  const { contract, contractAddress, networkName } = await getMigrationReadOnlyContract();
  const [name, symbol, owner, migrationFinalized, totalSupply, maxSupply, paused] =
    await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.owner(),
      contract.migrationFinalized(),
      contract.totalSupply(),
      contract.maxSupply(),
      contract.paused(),
    ]);

  console.log(`Network: ${networkName}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Token: ${name} (${symbol})`);
  console.log(`Owner: ${owner}`);
  console.log(`Migration finalized: ${migrationFinalized}`);
  console.log(`Paused: ${paused}`);
  console.log(`Total supply: ${formatUnits(totalSupply, 18)} KPL`);
  console.log(`Max supply: ${formatUnits(maxSupply, 18)} KPL`);
  console.log(`Remaining cap: ${formatUnits(maxSupply - totalSupply, 18)} KPL`);

  if (!fs.existsSync(options.batchFile)) {
    console.log(`Batch file: not found at ${options.batchFile}`);
    return;
  }

  const batchFile = loadMintBatches(options.batchFile);
  const progress = summarizeMintBatchProgress({
    batches: batchFile.batches,
    currentTotalSupply: totalSupply,
  });

  console.log(`Batch file: ${batchFile.sourcePath}`);
  console.log(`Target batch count: ${batchFile.batches.length}`);
  console.log(`Target recipient count: ${progress.targetRecipientCount}`);
  printBatchProgress(progress);

  if (migrationFinalized) {
    console.log("Next action: migration minting is already closed.");
    return;
  }

  if (progress.overDistributed) {
    console.log(
      "Next action: stop and audit the batch file against on-chain supply before sending more transactions."
    );
    return;
  }

  if (progress.fullyDistributed) {
    console.log(
      "Next action: finalize with `npm run migration:finalize` once you are ready to permanently close minting."
    );
    return;
  }

  if (progress.inProgressBatchNumber !== null) {
    console.log(
      "Next action: inspect prior mint transactions before resuming, because supply does not align to a batch boundary."
    );
    return;
  }

  if (progress.nextBatchNumber !== null) {
    console.log(
      `Next action: resume minting with \`npm run migration:mint-batches -- --start-batch ${progress.nextBatchNumber}\`.`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
