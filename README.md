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
- Original launch baseline: `1,000,000 KPL`
- Current live total supply on-chain: `1,000,200 KPL`

Monad mainnet deployment:

- Official contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Chain ID: `143`
- Explorer: `https://monadscan.com/address/0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c#code`

## Mainnet Status

- Official mainnet contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Current on-chain owner: `0x27c97c377f43e73b1F62b317E3499B510e5a0C95`
- Current on-chain total supply: `1,000,200 KPL`
- Live supply is `200 KPL` above the original `1,000,000 KPL` baseline
- Operations runbook: [OPERATIONS.md](/home/el3aw/kingpulse/OPERATIONS.md#L1)
- Tokenomics: [TOKENOMICS.md](/home/el3aw/kingpulse/TOKENOMICS.md#L1)
- Mainnet checklist: [MAINNET_CHECKLIST.md](/home/el3aw/kingpulse/MAINNET_CHECKLIST.md#L1)

## Project Layout

```text
kingpulse/
├── artifacts/
├── cache/
├── contracts/
│   └── KingPulse.sol
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── scripts/
│   ├── lib/
│   │   └── kingpulse.js
│   ├── allowance.js
│   ├── approve.js
│   ├── balance.js
│   ├── burn-from.js
│   ├── burn.js
│   ├── deploy.js
│   ├── mint.js
│   ├── native-balance.js
│   ├── pause.js
│   ├── serve-frontend.js
│   ├── token-info.js
│   ├── transfer.js
│   ├── unpause.js
│   └── whoami.js
├── test/
│   └── KingPulse.js
├── .env.example
├── hardhat.config.js
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
KINGPULSE_MAINNET_ADDRESS=optional_legacy_mainnet_address_fallback
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
The current official mainnet contract is `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`.

## Confidence And Vesting

If you want higher investor confidence without altering holder balances manually,
lock sensitive allocations behind transparent vesting or timelock custody instead
of informal promises.

Recommended custody plan for the current category wallets is in:

```bash
vesting.recommended.json
```

Recommended direction:

- treasury reserve: gradual release over `730` days with a published spending policy
- ecosystem growth: gradual release over `730` days
- team core contributors: start after `2027-04-12T00:00:00Z`, then `1095` days of linear vesting
- future liquidity: `0`-day duration with a future start date to act as a timelock
- marketing partnerships: gradual release over `365` days

Deploy a vesting wallet:

```bash
npm run deploy-vesting -- 0xBeneficiaryAddress 2027-04-12T00:00:00Z 1095 150000
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

## Token Info And Balance Commands

Token metadata and status:

```bash
npm run token-info
```

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

## Admin Commands

Mint:

```bash
npm run mint -- 0xRecipientAddress 100
```

Transfer:

```bash
npm run transfer -- 0xRecipientAddress 25
```

Approve:

```bash
npm run approve -- 0xSpenderAddress 50
```

Burn:

```bash
npm run burn -- 10
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
