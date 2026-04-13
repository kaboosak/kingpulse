import { network } from "hardhat";
import { formatEther } from "ethers";
import { parseAddress } from "./lib/kingpulse.js";

async function main() {
  const { ethers } = await network.connect();
  const accountInput = process.argv[2];

  if (!accountInput) {
    throw new Error("Usage: npm run native-balance -- <wallet_address>");
  }

  const account = parseAddress(accountInput, "wallet address");
  const balance = await ethers.provider.getBalance(account);

  console.log(`Wallet: ${account}`);
  console.log(`Native balance: ${formatEther(balance)} MON`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
