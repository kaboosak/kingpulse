const {
  formatTokenAmount,
  getReadOnlyContract,
  parseAddress,
} = require("./lib/kingpulse");

async function main() {
  const ownerInput = process.argv[2];
  const spenderInput = process.argv[3];

  if (!ownerInput || !spenderInput) {
    throw new Error("Usage: npm run allowance:monad -- <owner> <spender>");
  }

  const { contract, contractAddress } = await getReadOnlyContract();
  const owner = parseAddress(ownerInput, "owner");
  const spender = parseAddress(spenderInput, "spender");
  const allowance = await contract.allowance(owner, spender);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Owner: ${owner}`);
  console.log(`Spender: ${spender}`);
  console.log(`Allowance: ${formatTokenAmount(allowance)} KPL`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
