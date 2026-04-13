import fs from "node:fs";
import path from "node:path";

import { getAddress, parseUnits } from "ethers";

function normalizeAddress(value, label) {
  try {
    return getAddress(String(value ?? "").trim());
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function normalizeAmount(value, label) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  const parsed = parseUnits(normalized, 18);

  if (parsed <= 0n) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return {
    display: normalized,
    wei: parsed.toString(),
  };
}

function normalizeDurationDays(value) {
  const normalized = String(value ?? "").trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`durationDays must be a non-negative integer. Received: ${value}`);
  }

  return normalized;
}

function normalizeSignerKeyEnv(value, category) {
  const normalized = String(value ?? "").trim();

  if (!/^[A-Z0-9_]+$/.test(normalized)) {
    throw new Error(
      `Invalid signerKeyEnv for ${category}: ${value}. Use an uppercase environment variable name.`
    );
  }

  return normalized;
}

function loadVestingPlan(planFile) {
  const sourcePath = path.resolve(process.cwd(), planFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Vesting plan file not found: ${sourcePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Vesting plan ${sourcePath} must contain a non-empty JSON array.`);
  }

  return raw.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Vesting plan entry #${index + 1} must be an object.`);
    }

    const category = String(entry.category ?? "").trim();

    if (!category) {
      throw new Error(`Vesting plan entry #${index + 1} is missing category.`);
    }

    const amount = normalizeAmount(entry.amount, `amount for ${category}`);

    return {
      category,
      currentHolder: normalizeAddress(entry.current_holder, `current_holder for ${category}`),
      beneficiary: normalizeAddress(entry.beneficiary, `beneficiary for ${category}`),
      amountDisplay: amount.display,
      amountWei: amount.wei,
      start: String(entry.start ?? "").trim(),
      durationDays: normalizeDurationDays(entry.durationDays),
      signerKeyEnv: normalizeSignerKeyEnv(entry.signerKeyEnv, category),
      policy: String(entry.policy ?? "").trim(),
    };
  });
}

function printTsv(planFile) {
  const rows = loadVestingPlan(planFile);

  for (const row of rows) {
    console.log(
      [
        row.category,
        row.currentHolder,
        row.beneficiary,
        row.amountDisplay,
        row.amountWei,
        row.start,
        row.durationDays,
        row.signerKeyEnv,
        row.policy.replaceAll("\t", " "),
      ].join("\t")
    );
  }
}

if (process.argv[2] === "--tsv") {
  printTsv(process.argv[3] || "vesting.recommended.json");
}

export { loadVestingPlan };
