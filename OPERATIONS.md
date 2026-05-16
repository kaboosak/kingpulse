# KingPulse Operations

This document records the live operational state for the KingPulse contract currently used by this repo on Monad mainnet and should be updated whenever the selected contract, owner, or public launch posture changes.

## Mainnet Contract In Use

- Network: Monad Mainnet
- Chain ID: `143`
- Contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Explorer: `https://monadscan.com/address/0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Current on-chain `owner()`: `0x17C33dB369B0BcAcEc40115f5D1665f43fF70361`

## Current Contract State

Observed on `2026-05-16`:

- Live total supply: `27,510 KPL`
- Externally held supply: `27,510 KPL`
- KPL held at the token contract address itself: `0 KPL`
- `maxSupply()`: `27,510 KPL`
- `migrationFinalized()`: `true`
- `paused()`: `false`
- Migration minting is permanently closed on the repo-default contract because finalization is complete
- Owner-only `pause`, `unpause`, `transferOwnership`, `recoverContractBalance`, and `burnContractBalance` remain available

## Legacy Contract Reference

- Contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- `owner()`: `0x0000000000000000000000000000000000000000`
- Total supply at reference check time: `27,850 KPL`
- Externally held supply at reference check time: `25,610 KPL`
- Contract-held KPL at reference check time: `2,240 KPL`

## Operational Priorities

1. Keep `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369` in repo defaults, explorer links, and operator workflows.
2. Complete the token-profile update and public branding for `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369` if it will remain the public live token.
3. Recalculate liquidity, treasury, and launch planning against the live `27,510 KPL` total and externally held supply.
4. Transfer ownership if `0x17C33dB369B0BcAcEc40115f5D1665f43fF70361` is not the intended long-term admin or multisig.
5. Keep `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` clearly marked as legacy and excluded from active supply claims.

## Ownership Status

The repo-default replacement contract still has an active owner.

- `owner() = 0x17C33dB369B0BcAcEc40115f5D1665f43fF70361`
- migration minting cannot be reopened because `migrationFinalized() = true`
- ownership transfer is still possible
- `pause` and `unpause` are still possible
- owner-only contract-balance recovery and contract-balance burning remain available if KPL are ever sent to `address(this)`

## Verification Commands

Check the current repo-default contract info:

```bash
npm run token-info
npm run migration:status
```

Check the legacy contract-held balance:

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

## Non-Default Mainnet Deployments

The following mainnet KingPulse deployments should not be presented as the active repo-default token unless explicitly re-designated:

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
- Check `owner()` on-chain before assuming the configured `ADMIN_PRIVATE_KEY` is still the live control wallet.
- Do not count the legacy contract-held `2,240 KPL` on `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` as spendable supply.
