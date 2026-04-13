// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20 <0.9.0;

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";

/// @title KingPulseVestingWallet
/// @notice Thin wrapper around OpenZeppelin VestingWallet for KPL treasury, team, and ecosystem custody.
contract KingPulseVestingWallet is VestingWallet {
    constructor(address beneficiary, uint64 startTimestamp, uint64 durationSeconds)
        payable
        VestingWallet(beneficiary, startTimestamp, durationSeconds)
    {}
}
