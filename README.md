# KingPulse

KingPulse is a Solidity ERC20 token project for Monad with:

- `ERC20`
- `ERC20Permit`
- owner-controlled minting
- user burning
- `burnFrom`
- pause / unpause
- Hardhat-based scripts
- a browser frontend for wallet-based interaction

## Contract

- Name: `KingPulse`
- Symbol: `KPL`
- Decimals: `18`
- Default mainnet contract in this repo: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Replacement-contract reference: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Current observed live state on `2026-05-15`:
  - Total supply: `29,750 KPL`
  - Contract-held balance: `2,240 KPL`
  - Externally held supply: `27,510 KPL`
  - Owner: `0x27c97c377f43e73b1F62b317E3499B510e5a0C95`
  - `paused`: `false`

Monad mainnet deployment:

- Default contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Chain ID: `143`
- Explorer: `https://monadscan.com/address/0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Replacement-contract reference: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`

## Mainnet Status

- Default mainnet contract in this repo: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Replacement-contract reference: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Current on-chain owner: `0x27c97c377f43e73b1F62b317E3499B510e5a0C95`
- Current on-chain total supply: `29,750 KPL`
- Current contract-held balance: `2,240 KPL`
- Current externally held supply: `27,510 KPL`
- Current paused state: `false`
- KPL held at the token contract address is stranded on this legacy deployment and should not be treated as spendable holder balance.
- Older repo documents that referenced `1,000,000 KPL` or `1,000,200 KPL` should be treated as historical and not as the live supply.
- Operations runbook: [OPERATIONS.md](/home/el3aw/kingpulse/OPERATIONS.md#L1)
- Tokenomics: [TOKENOMICS.md](/home/el3aw/kingpulse/TOKENOMICS.md#L1)
- Migration plan: [MIGRATION_PLAN.md](/home/el3aw/kingpulse/MIGRATION_PLAN.md#L1)
- Mainnet checklist: [MAINNET_CHECKLIST.md](/home/el3aw/kingpulse/MAINNET_CHECKLIST.md#L1)

## Project Layout

```text
kingpulse/
├── artifacts/
├── cache/
├── contracts/
│   ├── KingPulse.sol
│   ├── KingPulseMigrationToken.sol
│   └── KingPulseVestingWallet.sol
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── scripts/
│   ├── lib/
│   │   ├── kingpulse.js
│   │   └── migration-snapshot.js
│   ├── allowance.js
│   ├── approve.js
│   ├── balance.js
│   ├── burn-from.js
│   ├── burn.js
│   ├── deploy-migration-token.js
│   ├── deploy.js
│   ├── mint.js
│   ├── native-balance.js
│   ├── pause.js
│   ├── serve-frontend.js
│   ├── snapshot-holders.js
│   ├── token-info.js
│   ├── transfer.js
│   ├── unpause.js
│   └── whoami.js
├── test/
│   ├── KingPulse.js
│   ├── KingPulseMigrationToken.js
│   ├── KingPulseVestingWallet.js
│   └── migration-snapshot.test.js
├── .env.example
├── hardhat.config.js
├── MIGRATION_PLAN.md
├── package-lock.json
├── package.json
└── README.md
```

## Requirements

- Node.js
- npm
- MetaMask or another EVM wallet for frontend use

Use Node `22.10.0` or later LTS. The repo pins that floor in `package.json` and `.nvmrc` because Hardhat 3 does not support Node 18.

## Install

From the project directory:

```bash
cd /home/el3aw/kingpulse
npm install
```

## Environment

Create `.env` from `.env.example`.

Example:

```env
MONAD_RPC_URL=https://rpc.monad.xyz
ADMIN_PRIVATE_KEY=admin_wallet_private_key_without_0x
OPERATOR_PRIVATE_KEY=operator_wallet_private_key_without_0x
PRIVATE_KEY=optional_legacy_fallback_admin_key_without_0x
ETHERSCAN_API_KEY=your_etherscan_api_key
KINGPULSE_ADDRESS=0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c
KINGPULSE_MAINNET_ADDRESS=0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c
KINGPULSE_MIGRATION_ADDRESS=0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c
```

## Admin / Operator Workflow

This project supports two roles:

- `admin`: the wallet that should currently control owner-only actions
- `operator`: a secondary wallet used for allowance-based actions like `burnFrom`

Check the configured wallets:

```bash
npm run whoami:admin
npm run whoami:operator
```

## Ownership Policy

Recommended production policy:

- deploy with a dedicated admin wallet
- verify the contract on mainnet
- transfer ownership to a multisig immediately after deployment
- use the multisig/current admin for all owner-only actions:
  - `mint`
  - `pause`
  - `unpause`
  - `transferOwnership`

Important: trust the on-chain `owner()` result, not an old local label. If the actual owner changes, update `ADMIN_PRIVATE_KEY` to match the wallet that currently controls the contract.

## Compile And Test

```bash
npm run compile
npm test
```

## Deployment And Verification

Deploy to Monad mainnet:

```bash
npm run deploy
```

To avoid launching with all supply concentrated in the deployer wallet, you can
provide a distribution file and spread the initial supply immediately after
deployment:

```bash
KINGPULSE_DISTRIBUTION_FILE=distribution.example.json npm run deploy
```

The distribution file must be a JSON array of `{ "recipient", "amount" }`
objects. Amounts use whole-token notation and are parsed with 18 decimals.

For production planning, start from:

```bash
distribution.production.template.json
```

For an editable launch file already aligned to the current tokenomics split, use:

```bash
distribution.production.json
```

Replace every `0x0000000000000000000000000000000000000000` placeholder with a real
wallet before deploying. The deploy script will reject invalid or duplicate
recipients.

Live deployments now refuse to proceed without `KINGPULSE_DISTRIBUTION_FILE`.
After distribution, the deployer wallet must retain no more than `25%` of total
supply by default. Override intentionally with `KINGPULSE_MAX_RETAINED_BPS` if
your launch plan requires a different threshold.

Verify:

```bash
npm run verify -- 0xYourMainnetContractAddress
```

Explicit mainnet aliases are also available:

```bash
npm run deploy:mainnet
npm run verify:mainnet -- 0xYourMainnetContractAddress
```

Before using them, complete [MAINNET_CHECKLIST.md](/home/el3aw/kingpulse/MAINNET_CHECKLIST.md#L1).
The default mainnet contract in this repo is `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`.

## Confidence And Vesting

If you want higher investor confidence without altering holder balances manually,
lock sensitive allocations behind transparent vesting or timelock custody instead
of informal promises.

Recommended custody plan for the current category wallets is in:

```bash
vesting.recommended.json
```

That file is now sized to the exact live balances of the wallets provable from local `.env` keys on the official replacement token and currently covers `293.049671684168789124 KPL`. If you control additional large-holder wallets outside `.env`, extend the plan before running it.

Recommended direction:

- owner/admin reserve: gradual release over `365` days unless you intentionally keep a small liquid admin balance
- legacy operator wallet: gradual release over `365` days unless it still needs operational KPL
- treasury reserve: gradual release over `730` days with a published spending policy
- ecosystem growth: gradual release over `730` days
- team core contributors: start after `2027-05-14T00:00:00Z`, then `1095` days of linear vesting
- future liquidity: `0`-day duration with a future start date to act as a timelock
- marketing partnerships: gradual release over `365` days

Deploy a vesting wallet:

```bash
npm run deploy-vesting -- 0xBeneficiaryAddress 2027-05-14T00:00:00Z 1095 35.148534040780626171
```

Check vesting wallet status:

```bash
npm run vesting-status -- 0xVestingWalletAddress
```

Release vested KPL:

```bash
npm run release-vested -- 0xVestingWalletAddress
```

Automate the full vesting rollout from [vesting.recommended.json](/home/el3aw/kingpulse/vesting.recommended.json#L1):

```bash
npm run vesting-batch
```

That runs in dry-run mode by default. It checks:

- the current holder balance for each category
- whether the category-specific signer key env var is present
- whether the signer key matches the current holder address

For live execution, set these env vars in `.env` first:

- `ADMIN_PRIVATE_KEY`
- `OPERATOR_PRIVATE_KEY`
- `TREASURY_PRIVATE_KEY`
- `ECOSYSTEM_PRIVATE_KEY`
- `TEAM_PRIVATE_KEY`
- `FUTURE_LIQUIDITY_PRIVATE_KEY`
- `MARKETING_PRIVATE_KEY`

Then run:

```bash
npm run vesting-batch -- --execute
```

Successful live runs write deployed vesting wallet addresses to:

```bash
vesting.batch.results.log
```

To see which migration-snapshot holders are still not covered by your current vesting plan or local key set:

```bash
npm run holders:unclassified
```

You can also mark additional holder wallets as controlled without adding keys yet:

```bash
npm run holders:unclassified -- --known-address 0xYourHolder1 --known-address 0xYourHolder2
```

To scaffold a vesting template for addresses listed in [controlled.addresses.txt](/home/el3aw/kingpulse/controlled.addresses.txt#L1):

```bash
npm run vesting:controlled-template
```

That writes:

- `vesting.controlled.template.json`
- `controlled.private-keys.template.env`

Fill the generated `CONTROLLED_HOLDER_XX_PRIVATE_KEY` variables with the matching holder keys, then merge the entries you actually want to lock into your live vesting plan.

To build one combined execution-ready template from the key-backed live plan plus the controlled-holder template:

```bash
npm run vesting:merge
```

That writes:

- `vesting.execution-ready.template.json`

If an `--execute` run partially succeeds and stops on a later holder, do not rerun the full merged file. Build a resume-only plan by excluding the categories already written to [vesting.batch.results.log](/home/el3aw/kingpulse/vesting.batch.results.log#L1):

```bash
npm run vesting:resume
```

That writes:

- `vesting.execution-ready.remaining.json`

Then continue from the reduced plan instead of the original merged file:

```bash
KINGPULSE_VESTING_PLAN_FILE=vesting.execution-ready.remaining.json bash scripts/automate-vesting.sh --dry-run
```

```bash
KINGPULSE_VESTING_PLAN_FILE=vesting.execution-ready.remaining.json bash scripts/automate-vesting.sh --execute
```

Before resuming, audit which remaining holders still need native MON for vesting deployment gas:

```bash
npm run vesting:gas-audit
```

That reads the remaining plan by default and writes:

- `vesting.execution-ready.remaining.gas-audit.json`

You can raise or lower the minimum native balance target per holder:

```bash
npm run vesting:gas-audit -- --min-mon 0.2
```

To fund the wallets that still need MON, build a top-up plan from the audit report. The script refreshes live balances before calculating transfers, so it only sends the remaining shortfall:

```bash
npm run vesting:gas-topup
```

By default this targets the report minimum plus an extra `0.05 MON` buffer per wallet, and writes:

- `vesting.execution-ready.remaining.gas-audit.topup-plan.json`

Execute the native MON top-ups from the admin wallet once the dry run looks correct:

```bash
npm run vesting:gas-topup -- --execute
```

If the dry run reports blocked recipients such as contract or smart-wallet addresses, fund only the clean recipients with:

```bash
npm run vesting:gas-topup -- --execute --skip-blocked
```

## Token Info And Balance Commands

Token metadata and status:

```bash
npm run token-info
```

`token-info` also reports any KPL held at the token contract address. On the legacy `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` deployment that balance is stranded; on the official replacement contract it can be handled with owner-only contract-balance recovery or burn helpers.

KPL balance:

```bash
npm run balance -- 0xWalletAddress
```

Native MON balance:

```bash
npm run native-balance -- 0xWalletAddress
```

Allowance:

```bash
npm run allowance -- 0xOwnerAddress 0xSpenderAddress
```

## Migration Tooling

Live migration is already complete on Monad mainnet:

- Legacy source contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Official replacement contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Snapshot block: `74540419`
- Finalize tx: `0x8a97f677afa158dd6ff2890bd7238215330f664ce7ebb479348c047424e5fcc5`

The scripts below remain useful for auditing the completed migration, rehearsing on test deployments, or preparing a future replacement flow. Do not rerun mint or finalize against the official replacement contract, because minting is already closed there.

Deploy the replacement migration contract scaffold:

```bash
KINGPULSE_MIGRATION_SUPPLY_CAP=27510 npm run deploy:migration
```

Build a migration distribution file by scanning `Transfer` logs and snapshotting balances:

```bash
npm run snapshot:holders -- --contract 0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c --from-block 0
```

On Monad mainnet, the script automatically falls back to the Etherscan V2 token-transfer API when the RPC limits `eth_getLogs` ranges. Keep `ETHERSCAN_API_KEY` configured for reliable live snapshots.

To reissue the stranded contract-held balance to a specific wallet instead of retiring it:

```bash
npm run snapshot:holders -- --contract 0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c --from-block 0 --contract-self-balance-recipient 0xTreasuryWallet
```

The snapshot command writes:

- `distribution.migration.snapshot.json`
- `distribution.migration.snapshot.summary.json`

Turn the distribution file into `mintBatch` chunks for the replacement contract:

```bash
npm run migration:batches
```

The batch builder defaults to `50` recipients per call and writes:

- `distribution.migration.batches.json`
- `distribution.migration.batches.summary.json`

You can override the chunk size if you want smaller or larger `mintBatch` calls:

```bash
npm run migration:batches -- --batch-size 25
```

Dry-run the replacement mint sequence against the deployed migration token:

```bash
KINGPULSE_MIGRATION_ADDRESS=0xReplacementToken npm run migration:mint-batches:dry-run
```

Broadcast the `mintBatch` calls in order once you are satisfied with the dry run:

```bash
KINGPULSE_MIGRATION_ADDRESS=0xReplacementToken npm run migration:mint-batches
```

To resume after partial completion, select a later range:

```bash
KINGPULSE_MIGRATION_ADDRESS=0xReplacementToken npm run migration:mint-batches -- --start-batch 2
```

Check on-chain migration progress against the local batch file. For the live official replacement token:

```bash
KINGPULSE_MIGRATION_ADDRESS=0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369 npm run migration:status
```

Dry-run the irreversible finalize step:

```bash
KINGPULSE_MIGRATION_ADDRESS=0xReplacementToken npm run migration:finalize:dry-run
```

Finalize migration minting once all batches are complete:

```bash
KINGPULSE_MIGRATION_ADDRESS=0xReplacementToken npm run migration:finalize
```

## Admin Commands

Mint:

```bash
npm run mint -- 0xRecipientAddress 100
```

Transfer:

```bash
npm run transfer -- 0xRecipientAddress 25
```

`npm run transfer` uses the configured `admin` signer. That only works if the admin wallet itself holds KPL. For routine token sends from a funded holder wallet, prefer `npm run transfer:mainnet:operator -- 0xRecipientAddress 25` or another signer key that already holds tokens.

Approve:

```bash
npm run approve -- 0xSpenderAddress 50
```

Burn:

```bash
npm run burn -- 10
```

Build an exact proportional burn plan from a holder plan such as [vesting.execution-ready.remaining.json](/home/el3aw/kingpulse/vesting.execution-ready.remaining.json:1):

```bash
npm run burn:build-plan -- --source vesting.execution-ready.remaining.json --target-amount 17135.919186604419828074 --output burn.remaining-70pct.exact.json
```

Dry-run the per-wallet burns after you have funded gas and loaded the matching holder keys:

```bash
KINGPULSE_BURN_PLAN_FILE=burn.remaining-70pct.exact.json npm run burn:execute-plan -- --dry-run
```

Execute the plan once the dry run is clean:

```bash
KINGPULSE_BURN_PLAN_FILE=burn.remaining-70pct.exact.json npm run burn:execute-plan -- --execute
```

Pause:

```bash
npm run pause
```

Unpause:

```bash
npm run unpause
```

## Spender Commands

Transfer from operator wallet:

```bash
npm run transfer:mainnet:operator -- 0xRecipientAddress 5
```

Approve from operator wallet:

```bash
npm run approve:mainnet:operator -- 0xAnotherSpender 10
```

Burn from operator wallet:

```bash
npm run burn:mainnet:operator -- 2
```

Burn from owner balance using allowance:

```bash
npm run burn-from -- 0xOwnerAddress 10
```

## Frontend

Start the local frontend server:

```bash
npm run frontend
```

Then open:

```text
http://localhost:4173
```

Frontend features:

- connect MetaMask
- switch to Monad mainnet
- load the deployed contract from runtime config
- surface contract-held KPL and trapped-balance warnings
- mint / transfer / approve / burn / burnFrom
- pause / unpause
- permit signing and submission
- KPL / MON balance lookup
- allowance lookup
- recent transaction cards
- MonadVision links for submitted transactions

## Permit Flow

The frontend supports `ERC20Permit`.

Recommended flow:

1. Connect the owner wallet in the frontend.
2. Use the `Permit` form.
3. Enter spender address, amount, and deadline.
4. Submit the signed permit transaction.
5. Confirm the result with:

```bash
npm run allowance -- 0xOwnerAddress 0xSpenderAddress
```

## Security Notes

- Do not use `sudo` for npm, Hardhat, or project scripts.
- Do not paste private keys into terminals, chat, or source files.
- Use a separate wallet for testing when possible.
- Owner-only actions require the current admin wallet.
- `burnFrom` requires both allowance and MON gas on the operator wallet.
- KPL sent to the token contract address cannot be burned or recovered through the current ABI.

## Current Status

Validated in this project:

- deploy
- verify
- token info
- KPL balance lookup
- MON balance lookup
- mint
- transfer
- approve
- permit
- burn
- burnFrom
- pause / unpause
- wallet-based frontend interaction

Current repo status:

- live docs updated to the `2026-05-14` observed mainnet state
- migration and reissue options documented in [MIGRATION_PLAN.md](/home/el3aw/kingpulse/MIGRATION_PLAN.md#L1)
