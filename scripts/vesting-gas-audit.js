import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";
import { formatEther, parseEther } from "ethers";

import { loadVestingPlan } from "./lib/vesting-plan.js";

function buildDefaultOutputPath(planPath) {
  const parsed = path.parse(planPath);
  return path.join(parsed.dir, `${parsed.name}.gas-audit.json`);
}

function printHelp() {
  console.log(`Usage: npm run vesting:gas-audit -- [options]

Options:
  --plan <path>      Input vesting plan file. Defaults to vesting.execution-ready.remaining.json.
  --min-mon <value>  Minimum native MON target per holder. Defaults to 0.15.
  --output <path>    Output report file. Defaults to <plan>.gas-audit.json.
  --help             Show this message.

Environment:
  KINGPULSE_VESTING_PLAN_FILE
  KINGPULSE_VESTING_GAS_MIN_MON
  KINGPULSE_VESTING_GAS_AUDIT_OUTPUT
`);
}

function parseArgs(argv, env = process.env) {
  const defaultPlanPath =
    env.KINGPULSE_VESTING_PLAN_FILE || "vesting.execution-ready.remaining.json";
  const options = {
    planPath: defaultPlanPath,
    minMon: env.KINGPULSE_VESTING_GAS_MIN_MON || "0.15",
    outputPath:
      env.KINGPULSE_VESTING_GAS_AUDIT_OUTPUT || buildDefaultOutputPath(defaultPlanPath),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--plan") {
      if (!next) {
        throw new Error("--plan requires a file path.");
      }

      options.planPath = next;
      if (!env.KINGPULSE_VESTING_GAS_AUDIT_OUTPUT) {
        options.outputPath = buildDefaultOutputPath(next);
      }
      index += 1;
      continue;
    }

    if (arg === "--min-mon") {
      if (!next) {
        throw new Error("--min-mon requires a numeric value.");
      }

      options.minMon = next;
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

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const minRequiredWei = parseEther(String(options.minMon));

  if (minRequiredWei <= 0n) {
    throw new Error("--min-mon must be greater than zero.");
  }

  return {
    help: false,
    planPath: path.resolve(process.cwd(), options.planPath),
    outputPath: path.resolve(process.cwd(), options.outputPath),
    minMon: String(options.minMon),
    minRequiredWei,
  };
}

function buildAuditRows(entries, nativeBalanceByHolder, minRequiredWei) {
  return entries.map((entry) => {
    const balanceWei = nativeBalanceByHolder.get(entry.currentHolder) ?? 0n;
    const funded = balanceWei >= minRequiredWei;
    const shortfallWei = funded ? 0n : minRequiredWei - balanceWei;

    return {
      category: entry.category,
      currentHolder: entry.currentHolder,
      beneficiary: entry.beneficiary,
      amount: entry.amountDisplay,
      signerKeyEnv: entry.signerKeyEnv,
      nativeBalanceWei: balanceWei.toString(),
      nativeBalanceMon: formatEther(balanceWei),
      minRequiredWei: minRequiredWei.toString(),
      minRequiredMon: formatEther(minRequiredWei),
      shortfallWei: shortfallWei.toString(),
      shortfallMon: formatEther(shortfallWei),
      funded,
      status: funded ? "ready" : "needs_mon",
    };
  });
}

function summarizeAuditRows(rows) {
  const fundedRows = rows.filter((row) => row.funded);
  const rowsNeedingFunding = rows.filter((row) => !row.funded);
  const totalShortfallWei = rowsNeedingFunding.reduce(
    (sum, row) => sum + BigInt(row.shortfallWei),
    0n
  );

  return {
    entryCount: rows.length,
    fundedCount: fundedRows.length,
    needsFundingCount: rowsNeedingFunding.length,
    totalShortfallWei: totalShortfallWei.toString(),
    totalShortfallMon: formatEther(totalShortfallWei),
  };
}

async function collectNativeBalances(entries) {
  const connection = await network.connect();
  const { ethers } = connection;
  const uniqueHolders = [...new Set(entries.map((entry) => entry.currentHolder))];

  const balances = await Promise.all(
    uniqueHolders.map(async (holder) => [holder, await ethers.provider.getBalance(holder)])
  );

  return new Map(balances);
}

function printConsoleSummary({ planPath, outputPath, minMon, summary, rows }) {
  console.log(`Plan: ${planPath}`);
  console.log(`Report: ${outputPath}`);
  console.log(`Minimum target per holder: ${minMon} MON`);
  console.log(`Entries checked: ${summary.entryCount}`);
  console.log(`Ready: ${summary.fundedCount}`);
  console.log(`Need MON: ${summary.needsFundingCount}`);
  console.log(`Total shortfall to target: ${summary.totalShortfallMon} MON`);

  if (summary.needsFundingCount === 0) {
    console.log("All holders meet the MON target.");
    return;
  }

  console.log("");
  console.log("Wallets needing MON:");

  for (const row of rows.filter((entry) => !entry.funded)) {
    console.log(
      [
        `- ${row.category}`,
        `${row.currentHolder}`,
        `balance=${row.nativeBalanceMon} MON`,
        `shortfall=${row.shortfallMon} MON`,
        `amount=${row.amount} KPL`,
      ].join(" | ")
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const entries = loadVestingPlan(options.planPath);
  const nativeBalanceByHolder = await collectNativeBalances(entries);
  const rows = buildAuditRows(entries, nativeBalanceByHolder, options.minRequiredWei);
  const summary = summarizeAuditRows(rows);
  const report = {
    generatedAt: new Date().toISOString(),
    planPath: options.planPath,
    outputPath: options.outputPath,
    minRequiredMon: formatEther(options.minRequiredWei),
    minRequiredWei: options.minRequiredWei.toString(),
    ...summary,
    rows,
  };

  fs.writeFileSync(options.outputPath, `${JSON.stringify(report, null, 2)}\n`);

  printConsoleSummary({
    planPath: options.planPath,
    outputPath: options.outputPath,
    minMon: formatEther(options.minRequiredWei),
    summary,
    rows,
  });
}

const entryFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === entryFilePath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildAuditRows,
  buildDefaultOutputPath,
  parseArgs,
  summarizeAuditRows,
};
