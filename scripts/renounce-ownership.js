import { ZeroAddress } from "ethers";
import { getContract, sendContractTransaction } from "./lib/kingpulse.js";

const CONFIRM_FLAG = "--confirm-renounce-ownership";

async function main() {
  const confirmed = process.argv.includes(CONFIRM_FLAG);

  if (!confirmed) {
    throw new Error(
      [
        "Renouncing ownership is irreversible and will disable all owner-only functions.",
        `Re-run with ${CONFIRM_FLAG} if you really want to continue.`,
      ].join(" ")
    );
  }

  const { signer, contract, contractAddress } = await getContract();
  const currentOwner = await contract.owner();

  if (currentOwner === ZeroAddress) {
    throw new Error("Ownership is already renounced on this contract.");
  }

  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error("Only the current owner can renounce ownership.");
  }

  const txRequest = await contract.renounceOwnership.populateTransaction();

  console.log(`Contract: ${contractAddress}`);
  console.log(`Current owner: ${currentOwner}`);
  console.log("Renouncing ownership");

  await sendContractTransaction(signer, txRequest);

  console.log(`Updated owner: ${await contract.owner()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
