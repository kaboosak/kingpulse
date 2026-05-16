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

- The current arithmetic is consistent: `25,610 + 2,240 = 27,850`.
- The `2,240 KPL` held at the token contract address are not spendable by users and should not be modeled as circulating inventory.
- Holder-side burning remains possible through `burn` and `burnFrom`, so total supply can still decrease over time.
- Minting cannot increase supply because `mint` is owner-only and ownership is already renounced.

## Governance And Control Posture

- `owner() = 0x0000000000000000000000000000000000000000`
- `mint`, `pause`, `unpause`, `transferOwnership`, and `renounceOwnership` are permanently unavailable
- standard holder-side ERC-20 flows such as `transfer`, `approve`, `burn`, and `burnFrom` still work subject to balances and allowances
- there is no contract-specific rescue path for KPL held at `address(this)`

## Replacement Reference

- Replacement contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Replacement total supply at reference check time: `27,510 KPL`
- Replacement KPL held at the token contract address: `0 KPL`
- Replacement `owner()`: `0x17C33dB369B0BcAcEc40115f5D1665f43fF70361`
- Replacement `migrationFinalized()`: `true`

Detailed migration execution is tracked in [MIGRATION_PLAN.md](/home/el3aw/kingpulse/MIGRATION_PLAN.md#L1).

## Historical Planning Numbers

- Older repo documents referred to `1,000,000 KPL` as an intended launch baseline.
- Older repo documents also referred to `1,000,200 KPL` as a later reported live total.
- Neither figure matches the current active mainnet contract.
- Allocation tables derived from those numbers are historical planning material only.

## Liquidity And Treasury Planning

Any current liquidity or treasury plan should use the live `25,610 KPL` externally held supply as its practical denominator.

Important consequences:

- The old `5,000 MON + 10,845 KPL` example from the `1,000,000 KPL` planning model is no longer a valid percentage reference.
- The repo-default stranded `2,240 KPL` self-balance at `0x740...` must not be counted as treasury, reserve, or deployable supply.
- Treasury and launch custody wallets should be documented separately from any wallet labels inherited from older admin/operator workflows.

## Launch Disclosure Checklist

Before broad public promotion, publish the following:

1. Active mainnet contract address and explorer link
2. Current live total supply and externally held supply
3. Current owner-renounced policy
4. Current pause policy (`paused = false`, but no one can change it)
5. Clear statement that `2,240 KPL` are stranded at the token contract address
6. Clear statement that `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369` is not the repo-default official token
7. Current liquidity and treasury policy based on `25,610 KPL` externally held supply

## Risk Disclosures

Users should understand the following:

- The active contract is ownerless, so there is no emergency pause or future mint path.
- The active contract-held `2,240 KPL` self-balance is not recoverable on `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`.
- Multiple other mainnet deployments exist and must not be confused with the active repo-default contract.
- The replacement `0x8AC...` deployment has different supply and owner posture and should not be mixed into current `0x740...` tokenomics statements.

## Current Recommendation

For credible public operation:

1. Keep `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` as the active repo-default contract while that remains the intended public token.
2. Recalculate liquidity and public communications against the live `25,610 KPL` externally held supply.
3. Keep the `2,240 KPL` stranded balance excluded from treasury and circulating-supply claims.
4. Keep the replacement `0x8AC...` deployment labeled as reference only unless you intentionally switch again.
