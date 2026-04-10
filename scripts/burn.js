const {
  formatTokenAmount,
  getContract,
  parseTokenAmount,
  sendContractTransaction,
} = require("./lib/kingpulse");

async function main() {
  const amountInput = process.argv[2];

  if (!amountInput) {
    throw new Error("Usage: npm run burn:monad -- <amount>");
  }

  const { signer, contract, contractAddress } = await getContract();
  const amount = parseTokenAmount(amountInput);
  const txRequest = await contract.burn.populateTransaction(amount);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Burner: ${signer.address}`);
  console.log(`Burning ${amountInput} KPL`);

  await sendContractTransaction(signer, txRequest);

  console.log(
    `Remaining balance: ${formatTokenAmount(await contract.balanceOf(signer.address))} KPL`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
