import { getReadOnlyContract, parseAddress } from "./lib/kingpulse.js";

async function main() {
  const vestingAddressInput = process.argv[2];

  if (!vestingAddressInput) {
    throw new Error("Usage: npm run vesting-status -- <vesting_wallet_address>");
  }

  const { contractAddress, ethers } = await getReadOnlyContract();
  const vestingAddress = parseAddress(vestingAddressInput, "vesting wallet");
  const vesting = await ethers.getContractAt(
    "KingPulseVestingWallet",
    vestingAddress
  );
  const now = BigInt(Math.floor(Date.now() / 1000));

  const [owner, start, duration, end, released, releasable, balance] =
    await Promise.all([
      vesting.owner(),
      vesting.start(),
      vesting.duration(),
      vesting.end(),
      vesting["released(address)"](contractAddress),
      vesting["releasable(address)"](contractAddress),
      (await ethers.getContractAt("KingPulse", contractAddress)).balanceOf(
        vestingAddress
      ),
    ]);

  console.log(`Vesting wallet: ${vestingAddress}`);
  console.log(`Beneficiary: ${owner}`);
  console.log(`Token: ${contractAddress}`);
  console.log(`Now: ${now} (${new Date(Number(now) * 1000).toISOString()})`);
  console.log(`Start: ${start} (${new Date(Number(start) * 1000).toISOString()})`);
  console.log(`End: ${end} (${new Date(Number(end) * 1000).toISOString()})`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`Released: ${ethers.formatUnits(released, 18)} KPL`);
  console.log(`Currently releasable: ${ethers.formatUnits(releasable, 18)} KPL`);
  console.log(`Current wallet balance: ${ethers.formatUnits(balance, 18)} KPL`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
