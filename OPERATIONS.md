# KingPulse Operations

This document records the current operational state for KingPulse and should be updated whenever production ownership, treasury, or official contract status changes.

## Official Mainnet Contract

- Network: Monad Mainnet
- Chain ID: `143`
- Official contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Explorer: `https://monadvision.com/address/0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c#code`

## Official Testnet Contract

- Network: Monad Testnet
- Chain ID: `10143`
- Contract: `0xd03f87cba1066afC456ca30cB76E368c18177691`
- Explorer: `https://testnet.monadscan.com/address/0xd03f87cba1066afC456ca30cB76E368c18177691#code`

## Current Role Model

Current observed mainnet state:

- Admin wallet:
  - `0x27c97c377f43e73b1F62b317E3499B510e5a0C95`
  - This wallet is the current on-chain `owner()`
  - This wallet controls owner-only functions:
    - `mint`
    - `pause`
    - `unpause`
    - `transferOwnership`

- Operator / treasury-distribution wallet:
  - Reconfirm separately from `.env` and current mainnet balances
  - Do not assume it differs from the admin wallet without verifying

## Ownership Policy

Recommended production policy:

1. The official mainnet contract must be the only contract publicly promoted.
2. The on-chain owner should be transferred to a multisig as soon as practical.
3. The wallet holding the token supply should be treated as treasury/distribution custody.
4. Admin and treasury should remain logically separate unless there is a deliberate reason to combine them.

## Immediate Priority

If KPL is intended to remain a live production token:

1. Finalize the official mainnet contract as:
   - `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
2. Move owner/admin control to a multisig
3. Publish the official address everywhere
4. Mark older mainnet deployments as deprecated

## Ownership Transfer Command

When a multisig is ready:

```bash
cd /home/el3aw/kingpulse
npm run transfer-ownership:monad:mainnet -- 0xYourMultisigAddress
```

Then verify:

```bash
npm run token-info:monad:mainnet
```

## Verification Commands

Check official mainnet contract info:

```bash
npm run token-info:monad:mainnet
```

Check the admin signer currently configured in `.env`:

```bash
npm run whoami:monad:mainnet:admin
```

Check the operator signer currently configured in `.env`:

```bash
npm run whoami:monad:mainnet:operator
```

Check treasury balance:

```bash
npm run balance:monad:mainnet -- 0x27c97c377f43e73b1F62b317E3499B510e5a0C95
```

## Deprecated Mainnet Deployments

The following mainnet KingPulse deployments should be treated as non-official unless explicitly re-designated:

- `0xd03f87cba1066afC456ca30cB76E368c18177691`
- `0xB8F5BfAdb3d703a8b31016bd48CdF188BDD959c7`
- `0x41eFE909baCddFF028052bb891f7027fb7823723`
- `0x529C6b93193F8127dAf9849422CBfD0F7d842931`
- `0xa4BbDE0711ECf0efc7DCeB6004067C1e038a6c35`
- `0x0E97181313Ca0a12cF77b88487890083D0871Ae5`
- `0xDA10484028100F02dcC88Fe147991059001AF273`

Only one mainnet contract should be presented as the official KPL token at any time.

## Security Notes

- Do not expose private keys in terminals, screenshots, or chat.
- If any production private key is exposed, treat it as compromised.
- Rotate compromised keys immediately.
- Re-check `owner()` on-chain after any ownership transfer.
