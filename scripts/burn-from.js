const {
  formatTokenAmount,
  getContract,
  parseAddress,
  parseTokenAmount,
  sendContractTransaction,
} = require("./lib/kingpulse");

async function main() {
  const ownerInput = process.argv[2];
  const amountInput = process.argv[3];

  if (!ownerInput || !amountInput) {
    throw new Error("Usage: npm run burn-from:monad -- <owner> <amount>");
  }

  const { signer, contract, contractAddress } = await getContract();
  const owner = parseAddress(ownerInput, "owner");
  const amount = parseTokenAmount(amountInput);
  const txRequest = await contract.burnFrom.populateTransaction(owner, amount);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Caller: ${signer.address}`);
  console.log(`Burning ${amountInput} KPL from ${owner}`);

  await sendContractTransaction(signer, txRequest);

  console.log(
    `Owner remaining balance: ${formatTokenAmount(
      await contract.balanceOf(owner)
    )} KPL`
  );
  console.log(
    `Remaining allowance: ${formatTokenAmount(
      await contract.allowance(owner, signer.address)
    )} KPL`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
