import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { Wallet, formatUnits, getAddress, isAddress } from "ethers";

import { loadDistributionPlan } from "./lib/distribution.js";
import { loadVestingPlan } from "./lib/vesting-plan.js";

function printHelp() {
  console.log(`Usage: npm run holders:unclassified -- [options]

Options:
  --input <path>          Snapshot/distribution JSON file. Defaults to distribution.migration.snapshot.json.
  --plan <path>           Vesting plan JSON file. Defaults to vesting.recommended.json.
  --output <path>         Output report JSON file. Defaults to vesting.unclassified.report.json.
  --top <n>               Number of largest unclassified holders to include. Defaults to 25.
  --env-file <path>       Env file used to derive key-backed wallet addresses. Defaults to .env.
  --known-address <addr>  Additional address to treat as controlled. Repeatable.
  --known-file <path>     File containing additional controlled addresses (JSON array or newline text).
  --help                  Show this message.

Environment:
  KINGPULSE_SNAPSHOT_OUTPUT
  KINGPULSE_VESTING_PLAN_FILE
  KINGPULSE_UNCLASSIFIED_REPORT_OUTPUT
  KINGPULSE_UNCLASSIFIED_TOP
  KINGPULSE_CONTROLLED_ADDRESSES
  KINGPULSE_CONTROLLED_ADDRESSES_FILE
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

function parseKnownAddressesEnv(value) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => normalizeAddress(entry, `controlled address #${index + 1}`));
}

function parseArgs(argv, env = process.env) {
  const options = {
    distributionFile: env.KINGPULSE_SNAPSHOT_OUTPUT || "distribution.migration.snapshot.json",
    vestingPlanFile: env.KINGPULSE_VESTING_PLAN_FILE || "vesting.recommended.json",
    outputPath:
      env.KINGPULSE_UNCLASSIFIED_REPORT_OUTPUT || "vesting.unclassified.report.json",
    topCount: env.KINGPULSE_UNCLASSIFIED_TOP || "25",
    envFile: ".env",
    knownAddresses: parseKnownAddressesEnv(env.KINGPULSE_CONTROLLED_ADDRESSES),
    knownFile: env.KINGPULSE_CONTROLLED_ADDRESSES_FILE || "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input") {
      options.distributionFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--plan") {
      options.vestingPlanFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputPath = next || "";
      index += 1;
      continue;
    }

    if (arg === "--top") {
      options.topCount = next || "";
      index += 1;
      continue;
    }

    if (arg === "--env-file") {
      options.envFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--known-address") {
      options.knownAddresses.push(
        normalizeAddress(next, `controlled address passed after ${arg}`)
      );
      index += 1;
      continue;
    }

    if (arg === "--known-file") {
      options.knownFile = next || "";
      index += 1;
      continue;
    }

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.distributionFile) {
    throw new Error("Distribution file is required. Pass --input or set KINGPULSE_SNAPSHOT_OUTPUT.");
  }

  if (!options.vestingPlanFile) {
    throw new Error("Vesting plan file is required. Pass --plan or set KINGPULSE_VESTING_PLAN_FILE.");
  }

  return {
    help: false,
    distributionFile: options.distributionFile,
    vestingPlanFile: options.vestingPlanFile,
    outputPath: path.resolve(process.cwd(), options.outputPath),
    topCount: parsePositiveInteger(options.topCount, "top count"),
    envFile: path.resolve(process.cwd(), options.envFile),
    knownAddresses: options.knownAddresses,
    knownFile: options.knownFile ? path.resolve(process.cwd(), options.knownFile) : "",
  };
}

function isPrivateKeyEnv(key, value) {
  const normalizedKey = String(key ?? "").trim();
  const normalizedValue = String(value ?? "").replace(/^0x/, "").trim();

  if (!(normalizedKey === "PRIVATE_KEY" || normalizedKey.endsWith("_PRIVATE_KEY"))) {
    return false;
  }

  return /^[0-9a-fA-F]{64}$/.test(normalizedValue);
}

function loadEnvConfig(envFile) {
  if (!fs.existsSync(envFile)) {
    return {};
  }

  return dotenv.parse(fs.readFileSync(envFile, "utf8"));
}

function collectKeyBackedAddresses(envConfig) {
  const grouped = new Map();

  for (const [key, value] of Object.entries(envConfig)) {
    if (!isPrivateKeyEnv(key, value)) {
      continue;
    }

    const address = new Wallet(
      `0x${String(value).replace(/^0x/, "").trim()}`
    ).address;
    const normalizedAddress = getAddress(address);
    const current = grouped.get(normalizedAddress);

    if (current) {
      current.sources.push(key);
      continue;
    }

    grouped.set(normalizedAddress, {
      address: normalizedAddress,
      sources: [key],
    });
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.address.localeCompare(right.address)
  );
}

function loadKnownAddressesFromFile(knownFile) {
  if (!knownFile) {
    return [];
  }

  if (!fs.existsSync(knownFile)) {
    throw new Error(`Controlled address file not found: ${knownFile}`);
  }

  const raw = fs.readFileSync(knownFile, "utf8").trim();

  if (!raw) {
    return [];
  }

  if (raw.startsWith("[")) {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error(`Controlled address file ${knownFile} must contain a JSON array.`);
    }

    return parsed.map((entry, index) =>
      normalizeAddress(
        typeof entry === "string" ? entry : entry?.address,
        `controlled address file entry #${index + 1}`
      )
    );
  }

  return raw
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry && !entry.startsWith("#"))
    .map((entry, index) =>
      normalizeAddress(entry, `controlled address file line #${index + 1}`)
    );
}

function formatPercent(numerator, denominator, decimals = 4) {
  if (denominator === 0n) {
    return "0";
  }

  const scale = 10n ** BigInt(decimals);
  const scaled = (numerator * 100n * scale) / denominator;
  const whole = scaled / scale;
  const fraction = (scaled % scale).toString().padStart(decimals, "0").replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function sumRawAmounts(entries) {
  return entries.reduce((sum, entry) => sum + entry.amount, 0n);
}

function buildRecipientRecord(entry, totalAmount, reason) {
  return {
    recipient: entry.recipient,
    amount: formatUnits(entry.amount, 18),
    rawAmount: entry.amount.toString(),
    shareOfDistributionPercent: formatPercent(entry.amount, totalAmount),
    reason,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const distribution = loadDistributionPlan(options.distributionFile);
  const vestingPlan = loadVestingPlan(options.vestingPlanFile);
  const fileEnv = loadEnvConfig(options.envFile);
  const mergedEnv = { ...fileEnv, ...process.env };
  const keyBackedAddresses = collectKeyBackedAddresses(mergedEnv);
  const knownAddresses = Array.from(
    new Set([
      ...options.knownAddresses,
      ...loadKnownAddressesFromFile(options.knownFile),
    ])
  ).sort((left, right) => left.localeCompare(right));
  const knownAddressSet = new Set(knownAddresses);
  const keyBackedAddressSet = new Set(keyBackedAddresses.map((entry) => entry.address));
  const vestingHolderSet = new Set(vestingPlan.map((entry) => entry.currentHolder));
  const vestingAmountByHolder = new Map();

  for (const entry of vestingPlan) {
    const current = vestingAmountByHolder.get(entry.currentHolder) || 0n;
    vestingAmountByHolder.set(entry.currentHolder, current + BigInt(entry.amountWei));
  }

  const planned = [];
  const keyBackedOnly = [];
  const knownOnly = [];
  const unclassified = [];

  for (const entry of distribution.allocations) {
    if (vestingHolderSet.has(entry.recipient)) {
      planned.push(
        buildRecipientRecord(entry, distribution.total, {
          type: "planned_vesting_holder",
          plannedAmount: formatUnits(vestingAmountByHolder.get(entry.recipient) || 0n, 18),
        })
      );
      continue;
    }

    if (knownAddressSet.has(entry.recipient)) {
      knownOnly.push(
        buildRecipientRecord(entry, distribution.total, { type: "known_manual_address" })
      );
      continue;
    }

    if (keyBackedAddressSet.has(entry.recipient)) {
      const keyBacked = keyBackedAddresses.find((item) => item.address === entry.recipient);
      keyBackedOnly.push(
        buildRecipientRecord(entry, distribution.total, {
          type: "key_backed_only",
          sources: keyBacked?.sources || [],
        })
      );
      continue;
    }

    unclassified.push(
      buildRecipientRecord(entry, distribution.total, { type: "unclassified" })
    );
  }

  const plannedRawAmount = vestingPlan.reduce(
    (sum, entry) => sum + BigInt(entry.amountWei),
    0n
  );
  const classifiedDistributionRawAmount =
    sumRawAmounts(planned.map((entry) => ({ amount: BigInt(entry.rawAmount) }))) +
    sumRawAmounts(keyBackedOnly.map((entry) => ({ amount: BigInt(entry.rawAmount) }))) +
    sumRawAmounts(knownOnly.map((entry) => ({ amount: BigInt(entry.rawAmount) })));
  const unclassifiedRawAmount = sumRawAmounts(
    unclassified.map((entry) => ({ amount: BigInt(entry.rawAmount) }))
  );
  const topUnclassified = unclassified.slice(0, options.topCount);

  const report = {
    generatedAt: new Date().toISOString(),
    distributionFile: path.relative(process.cwd(), distribution.sourcePath),
    vestingPlanFile: path.relative(process.cwd(), path.resolve(process.cwd(), options.vestingPlanFile)),
    envFile: path.relative(process.cwd(), options.envFile),
    distribution: {
      recipientCount: distribution.allocations.length,
      totalAmount: formatUnits(distribution.total, 18),
      totalRawAmount: distribution.total.toString(),
    },
    keyBackedAddresses,
    knownManualAddresses: knownAddresses,
    vestingPlan: {
      holderCount: vestingHolderSet.size,
      categoryCount: vestingPlan.length,
      totalAmount: formatUnits(plannedRawAmount, 18),
      totalRawAmount: plannedRawAmount.toString(),
    },
    classification: {
      plannedHolderRecipientCount: planned.length,
      plannedHolderDistributionAmount: formatUnits(
        sumRawAmounts(planned.map((entry) => ({ amount: BigInt(entry.rawAmount) }))),
        18
      ),
      keyBackedOnlyRecipientCount: keyBackedOnly.length,
      keyBackedOnlyDistributionAmount: formatUnits(
        sumRawAmounts(keyBackedOnly.map((entry) => ({ amount: BigInt(entry.rawAmount) }))),
        18
      ),
      knownManualRecipientCount: knownOnly.length,
      knownManualDistributionAmount: formatUnits(
        sumRawAmounts(knownOnly.map((entry) => ({ amount: BigInt(entry.rawAmount) }))),
        18
      ),
      classifiedRecipientCount: planned.length + keyBackedOnly.length + knownOnly.length,
      classifiedDistributionAmount: formatUnits(classifiedDistributionRawAmount, 18),
      classifiedDistributionPercent: formatPercent(
        classifiedDistributionRawAmount,
        distribution.total
      ),
      unclassifiedRecipientCount: unclassified.length,
      unclassifiedDistributionAmount: formatUnits(unclassifiedRawAmount, 18),
      unclassifiedDistributionPercent: formatPercent(
        unclassifiedRawAmount,
        distribution.total
      ),
    },
    topUnclassified,
  };

  fs.writeFileSync(options.outputPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Distribution file: ${distribution.sourcePath}`);
  console.log(`Vesting plan: ${path.resolve(process.cwd(), options.vestingPlanFile)}`);
  console.log(`Distribution recipients: ${distribution.allocations.length}`);
  console.log(`Distribution total: ${formatUnits(distribution.total, 18)} KPL`);
  console.log(`Planned vesting total: ${formatUnits(plannedRawAmount, 18)} KPL`);
  console.log(
    `Classified distribution coverage: ${report.classification.classifiedDistributionAmount} KPL (${report.classification.classifiedDistributionPercent}%)`
  );
  console.log(
    `Unclassified distribution coverage gap: ${report.classification.unclassifiedDistributionAmount} KPL (${report.classification.unclassifiedDistributionPercent}%)`
  );
  console.log(`Key-backed addresses detected: ${keyBackedAddresses.length}`);
  console.log(`Top unclassified holders listed: ${topUnclassified.length}`);
  console.log("");
  console.log(`Wrote report: ${options.outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
