const hre = require("hardhat");
const { parseAddress } = require("./lib/kingpulse");

async function main() {
  const accountInput = process.argv[2];

  if (!accountInput) {
    throw new Error("Usage: npm run native-balance:monad -- <wallet_address>");
  }

  const account = parseAddress(accountInput, "wallet address");
  const balance = await hre.ethers.provider.getBalance(account);

  console.log(`Wallet: ${account}`);
  console.log(`Native balance: ${hre.ethers.formatEther(balance)} MON`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
