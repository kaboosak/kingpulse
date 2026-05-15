# KingPulse Tokenomics

This document defines the live post-migration token state for KingPulse (`KPL`) on Monad mainnet.

It should be treated as the source of truth for supply, minting posture, and public launch assumptions until a later governance change replaces it.

## Official Mainnet Contract

- Network: Monad Mainnet
- Chain ID: `143`
- Official contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Token name: `KingPulse`
- Symbol: `KPL`
- Decimals: `18`

## Live Supply State

Observed on `2026-05-14`:

- Current live total supply: `27,510 KPL`
- Current max supply: `27,510 KPL`
- Current on-chain owner: `0x3487E1fF712791C67A17D7E2fE45Af8C3E732C10`
- Current paused state: `false`
- Current `migrationFinalized()`: `true`
- KPL held at the official token contract address: `0 KPL`

## Legacy Migration Source

- Legacy contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Legacy total supply: `29,750 KPL`
- Legacy KPL held at the token contract address: `2,240 KPL`
- That legacy self-balance was retired in the replacement distribution and is not part of the official live supply.

Detailed migration execution is tracked in [MIGRATION_PLAN.md](/home/el3aw/kingpulse/MIGRATION_PLAN.md#L1).

## Historical Planning Numbers

- Older repo documents referred to `1,000,000 KPL` as an intended launch baseline.
- Older repo documents also referred to `1,000,200 KPL` as a later reported live total.
- Neither figure matches the current official mainnet contract.
- Allocation tables derived from those numbers are historical planning material only.

## Minting And Cap Policy

The official replacement contract was deployed with a hard cap and one-way migration close:

- `maxSupply = 27,510 KPL`
- migration minting completed across `4` `mintBatch` transactions
- `finalizeMigration()` has already been called
- additional owner minting is therefore permanently closed on the official contract

The replacement contract also includes owner-only `recoverContractBalance()` and `burnContractBalance()` helpers if KPL are ever sent to `address(this)` again.

## Pause And Governance Policy

The official contract still supports owner-controlled pause and unpause actions.

Recommended production policy:

1. Use pause only for emergency response.
2. Keep normal market operation unpaused.
3. Transfer ownership to a multisig if `0x3487E1fF712791C67A17D7E2fE45Af8C3E732C10` is not the intended long-term admin.
4. Disclose any future owner action publicly.

## Liquidity And Treasury Planning

Any current liquidity or treasury plan must use the live `27,510 KPL` supply as its denominator.

Important consequences:

- The old `5,000 MON + 10,845 KPL` example from the `1,000,000 KPL` planning model is no longer a valid percentage reference.
- The legacy `2,240 KPL` self-balance must not be counted as treasury, reserve, or deployable supply.
- Treasury and launch custody wallets should be documented separately from admin control where practical.

## Launch Disclosure Checklist

Before broad public promotion, publish the following:

1. Official mainnet contract address and explorer link
2. Current live total supply and max supply
3. `migrationFinalized = true`
4. Current owner / multisig policy
5. Pause policy
6. Clear statement that `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` is legacy and deprecated
7. Clear statement that the legacy `2,240 KPL` self-balance was retired in migration
8. Current liquidity and treasury policy based on `27,510 KPL`

## Risk Disclosures

Users should understand the following:

- The contract owner still retains pause authority.
- The current owner is `0x3487E1fF712791C67A17D7E2fE45Af8C3E732C10` until ownership is transferred.
- Multiple older mainnet deployments exist and must not be confused with the official contract.
- Archived tokenomics or liquidity notes derived from `1,000,000 KPL` are historical and not current.

## Current Recommendation

For a credible public launch or ongoing operation:

1. Keep `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369` as the only official mainnet contract.
2. Transfer ownership if the current deployer wallet is not the intended long-term admin.
3. Recalculate liquidity and public communications against the live `27,510 KPL` supply.
4. Keep `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` and all older deployments clearly marked deprecated.
