import { network } from "hardhat";
import { formatEther, formatUnits, parseUnits } from "ethers";

import {
  assertDeploymentDistributionReady,
  assertRetainedBalanceWithinLimit,
} from "./lib/distribution.js";
import { sendContractTransaction } from "./lib/kingpulse.js";

const INITIAL_SUPPLY = parseUnits("1000000", 18);

async function main() {
  const connection = await network.connect();
  const { ethers, networkName } = connection;
  const signers = await ethers.getSigners();

  if (signers.length === 0) {
    throw new Error(
      [
        "No deployer account is configured for the selected network.",
        "Set a valid PRIVATE_KEY in .env for Monad mainnet and run the command without sudo.",
        "Example: npm run deploy",
      ].join(" ")
    );
  }

  const [deployer] = signers;
  const provider = ethers.provider;
  const networkInfo = await provider.getNetwork();
  const balance = await provider.getBalance(deployer.address);
  const feeData = await provider.getFeeData();
  const kingPulseFactory = await ethers.getContractFactory("KingPulse", deployer);
  const deployTx = await kingPulseFactory.getDeployTransaction();
  const estimatedGas = await deployer.estimateGas(deployTx);
  const gasLimit = (estimatedGas * 120n) / 100n;
  const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;
  const distributionFile = process.env.KINGPULSE_DISTRIBUTION_FILE || "";
  const distributionPlan = assertDeploymentDistributionReady({
    distributionFile,
    networkName,
    totalSupply: INITIAL_SUPPLY,
  });

  if (maxFeePerGas === null) {
    throw new Error("Could not determine gas pricing from the selected RPC.");
  }

  const maxUpfrontCost = gasLimit * maxFeePerGas;

  console.log(`Deploying KingPulse with: ${deployer.address}`);
  console.log(`Network: ${networkName} (chainId ${networkInfo.chainId})`);
  console.log(`Deployer balance: ${formatEther(balance)} MON`);
  console.log(`Estimated gas: ${estimatedGas.toString()}`);
  console.log(`Gas limit: ${gasLimit.toString()}`);
  console.log(`Max fee per gas: ${formatUnits(maxFeePerGas, "gwei")} gwei`);
  console.log(`Max upfront gas cost: ${formatEther(maxUpfrontCost)} MON`);

  if (balance < maxUpfrontCost) {
    throw new Error(
      [
        "Deployer balance is lower than the transaction's maximum upfront gas cost.",
        `Balance: ${formatEther(balance)} MON.`,
        `Required for gas cap: ${formatEther(maxUpfrontCost)} MON.`,
      ].join(" ")
    );
  }

  const kingPulse = await kingPulseFactory.deploy({
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  await kingPulse.waitForDeployment();

  const contractAddress = await kingPulse.getAddress();
  const totalSupply = await kingPulse.totalSupply();

  console.log(`KingPulse deployed to: ${contractAddress}`);
  console.log(`Initial supply: ${formatUnits(totalSupply, 18)} KPL`);

  if (distributionPlan.allocations.length > 0) {
    console.log("");
    console.log(`Applying initial distribution from: ${distributionPlan.sourcePath}`);
    console.log(`Recipients: ${distributionPlan.allocations.length}`);
    console.log(`Total distributed: ${formatUnits(distributionPlan.total, 18)} KPL`);

    for (const { recipient, amount } of distributionPlan.allocations) {
      if (recipient.toLowerCase() === deployer.address.toLowerCase()) {
        console.log(`Skipping deployer self-allocation: ${recipient}`);
        continue;
      }

      console.log(
        `Transferring ${formatUnits(amount, 18)} KPL to ${recipient}`
      );

      const txRequest = await kingPulse.transfer.populateTransaction(recipient, amount);
      await sendContractTransaction(deployer, txRequest);
    }

    const deployerBalance = await kingPulse.balanceOf(deployer.address);
    assertRetainedBalanceWithinLimit(deployerBalance, totalSupply);
    console.log(`Deployer retained balance: ${formatUnits(deployerBalance, 18)} KPL`);
    console.log(`Retention guard: ${distributionPlan.maxRetainedBps} bps max`);
  }

  console.log("");
  console.log("Verification command:");
  console.log(`npx hardhat verify --network ${networkName} ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
