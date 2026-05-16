# KingPulse Launch Checklist

This checklist tracks the KingPulse contract currently used by this repo on Monad mainnet.

As of `2026-05-16`, the repo default is `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`. The remaining launch work is explorer/profile cleanup, liquidity sizing, and public disclosure of the current owner-governed but mint-finalized posture.

## Contract In Use

- Network: Monad Mainnet
- Chain ID: `143`
- Contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Token: `KingPulse (KPL)`

## Current Verified On-Chain State

Before launch, confirm:

```bash
cd /home/el3aw/kingpulse
npm run token-info
npm run migration:status
```

Expected baseline:

- Contract: `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- Name: `KingPulse`
- Symbol: `KPL`
- Decimals: `18`
- Total supply: `27,510.0 KPL`
- Externally held supply: `27,510.0 KPL`
- Owner: `0x17C33dB369B0BcAcEc40115f5D1665f43fF70361`
- Paused: `false`
- KPL held at the token contract address: `0.0 KPL`
- Max supply: `27,510.0 KPL`
- Migration finalized: `true`

Active-supply notes:

- Do not publish `1,000,000 KPL` or `1,000,200 KPL` as the current live supply.
- Do not count the legacy contract-held `2,240 KPL` at `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c` as spendable treasury, launch inventory, or holder balance.

## Ownership

Current observed owner:

- `0x17C33dB369B0BcAcEc40115f5D1665f43fF70361`

Current control posture:

- [ ] Keep the current owner temporarily for launch
- [ ] Or transfer ownership to a real multisig before launch
- [ ] Do not renounce ownership unless you intentionally want to disable contract-balance recovery and burn helpers
- [ ] Disclose publicly that minting is already closed because `migrationFinalized = true`

If ownership is moving:

```bash
cd /home/el3aw/kingpulse
npm run transfer-ownership -- 0xYourMultisigAddress
npm run token-info
npm run migration:status
```

## Liquidity Plan

Before adding liquidity:

- [ ] Recalculate the actual KPL amount against the live `27,510 KPL` total and externally held supply
- [ ] Recalculate against live `MON` price
- [ ] Confirm the wallet providing `KPL` holds the intended amount on `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- [ ] Confirm the wallet providing `MON` holds the intended amount plus gas
- [ ] Confirm the DEX/router/pool address you plan to use
- [ ] Confirm no one is using the legacy `0x740...` balance model in liquidity math

Deprecated reference:

- The old `5,000 MON + 10,845 KPL` example came from the archived `1,000,000 KPL` planning model and should not be reused as a current percentage target.

## Treasury And Supply Handling

Before launch:

- [ ] Confirm which wallet is treasury custody
- [ ] Confirm which wallet will provide launch liquidity
- [ ] Confirm whether treasury and admin are intentionally the same wallet
- [ ] Confirm no unintended token transfers have occurred on the selected contract
- [ ] Confirm the active contract-held token balance is `0 KPL`
- [ ] Confirm no one is relying on the legacy `0x740...` contract-held `2,240 KPL`

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

- `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`

Legacy-contract reference:

- `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`

## Deprecated Deployments

Do not promote the following as official:

- `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
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

- [ ] owner / multisig policy
- [ ] pause policy
- [ ] migration-finalized / mint-closed policy
- [ ] treasury usage policy
- [ ] legacy `0x740...` deprecation note
- [ ] current supply state

If these are not clear, users will not know whether the token is admin-controlled, mint-closed, or still tied to the deprecated legacy deployment.

## Final Go/No-Go

Do not launch until all of the following are true:

- [ ] contract in use is confirmed as `0x8AC0786d71EE4D57C1FC6B7BCef4CDB807825369`
- [ ] owner/multisig posture is disclosed accurately
- [ ] liquidity amounts are recalculated against the live `27,510 KPL` supply
- [ ] official public docs are updated
- [ ] deprecated deployments are not being promoted
- [ ] treasury and launch wallets are verified
