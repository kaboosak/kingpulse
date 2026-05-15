import { network } from "hardhat";
import {
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
} from "ethers";

function getMigrationOwner(defaultOwner) {
  const configuredOwner = process.env.KINGPULSE_MIGRATION_OWNER || "";

  if (!configuredOwner) {
    return defaultOwner;
  }

  if (!isAddress(configuredOwner)) {
    throw new Error(
      `Invalid KINGPULSE_MIGRATION_OWNER: ${configuredOwner}. Use a real EVM address.`
    );
  }

  return getAddress(configuredOwner);
}

function getMigrationSupplyCap(networkName) {
  const configuredCap =
    process.env.KINGPULSE_MIGRATION_SUPPLY_CAP ||
    process.env.KINGPULSE_REPLACEMENT_SUPPLY_CAP ||
    (networkName === "hardhat" ? "27510" : "");

  if (!configuredCap) {
    throw new Error(
      [
        "Set KINGPULSE_MIGRATION_SUPPLY_CAP to the replacement total supply in whole KPL.",
        "Example: KINGPULSE_MIGRATION_SUPPLY_CAP=27510 npm run deploy:migration",
      ].join(" ")
    );
  }

  return {
    input: configuredCap,
    value: parseUnits(configuredCap, 18),
  };
}

async function main() {
  const connection = await network.connect();
  const { ethers, networkName } = connection;
  const signers = await ethers.getSigners();

  if (signers.length === 0) {
    throw new Error(
      [
        "No deployer account is configured for the selected network.",
        "Set a valid PRIVATE_KEY in .env for Monad mainnet and run the command without sudo.",
      ].join(" ")
    );
  }

  const [deployer] = signers;
  const provider = ethers.provider;
  const networkInfo = await provider.getNetwork();
  const balance = await provider.getBalance(deployer.address);
  const feeData = await provider.getFeeData();
  const migrationOwner = getMigrationOwner(deployer.address);
  const supplyCap = getMigrationSupplyCap(networkName);
  const factory = await ethers.getContractFactory("KingPulseMigrationToken", deployer);
  const deployTx = await factory.getDeployTransaction(migrationOwner, supplyCap.value);
  const estimatedGas = await deployer.estimateGas(deployTx);
  const gasLimit = (estimatedGas * 120n) / 100n;
  const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;

  if (maxFeePerGas === null) {
    throw new Error("Could not determine gas pricing from the selected RPC.");
  }

  const maxUpfrontCost = gasLimit * maxFeePerGas;

  console.log(`Deploying KingPulseMigrationToken with: ${deployer.address}`);
  console.log(`Network: ${networkName} (chainId ${networkInfo.chainId})`);
  console.log(`Deployer balance: ${formatEther(balance)} MON`);
  console.log(`Migration owner: ${migrationOwner}`);
  console.log(`Migration supply cap: ${supplyCap.input} KPL`);
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

  const contract = await factory.deploy(migrationOwner, supplyCap.value, {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log(`KingPulseMigrationToken deployed to: ${contractAddress}`);
  console.log(`Total supply at deploy: ${formatUnits(await contract.totalSupply(), 18)} KPL`);
  console.log(`Cap: ${formatUnits(await contract.maxSupply(), 18)} KPL`);
  console.log("");
  console.log("Verification command:");
  console.log(
    `npx hardhat verify --network ${networkName} ${contractAddress} ${migrationOwner} ${supplyCap.value}`
  );
  console.log("");
  console.log("Next steps:");
  console.log(
    "- Generate a migration distribution file with `npm run snapshot:holders -- --contract 0xCurrentToken --from-block <deployBlock>`."
  );
  console.log("- Mint snapshot allocations with the owner wallet.");
  console.log("- Call finalizeMigration() once the replacement distribution is complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
