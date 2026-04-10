// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title KingPulse
/// @notice Production-ready ERC20 token with permit, owner-controlled minting, user burning, and transfer pausing.
/// @dev Built for Solidity ^0.8.20 using current OpenZeppelin contract patterns and Etherscan-friendly imports.
contract KingPulse is ERC20, ERC20Permit, Ownable, Pausable, ReentrancyGuard {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    /// @notice Emitted when new tokens are minted.
    /// @param to Recipient of the newly minted tokens.
    /// @param amount Number of tokens minted.
    event TokensMinted(address indexed to, uint256 amount);

    /// @notice Emitted when tokens are burned.
    /// @param account Address whose tokens were burned.
    /// @param amount Number of tokens burned.
    event TokensBurned(address indexed account, uint256 amount);

    /// @notice Emitted when ERC20 transfers are paused.
    /// @param account Address that triggered the pause.
    event TransfersPaused(address indexed account);

    /// @notice Emitted when ERC20 transfers are resumed.
    /// @param account Address that triggered the unpause.
    event TransfersUnpaused(address indexed account);

    /// @notice Deploys the token and mints the initial supply to the deployer.
    /// @dev ERC20 uses 18 decimals by default, which matches the requested configuration.
    constructor()
        ERC20("KingPulse", "KPL")
        ERC20Permit("KingPulse")
        Ownable(msg.sender)
    {
        _mint(msg.sender, INITIAL_SUPPLY);
        emit TokensMinted(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice Mints new tokens to a recipient address.
    /// @dev Only the contract owner can call this function. Reentrancy protection is added defensively.
    /// @param to Recipient of the minted tokens.
    /// @param amount Number of tokens to mint.
    function mint(address to, uint256 amount) external onlyOwner nonReentrant {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /// @notice Burns tokens from the caller's balance.
    /// @dev Reentrancy protection is added defensively. The inherited ERC20 transfer event is also emitted.
    /// @param amount Number of tokens to burn.
    function burn(uint256 amount) external nonReentrant {
        _burn(_msgSender(), amount);
        emit TokensBurned(_msgSender(), amount);
    }

    /// @notice Burns tokens from another account using the caller's allowance.
    /// @dev Requires the caller to have enough allowance approved by `account`.
    /// @param account Address whose tokens will be burned.
    /// @param amount Number of tokens to burn.
    function burnFrom(address account, uint256 amount) external nonReentrant {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }

    /// @notice Pauses ERC20 transfers.
    /// @dev Only the owner can call this function. Minting and burning remain available by design.
    function pause() external onlyOwner {
        _pause();
        emit TransfersPaused(_msgSender());
    }

    /// @notice Resumes ERC20 transfers.
    /// @dev Only the owner can call this function.
    function unpause() external onlyOwner {
        _unpause();
        emit TransfersUnpaused(_msgSender());
    }

    /// @notice Updates balances during mint, burn, and transfer operations.
    /// @dev When paused, only direct wallet-to-wallet transfers are blocked. Minting and burning remain allowed.
    /// @param from Token sender.
    /// @param to Token recipient.
    /// @param value Number of tokens being moved.
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            _requireNotPaused();
        }

        super._update(from, to, value);
    }
}
