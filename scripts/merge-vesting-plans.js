import fs from "node:fs";
import path from "node:path";

import { loadVestingPlan } from "./lib/vesting-plan.js";

function printHelp() {
  console.log(`Usage: npm run vesting:merge -- [options]

Options:
  --input <path>     Input vesting plan file. Repeatable.
  --output <path>    Output merged vesting plan file. Defaults to vesting.execution-ready.template.json.
  --help             Show this message.

Environment:
  KINGPULSE_VESTING_MERGE_OUTPUT
`);
}

function parseArgs(argv, env = process.env) {
  const options = {
    inputs: [],
    outputPath:
      env.KINGPULSE_VESTING_MERGE_OUTPUT ||
      "vesting.execution-ready.template.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input") {
      if (!next) {
        throw new Error("--input requires a file path.");
      }

      options.inputs.push(next);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputPath = next || "";
      index += 1;
      continue;
    }

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.inputs.length === 0) {
    options.inputs.push("vesting.recommended.json", "vesting.controlled.template.json");
  }

  return {
    help: false,
    inputs: options.inputs.map((entry) => path.resolve(process.cwd(), entry)),
    outputPath: path.resolve(process.cwd(), options.outputPath),
  };
}

function loadPlanEntries(inputPath) {
  const plan = loadVestingPlan(inputPath);

  return plan.map((entry) => ({
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

function mergePlans(inputPaths) {
  const seenCategories = new Set();
  const merged = [];

  for (const inputPath of inputPaths) {
    const entries = loadPlanEntries(inputPath);

    for (const entry of entries) {
      if (seenCategories.has(entry.category)) {
        throw new Error(
          `Duplicate vesting category detected while merging plans: ${entry.category}`
        );
      }

      seenCategories.add(entry.category);
      merged.push(entry);
    }
  }

  return merged;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const merged = mergePlans(options.inputs);

  fs.writeFileSync(options.outputPath, `${JSON.stringify(merged, null, 2)}\n`);

  console.log(`Merged input plans: ${options.inputs.length}`);
  console.log(`Merged entries: ${merged.length}`);
  console.log(`Wrote merged plan: ${options.outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
