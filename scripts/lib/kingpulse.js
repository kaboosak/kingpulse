import { network } from "hardhat";
import {
  Wallet,
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
} from "ethers";

function getContractAddress(networkName) {
  const contractAddress =
    process.env.KINGPULSE_ADDRESS || process.env.KINGPULSE_MAINNET_ADDRESS;

  if (!contractAddress) {
    throw new Error(
      [
        "Set KINGPULSE_ADDRESS in .env to your deployed KingPulse mainnet contract address.",
        "KINGPULSE_MAINNET_ADDRESS is still accepted as a compatibility fallback.",
      ].join(" ")
    );
  }

  return contractAddress;
}

function getSignerRole() {
  return process.env.KINGPULSE_SIGNER || "admin";
}

function normalizePrivateKey(value) {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/^0x/, "");
  return /^[0-9a-fA-F]{64}$/.test(normalized) ? `0x${normalized}` : "";
}

function getPrivateKeyForRole(role) {
  if (role === "admin") {
    return normalizePrivateKey(
      process.env.ADMIN_PRIVATE_KEY ||
      process.env.OWNER_PRIVATE_KEY ||
      process.env.PRIVATE_KEY
    );
  }

  if (role === "operator") {
    return normalizePrivateKey(
      process.env.OPERATOR_PRIVATE_KEY || process.env.SPENDER_PRIVATE_KEY
    );
  }

  throw new Error(`Unsupported signer role: ${role}`);
}

async function getSigner() {
  const role = getSignerRole();
  const connection = await network.connect();
  const { ethers, networkName } = connection;

  if (networkName === "hardhat") {
    const signers = await ethers.getSigners();
    const signer = role === "operator" ? signers[1] : signers[0];

    if (!signer) {
      throw new Error(`No ${role} signer is available on the hardhat network.`);
    }

    return {
      connection,
      ethers,
      networkName,
      signer,
    };
  }

  const privateKey = getPrivateKeyForRole(role);

  if (!privateKey) {
    throw new Error(
      [
        `No ${role} private key is configured for the selected network.`,
        role === "admin"
          ? "Set ADMIN_PRIVATE_KEY in .env, or fall back to OWNER_PRIVATE_KEY / PRIVATE_KEY."
          : "Set OPERATOR_PRIVATE_KEY in .env, or fall back to SPENDER_PRIVATE_KEY.",
        "Run the command without sudo.",
      ].join(" ")
    );
  }

  return {
    connection,
    ethers,
    networkName,
    signer: new Wallet(privateKey, ethers.provider),
  };
}

async function getReadOnlyContract() {
  const connection = await network.connect();
  const { ethers, networkName } = connection;
  const contractAddress = getContractAddress(networkName);
  const contract = await ethers.getContractAt("KingPulse", contractAddress);

  return { connection, contract, contractAddress, ethers, networkName };
}

async function getContract() {
  const { connection, ethers, networkName, signer } = await getSigner();
  const contractAddress = getContractAddress(networkName);
  const contract = await ethers.getContractAt("KingPulse", contractAddress, signer);

  return { connection, signer, contract, contractAddress, ethers, networkName };
}

function parseTokenAmount(value) {
  if (!value) {
    throw new Error("Token amount is required.");
  }

  return parseUnits(value, 18);
}

function parseAddress(value, label = "address") {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (!isAddress(value)) {
    throw new Error(
      `Invalid ${label}: ${value}. Use a real EVM address like 0x1234...abcd.`
    );
  }

  return getAddress(value);
}

function formatTokenAmount(value) {
  return formatUnits(value, 18);
}

async function getTransactionOverrides(signer, txRequest) {
  const provider = signer.provider;
  const feeData = await provider.getFeeData();
  const estimatedGas = await signer.estimateGas(txRequest);
  const gasLimit = (estimatedGas * 120n) / 100n;
  const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;

  if (maxFeePerGas === null) {
    throw new Error("Could not determine gas pricing from the selected RPC.");
  }

  const balance = await provider.getBalance(signer.address);
  const maxUpfrontCost = gasLimit * maxFeePerGas;

  if (balance < maxUpfrontCost) {
    throw new Error(
      [
        "Signer balance is lower than the transaction's maximum upfront gas cost.",
        `Balance: ${formatEther(balance)} MON.`,
        `Required for gas cap: ${formatEther(maxUpfrontCost)} MON.`,
      ].join(" ")
    );
  }

  return {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

async function sendContractTransaction(signer, txRequest) {
  const overrides = await getTransactionOverrides(signer, txRequest);
  const tx = await signer.sendTransaction({
    ...txRequest,
    ...overrides,
  });
  console.log(`Submitted tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Confirmed in block: ${receipt.blockNumber}`);
  return receipt;
}

export {
  formatTokenAmount,
  getContract,
  getReadOnlyContract,
  parseAddress,
  parseTokenAmount,
  sendContractTransaction,
};
