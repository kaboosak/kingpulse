const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();

  if (signers.length === 0) {
    throw new Error(
      [
        "No deployer account is configured for the selected network.",
        "Set a valid PRIVATE_KEY in .env for the Monad network and run the command without sudo.",
        "Example: npm run deploy:monad",
      ].join(" ")
    );
  }

  const [deployer] = signers;
  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  const balance = await provider.getBalance(deployer.address);
  const feeData = await provider.getFeeData();
  const kingPulseFactory = await hre.ethers.getContractFactory("KingPulse", deployer);
  const deployTx = await kingPulseFactory.getDeployTransaction();
  const estimatedGas = await deployer.estimateGas(deployTx);
  const gasLimit = (estimatedGas * 120n) / 100n;
  const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;

  if (maxFeePerGas === null) {
    throw new Error("Could not determine gas pricing from the selected RPC.");
  }

  const maxUpfrontCost = gasLimit * maxFeePerGas;

  console.log(`Deploying KingPulse with: ${deployer.address}`);
  console.log(`Network: ${hre.network.name} (chainId ${network.chainId})`);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} MON`);
  console.log(`Estimated gas: ${estimatedGas.toString()}`);
  console.log(`Gas limit: ${gasLimit.toString()}`);
  console.log(`Max fee per gas: ${hre.ethers.formatUnits(maxFeePerGas, "gwei")} gwei`);
  console.log(
    `Max upfront gas cost: ${hre.ethers.formatEther(maxUpfrontCost)} MON`
  );

  if (balance < maxUpfrontCost) {
    throw new Error(
      [
        "Deployer balance is lower than the transaction's maximum upfront gas cost.",
        `Balance: ${hre.ethers.formatEther(balance)} MON.`,
        `Required for gas cap: ${hre.ethers.formatEther(maxUpfrontCost)} MON.`,
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
  console.log(`Initial supply: ${hre.ethers.formatUnits(totalSupply, 18)} KPL`);
  console.log("");
  console.log("Verification command:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
