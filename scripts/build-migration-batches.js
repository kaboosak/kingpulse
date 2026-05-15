import fs from "node:fs";
import path from "node:path";

import { formatUnits } from "ethers";

import { loadDistributionPlan } from "./lib/distribution.js";
import { buildMintBatches, parseBatchArgs } from "./lib/migration-batches.js";

function printHelp() {
  console.log(`Usage: npm run migration:batches -- [options]

Options:
  --input <path>       Distribution file to chunk. Defaults to distribution.migration.snapshot.json.
  --batch-size <n>     Recipients per mintBatch call. Defaults to 50.
  --output <path>      Output batch JSON file.
  --summary <path>     Output summary JSON file.
  --help               Show this message.

Environment:
  KINGPULSE_MIGRATION_DISTRIBUTION_FILE
  KINGPULSE_MIGRATION_BATCH_SIZE
  KINGPULSE_MIGRATION_BATCH_OUTPUT
  KINGPULSE_MIGRATION_BATCH_SUMMARY
  KINGPULSE_SNAPSHOT_OUTPUT
`);
}

async function main() {
  const options = parseBatchArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const plan = loadDistributionPlan(options.distributionFile);
  const result = buildMintBatches({
    allocations: plan.allocations,
    batchSize: options.batchSize,
  });

  fs.writeFileSync(options.outputPath, `${JSON.stringify(result.batches, null, 2)}\n`);

  const summary = {
    generatedAt: new Date().toISOString(),
    distributionFile: path.relative(process.cwd(), plan.sourcePath),
    batchSize: options.batchSize,
    batchCount: result.batchCount,
    recipientCount: result.recipientCount,
    totalAmount: formatUnits(result.totalRawAmount, 18),
    totalRawAmount: result.totalRawAmount.toString(),
    largestBatchRecipientCount: result.largestBatchRecipientCount,
    smallestBatchRecipientCount: result.smallestBatchRecipientCount,
    outputFile: path.relative(process.cwd(), options.outputPath),
  };

  fs.writeFileSync(options.summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`Distribution file: ${plan.sourcePath}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log(`Recipients: ${result.recipientCount}`);
  console.log(`Batches: ${result.batchCount}`);
  console.log(`Total amount: ${summary.totalAmount} KPL`);
  console.log(`Largest batch: ${result.largestBatchRecipientCount} recipients`);
  console.log(`Smallest batch: ${result.smallestBatchRecipientCount} recipients`);
  console.log("");
  console.log(`Wrote mint batches: ${options.outputPath}`);
  console.log(`Wrote batch summary: ${options.summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
