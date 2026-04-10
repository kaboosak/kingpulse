const hre = require("hardhat");
const { getContract } = require("./lib/kingpulse");

async function main() {
  const { signer, contractAddress } = await getContract();
  const balance = await hre.ethers.provider.getBalance(signer.address);

  console.log(`Network: ${hre.network.name}`);
  console.log(`Signer role: ${process.env.KINGPULSE_SIGNER || "owner"}`);
  console.log(`Signer address: ${signer.address}`);
  console.log(`Native balance: ${hre.ethers.formatEther(balance)} MON`);
  console.log(`Contract: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
