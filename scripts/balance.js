const {
  formatTokenAmount,
  getReadOnlyContract,
  parseAddress,
} = require("./lib/kingpulse");

async function main() {
  const accountInput = process.argv[2];

  if (!accountInput) {
    throw new Error("Usage: npm run balance:monad -- <wallet_address>");
  }

  const { contract, contractAddress } = await getReadOnlyContract();
  const account = parseAddress(accountInput, "wallet address");
  const balance = await contract.balanceOf(account);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Wallet: ${account}`);
  console.log(`Balance: ${formatTokenAmount(balance)} KPL`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
