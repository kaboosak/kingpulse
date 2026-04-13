import {
  getContract,
  parseAddress,
  sendContractTransaction,
} from "./lib/kingpulse.js";

async function main() {
  const vestingAddressInput = process.argv[2];

  if (!vestingAddressInput) {
    throw new Error("Usage: npm run release-vested -- <vesting_wallet_address>");
  }

  const { signer, contractAddress, ethers } = await getContract();
  const vestingAddress = parseAddress(vestingAddressInput, "vesting wallet");
  const vesting = await ethers.getContractAt(
    "KingPulseVestingWallet",
    vestingAddress,
    signer
  );
  const beneficiary = await vesting.owner();
  const releasable = await vesting["releasable(address)"](contractAddress);

  console.log(`Vesting wallet: ${vestingAddress}`);
  console.log(`Beneficiary: ${beneficiary}`);
  console.log(`Token: ${contractAddress}`);
  console.log(`Releasing: ${ethers.formatUnits(releasable, 18)} KPL`);

  const txRequest =
    await vesting["release(address)"].populateTransaction(contractAddress);
  await sendContractTransaction(signer, txRequest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
