import { getContract, sendContractTransaction } from "./lib/kingpulse.js";

async function main() {
  const { signer, contract, contractAddress } = await getContract();

  console.log(`Contract: ${contractAddress}`);
  console.log(`Caller: ${signer.address}`);
  console.log("Pausing transfers");

  const txRequest = await contract.pause.populateTransaction();
  await sendContractTransaction(signer, txRequest);

  console.log(`Paused: ${await contract.paused()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
