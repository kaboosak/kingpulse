# Mainnet Checklist

Use this checklist before deploying KingPulse to Monad mainnet.

## 1. Freeze The Contract Decision

- Confirm token name, symbol, decimals, and initial supply.
- Confirm whether owner minting should remain enabled.
- Confirm whether pause / unpause should remain enabled.
- Confirm whether ownership will be transferred after deployment.

## 2. Security Review

- Re-read `contracts/KingPulse.sol` line by line.
- Re-run the test suite.
- Review all owner-only flows:
  - `mint`
  - `pause`
  - `unpause`
  - `transferOwnership`
- Review all allowance-based flows:
  - `approve`
  - `permit`
  - `burnFrom`
- Perform an independent review or audit before public launch.

## 3. Wallet And Key Management

- Do not deploy from a casual hot wallet.
- Use a dedicated production owner wallet.
- Prefer transferring ownership to a multisig after deployment.
- Keep deployer and treasury/admin roles separate where practical.
- Ensure the owner wallet has enough MON for deployment and follow-up admin actions.

## 4. Environment Setup

Update `.env` with production values:

```env
MONAD_MAINNET_RPC_URL=your_mainnet_rpc_url
OWNER_PRIVATE_KEY=your_mainnet_owner_private_key_without_0x
SPENDER_PRIVATE_KEY=optional_mainnet_spender_private_key_without_0x
ETHERSCAN_API_KEY=your_etherscan_api_key
KINGPULSE_MAINNET_ADDRESS=
```

Check the configured owner wallet:

```bash
npm run whoami:monad:mainnet:owner
npm run native-balance:monad:mainnet -- 0xYourOwnerAddress
```

## 5. Pre-Deployment Validation

- Run:

```bash
npm run compile
npm test
```

- Review `hardhat.config.js` mainnet settings.
- Confirm the RPC endpoint is correct and stable.
- Confirm the wallet connected to `monadMainnet` is the intended owner.

## 6. Deploy To Mainnet

Deploy:

```bash
npm run deploy:monad:mainnet
```

Record immediately:

- deployed contract address
- deployer address
- tx hash
- block number

Then store the address in `.env`:

```env
KINGPULSE_MAINNET_ADDRESS=0xYourMainnetContractAddress
```

## 7. Verify The Contract

Verify on mainnet:

```bash
npm run verify:monad:mainnet -- 0xYourMainnetContractAddress
```

If the explorer configuration changes, re-check the official Monad docs before retrying.

## 8. Post-Deployment Validation

Run read-only checks:

```bash
npm run token-info:monad:mainnet
npm run balance:monad:mainnet -- 0xYourOwnerAddress
```

Run controlled functional checks with small values:

- mint a tiny amount if minting remains enabled
- transfer a tiny amount
- approve a tiny amount
- test `permit`
- test `burn`
- test `burnFrom`
- test pause/unpause if retained

## 9. Ownership Transfer

If using multisig or treasury custody, transfer ownership:

```bash
npm run transfer-ownership:monad:mainnet -- 0xYourMultisigAddress
```

Then verify:

```bash
npm run token-info:monad:mainnet
```

## 10. Launch Operations

- Publish the official mainnet contract address.
- Publish tokenomics and admin policy.
- Publish explorer links.
- Publish any audit or review notes.
- Add liquidity only after contract and ownership checks are complete.

## 11. Do Not

- Do not use `sudo` for npm, Hardhat, or project scripts.
- Do not deploy mainnet from a wallet you use casually.
- Do not publish an address before verification and validation.
- Do not assume testnet RPC, explorer, or gas behavior exactly matches mainnet.
