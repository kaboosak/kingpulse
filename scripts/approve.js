import {
  formatTokenAmount,
  getContract,
  parseAddress,
  parseTokenAmount,
  sendContractTransaction,
} from "./lib/kingpulse.js";

async function main() {
  const spenderInput = process.argv[2];
  const amountInput = process.argv[3];

  if (!spenderInput || !amountInput) {
    throw new Error("Usage: npm run approve -- <spender> <amount>");
  }

  const { signer, contract, contractAddress } = await getContract();
  const spender = parseAddress(spenderInput, "spender");
  const amount = parseTokenAmount(amountInput);
  const txRequest = await contract.approve.populateTransaction(spender, amount);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Owner: ${signer.address}`);
  console.log(`Approving ${spender} for ${amountInput} KPL`);

  await sendContractTransaction(signer, txRequest);

  console.log(
    `Updated allowance: ${formatTokenAmount(
      await contract.allowance(signer.address, spender)
    )} KPL`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
