# KingPulse Launch Checklist

This checklist is for the current official KingPulse mainnet deployment.

## Official Contract

- Network: Monad Mainnet
- Chain ID: `143`
- Official contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Token: `KingPulse (KPL)`

## Current Verified On-Chain State

Before launch, confirm:

```bash
cd /home/el3aw/kingpulse
npm run token-info:monad:mainnet
```

Expected baseline:

- Contract: `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- Name: `KingPulse`
- Symbol: `KPL`
- Decimals: `18`
- Total supply: `1,000,000.0 KPL`
- Paused: `false`

## Ownership

Current observed owner:

- `0x27c97c377f43e73b1F62b317E3499B510e5a0C95`

Pre-launch decision:

- [ ] Keep current owner temporarily for launch
- [ ] Or transfer ownership to a real multisig before launch

If ownership is moving:

```bash
cd /home/el3aw/kingpulse
npm run transfer-ownership:monad:mainnet -- 0xYourMultisigAddress
npm run token-info:monad:mainnet
```

## Liquidity Plan

Chosen reference pool:

- `5,000 MON + 10,845 KPL`

This implies:

- Target starting price: approximately `$0.01` per `KPL`
- Initial liquidity allocation: `10,845 KPL`
- Initial liquidity allocation share of total supply: `1.0845%`

Before adding liquidity:

- [ ] Recalculate against live `MON` price
- [ ] Confirm the wallet providing `KPL` holds at least `10,845 KPL`
- [ ] Confirm the wallet providing `MON` holds at least `5,000 MON` plus gas
- [ ] Confirm the DEX/router/pool address you plan to use

## Treasury and Supply Handling

Before launch:

- [ ] Confirm which wallet is treasury custody
- [ ] Confirm which wallet will provide launch liquidity
- [ ] Confirm whether treasury and admin are intentionally the same wallet
- [ ] Confirm no unintended token transfers have occurred

Suggested verification:

```bash
cd /home/el3aw/kingpulse
npm run balance:monad:mainnet -- 0x27c97c377f43e73b1F62b317E3499B510e5a0C95
npm run native-balance:monad:mainnet -- 0x27c97c377f43e73b1F62b317E3499B510e5a0C95
```

## Public Docs

Before launch, confirm all public references use only the official contract:

- [ ] `README.md`
- [ ] `OPERATIONS.md`
- [ ] `TOKENOMICS.md`
- [ ] frontend default contract
- [ ] GitHub repo description / website field
- [ ] social posts / public announcements

Official mainnet contract to publish:

- `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`

## Deprecated Deployments

Do not promote the following as official:

- `0xd03f87cba1066afC456ca30cB76E368c18177691`
- `0xB8F5BfAdb3d703a8b31016bd48CdF188BDD959c7`
- `0x41eFE909baCddFF028052bb891f7027fb7823723`
- `0x529C6b93193F8127dAf9849422CBfD0F7d842931`
- `0xa4BbDE0711ECf0efc7DCeB6004067C1e038a6c35`
- `0x0E97181313Ca0a12cF77b88487890083D0871Ae5`
- `0xDA10484028100F02dcC88Fe147991059001AF273`

## Governance and Trust

Before launch, make sure your public position is clear on:

- [ ] mint policy
- [ ] pause policy
- [ ] ownership policy
- [ ] team allocation policy
- [ ] treasury usage policy

If these are not clear, users will assume elevated admin risk.

## Final Go/No-Go

Do not launch until all of the following are true:

- [ ] official contract is confirmed as `0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c`
- [ ] owner is confirmed and intentionally chosen
- [ ] liquidity amounts are recalculated against live `MON` price
- [ ] official public docs are updated
- [ ] deprecated deployments are not being promoted
- [ ] treasury and launch wallets are verified
