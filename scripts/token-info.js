const { formatTokenAmount, getReadOnlyContract } = require("./lib/kingpulse");

async function main() {
  const { contract, contractAddress } = await getReadOnlyContract();
  const [name, symbol, decimals, totalSupply, owner, paused] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.totalSupply(),
    contract.owner(),
    contract.paused(),
  ]);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Total supply: ${formatTokenAmount(totalSupply)} KPL`);
  console.log(`Owner: ${owner}`);
  console.log(`Paused: ${paused}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
