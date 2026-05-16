# KingPulse Migration Plan

This document records the historical replacement-token exercise from the legacy KingPulse mainnet contract at `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` to the replacement contract at `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`.

It is a historical reference only. The current repo-default live contract remains `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`.

## Historical Replacement Status

Observed and executed on `2026-05-14`:

- Legacy source contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Historical replacement contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Snapshot block: `74540419`
- Policy chosen: retire the stranded legacy self-balance
- Replacement total supply: `27,510 KPL`
- Replacement max supply: `27,510 KPL`
- Replacement `migrationFinalized()`: `true`
- Replacement `paused()`: `false`
- Replacement owner: `0x3487E1fF712791C67A17D7E2fE45Af8C3E732C10`
- Finalize tx: `0x8a97f677afa158dd6ff2890bd7238215330f664ce7ebb479348c047424e5fcc5`
- Finalize block: `74560704`

This section is tied to the snapshot block above and should not be read as the current live legacy supply after later burns and ownership renouncement.

## Legacy Problem

The legacy deployment accumulated `2,240 KPL` at the token contract address itself and could not recover or burn that balance externally.

Why:

- `burn(uint256)` only burns the caller's balance
- `burnFrom(address,uint256)` requires allowance from the source address
- the token contract address cannot sign an approval for itself
- there is no owner rescue or owner burn function for `address(this)`

That made the legacy `2,240 KPL` self-balance permanently stranded.

## Execution Summary

1. Holder balances were snapshotted from the legacy contract at block `74540419`, excluding the token contract's own balance.
2. The distribution reconciled to `27,510 KPL` across `156` recipients.
3. The replacement contract was deployed at `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369` with `maxSupply = 27,510 KPL`.
4. Four `mintBatch` transactions completed the replacement distribution.
5. `finalizeMigration()` permanently closed minting on the replacement contract.

Mint batch transactions:

- Batch 1: `0x43fe22f4a74e9ae2f32116236718b9ba0b9f37550e1802a2fd9a37734f0c64fe`
- Batch 2: `0x3bea4a79d3f41877f49d2c8bda2c28f8a54a38f0bf1fab2e7aad6f70d64cb582`
- Batch 3: `0x9f204fc107a8e5ce1a99a4afd407ef1fa843c24d706ccbcabdc3980328fe7f69`
- Batch 4: `0x4d254b1b5ec584e6e44fa2a6f00d9ba2769ab39ea2dbd73e7358bf91405a80df`

## Replacement Supply Policy

The selected policy was the cleaner retirement path:

- reissue only the externally held `27,510 KPL`
- omit the stranded legacy `2,240 KPL` from the replacement supply used in that exercise
- keep the legacy contract as deprecated historical reference only

No treasury or reserve wallet received a discretionary recreation of the stranded balance.

## Artifacts

The migration artifacts committed to the repo are:

- `distribution.migration.snapshot.json`
- `distribution.migration.snapshot.summary.json`
- `distribution.migration.batches.json`
- `distribution.migration.batches.summary.json`

## Current Repo Posture

The repo is not currently operating in post-migration mode:

- `KINGPULSE_ADDRESS` and frontend defaults point to `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369` is kept as historical/reference-only material unless the project intentionally switches back to it or performs a future migration
- migration mint and finalize steps must not be rerun against `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`

## Historical And Reusable Commands

The migration scripts remain useful for audit, rehearsal, or future replacement exercises.

Snapshot the legacy holder set again:

```bash
npm run snapshot:holders -- --contract 0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c --from-block 0
```

Redirect the legacy contract-held balance to a treasury wallet if you are rehearsing the alternative reissue path:

```bash
npm run snapshot:holders -- --contract 0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c --from-block 0 --contract-self-balance-recipient 0xYourTreasuryWallet
```

Build conservative `mintBatch` chunks:

```bash
npm run migration:batches
```

Inspect the historical replacement status:

```bash
KINGPULSE_MIGRATION_ADDRESS=0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369 npm run migration:status
```

For a fresh unreleased replacement deployment under test, the broadcaster and finalize helpers are still:

```bash
KINGPULSE_MIGRATION_ADDRESS=0xYourReplacementToken npm run migration:mint-batches:dry-run
KINGPULSE_MIGRATION_ADDRESS=0xYourReplacementToken npm run migration:mint-batches
KINGPULSE_MIGRATION_ADDRESS=0xYourReplacementToken npm run migration:finalize:dry-run
KINGPULSE_MIGRATION_ADDRESS=0xYourReplacementToken npm run migration:finalize
```
