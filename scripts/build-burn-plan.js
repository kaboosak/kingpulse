import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseUnits } from "ethers";

import {
  buildProportionalBurnPlan,
  loadBurnSourcePlan,
  serializeBurnPlan,
} from "./lib/burn-plan.js";

function printHelp() {
  console.log(`Usage: npm run burn:build-plan -- [options]

Options:
  --source <path>          Source vesting/control plan. Defaults to vesting.execution-ready.remaining.json.
  --percent <value>        Burn percentage of the source plan. Defaults to 70.
  --target-amount <value>  Exact burn amount in KPL. Overrides --percent.
  --output <path>          Output burn plan file. Defaults to burn.plan.json.
  --help                   Show this message.

Environment:
  KINGPULSE_BURN_SOURCE_PLAN
  KINGPULSE_BURN_PERCENT
  KINGPULSE_BURN_TARGET_AMOUNT
  KINGPULSE_BURN_PLAN_OUTPUT
`);
}

function parsePercent(value) {
  const normalized = String(value ?? "").trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid --percent value: ${value}`);
  }

  return parseUnits(normalized, 18);
}

function parseArgs(argv, env = process.env) {
  const options = {
    sourcePath: env.KINGPULSE_BURN_SOURCE_PLAN || "vesting.execution-ready.remaining.json",
    percent: env.KINGPULSE_BURN_PERCENT || "70",
    targetAmount: env.KINGPULSE_BURN_TARGET_AMOUNT || "",
    outputPath: env.KINGPULSE_BURN_PLAN_OUTPUT || "burn.plan.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--source") {
      if (!next) {
        throw new Error("--source requires a file path.");
      }

      options.sourcePath = next;
      index += 1;
      continue;
    }

    if (arg === "--percent") {
      if (!next) {
        throw new Error("--percent requires a numeric value.");
      }

      options.percent = next;
      index += 1;
      continue;
    }

    if (arg === "--target-amount") {
      if (!next) {
        throw new Error("--target-amount requires a numeric value.");
      }

      options.targetAmount = next;
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

  return {
    help: false,
    sourcePath: path.resolve(process.cwd(), options.sourcePath),
    outputPath: path.resolve(process.cwd(), options.outputPath),
    percent: String(options.percent ?? "").trim(),
    targetAmount: String(options.targetAmount ?? "").trim(),
  };
}

function resolveTargetRawAmount(sourceEntries, options) {
  if (options.targetAmount) {
    return parseUnits(options.targetAmount, 18);
  }

  const totalSourceRawAmount = sourceEntries.reduce(
    (sum, entry) => sum + parseUnits(entry.amountDisplay, 18),
    0n
  );
  const scaledPercent = parsePercent(options.percent);

  return (totalSourceRawAmount * scaledPercent) / 10n ** 20n;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const sourceEntries = loadBurnSourcePlan(options.sourcePath);
  const targetRawAmount = resolveTargetRawAmount(sourceEntries, options);
  const plan = buildProportionalBurnPlan({
    sourceEntries,
    targetRawAmount,
  });
  const serialized = serializeBurnPlan({
    sourcePlan: options.sourcePath,
    plan,
  });

  fs.writeFileSync(options.outputPath, `${JSON.stringify(serialized, null, 2)}\n`);

  console.log(`Source plan: ${options.sourcePath}`);
  console.log(`Output plan: ${options.outputPath}`);
  console.log(`Entries: ${plan.entryCount}`);
  console.log(`Source amount: ${plan.totalSourceAmount} KPL`);
  console.log(`Target burn amount: ${plan.targetAmount} KPL`);
}

const entryFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === entryFilePath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { parseArgs, resolveTargetRawAmount };
