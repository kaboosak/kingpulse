import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatUnits, parseUnits } from "ethers";

import { loadVestingPlan } from "./lib/vesting-plan.js";

function printHelp() {
  console.log(`Usage: npm run vesting:resume -- [options]

Options:
  --plan <path>      Input vesting plan file. Defaults to vesting.execution-ready.template.json.
  --results <path>   Results log from a prior execute run. Defaults to vesting.batch.results.log.
  --output <path>    Output remaining-plan file. Defaults to vesting.execution-ready.remaining.json.
  --help             Show this message.

Environment:
  KINGPULSE_VESTING_RESUME_PLAN
  KINGPULSE_VESTING_RESULTS_FILE
  KINGPULSE_VESTING_RESUME_OUTPUT
`);
}

function parseArgs(argv, env = process.env) {
  const options = {
    planPath:
      env.KINGPULSE_VESTING_RESUME_PLAN ||
      env.KINGPULSE_VESTING_PLAN_FILE ||
      "vesting.execution-ready.template.json",
    resultsPath: env.KINGPULSE_VESTING_RESULTS_FILE || "vesting.batch.results.log",
    outputPath:
      env.KINGPULSE_VESTING_RESUME_OUTPUT || "vesting.execution-ready.remaining.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--plan") {
      if (!next) {
        throw new Error("--plan requires a file path.");
      }

      options.planPath = next;
      index += 1;
      continue;
    }

    if (arg === "--results") {
      if (!next) {
        throw new Error("--results requires a file path.");
      }

      options.resultsPath = next;
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
    planPath: path.resolve(process.cwd(), options.planPath),
    resultsPath: path.resolve(process.cwd(), options.resultsPath),
    outputPath: path.resolve(process.cwd(), options.outputPath),
  };
}

function parseCompletedCategoriesLog(rawLog) {
  const categories = [];

  for (const line of String(rawLog ?? "").split(/\r?\n/u)) {
    if (!line.startsWith("category=")) {
      continue;
    }

    const category = line.slice("category=".length).trim();

    if (!category) {
      throw new Error("Encountered an empty category entry in the vesting results log.");
    }

    categories.push(category);
  }

  if (categories.length === 0) {
    throw new Error("No completed vesting categories were found in the results log.");
  }

  return [...new Set(categories)];
}

function loadCompletedCategories(resultsPath) {
  if (!fs.existsSync(resultsPath)) {
    throw new Error(`Vesting results log not found: ${resultsPath}`);
  }

  return parseCompletedCategoriesLog(fs.readFileSync(resultsPath, "utf8"));
}

function buildRemainingPlan({ planEntries, completedCategories }) {
  const completed = new Set(completedCategories);

  return planEntries.filter((entry) => !completed.has(entry.category));
}

function summarizePlan(entries) {
  const totalRawAmount = entries.reduce(
    (sum, entry) => sum + parseUnits(entry.amountDisplay, 18),
    0n
  );

  return {
    entryCount: entries.length,
    totalRawAmount,
    totalAmount: formatUnits(totalRawAmount, 18),
  };
}

function serializePlan(entries) {
  return entries.map((entry) => ({
    category: entry.category,
    current_holder: entry.currentHolder,
    beneficiary: entry.beneficiary,
    amount: entry.amountDisplay,
    start: entry.start,
    durationDays: Number(entry.durationDays),
    signerKeyEnv: entry.signerKeyEnv,
    policy: entry.policy,
  }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const planEntries = loadVestingPlan(options.planPath);
  const completedCategories = loadCompletedCategories(options.resultsPath);
  const remainingEntries = buildRemainingPlan({ planEntries, completedCategories });
  const completedEntries = planEntries.filter((entry) =>
    completedCategories.includes(entry.category)
  );
  const planSummary = summarizePlan(planEntries);
  const completedSummary = summarizePlan(completedEntries);
  const remainingSummary = summarizePlan(remainingEntries);

  fs.writeFileSync(options.outputPath, `${JSON.stringify(serializePlan(remainingEntries), null, 2)}\n`);

  console.log(`Input plan: ${options.planPath}`);
  console.log(`Results log: ${options.resultsPath}`);
  console.log(`Output plan: ${options.outputPath}`);
  console.log(`Completed categories excluded: ${completedCategories.length}`);
  console.log(`Original entries: ${planSummary.entryCount} (${planSummary.totalAmount} KPL)`);
  console.log(
    `Completed entries: ${completedSummary.entryCount} (${completedSummary.totalAmount} KPL)`
  );
  console.log(
    `Remaining entries: ${remainingSummary.entryCount} (${remainingSummary.totalAmount} KPL)`
  );
}

const entryFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === entryFilePath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildRemainingPlan,
  loadCompletedCategories,
  parseArgs,
  parseCompletedCategoriesLog,
  serializePlan,
  summarizePlan,
};
