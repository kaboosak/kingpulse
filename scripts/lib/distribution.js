import fs from "node:fs";
import path from "node:path";

import { formatUnits } from "ethers";

import { parseAddress, parseTokenAmount } from "./kingpulse.js";

const DEFAULT_MAX_RETAINED_BPS = 2500n;

function loadDistributionPlan(distributionFile) {
  if (!distributionFile) {
    return { allocations: [], total: 0n, sourcePath: "" };
  }

  const sourcePath = path.resolve(process.cwd(), distributionFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Distribution file not found: ${sourcePath}`);
  }

  let rawPlan;
  try {
    rawPlan = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not parse distribution file ${sourcePath}: ${error.message}`
    );
  }

  if (!Array.isArray(rawPlan) || rawPlan.length === 0) {
    throw new Error(
      `Distribution file ${sourcePath} must contain a non-empty JSON array.`
    );
  }

  const seenRecipients = new Set();
  let total = 0n;

  const allocations = rawPlan.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(
        `Distribution entry #${index + 1} must be an object with recipient and amount fields.`
      );
    }

    const recipient = parseAddress(entry.recipient, `distribution recipient #${index + 1}`);
    const amount = parseTokenAmount(String(entry.amount ?? ""));

    if (amount <= 0n) {
      throw new Error(`Distribution amount for ${recipient} must be greater than zero.`);
    }

    if (seenRecipients.has(recipient)) {
      throw new Error(`Duplicate recipient in distribution plan: ${recipient}`);
    }

    seenRecipients.add(recipient);
    total += amount;

    return { recipient, amount };
  });

  return { allocations, total, sourcePath };
}

function parseBasisPoints(value, label) {
  const normalized = String(value ?? "").trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be an integer basis-points value between 0 and 10000.`);
  }

  const parsed = BigInt(normalized);

  if (parsed < 0n || parsed > 10000n) {
    throw new Error(`${label} must be between 0 and 10000 basis points.`);
  }

  return parsed;
}

function getMaxRetainedBps() {
  const configured = process.env.KINGPULSE_MAX_RETAINED_BPS;
  return configured ? parseBasisPoints(configured, "KINGPULSE_MAX_RETAINED_BPS") : DEFAULT_MAX_RETAINED_BPS;
}

function assertRetainedBalanceWithinLimit(retainedBalance, totalSupply) {
  if (totalSupply <= 0n) {
    throw new Error("Total supply must be greater than zero.");
  }

  const maxRetainedBps = getMaxRetainedBps();
  const retainedBps = (retainedBalance * 10000n) / totalSupply;

  if (retainedBps > maxRetainedBps) {
    throw new Error(
      [
        "Launch concentration guard triggered.",
        `Deployer retained ${retainedBps} bps of total supply.`,
        `Maximum allowed is ${maxRetainedBps} bps.`,
        "Provide a broader KINGPULSE_DISTRIBUTION_FILE or raise KINGPULSE_MAX_RETAINED_BPS intentionally.",
      ].join(" ")
    );
  }
}

function assertDeploymentDistributionReady({
  distributionFile,
  networkName,
  totalSupply,
}) {
  const maxRetainedBps = getMaxRetainedBps();

  if (!distributionFile) {
    if (networkName !== "hardhat") {
      throw new Error(
        [
          "Refusing concentrated live deployment without a distribution plan.",
          "Set KINGPULSE_DISTRIBUTION_FILE to a JSON allocation file.",
          `Current retention guard is ${maxRetainedBps} bps max retained by deployer.`,
        ].join(" ")
      );
    }

    return {
      allocations: [],
      total: 0n,
      sourcePath: "",
      maxRetainedBps,
    };
  }

  const plan = loadDistributionPlan(distributionFile);

  if (plan.total > totalSupply) {
    throw new Error(
      `Distribution plan total ${formatUnits(plan.total, 18)} KPL exceeds total supply ${formatUnits(totalSupply, 18)} KPL.`
    );
  }

  return {
    ...plan,
    maxRetainedBps,
  };
}

export {
  assertDeploymentDistributionReady,
  assertRetainedBalanceWithinLimit,
  getMaxRetainedBps,
  loadDistributionPlan,
};
