import fs from "node:fs";
import path from "node:path";

import { formatUnits, getAddress, isAddress, parseUnits } from "ethers";

import { loadVestingPlan } from "./vesting-plan.js";

function parseNonNegativeTokenAmount(value, label) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  const parsed = parseUnits(normalized, 18);

  if (parsed < 0n) {
    throw new Error(`${label} must be non-negative.`);
  }

  return {
    display: normalized,
    raw: parsed,
  };
}

function normalizeAddress(value, label) {
  const normalized = String(value ?? "").trim();

  if (!isAddress(normalized)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return getAddress(normalized);
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

function buildProportionalBurnPlan({ sourceEntries, targetRawAmount }) {
  if (!Array.isArray(sourceEntries) || sourceEntries.length === 0) {
    throw new Error("sourceEntries must be a non-empty array.");
  }

  if (typeof targetRawAmount !== "bigint" || targetRawAmount <= 0n) {
    throw new Error("targetRawAmount must be a positive bigint.");
  }

  const normalized = sourceEntries.map((entry, index) => ({
    index,
    category: entry.category,
    currentHolder: entry.currentHolder,
    beneficiary: entry.beneficiary,
    holderRawAmount: parseUnits(entry.amountDisplay, 18),
    holderAmount: entry.amountDisplay,
    signerKeyEnv: entry.signerKeyEnv,
    policy: entry.policy,
  }));

  const totalSourceRawAmount = normalized.reduce(
    (sum, entry) => sum + entry.holderRawAmount,
    0n
  );

  if (targetRawAmount > totalSourceRawAmount) {
    throw new Error(
      [
        "Target burn amount exceeds the source amount available in the selected plan.",
        `Target: ${formatUnits(targetRawAmount, 18)} KPL.`,
        `Available: ${formatUnits(totalSourceRawAmount, 18)} KPL.`,
      ].join(" ")
    );
  }

  const provisional = normalized.map((entry) => {
    const scaled = entry.holderRawAmount * targetRawAmount;
    const burnRawAmount = scaled / totalSourceRawAmount;
    const remainder = scaled % totalSourceRawAmount;

    return {
      ...entry,
      burnRawAmount,
      remainder,
    };
  });

  const provisionalTotal = provisional.reduce(
    (sum, entry) => sum + entry.burnRawAmount,
    0n
  );
  const remainingWei = targetRawAmount - provisionalTotal;

  const ranked = [...provisional]
    .filter((entry) => entry.holderRawAmount > entry.burnRawAmount)
    .sort((left, right) => {
      if (left.remainder === right.remainder) {
        return left.index - right.index;
      }

      return left.remainder > right.remainder ? -1 : 1;
    });

  if (remainingWei > BigInt(ranked.length)) {
    throw new Error(
      [
        "Unable to distribute the requested exact burn amount across the selected holders.",
        `Unallocated delta: ${remainingWei} wei.`,
        `Eligible holders: ${ranked.length}.`,
      ].join(" ")
    );
  }

  for (let index = 0; index < Number(remainingWei); index += 1) {
    ranked[index].burnRawAmount += 1n;
  }

  const entries = provisional.map((entry) => {
    const retainedRawAmount = entry.holderRawAmount - entry.burnRawAmount;

    return {
      category: entry.category,
      current_holder: entry.currentHolder,
      beneficiary: entry.beneficiary,
      holderAmount: formatUnits(entry.holderRawAmount, 18),
      burnAmount: formatUnits(entry.burnRawAmount, 18),
      retainedAmount: formatUnits(retainedRawAmount, 18),
      signerKeyEnv: entry.signerKeyEnv,
      policy: entry.policy,
    };
  });

  const totalBurnRawAmount = entries.reduce(
    (sum, entry) => sum + parseUnits(entry.burnAmount, 18),
    0n
  );

  return {
    entryCount: entries.length,
    totalSourceRawAmount,
    totalSourceAmount: formatUnits(totalSourceRawAmount, 18),
    targetRawAmount,
    targetAmount: formatUnits(targetRawAmount, 18),
    totalBurnRawAmount,
    totalBurnAmount: formatUnits(totalBurnRawAmount, 18),
    entries,
  };
}

function serializeBurnPlan({ sourcePlan, plan }) {
  return {
    generatedAt: new Date().toISOString(),
    sourcePlan,
    entryCount: plan.entryCount,
    totalSourceAmount: plan.totalSourceAmount,
    targetBurnAmount: plan.targetAmount,
    entries: plan.entries,
  };
}

function loadBurnSourcePlan(planFile) {
  return loadVestingPlan(planFile);
}

function loadBurnPlan(planFile) {
  const sourcePath = path.resolve(process.cwd(), planFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Burn plan file not found: ${sourcePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const entries = Array.isArray(raw) ? raw : raw.entries;

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`Burn plan ${sourcePath} must contain a non-empty entries array.`);
  }

  const normalizedEntries = entries.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Burn plan entry #${index + 1} must be an object.`);
    }

    const category = String(entry.category ?? "").trim();

    if (!category) {
      throw new Error(`Burn plan entry #${index + 1} is missing category.`);
    }

    const holderAmount = parseNonNegativeTokenAmount(
      entry.holderAmount,
      `holderAmount for ${category}`
    );
    const burnAmount = parseNonNegativeTokenAmount(
      entry.burnAmount,
      `burnAmount for ${category}`
    );
    const retainedAmount = parseNonNegativeTokenAmount(
      entry.retainedAmount,
      `retainedAmount for ${category}`
    );

    if (holderAmount.raw !== burnAmount.raw + retainedAmount.raw) {
      throw new Error(
        `Burn plan entry ${category} does not reconcile holderAmount = burnAmount + retainedAmount.`
      );
    }

    return {
      category,
      currentHolder: normalizeAddress(entry.current_holder, `current_holder for ${category}`),
      beneficiary: normalizeAddress(entry.beneficiary, `beneficiary for ${category}`),
      holderAmountDisplay: holderAmount.display,
      holderRawAmount: holderAmount.raw,
      burnAmountDisplay: burnAmount.display,
      burnRawAmount: burnAmount.raw,
      retainedAmountDisplay: retainedAmount.display,
      retainedRawAmount: retainedAmount.raw,
      signerKeyEnv: normalizeSignerKeyEnv(entry.signerKeyEnv, category),
      policy: String(entry.policy ?? "").trim(),
    };
  });

  const totalBurnRawAmount = normalizedEntries.reduce(
    (sum, entry) => sum + entry.burnRawAmount,
    0n
  );

  return {
    sourcePath,
    generatedAt: raw.generatedAt || "",
    sourcePlan: raw.sourcePlan || "",
    targetBurnAmount: raw.targetBurnAmount || formatUnits(totalBurnRawAmount, 18),
    entries: normalizedEntries,
    totalBurnRawAmount,
    totalBurnAmount: formatUnits(totalBurnRawAmount, 18),
  };
}

export {
  buildProportionalBurnPlan,
  loadBurnPlan,
  loadBurnSourcePlan,
  serializeBurnPlan,
};
