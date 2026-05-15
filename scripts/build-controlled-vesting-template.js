import fs from "node:fs";
import path from "node:path";

import { getAddress, isAddress } from "ethers";

import { loadDistributionPlan } from "./lib/distribution.js";

function printHelp() {
  console.log(`Usage: npm run vesting:controlled-template -- [options]

Options:
  --known-file <path>    Controlled address file. Defaults to controlled.addresses.txt.
  --input <path>         Distribution/snapshot JSON file. Defaults to distribution.migration.snapshot.json.
  --output <path>        Vesting JSON output. Defaults to vesting.controlled.template.json.
  --env-output <path>    Placeholder env output. Defaults to controlled.private-keys.template.env.
  --start <iso>          Vesting start time. Defaults to tomorrow 00:00:00Z.
  --duration-days <n>    Default duration for every entry. Defaults to 365.
  --help                 Show this message.

Environment:
  KINGPULSE_CONTROLLED_ADDRESSES_FILE
  KINGPULSE_SNAPSHOT_OUTPUT
  KINGPULSE_CONTROLLED_VESTING_TEMPLATE_OUTPUT
  KINGPULSE_CONTROLLED_VESTING_ENV_OUTPUT
  KINGPULSE_CONTROLLED_VESTING_START
  KINGPULSE_CONTROLLED_VESTING_DURATION_DAYS
`);
}

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

function normalizeAddress(value, label) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (!isAddress(normalized)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return getAddress(normalized);
}

function defaultStartIso() {
  const now = new Date();
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  ));

  return start.toISOString().replace(".000Z", "Z");
}

function parseArgs(argv, env = process.env) {
  const options = {
    knownFile: env.KINGPULSE_CONTROLLED_ADDRESSES_FILE || "controlled.addresses.txt",
    distributionFile: env.KINGPULSE_SNAPSHOT_OUTPUT || "distribution.migration.snapshot.json",
    outputPath:
      env.KINGPULSE_CONTROLLED_VESTING_TEMPLATE_OUTPUT ||
      "vesting.controlled.template.json",
    envOutputPath:
      env.KINGPULSE_CONTROLLED_VESTING_ENV_OUTPUT ||
      "controlled.private-keys.template.env",
    start: env.KINGPULSE_CONTROLLED_VESTING_START || defaultStartIso(),
    durationDays:
      env.KINGPULSE_CONTROLLED_VESTING_DURATION_DAYS || "365",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--known-file") {
      options.knownFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--input") {
      options.distributionFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputPath = next || "";
      index += 1;
      continue;
    }

    if (arg === "--env-output") {
      options.envOutputPath = next || "";
      index += 1;
      continue;
    }

    if (arg === "--start") {
      options.start = next || "";
      index += 1;
      continue;
    }

    if (arg === "--duration-days") {
      options.durationDays = next || "";
      index += 1;
      continue;
    }

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.knownFile) {
    throw new Error(
      "Controlled address file is required. Pass --known-file or set KINGPULSE_CONTROLLED_ADDRESSES_FILE."
    );
  }

  if (!options.distributionFile) {
    throw new Error(
      "Distribution file is required. Pass --input or set KINGPULSE_SNAPSHOT_OUTPUT."
    );
  }

  return {
    help: false,
    knownFile: path.resolve(process.cwd(), options.knownFile),
    distributionFile: options.distributionFile,
    outputPath: path.resolve(process.cwd(), options.outputPath),
    envOutputPath: path.resolve(process.cwd(), options.envOutputPath),
    start: options.start,
    durationDays: parsePositiveInteger(options.durationDays, "duration days"),
  };
}

function loadControlledAddresses(knownFile) {
  if (!fs.existsSync(knownFile)) {
    throw new Error(`Controlled address file not found: ${knownFile}`);
  }

  const seen = new Set();
  const lines = fs
    .readFileSync(knownFile, "utf8")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry && !entry.startsWith("#"));

  const addresses = [];

  for (const [index, entry] of lines.entries()) {
    const address = normalizeAddress(entry, `controlled address line #${index + 1}`);

    if (seen.has(address)) {
      continue;
    }

    seen.add(address);
    addresses.push(address);
  }

  if (addresses.length === 0) {
    throw new Error(`Controlled address file ${knownFile} does not contain any addresses.`);
  }

  return addresses;
}

function buildTemplateEntries({ addresses, distribution, start, durationDays }) {
  const allocationMap = new Map(
    distribution.allocations.map((entry) => [entry.recipient, entry.amount])
  );
  const padWidth = Math.max(2, String(addresses.length).length);

  const rawEntries = addresses.map((address, index) => {
    const amount = allocationMap.get(address);

    if (amount === undefined) {
      throw new Error(
        `Controlled address ${address} was not found in ${distribution.sourcePath}.`
      );
    }

    const suffix = String(index + 1).padStart(padWidth, "0");
    const envName = `CONTROLLED_HOLDER_${suffix}_PRIVATE_KEY`;

    return {
      category: `controlled_holder_${suffix}`,
      current_holder: address,
      beneficiary: address,
      signerKeyEnv: envName,
      start,
      durationDays,
      policy:
        "Placeholder generated from controlled.addresses.txt and the migration snapshot. Review beneficiary, start date, duration, and whether this holder should instead be consolidated before live execution.",
      _rawAmount: amount,
    };
  });

  return {
    totalRawAmount: rawEntries.reduce((sum, entry) => sum + entry._rawAmount, 0n),
    entries: rawEntries.map((entry) => ({
      category: entry.category,
      current_holder: entry.current_holder,
      beneficiary: entry.beneficiary,
      amount: formatDisplayAmount(entry._rawAmount),
      start: entry.start,
      durationDays: entry.durationDays,
      signerKeyEnv: entry.signerKeyEnv,
      policy: entry.policy,
    })),
  };
}

function formatDisplayAmount(amount) {
  const raw = amount.toString();

  if (raw === "0") {
    return "0";
  }

  const negative = raw.startsWith("-");
  const normalized = negative ? raw.slice(1) : raw;
  const padded = normalized.padStart(19, "0");
  const whole = padded.slice(0, -18).replace(/^0+/, "") || "0";
  const fraction = padded.slice(-18).replace(/0+$/, "");
  const formatted = fraction ? `${whole}.${fraction}` : whole;

  return negative ? `-${formatted}` : formatted;
}

function buildEnvTemplate(entries) {
  return entries
    .map(
      (entry) =>
        [
          `# ${entry.category} | ${entry.current_holder} | ${entry.amount} KPL`,
          `${entry.signerKeyEnv}=`,
        ].join("\n")
    )
    .join("\n\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const addresses = loadControlledAddresses(options.knownFile);
  const distribution = loadDistributionPlan(options.distributionFile);
  const result = buildTemplateEntries({
    addresses,
    distribution,
    start: options.start,
    durationDays: options.durationDays,
  });

  fs.writeFileSync(options.outputPath, `${JSON.stringify(result.entries, null, 2)}\n`);
  fs.writeFileSync(options.envOutputPath, `${buildEnvTemplate(result.entries)}\n`);

  console.log(`Controlled address file: ${options.knownFile}`);
  console.log(`Distribution file: ${distribution.sourcePath}`);
  console.log(`Template entries: ${result.entries.length}`);
  console.log(`Template total amount: ${formatDisplayAmount(result.totalRawAmount)} KPL`);
  console.log(`Default start: ${options.start}`);
  console.log(`Default duration: ${options.durationDays} days`);
  console.log("");
  console.log(`Wrote vesting template: ${options.outputPath}`);
  console.log(`Wrote env template: ${options.envOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
