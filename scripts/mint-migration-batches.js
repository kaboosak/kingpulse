import { formatEther, formatUnits } from "ethers";

import {
  getSigner,
  getTransactionOverrides,
  sendContractTransaction,
} from "./lib/kingpulse.js";
import {
  loadMintBatches,
  parseBroadcastArgs,
  selectMintBatchRange,
} from "./lib/migration-batches.js";

function printHelp() {
  console.log(`Usage: npm run migration:mint-batches -- [options]

Options:
  --contract <address>          Migration token address.
  --input <path>                Mint batch file. Defaults to distribution.migration.batches.json.
  --start-batch <n>             First batch number to process. Defaults to 1.
  --end-batch <n>               Last batch number to process. Defaults to the final batch.
  --dry-run                     Estimate each mintBatch call without broadcasting.
  --allow-nonzero-supply        Allow sending from batch 1 even if current totalSupply is already non-zero.
  --help                        Show this message.

Environment:
  KINGPULSE_MIGRATION_ADDRESS
  KINGPULSE_REPLACEMENT_ADDRESS
  KINGPULSE_MIGRATION_BATCH_INPUT
  KINGPULSE_MIGRATION_BATCH_OUTPUT
  KINGPULSE_MIGRATION_START_BATCH
  KINGPULSE_MIGRATION_END_BATCH
  KINGPULSE_MIGRATION_DRY_RUN
  KINGPULSE_MIGRATION_ALLOW_NONZERO_SUPPLY
  KINGPULSE_SIGNER
  MONAD_RPC_URL
`);
}

function formatBatchLabel(batch, totalBatches) {
  return `Batch ${batch.batchNumber}/${totalBatches}`;
}

async function main() {
  const options = parseBroadcastArgs(process.argv.slice(2));

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
  const batchFile = loadMintBatches(options.batchFile);
  const selection = selectMintBatchRange({
    batches: batchFile.batches,
    startBatch: options.startBatch,
    endBatch: options.endBatch,
  });
  const [owner, migrationFinalized, totalSupply, maxSupply, signerBalance] =
    await Promise.all([
      contract.owner(),
      contract.migrationFinalized(),
      contract.totalSupply(),
      contract.maxSupply(),
      signer.provider.getBalance(signer.address),
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

  if (
    !options.dryRun &&
    totalSupply > 0n &&
    selection.startBatch === 1 &&
    !options.allowNonZeroSupply
  ) {
    throw new Error(
      [
        "Migration contract totalSupply is already non-zero.",
        "Refusing to start from batch 1 because that risks replaying previous mints.",
        "Resume with --start-batch <n> or pass --allow-nonzero-supply if you are intentionally replaying.",
      ].join(" ")
    );
  }

  if (totalSupply + selection.totalRawAmount > maxSupply) {
    throw new Error(
      [
        "Selected batch range would exceed the migration supply cap.",
        `Current supply: ${formatUnits(totalSupply, 18)} KPL.`,
        `Selected range: ${selection.totalAmount} KPL.`,
        `Cap: ${formatUnits(maxSupply, 18)} KPL.`,
      ].join(" ")
    );
  }

  console.log(`Mode: ${options.dryRun ? "dry-run" : "broadcast"}`);
  console.log(`Network: ${networkName}`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Signer balance: ${formatEther(signerBalance)} MON`);
  console.log(`Migration contract: ${options.contractAddress}`);
  console.log(`Batch file: ${batchFile.sourcePath}`);
  console.log(`Selected batches: ${selection.startBatch}-${selection.endBatch}`);
  console.log(`Recipients in range: ${selection.recipientCount}`);
  console.log(`Amount in range: ${selection.totalAmount} KPL`);
  console.log(`Current supply: ${formatUnits(totalSupply, 18)} KPL`);
  console.log(`Remaining cap before run: ${formatUnits(maxSupply - totalSupply, 18)} KPL`);

  let projectedSupply = totalSupply;

  for (const batch of selection.selectedBatches) {
    console.log("");
    console.log(
      `${formatBatchLabel(batch, batchFile.batches.length)}: ${batch.recipientCount} recipients, ${batch.totalAmount} KPL`
    );

    const txRequest = await contract.mintBatch.populateTransaction(
      batch.recipients,
      batch.rawAmounts
    );

    if (options.dryRun) {
      const overrides = await getTransactionOverrides(signer, txRequest);
      const maxUpfrontCost = overrides.gasLimit * overrides.maxFeePerGas;
      projectedSupply += batch.totalRawAmount;

      console.log(`Estimated gas limit: ${overrides.gasLimit.toString()}`);
      console.log(`Max fee per gas: ${formatUnits(overrides.maxFeePerGas, "gwei")} gwei`);
      console.log(`Max upfront gas cost: ${formatEther(maxUpfrontCost)} MON`);
      console.log(`Projected total supply after batch: ${formatUnits(projectedSupply, 18)} KPL`);
      continue;
    }

    await sendContractTransaction(signer, txRequest);
    projectedSupply += batch.totalRawAmount;

    console.log(`Projected total supply after batch: ${formatUnits(projectedSupply, 18)} KPL`);
  }

  if (options.dryRun) {
    console.log("");
    console.log("Dry run complete. No transactions were broadcast.");
    return;
  }

  const finalTotalSupply = await contract.totalSupply();

  console.log("");
  console.log(
    `Completed selected mint batches. Final total supply: ${formatUnits(finalTotalSupply, 18)} KPL`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
