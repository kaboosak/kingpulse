import {
  formatTokenAmount,
  getContract,
  parseAddress,
  parseTokenAmount,
  sendContractTransaction,
} from "./lib/kingpulse.js";

async function main() {
  const ownerInput = process.argv[2];
  const amountInput = process.argv[3];

  if (!ownerInput || !amountInput) {
    throw new Error("Usage: npm run burn-from -- <owner> <amount>");
  }

  const { signer, contract, contractAddress } = await getContract();
  const owner = parseAddress(ownerInput, "owner");
  const amount = parseTokenAmount(amountInput);

  if (owner.toLowerCase() === contractAddress.toLowerCase()) {
    throw new Error(
      [
        "Cannot burn from the token contract address on this deployment.",
        "The contract cannot approve allowance to external wallets, and no owner rescue or owner burn function exists for address(this).",
      ].join(" ")
    );
  }

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
