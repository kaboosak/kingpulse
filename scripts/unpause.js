const { getContract, sendContractTransaction } = require("./lib/kingpulse");

async function main() {
  const { signer, contract, contractAddress } = await getContract();

  console.log(`Contract: ${contractAddress}`);
  console.log(`Caller: ${signer.address}`);
  console.log("Unpausing transfers");

  const txRequest = await contract.unpause.populateTransaction();
  await sendContractTransaction(signer, txRequest);

  console.log(`Paused: ${await contract.paused()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
