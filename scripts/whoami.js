import { network } from "hardhat";
import { formatEther } from "ethers";
import { getContract } from "./lib/kingpulse.js";

async function main() {
  const { ethers, networkName, signer, contractAddress } = await getContract();
  const balance = await ethers.provider.getBalance(signer.address);

  console.log(`Network: ${networkName}`);
  console.log(`Signer role: ${process.env.KINGPULSE_SIGNER || "owner"}`);
  console.log(`Signer address: ${signer.address}`);
  console.log(`Native balance: ${formatEther(balance)} MON`);
  console.log(`Contract: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
