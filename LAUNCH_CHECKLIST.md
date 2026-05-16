# KingPulse Launch Checklist

This checklist tracks the KingPulse contract currently used by this repo on Monad mainnet.

As of `2026-05-16`, the repo default is `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`. The remaining launch work is explorer/profile cleanup, liquidity sizing, and public disclosure of the current owner-renounced posture.

## Contract In Use

- Network: Monad Mainnet
- Chain ID: `143`
- Contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Token: `KingPulse (KPL)`

## Current Verified On-Chain State

Before launch, confirm:

```bash
cd /home/el3aw/kingpulse
npm run token-info
```

Expected baseline:

- Contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Name: `KingPulse`
- Symbol: `KPL`
- Decimals: `18`
- Total supply: `27,850.0 KPL`
- Externally held supply: `25,610.0 KPL`
- Owner: `0x0000000000000000000000000000000000000000`
- Paused: `false`
- KPL held at the token contract address: `2,240.0 KPL`

Active-supply notes:

- Do not publish `1,000,000 KPL` or `1,000,200 KPL` as the current live supply.
- Do not count the repo-default contract-held `2,240 KPL` as spendable treasury, launch inventory, or holder balance.
- When publishing supply numbers, disclose both total supply and externally held supply.

## Ownership

Current observed owner:

- `0x0000000000000000000000000000000000000000`

Current control posture:

- [ ] Disclose publicly that ownership is already renounced
- [ ] Disclose publicly that `mint`, `pause`, `unpause`, and ownership transfer are no longer possible
- [ ] Do not present any admin wallet as able to perform owner-only actions on the repo-default contract

There is no ownership-transfer step for the repo-default contract because the owner is already the zero address.

## Liquidity Plan

Before adding liquidity:

- [ ] Recalculate the actual KPL amount against the live `25,610 KPL` externally held supply
- [ ] Recalculate against live `MON` price
- [ ] Confirm the wallet providing `KPL` holds the intended amount on `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- [ ] Confirm the wallet providing `MON` holds the intended amount plus gas
- [ ] Confirm the DEX/router/pool address you plan to use
- [ ] Confirm no one is using the replacement `0x8AC...` balance model in liquidity math

Deprecated reference:

- The old `5,000 MON + 10,845 KPL` example came from the archived `1,000,000 KPL` planning model and should not be reused as a current percentage target.

## Treasury And Supply Handling

Before launch:

- [ ] Confirm which wallet is treasury custody
- [ ] Confirm which wallet will provide launch liquidity
- [ ] Confirm whether treasury and any admin/operator wallet are intentionally the same wallet
- [ ] Confirm no unintended token transfers have occurred on the selected contract
- [ ] Confirm the active contract-held token balance is `2,240 KPL`
- [ ] Confirm no one is relying on the stranded `2,240 KPL` as usable inventory

Suggested verification:

```bash
cd /home/el3aw/kingpulse
npm run balance -- 0xYourTreasuryWallet
npm run native-balance -- 0xYourTreasuryWallet
```

## Public Docs

Before launch, confirm all public references use the repo-default contract:

- [ ] `README.md`
- [ ] `OPERATIONS.md`
- [ ] `TOKENOMICS.md`
- [ ] `MIGRATION_PLAN.md`
- [ ] frontend default contract
- [ ] GitHub repo description / website field
- [ ] social posts / public announcements

Mainnet contract to publish:

- `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`

Replacement-contract reference:

- `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`

## Non-Official Deployments

Do not promote the following as the official token while `0x740...` remains the repo default:

- `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- `0xBC51Ff6E0e03d13B7C9c9916c931Ce69589c0F54`
- `0xd03f87cba1066afC456ca30cB76E368c18177691`
- `0xB8F5BfAdb3d703a8b31016bd48CdF188BDD959c7`
- `0x41eFE909baCddFF028052bb891f7027fb7823723`
- `0x529C6b93193F8127dAf9849422CBfD0F7d842931`
- `0xa4BbDE0711ECf0efc7DCeB6004067C1e038a6c35`
- `0x0E97181313Ca0a12cF77b88487890083D0871Ae5`
- `0xDA10484028100F02dcC88Fe147991059001AF273`

## Governance And Trust

Before launch, make sure your public position is clear on:

- [ ] owner-renounced policy
- [ ] pause policy (`paused = false`, but no one can change it)
- [ ] treasury usage policy
- [ ] stranded `2,240 KPL` disclosure
- [ ] current total-supply and externally-held-supply state
- [ ] replacement-contract status as reference only

If these are not clear, users will not know whether the token is ownerless, how much supply is actually spendable, or which deployment is official.

## Final Go/No-Go

Do not launch until all of the following are true:

- [ ] contract in use is confirmed as `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- [ ] owner-renounced posture is disclosed accurately
- [ ] liquidity amounts are recalculated against the live `25,610 KPL` externally held supply
- [ ] official public docs are updated
- [ ] non-official deployments are not being promoted
- [ ] treasury and launch wallets are verified
