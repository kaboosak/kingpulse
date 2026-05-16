# KingPulse Tokenomics

This document defines the live token state for KingPulse (`KPL`) on Monad mainnet as currently used by this repo.

It should be treated as the source of truth for supply, governance posture, and public launch assumptions until the project intentionally changes contracts again.

## Active Mainnet Contract

- Network: Monad Mainnet
- Chain ID: `143`
- Repo-default contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Token name: `KingPulse`
- Symbol: `KPL`
- Decimals: `18`

## Live State

Observed on `2026-05-16`:

- Current live total supply: `27,510 KPL`
- Current externally held supply: `27,510 KPL`
- Current KPL held at the token contract address: `0 KPL`
- Current on-chain owner: `0x17C33dB369B0BcAcEc40115f5D1665f43fF70361`
- Current paused state: `false`
- Current `maxSupply()`: `27,510 KPL`
- Current `migrationFinalized()`: `true`

## Supply Integrity

- The current arithmetic is consistent: the full `27,510 KPL` supply is externally held.
- There is no KPL currently held at the active token contract address.
- Holder-side burning remains possible through `burn` and `burnFrom`, so total supply can still decrease over time.
- Minting cannot increase supply because migration has already been finalized and the cap has been fully reached.

## Governance And Control Posture

- `owner() = 0x17C33dB369B0BcAcEc40115f5D1665f43fF70361`
- `mint` is effectively closed because `migrationFinalized() = true`
- `pause`, `unpause`, `transferOwnership`, `recoverContractBalance`, and `burnContractBalance` remain owner-controlled
- standard holder-side ERC-20 flows such as `transfer`, `approve`, `burn`, and `burnFrom` still work subject to balances and allowances

## Historical Legacy Reference

- Legacy contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Legacy total supply at reference check time: `27,850 KPL`
- Legacy KPL held at the token contract address: `2,240 KPL`
- Legacy `owner()` is the zero address
- That legacy self-balance is stranded on the deprecated deployment and is not part of the active repo-default supply model

Detailed migration execution is tracked in [MIGRATION_PLAN.md](/home/el3aw/kingpulse/MIGRATION_PLAN.md#L1).

## Historical Planning Numbers

- Older repo documents referred to `1,000,000 KPL` as an intended launch baseline.
- Older repo documents also referred to `1,000,200 KPL` as a later reported live total.
- Neither figure matches the current active mainnet contract.
- Allocation tables derived from those numbers are historical planning material only.

## Liquidity And Treasury Planning

Any current liquidity or treasury plan should use the live `27,510 KPL` supply as its denominator.

Important consequences:

- The old `5,000 MON + 10,845 KPL` example from the `1,000,000 KPL` planning model is no longer a valid percentage reference.
- The legacy stranded `2,240 KPL` self-balance at `0x740...` must not be counted as treasury, reserve, or deployable supply.
- Treasury and launch custody wallets should be documented separately from any admin/operator wallets that still hold KPL.

## Launch Disclosure Checklist

Before broad public promotion, publish the following:

1. Active mainnet contract address and explorer link
2. Current live total supply and max supply
3. `migrationFinalized = true`
4. Current owner / multisig policy
5. Pause policy
6. Clear statement that `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` is legacy and deprecated
7. Clear statement that the legacy `2,240 KPL` self-balance is not part of the active supply
8. Current liquidity and treasury policy based on `27,510 KPL`

## Risk Disclosures

Users should understand the following:

- The active contract owner still retains pause authority and contract-balance recovery/burn authority.
- Migration minting is already finalized and cannot be reopened by standard owner actions.
- The legacy `2,240 KPL` self-balance is not recoverable on `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`.
- Multiple other mainnet deployments exist and must not be confused with the active repo-default contract.

## Current Recommendation

For credible public operation:

1. Keep `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369` as the active repo-default contract unless you intentionally execute a future migration.
2. Recalculate liquidity and public communications against the live `27,510 KPL` supply.
3. Keep the legacy `0x740...` stranded balance excluded from treasury and circulating-supply claims.
4. Transfer ownership if the current owner wallet is not the intended long-term admin or multisig.
