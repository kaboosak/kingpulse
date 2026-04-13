import {
  getContract,
  parseAddress,
  sendContractTransaction,
} from "./lib/kingpulse.js";

async function main() {
  const nextOwnerInput = process.argv[2];

  if (!nextOwnerInput) {
    throw new Error("Usage: node scripts/transfer-ownership.js <new_owner_address>");
  }

  const { signer, contract, contractAddress } = await getContract();
  const nextOwner = parseAddress(nextOwnerInput, "new owner");
  const currentOwner = await contract.owner();

  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error("Only the current owner can transfer ownership.");
  }

  if (currentOwner.toLowerCase() === nextOwner.toLowerCase()) {
    throw new Error("New owner must be different from the current owner.");
  }

  const txRequest = await contract.transferOwnership.populateTransaction(nextOwner);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Current owner: ${currentOwner}`);
  console.log(`New owner: ${nextOwner}`);
  console.log("Transferring ownership");

  await sendContractTransaction(signer, txRequest);

  console.log(`Updated owner: ${await contract.owner()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
