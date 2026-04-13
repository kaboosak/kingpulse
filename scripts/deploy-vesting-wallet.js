import { formatEther, formatUnits } from "ethers";

import {
  getContract,
  parseAddress,
  parseTokenAmount,
  sendContractTransaction,
} from "./lib/kingpulse.js";

function parseStartTimestamp(value) {
  if (!value) {
    throw new Error(
      "Start timestamp is required. Use a unix timestamp in seconds or an ISO date like 2027-04-12T00:00:00Z."
    );
  }

  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }

  const parsed = Date.parse(trimmed);

  if (Number.isNaN(parsed)) {
    throw new Error(
      `Invalid start timestamp: ${value}. Use unix seconds or an ISO date.`
    );
  }

  return BigInt(Math.floor(parsed / 1000));
}

function parseDurationDays(value) {
  if (value === undefined) {
    throw new Error("Duration in days is required.");
  }

  const trimmed = String(value).trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Duration days must be a non-negative integer.");
  }

  return BigInt(trimmed) * 24n * 60n * 60n;
}

async function main() {
  const beneficiaryInput = process.argv[2];
  const startInput = process.argv[3];
  const durationDaysInput = process.argv[4];
  const amountInput = process.argv[5];

  if (!beneficiaryInput || !startInput || durationDaysInput === undefined) {
    throw new Error(
      "Usage: npm run deploy-vesting -- <beneficiary> <start_unix_or_iso> <duration_days> [amount]"
    );
  }

  const { signer, contract, contractAddress, ethers } = await getContract();
  const beneficiary = parseAddress(beneficiaryInput, "beneficiary");
  const startTimestamp = parseStartTimestamp(startInput);
  const durationSeconds = parseDurationDays(durationDaysInput);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const vestingFactory = await ethers.getContractFactory(
    "KingPulseVestingWallet",
    signer
  );
  const feeData = await signer.provider.getFeeData();
  const deployTx = await vestingFactory.getDeployTransaction(
    beneficiary,
    startTimestamp,
    durationSeconds
  );
  const estimatedDeployGas = await signer.estimateGas(deployTx);
  const deployGasLimit = (estimatedDeployGas * 120n) / 100n;
  const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
  const nativeBalance = await signer.provider.getBalance(signer.address);

  if (maxFeePerGas === null) {
    throw new Error("Could not determine gas pricing from the selected RPC.");
  }

  const maxDeployUpfrontCost = deployGasLimit * maxFeePerGas;
  let amount = null;
  let signerTokenBalance = null;

  console.log(`KPL contract: ${contractAddress}`);
  console.log(`Funding signer: ${signer.address}`);
  console.log(`Beneficiary: ${beneficiary}`);
  console.log(`Start: ${startTimestamp.toString()} (${new Date(Number(startTimestamp) * 1000).toISOString()})`);
  console.log(`Duration: ${durationSeconds.toString()} seconds`);
  console.log(`Native balance: ${formatEther(nativeBalance)} MON`);
  console.log(`Estimated deploy gas: ${estimatedDeployGas.toString()}`);
  console.log(`Deploy gas limit: ${deployGasLimit.toString()}`);
  console.log(`Max deploy upfront gas cost: ${formatEther(maxDeployUpfrontCost)} MON`);

  if (nativeBalance < maxDeployUpfrontCost) {
    throw new Error(
      [
        "Signer has insufficient MON to deploy the vesting wallet.",
        `Balance: ${formatEther(nativeBalance)} MON.`,
        `Required for deploy gas cap: ${formatEther(maxDeployUpfrontCost)} MON.`,
      ].join(" ")
    );
  }

  if (startTimestamp < now) {
    console.log(
      "Warning: vesting starts in the past, so any transferred tokens may be partially releasable immediately."
    );
  }

  if (amountInput) {
    amount = parseTokenAmount(amountInput);
    signerTokenBalance = await contract.balanceOf(signer.address);

    console.log(`Funding amount: ${amountInput} KPL`);
    console.log(`Signer KPL balance: ${formatUnits(signerTokenBalance, 18)} KPL`);

    if (signerTokenBalance < amount) {
      throw new Error(
        [
          "Funding signer does not hold enough KPL for this vesting transfer.",
          `Signer KPL balance: ${formatUnits(signerTokenBalance, 18)} KPL.`,
          `Required: ${amountInput} KPL.`,
        ].join(" ")
      );
    }
  }

  const vestingWallet = await vestingFactory.deploy(
    beneficiary,
    startTimestamp,
    durationSeconds
  );
  await vestingWallet.waitForDeployment();

  const vestingAddress = await vestingWallet.getAddress();

  console.log(`Vesting wallet: ${vestingAddress}`);

  if (amount !== null) {
    console.log(`Funding vesting wallet with ${amountInput} KPL`);
    const txRequest = await contract.transfer.populateTransaction(
      vestingAddress,
      amount
    );
    await sendContractTransaction(signer, txRequest);
    console.log(
      `Vesting wallet balance: ${formatUnits(
        await contract.balanceOf(vestingAddress),
        18
      )} KPL`
    );
  }

  console.log("");
  console.log("Status command:");
  console.log(`npm run vesting-status -- ${vestingAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
