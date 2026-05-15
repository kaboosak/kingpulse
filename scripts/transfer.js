import {
  formatTokenAmount,
  getContract,
  parseAddress,
  parseTokenAmount,
  sendContractTransaction,
} from "./lib/kingpulse.js";

async function main() {
  const to = process.argv[2];
  const amountInput = process.argv[3];

  if (!to || !amountInput) {
    throw new Error("Usage: npm run transfer -- <to> <amount>");
  }

  const { signer, contract, contractAddress } = await getContract();
  const recipient = parseAddress(to, "recipient");
  const amount = parseTokenAmount(amountInput);
  const senderBalance = await contract.balanceOf(signer.address);
  const txRequest = await contract.transfer.populateTransaction(recipient, amount);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Sender: ${signer.address}`);
  console.log(`Sender balance: ${formatTokenAmount(senderBalance)} KPL`);
  console.log(`Transferring ${amountInput} KPL to ${recipient}`);

  if (senderBalance < amount) {
    const signerRole = process.env.KINGPULSE_SIGNER || "admin";
    const retryHint =
      signerRole === "admin"
        ? "If routine transfers should come from a funded holder wallet, retry with `npm run transfer:mainnet:operator -- <to> <amount>` or another signer key that already holds KPL."
        : "Use a signer key that already holds KPL or reduce the transfer amount.";

    throw new Error(
      [
        `Signer ${signer.address} only holds ${formatTokenAmount(senderBalance)} KPL,`,
        `but the requested transfer needs ${formatTokenAmount(amount)} KPL.`,
        retryHint,
      ].join(" ")
    );
  }

  await sendContractTransaction(signer, txRequest);

  console.log(
    `Recipient balance: ${formatTokenAmount(await contract.balanceOf(recipient))} KPL`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
