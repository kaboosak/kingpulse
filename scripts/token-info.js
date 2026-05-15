import { formatTokenAmount, getReadOnlyContract } from "./lib/kingpulse.js";

async function readMigrationState(connection, contractAddress) {
  const { ethers } = connection;
  const migrationContract = await ethers.getContractAt("KingPulseMigrationToken", contractAddress);

  try {
    const [maxSupply, migrationFinalized] = await Promise.all([
      migrationContract.maxSupply(),
      migrationContract.migrationFinalized(),
    ]);

    return { maxSupply, migrationFinalized };
  } catch {
    return null;
  }
}

async function main() {
  const { connection, contract, contractAddress } = await getReadOnlyContract();
  const [name, symbol, decimals, totalSupply, owner, paused, contractSelfBalance] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.totalSupply(),
    contract.owner(),
    contract.paused(),
    contract.balanceOf(contractAddress),
  ]);
  const migrationState = await readMigrationState(connection, contractAddress);
  const externallyHeldSupply = totalSupply - contractSelfBalance;

  console.log(`Contract: ${contractAddress}`);
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Total supply: ${formatTokenAmount(totalSupply)} KPL`);
  console.log(`Contract-held balance: ${formatTokenAmount(contractSelfBalance)} KPL`);
  console.log(`Externally held supply: ${formatTokenAmount(externallyHeldSupply)} KPL`);
  console.log(`Owner: ${owner}`);
  console.log(`Paused: ${paused}`);

  if (migrationState) {
    console.log(`Max supply: ${formatTokenAmount(migrationState.maxSupply)} KPL`);
    console.log(`Migration finalized: ${migrationState.migrationFinalized}`);
  }

  if (contractSelfBalance > 0n) {
    if (migrationState) {
      console.log(
        "Warning: KPL is currently held at the token contract address. burnFrom cannot move that balance; use the owner-only contract balance recovery or burn helpers if needed."
      );
    } else {
      console.log(
        "Warning: KPL held at the token contract address is stranded in this legacy deployment unless a new contract is deployed."
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
