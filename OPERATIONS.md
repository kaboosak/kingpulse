# KingPulse Operations

This document records the live operational state for the KingPulse contract currently used by this repo on Monad mainnet and should be updated whenever the selected contract, owner, or public launch posture changes.

## Mainnet Contract In Use

- Network: Monad Mainnet
- Chain ID: `143`
- Contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Explorer: `https://monadscan.com/address/0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Current on-chain `owner()`: `0x27c97c377f43e73b1F62b317E3499B510e5a0C95`

## Current Contract State

Observed on `2026-05-15`:

- Live total supply: `29,750 KPL`
- Externally held supply: `27,510 KPL`
- KPL held at the token contract address itself: `2,240 KPL`
- `paused()`: `false`
- Stranded contract-held KPL should not be treated as spendable holder balance

## Replacement Contract Reference

- Contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- `owner()` at reference check time: `0x3487E1fF712791C67A17D7E2fE45Af8C3E732C10`
- Total supply at reference check time: `27,510 KPL`
- Contract-held KPL at reference check time: `0 KPL`

## Operational Priorities

1. Keep `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` in repo defaults, explorer links, and operator workflows.
2. Transfer ownership if `0x27c97c377f43e73b1F62b317E3499B510e5a0C95` is not the intended long-term admin or multisig.
3. Do not count the contract-held `2,240 KPL` as spendable treasury or holder balance.
4. Recalculate liquidity, treasury, and launch planning against the live `29,750 KPL` total supply and `27,510 KPL` externally held supply.

## Ownership Transfer Command

When a multisig is ready:

```bash
cd /home/el3aw/kingpulse
npm run transfer-ownership -- 0xYourMultisigAddress
```

Then verify:

```bash
npm run token-info
```

## Verification Commands

Check the current repo-default contract info:

```bash
npm run token-info
```

Check the replacement-contract migration status:

```bash
KINGPULSE_MIGRATION_ADDRESS=0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369 npm run migration:status
```

Check the retired legacy contract-held balance:

```bash
npm run balance -- 0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c
```

Check the admin signer currently configured in `.env`:

```bash
npm run whoami:admin
```

Check the operator signer currently configured in `.env`:

```bash
npm run whoami:operator
```

## Migration Reference

- Completed migration record: [MIGRATION_PLAN.md](/home/el3aw/kingpulse/MIGRATION_PLAN.md#L1)
- Snapshot and batch artifacts: `distribution.migration.snapshot.json`, `distribution.migration.snapshot.summary.json`, `distribution.migration.batches.json`, `distribution.migration.batches.summary.json`

## Deprecated Mainnet Deployments

The following mainnet KingPulse deployments should be treated as non-official unless explicitly re-designated:

- `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- `0xBC51Ff6E0e03d13B7C9c9916c931Ce69589c0F54`
- `0xd03f87cba1066afC456ca30cB76E368c18177691`
- `0xB8F5BfAdb3d703a8b31016bd48CdF188BDD959c7`
- `0x41eFE909baCddFF028052bb891f7027fb7823723`
- `0x529C6b93193F8127dAf9849422CBfD0F7d842931`
- `0xa4BbDE0711ECf0efc7DCeB6004067C1e038a6c35`
- `0x0E97181313Ca0a12cF77b88487890083D0871Ae5`
- `0xDA10484028100F02dcC88Fe147991059001AF273`

Only one mainnet contract should be presented as the active KPL token at any time.

## Security Notes

- Do not expose private keys in terminals, screenshots, or chat.
- If any production private key is exposed, treat it as compromised.
- Rotate compromised keys immediately.
- Re-check `owner()` on-chain after any ownership transfer.
- Do not count the contract-held `2,240 KPL` as spendable supply.
