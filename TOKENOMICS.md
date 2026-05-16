# KingPulse Tokenomics

This document defines the live token state for KingPulse (`KPL`) on Monad mainnet as currently used by this repo.

It should be treated as the source of truth for supply, governance posture, and public launch assumptions until the project intentionally changes contracts again.

## Active Mainnet Contract

- Network: Monad Mainnet
- Chain ID: `143`
- Repo-default contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Token name: `KingPulse`
- Symbol: `KPL`
- Decimals: `18`

## Live State

Observed on `2026-05-16`:

- Current live total supply: `27,850 KPL`
- Current externally held supply: `25,610 KPL`
- Current KPL held at the token contract address: `2,240 KPL`
- Current on-chain owner: `0x0000000000000000000000000000000000000000`
- Current paused state: `false`

## Supply Integrity

- The current arithmetic is consistent: `25,610 KPL` externally held plus `2,240 KPL` at the contract address equals `27,850 KPL` total supply.
- The `2,240 KPL` at `address(this)` are stranded on this legacy deployment and must not be counted as treasury, reserve, launch inventory, or circulating holder balance.
- Holder-side burning remains possible through `burn` and `burnFrom`, so total supply can still decrease over time.
- Minting can no longer increase supply because ownership has already been renounced.

## Governance And Control Posture

- `owner() = 0x0000000000000000000000000000000000000000`
- `mint`, `pause`, `unpause`, and `transferOwnership` are permanently unavailable on the active contract
- there is no emergency owner path on the active contract
- standard holder-side ERC-20 flows such as `transfer`, `approve`, `burn`, and `burnFrom` still work subject to balances and allowances

## Historical Planning Numbers

- Older repo documents referred to `1,000,000 KPL` as an intended launch baseline.
- Older repo documents also referred to `1,000,200 KPL` as a later reported live total.
- Neither figure matches the current active mainnet contract.
- Allocation tables derived from those numbers are historical planning material only.

## Liquidity And Treasury Planning

Any current liquidity or treasury plan should distinguish between:

- `27,850 KPL` total on-chain supply
- `25,610 KPL` externally held supply

Important consequences:

- The old `5,000 MON + 10,845 KPL` example from the `1,000,000 KPL` planning model is no longer a valid percentage reference.
- The stranded `2,240 KPL` self-balance must not be counted as treasury, reserve, or deployable supply.
- Treasury and launch custody wallets should be documented separately from any admin/operator wallets that still hold KPL.

## Historical Replacement Reference

A separate replacement-token deployment exists at `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`, but it is retained in this repo as historical/reference material only and is not the active repo-default contract.

Detailed historical replacement execution is tracked in [MIGRATION_PLAN.md](/home/el3aw/kingpulse/MIGRATION_PLAN.md#L1).

## Launch Disclosure Checklist

Before broad public promotion, publish the following:

1. Active mainnet contract address and explorer link
2. Current live total supply and externally held supply
3. Current owner state as the zero address
4. Clear statement that `mint`, `pause`, `unpause`, and ownership transfer are no longer available
5. Clear statement that `2,240 KPL` at the contract address are stranded and excluded from spendable supply
6. Current liquidity and treasury policy based on the live `27,850 / 25,610` supply split

## Risk Disclosures

Users should understand the following:

- There is no remaining owner or multisig control on the active contract.
- There is no emergency pause path on the active contract.
- The stranded `2,240 KPL` self-balance is not recoverable on this legacy deployment.
- Multiple other mainnet deployments exist and must not be confused with the active repo-default contract.

## Current Recommendation

For credible public operation:

1. Keep `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` as the active repo-default contract unless you intentionally execute a future migration.
2. Recalculate liquidity and public communications against the live `27,850 KPL` total supply and `25,610 KPL` externally held supply.
3. Keep the stranded `2,240 KPL` clearly excluded from treasury and circulating-supply claims.
4. Treat `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369` and all other non-default deployments as historical/reference-only unless re-designated.
