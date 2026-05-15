import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatEther, getAddress, isAddress, parseEther } from "ethers";
import { network } from "hardhat";

import {
  getSigner,
  getTransactionOverrides,
  sendContractTransaction as sendSignerTransaction,
} from "./lib/kingpulse.js";

function buildDefaultOutputPath(reportPath) {
  const parsed = path.parse(reportPath);
  return path.join(parsed.dir, `${parsed.name}.topup-plan.json`);
}

function printHelp() {
  console.log(`Usage: npm run vesting:gas-topup -- [options]

Options:
  --report <path>       Gas-audit report file. Defaults to vesting.execution-ready.remaining.gas-audit.json.
  --buffer-mon <value>  Extra MON to add on top of the report minimum. Defaults to 0.05.
  --output <path>       Output top-up plan file. Defaults to <report>.topup-plan.json.
  --skip-blocked        In execute mode, fund only recipients whose native transfers estimate cleanly.
  --execute             Broadcast the native MON top-ups.
  --dry-run             Refresh balances and build the plan without sending. Default.
  --help                Show this message.

Environment:
  KINGPULSE_VESTING_GAS_AUDIT_OUTPUT
  KINGPULSE_VESTING_GAS_TOPUP_REPORT
  KINGPULSE_VESTING_GAS_TOPUP_BUFFER_MON
  KINGPULSE_VESTING_GAS_TOPUP_OUTPUT
`);
}

function parseArgs(argv, env = process.env) {
  const defaultReportPath =
    env.KINGPULSE_VESTING_GAS_TOPUP_REPORT ||
    env.KINGPULSE_VESTING_GAS_AUDIT_OUTPUT ||
    "vesting.execution-ready.remaining.gas-audit.json";
  const options = {
    reportPath: defaultReportPath,
    bufferMon: env.KINGPULSE_VESTING_GAS_TOPUP_BUFFER_MON || "0.05",
    outputPath:
      env.KINGPULSE_VESTING_GAS_TOPUP_OUTPUT || buildDefaultOutputPath(defaultReportPath),
    execute: false,
    skipBlocked: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--report") {
      if (!next) {
        throw new Error("--report requires a file path.");
      }

      options.reportPath = next;
      if (!env.KINGPULSE_VESTING_GAS_TOPUP_OUTPUT) {
        options.outputPath = buildDefaultOutputPath(next);
      }
      index += 1;
      continue;
    }

    if (arg === "--buffer-mon") {
      if (!next) {
        throw new Error("--buffer-mon requires a numeric value.");
      }

      options.bufferMon = next;
      index += 1;
      continue;
    }

    if (arg === "--output") {
      if (!next) {
        throw new Error("--output requires a file path.");
      }

      options.outputPath = next;
      index += 1;
      continue;
    }

    if (arg === "--execute") {
      options.execute = true;
      continue;
    }

    if (arg === "--skip-blocked") {
      options.skipBlocked = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.execute = false;
      continue;
    }

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const bufferWei = parseEther(String(options.bufferMon));

  if (bufferWei < 0n) {
    throw new Error("--buffer-mon must be non-negative.");
  }

  return {
    help: false,
    reportPath: path.resolve(process.cwd(), options.reportPath),
    outputPath: path.resolve(process.cwd(), options.outputPath),
    bufferMon: String(options.bufferMon),
    bufferWei,
    execute: options.execute,
    skipBlocked: options.skipBlocked,
  };
}

function loadGasAuditReport(reportPath) {
  const sourcePath = path.resolve(process.cwd(), reportPath);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Gas-audit report not found: ${sourcePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

  if (!Array.isArray(raw.rows) || raw.rows.length === 0) {
    throw new Error(`Gas-audit report ${sourcePath} must contain a non-empty rows array.`);
  }

  const minRequiredWei = BigInt(raw.minRequiredWei ?? 0n);

  if (minRequiredWei <= 0n) {
    throw new Error(`Gas-audit report ${sourcePath} is missing a valid minRequiredWei value.`);
  }

  const rows = raw.rows.map((row, index) => {
    const category = String(row.category ?? "").trim();
    const currentHolder = String(row.currentHolder ?? "").trim();

    if (!category) {
      throw new Error(`Gas-audit row #${index + 1} is missing category.`);
    }

    if (!isAddress(currentHolder)) {
      throw new Error(`Gas-audit row ${category} has an invalid currentHolder: ${currentHolder}`);
    }

    return {
      category,
      currentHolder: getAddress(currentHolder),
      beneficiary: isAddress(String(row.beneficiary ?? ""))
        ? getAddress(String(row.beneficiary))
        : getAddress(currentHolder),
      amount: String(row.amount ?? "").trim(),
      signerKeyEnv: String(row.signerKeyEnv ?? "").trim(),
      reportNativeBalanceWei: String(row.nativeBalanceWei ?? "0"),
      reportNativeBalanceMon: String(row.nativeBalanceMon ?? "0"),
    };
  });

  return {
    sourcePath,
    minRequiredWei,
    minRequiredMon: formatEther(minRequiredWei),
    rows,
  };
}

async function collectLiveNativeBalances(rows) {
  const connection = await network.connect();
  const { ethers } = connection;
  const uniqueHolders = [...new Set(rows.map((row) => row.currentHolder))];
  const balances = await Promise.all(
    uniqueHolders.map(async (holder) => [holder, await ethers.provider.getBalance(holder)])
  );

  return new Map(balances);
}

function buildTopUpRows({ rows, minRequiredWei, bufferWei, liveBalanceByHolder }) {
  const targetWei = minRequiredWei + bufferWei;

  return rows.map((row) => {
    const liveBalanceWei = liveBalanceByHolder.get(row.currentHolder) ?? 0n;
    const transferWei = liveBalanceWei >= targetWei ? 0n : targetWei - liveBalanceWei;

    return {
      ...row,
      liveNativeBalanceWei: liveBalanceWei.toString(),
      liveNativeBalanceMon: formatEther(liveBalanceWei),
      minRequiredWei: minRequiredWei.toString(),
      minRequiredMon: formatEther(minRequiredWei),
      bufferWei: bufferWei.toString(),
      bufferMon: formatEther(bufferWei),
      targetBalanceWei: targetWei.toString(),
      targetBalanceMon: formatEther(targetWei),
      transferWei: transferWei.toString(),
      transferMon: formatEther(transferWei),
      funded: transferWei === 0n,
      status: transferWei === 0n ? "ready" : "needs_topup",
    };
  });
}

function summarizeTopUpRows(rows) {
  const rowsNeedingTopUp = rows.filter((row) => BigInt(row.transferWei) > 0n);
  const fundedRows = rows.filter((row) => BigInt(row.transferWei) === 0n);
  const fundableRows = rowsNeedingTopUp.filter((row) => row.estimationStatus !== "blocked");
  const blockedRows = rowsNeedingTopUp.filter((row) => row.estimationStatus === "blocked");
  const totalTransferWei = rowsNeedingTopUp.reduce(
    (sum, row) => sum + BigInt(row.transferWei),
    0n
  );
  const fundableTransferWei = fundableRows.reduce(
    (sum, row) => sum + BigInt(row.transferWei),
    0n
  );
  const blockedTransferWei = blockedRows.reduce(
    (sum, row) => sum + BigInt(row.transferWei),
    0n
  );

  return {
    entryCount: rows.length,
    fundedCount: fundedRows.length,
    needsTopUpCount: rowsNeedingTopUp.length,
    fundableCount: fundableRows.length,
    blockedCount: blockedRows.length,
    totalTransferWei: totalTransferWei.toString(),
    totalTransferMon: formatEther(totalTransferWei),
    fundableTransferWei: fundableTransferWei.toString(),
    fundableTransferMon: formatEther(fundableTransferWei),
    blockedTransferWei: blockedTransferWei.toString(),
    blockedTransferMon: formatEther(blockedTransferWei),
  };
}

async function estimateTopUpTransactions({ signer, rows }) {
  const estimates = [];
  let totalMaxGasCostWei = 0n;

  for (const row of rows) {
    if (BigInt(row.transferWei) === 0n) {
      estimates.push({
        category: row.category,
        recipientHasCode: false,
        recipientType: "skip",
        estimationStatus: "skip",
        estimationError: "",
        gasLimit: "0",
        maxFeePerGas: "0",
        maxPriorityFeePerGas: "0",
        maxUpfrontGasCostWei: "0",
        maxUpfrontGasCostMon: "0.0",
      });
      continue;
    }

    const txRequest = {
      to: row.currentHolder,
      value: BigInt(row.transferWei),
    };
    const recipientCode = await signer.provider.getCode(row.currentHolder);
    const recipientHasCode = recipientCode !== "0x";

    try {
      const overrides = await getTransactionOverrides(signer, txRequest);
      const maxUpfrontGasCostWei = overrides.gasLimit * overrides.maxFeePerGas;

      totalMaxGasCostWei += maxUpfrontGasCostWei;
      estimates.push({
        category: row.category,
        recipientHasCode,
        recipientType: recipientHasCode ? "contract_or_smart_wallet" : "eoa_or_unknown",
        estimationStatus: "ready",
        estimationError: "",
        gasLimit: overrides.gasLimit.toString(),
        maxFeePerGas: overrides.maxFeePerGas.toString(),
        maxPriorityFeePerGas: overrides.maxPriorityFeePerGas.toString(),
        maxUpfrontGasCostWei: maxUpfrontGasCostWei.toString(),
        maxUpfrontGasCostMon: formatEther(maxUpfrontGasCostWei),
      });
    } catch (error) {
      estimates.push({
        category: row.category,
        recipientHasCode,
        recipientType: recipientHasCode ? "contract_or_smart_wallet" : "eoa_or_unknown",
        estimationStatus: "blocked",
        estimationError: error instanceof Error ? error.message : String(error),
        gasLimit: "0",
        maxFeePerGas: "0",
        maxPriorityFeePerGas: "0",
        maxUpfrontGasCostWei: "0",
        maxUpfrontGasCostMon: "0.0",
      });
    }
  }

  return {
    totalMaxGasCostWei,
    totalMaxGasCostMon: formatEther(totalMaxGasCostWei),
    estimatesByCategory: new Map(estimates.map((entry) => [entry.category, entry])),
  };
}

function attachEstimates(rows, estimatesByCategory) {
  return rows.map((row) => ({
    ...row,
    ...(estimatesByCategory.get(row.category) || {
      gasLimit: "0",
      maxFeePerGas: "0",
      maxPriorityFeePerGas: "0",
      maxUpfrontGasCostWei: "0",
      maxUpfrontGasCostMon: "0.0",
    }),
  }));
}

function printSummary({
  mode,
  reportPath,
  outputPath,
  signerAddress,
  signerBalanceMon,
  minRequiredMon,
  bufferMon,
  summary,
  totalMaxGasCostMon,
  totalMaxSpendMon,
  rows,
}) {
  console.log(`Mode: ${mode}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Sender: ${signerAddress}`);
  console.log(`Sender balance: ${signerBalanceMon} MON`);
  console.log(`Minimum target from report: ${minRequiredMon} MON`);
  console.log(`Extra buffer per wallet: ${bufferMon} MON`);
  console.log(`Wallets checked: ${summary.entryCount}`);
  console.log(`Already at target: ${summary.fundedCount}`);
  console.log(`Need top-up: ${summary.needsTopUpCount}`);
  console.log(`Fundable now: ${summary.fundableCount}`);
  console.log(`Blocked recipients: ${summary.blockedCount}`);
  console.log(`Total MON needed: ${summary.totalTransferMon} MON`);
  console.log(`Fundable MON now: ${summary.fundableTransferMon} MON`);
  console.log(`Blocked MON: ${summary.blockedTransferMon} MON`);
  console.log(`Total max gas cap: ${totalMaxGasCostMon} MON`);
  console.log(`Total max spend: ${totalMaxSpendMon} MON`);

  if (summary.needsTopUpCount === 0) {
    console.log("All holders already meet the funding target.");
    return;
  }

  console.log("");
  console.log("Planned top-ups:");

  for (const row of rows.filter((entry) => BigInt(entry.transferWei) > 0n)) {
    const parts = [
      `- ${row.category}`,
      `${row.currentHolder}`,
      `live=${row.liveNativeBalanceMon} MON`,
      `send=${row.transferMon} MON`,
      `target=${row.targetBalanceMon} MON`,
    ];

    if (row.estimationStatus === "blocked") {
      parts.push(`status=BLOCKED`);
      parts.push(`recipientType=${row.recipientType}`);
    }

    console.log(parts.join(" | "));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const report = loadGasAuditReport(options.reportPath);
  const liveBalanceByHolder = await collectLiveNativeBalances(report.rows);
  const baseRows = buildTopUpRows({
    rows: report.rows,
    minRequiredWei: report.minRequiredWei,
    bufferWei: options.bufferWei,
    liveBalanceByHolder,
  });
  const { signer, ethers } = await getSigner();
  const signerBalanceWei = await ethers.provider.getBalance(signer.address);
  const gasEstimates = await estimateTopUpTransactions({
    signer,
    rows: baseRows,
  });
  const rows = attachEstimates(baseRows, gasEstimates.estimatesByCategory);
  const summary = summarizeTopUpRows(rows);
  const totalMaxSpendWei =
    BigInt(summary.fundableTransferWei) + gasEstimates.totalMaxGasCostWei;
  const totalMaxSpendMon = formatEther(totalMaxSpendWei);

  if (signerBalanceWei < totalMaxSpendWei) {
    throw new Error(
      [
        "Admin signer balance is lower than the total planned MON top-up plus max gas cap.",
        `Balance: ${formatEther(signerBalanceWei)} MON.`,
        `Required: ${totalMaxSpendMon} MON.`,
      ].join(" ")
    );
  }

  const output = {
    generatedAt: new Date().toISOString(),
    reportPath: report.sourcePath,
    outputPath: options.outputPath,
    sender: signer.address,
    senderBalanceWei: signerBalanceWei.toString(),
    senderBalanceMon: formatEther(signerBalanceWei),
    minRequiredWei: report.minRequiredWei.toString(),
    minRequiredMon: report.minRequiredMon,
    bufferWei: options.bufferWei.toString(),
    bufferMon: formatEther(options.bufferWei),
    totalMaxGasCostWei: gasEstimates.totalMaxGasCostWei.toString(),
    totalMaxGasCostMon: gasEstimates.totalMaxGasCostMon,
    totalMaxSpendWei: totalMaxSpendWei.toString(),
    totalMaxSpendMon,
    ...summary,
    rows,
  };

  fs.writeFileSync(options.outputPath, `${JSON.stringify(output, null, 2)}\n`);

  printSummary({
    mode: options.execute ? "execute" : "dry-run",
    reportPath: report.sourcePath,
    outputPath: options.outputPath,
    signerAddress: signer.address,
    signerBalanceMon: formatEther(signerBalanceWei),
    minRequiredMon: report.minRequiredMon,
    bufferMon: formatEther(options.bufferWei),
    summary,
    totalMaxGasCostMon: gasEstimates.totalMaxGasCostMon,
    totalMaxSpendMon,
    rows,
  });

  if (!options.execute || summary.needsTopUpCount === 0) {
    return;
  }

  if (summary.blockedCount > 0 && !options.skipBlocked) {
    throw new Error(
      [
        "Refusing live top-ups while blocked recipients remain in the plan.",
        `Blocked recipients: ${summary.blockedCount}.`,
        "Inspect the generated top-up plan and resolve those addresses first, or rerun with --skip-blocked to fund only the clean recipients.",
      ].join(" ")
    );
  }

  const executableRows = rows.filter(
    (entry) =>
      BigInt(entry.transferWei) > 0n &&
      (options.skipBlocked ? entry.estimationStatus !== "blocked" : true)
  );

  if (options.skipBlocked && summary.blockedCount > 0) {
    console.log("");
    console.log(`Skipping ${summary.blockedCount} blocked recipients during execution.`);
  }

  for (const row of executableRows) {
    console.log("");
    console.log(`Funding ${row.category}: ${row.transferMon} MON -> ${row.currentHolder}`);

    await sendSignerTransaction(signer, {
      to: row.currentHolder,
      value: BigInt(row.transferWei),
    });

    const updatedBalance = await ethers.provider.getBalance(row.currentHolder);
    console.log(`Recipient balance: ${formatEther(updatedBalance)} MON`);
  }
}

const entryFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === entryFilePath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  attachEstimates,
  buildDefaultOutputPath,
  buildTopUpRows,
  loadGasAuditReport,
  parseArgs,
  summarizeTopUpRows,
};
