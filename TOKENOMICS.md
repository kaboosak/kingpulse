# KingPulse Tokenomics

This document defines the current intended tokenomics model for KingPulse (`KPL`) on Monad Mainnet.

It should be treated as a living operational document until ownership, treasury custody, and launch liquidity are finalized.

## Official Mainnet Contract

- Network: Monad Mainnet
- Chain ID: `143`
- Official contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Token name: `KingPulse`
- Symbol: `KPL`
- Decimals: `18`

## Total Supply

- Fixed initial supply at launch: `1,000,000 KPL`
- Initial supply minted to treasury / distribution wallet at deployment
- Current live on-chain total supply: `1,000,200 KPL`
- Additional live supply above launch baseline: `200 KPL`

## Launch Pricing Model

Initial launch target:

- Target price: approximately `$0.01` per `KPL`
- Reference liquidity model: `5,000 MON + 10,845 KPL`

This launch model implies:

- Initial liquidity allocation: `10,845 KPL`
- Initial liquidity allocation as percentage of total supply: `1.0845%`
- Non-pooled supply after launch: `989,155 KPL`

The exact pool ratio should be recalculated immediately before adding liquidity to reflect the live market price of `MON`.

## Proposed Supply Allocation

The following allocation applies to the original `989,155 KPL` that remained outside the initial launch pool:

| Category | KPL | Share of Total Supply |
|---|---:|---:|
| Initial liquidity | 10,845 | 1.0845% |
| Treasury reserve | 500,000 | 50.0000% |
| Ecosystem and growth | 200,000 | 20.0000% |
| Team and core contributors | 150,000 | 15.0000% |
| Future liquidity | 100,000 | 10.0000% |
| Marketing and partnerships | 39,155 | 3.9155% |

Original allocation total at launch:

- `1,000,000 KPL`

Current live note:

- The live contract now reports `1,000,200 KPL` total supply.
- Public documentation should distinguish the original launch baseline from the current on-chain total.

## Intended Role Model

Current observed operational roles:

- Official mainnet admin wallet:
  - `0x27c97c377f43e73b1F62b317E3499B510e5a0C95`
  - This wallet is the current on-chain `owner()`
- Current treasury / distribution wallet:
  - Reconfirm from live balances before public launch
  - Do not assume treasury custody is separate from admin unless documented

Target production model:

- Admin ownership should move to a multisig
- Treasury custody should remain operationally separate from admin control
- Public communications should reference one official mainnet contract only

## Admin and Governance Policy

The contract currently supports owner-controlled administrative actions, including:

- `mint`
- `pause`
- `unpause`
- `transferOwnership`

Production policy should be:

1. Transfer ownership from the current admin wallet to a multisig
2. Document who controls the multisig
3. Record any future admin action publicly
4. Avoid discretionary admin activity without public disclosure

## Minting Policy

The smart contract supports additional minting by the owner.

This creates a trust-sensitive policy question that must be answered clearly before broad public launch.

Recommended public policy options:

1. Conservative policy:
   - No additional minting beyond the original `1,000,000 KPL` launch baseline
   - Mint function retained technically, but treated as unused in practice
2. Controlled growth policy:
   - Additional minting allowed only by multisig vote
   - Any mint must be announced publicly with purpose and amount

If no firm minting policy is published, the market should assume supply expansion risk exists.

For the current official contract, supply expansion has already occurred by `200 KPL`, so public materials should disclose that explicitly.

## Pause Policy

The contract also supports pausing transfers via the owner.

Recommended public policy:

- Pause should be used only for emergency response
- Normal market operation should remain unpaused
- Any pause event should be disclosed publicly with reason and expected resolution path

## Team and Treasury Handling

Recommended production standards:

- Team allocation should be subject to vesting or lockups
- Treasury wallets should be documented internally
- Marketing and partnership allocations should be tracked with purpose
- Future liquidity allocation should be reserved for planned market depth expansion, not arbitrary distribution

## Launch Disclosure Checklist

Before promoting KPL publicly, publish the following:

1. Official mainnet contract address
2. Official explorer link
3. Final initial liquidity ratio
4. Treasury policy
5. Team allocation policy
6. Minting policy
7. Ownership and multisig policy
8. Clear statement that older mainnet deployments are deprecated
9. Clear statement that the live supply is `1,000,200 KPL`, not the original `1,000,000 KPL` baseline

## Risk Disclosures

Users should understand the following:

- The contract includes owner-controlled mint authority
- The contract includes owner-controlled pause authority
- Price discovery depends on liquidity depth and can be highly volatile at launch
- Thin liquidity can produce severe slippage and price manipulation risk
- Multiple older mainnet deployments exist and must not be confused with the official contract

## Current Recommendation

For a credible public launch:

1. Keep `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` as the only official mainnet contract
2. Launch with the deeper reference pool of `5,000 MON + 10,845 KPL`
3. Transfer ownership to a multisig before broad promotion
4. Publish this tokenomics policy together with the operational runbook and official contract address
5. Explicitly disclose that the live supply is `1,000,200 KPL`
