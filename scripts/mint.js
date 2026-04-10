const {
  formatTokenAmount,
  getContract,
  parseAddress,
  parseTokenAmount,
  sendContractTransaction,
} = require("./lib/kingpulse");

async function main() {
  const to = process.argv[2];
  const amountInput = process.argv[3];

  if (!to || !amountInput) {
    throw new Error("Usage: npm run mint:monad -- <to> <amount>");
  }

  const { signer, contract, contractAddress } = await getContract();
  const recipient = parseAddress(to, "recipient");
  const amount = parseTokenAmount(amountInput);
  const txRequest = await contract.mint.populateTransaction(recipient, amount);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Caller: ${signer.address}`);
  console.log(`Minting ${amountInput} KPL to ${recipient}`);

  await sendContractTransaction(signer, txRequest);

  console.log(
    `Recipient balance: ${formatTokenAmount(await contract.balanceOf(recipient))} KPL`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
