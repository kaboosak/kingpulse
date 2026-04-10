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
- Initial supply: `1,000,000 KPL`

Monad mainnet deployment:

- Contract: `0xd03f87cba1066afC456ca30cB76E368c18177691`
- Chain ID: `143`
- Explorer: `https://monadvision.com/address/0xd03f87cba1066afC456ca30cB76E368c18177691#code`

Monad testnet deployment:

- Contract: `0xd03f87cba1066afC456ca30cB76E368c18177691`
- Chain ID: `10143`
- Explorer: `https://testnet.monadscan.com/address/0xd03f87cba1066afC456ca30cB76E368c18177691#code`

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

Note: this project currently runs on Node `18.19.1`, but Hardhat prints a support warning on that version.

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
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
OWNER_PRIVATE_KEY=owner_wallet_private_key_without_0x
SPENDER_PRIVATE_KEY=spender_wallet_private_key_without_0x
PRIVATE_KEY=optional_legacy_fallback_owner_key_without_0x
ETHERSCAN_API_KEY=your_etherscan_api_key
KINGPULSE_ADDRESS=0xd03f87cba1066afC456ca30cB76E368c18177691
```

## Admin / Operator Workflow

This project supports two roles:

- `admin`: the wallet that should currently control owner-only actions
- `operator`: a secondary wallet used for allowance-based actions like `burnFrom`

Check the configured wallets:

```bash
npm run whoami:monad:admin
npm run whoami:monad:operator
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

Deploy to Monad testnet:

```bash
npm run deploy:monad
```

Verify:

```bash
npm run verify:monad -- 0xd03f87cba1066afC456ca30cB76E368c18177691
```

Mainnet-ready commands are also available:

```bash
npm run deploy:monad:mainnet
npm run verify:monad:mainnet -- 0xYourMainnetContractAddress
```

Before using them, complete [MAINNET_CHECKLIST.md](/home/el3aw/kingpulse/MAINNET_CHECKLIST.md#L1).

## Token Info And Balance Commands

Token metadata and status:

```bash
npm run token-info:monad
```

KPL balance:

```bash
npm run balance:monad -- 0xWalletAddress
```

Native MON balance:

```bash
npm run native-balance:monad -- 0xWalletAddress
```

Allowance:

```bash
npm run allowance:monad -- 0xOwnerAddress 0xSpenderAddress
```

## Admin Commands

Mint:

```bash
npm run mint:monad -- 0xRecipientAddress 100
```

Transfer:

```bash
npm run transfer:monad -- 0xRecipientAddress 25
```

Approve:

```bash
npm run approve:monad -- 0xSpenderAddress 50
```

Burn:

```bash
npm run burn:monad -- 10
```

Pause:

```bash
npm run pause:monad
```

Unpause:

```bash
npm run unpause:monad
```

## Spender Commands

Transfer from operator wallet:

```bash
npm run transfer:monad:operator -- 0xRecipientAddress 5
```

Approve from operator wallet:

```bash
npm run approve:monad:operator -- 0xAnotherSpender 10
```

Burn from operator wallet:

```bash
npm run burn:monad:operator -- 2
```

Burn from owner balance using allowance:

```bash
npm run burn-from:monad -- 0xOwnerAddress 10
```

Mainnet aliases exist for the same flows, for example:

```bash
npm run whoami:monad:mainnet:admin
npm run token-info:monad:mainnet
npm run native-balance:monad:mainnet -- 0xWalletAddress
```

## Frontend

Start the local frontend server:

```bash
npm run frontend:monad
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
npm run allowance:monad -- 0xOwnerAddress 0xSpenderAddress
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
