import path from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";
import { Wallet } from "ethers";

import { loadBurnPlan } from "./lib/burn-plan.js";
import {
  formatTokenAmount,
  getContractAddress,
  getTransactionOverrides,
  sendContractTransaction,
} from "./lib/kingpulse.js";

function printHelp() {
  console.log(`Usage: npm run burn:execute-plan -- [options]

Options:
  --plan <path>       Burn plan file. Defaults to burn.plan.json.
  --execute           Broadcast the burns.
  --dry-run           Validate balances, keys, and gas only. Default.
  --help              Show this message.

Environment:
  KINGPULSE_BURN_PLAN_FILE
  KINGPULSE_ADDRESS
  MONAD_RPC_URL
`);
}

function parseArgs(argv, env = process.env) {
  const options = {
    planPath: env.KINGPULSE_BURN_PLAN_FILE || "burn.plan.json",
    execute: false,
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

    if (arg === "--execute") {
      options.execute = true;
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

  return {
    help: false,
    planPath: path.resolve(process.cwd(), options.planPath),
    execute: options.execute,
  };
}

function normalizePrivateKey(value) {
  const normalized = String(value ?? "").trim().replace(/^0x/, "");
  return /^[0-9a-fA-F]{64}$/.test(normalized) ? `0x${normalized}` : "";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const burnPlan = loadBurnPlan(options.planPath);
  const { ethers } = await network.connect();
  const contractAddress = getContractAddress("monad");

  console.log(`Mode: ${options.execute ? "execute" : "dry-run"}`);
  console.log(`Plan: ${options.planPath}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Target burn amount: ${burnPlan.totalBurnAmount} KPL`);

  for (const entry of burnPlan.entries) {
    console.log("");
    console.log(`== ${entry.category} ==`);
    console.log(`Current holder: ${entry.currentHolder}`);
    console.log(`Burn amount:    ${entry.burnAmountDisplay} KPL`);
    console.log(`Retained after: ${entry.retainedAmountDisplay} KPL`);
    console.log(`Signer key env: ${entry.signerKeyEnv}`);

    if (entry.burnRawAmount === 0n) {
      console.log("Status: SKIP - burn amount is zero.");
      continue;
    }

    const holderKey = normalizePrivateKey(process.env[entry.signerKeyEnv] || "");

    if (!holderKey) {
      if (options.execute) {
        throw new Error(`Missing required env var ${entry.signerKeyEnv} for live execution.`);
      }

      console.log(`Status: DRY-RUN - missing ${entry.signerKeyEnv}, skipping signer validation.`);
      continue;
    }

    const signer = new Wallet(holderKey, ethers.provider);

    if (signer.address.toLowerCase() !== entry.currentHolder.toLowerCase()) {
      throw new Error(
        `${entry.signerKeyEnv} resolves to ${signer.address}, not ${entry.currentHolder}.`
      );
    }

    const contract = await ethers.getContractAt("KingPulse", contractAddress, signer);
    const holderBalance = await contract.balanceOf(entry.currentHolder);
    const nativeBalance = await ethers.provider.getBalance(entry.currentHolder);

    console.log(`Holder balance: ${formatTokenAmount(holderBalance)} KPL`);
    console.log(`Native balance: ${ethers.formatEther(nativeBalance)} MON`);

    if (holderBalance < entry.burnRawAmount) {
      throw new Error(
        `Holder balance for ${entry.category} is lower than the planned burn amount.`
      );
    }

    const txRequest = await contract.burn.populateTransaction(entry.burnRawAmount);

    if (!options.execute) {
      const overrides = await getTransactionOverrides(signer, txRequest);
      console.log(
        `Status: DRY-RUN - ready. Gas limit ${overrides.gasLimit.toString()}, max fee ${ethers.formatUnits(
          overrides.maxFeePerGas,
          "gwei"
        )} gwei.`
      );
      continue;
    }

    await sendContractTransaction(signer, txRequest);

    const remainingBalance = await contract.balanceOf(entry.currentHolder);
    console.log(`Remaining balance: ${formatTokenAmount(remainingBalance)} KPL`);
  }

  console.log("");
  console.log("Burn plan complete.");
}

const entryFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === entryFilePath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { parseArgs };
