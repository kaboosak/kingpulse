// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20 <0.9.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title KingPulseMigrationToken
/// @notice Replacement KPL scaffold with capped migration minting and explicit handling for contract-held balance.
contract KingPulseMigrationToken is ERC20, ERC20Permit, Ownable, Pausable, ReentrancyGuard {
    uint256 public immutable maxSupply;
    bool public migrationFinalized;

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed account, uint256 amount);
    event TransfersPaused(address indexed account);
    event TransfersUnpaused(address indexed account);
    event MigrationFinalized(address indexed account, uint256 totalSupply);
    event ContractBalanceRecovered(address indexed account, address indexed recipient, uint256 amount);
    event ContractBalanceBurned(address indexed account, uint256 amount);

    error CapExceeded(uint256 requestedTotalSupply, uint256 maxSupply);
    error LengthMismatch();
    error MigrationAlreadyFinalized();
    error ZeroSupplyCap();

    constructor(address initialOwner, uint256 maxSupply_)
        ERC20("KingPulse", "KPL")
        ERC20Permit("KingPulse")
        Ownable(initialOwner)
    {
        if (maxSupply_ == 0) {
            revert ZeroSupplyCap();
        }

        maxSupply = maxSupply_;
    }

    function mint(address to, uint256 amount) external onlyOwner nonReentrant {
        _requireMintingOpen();
        _enforceSupplyCap(totalSupply() + amount);
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function mintBatch(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner nonReentrant {
        _requireMintingOpen();

        if (recipients.length != amounts.length) {
            revert LengthMismatch();
        }

        uint256 batchTotal;
        for (uint256 index = 0; index < amounts.length; ++index) {
            batchTotal += amounts[index];
        }

        _enforceSupplyCap(totalSupply() + batchTotal);

        for (uint256 index = 0; index < recipients.length; ++index) {
            _mint(recipients[index], amounts[index]);
            emit TokensMinted(recipients[index], amounts[index]);
        }
    }

    function finalizeMigration() external onlyOwner {
        _requireMintingOpen();
        migrationFinalized = true;
        emit MigrationFinalized(_msgSender(), totalSupply());
    }

    function burn(uint256 amount) external nonReentrant {
        _burn(_msgSender(), amount);
        emit TokensBurned(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) external nonReentrant {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }

    function recoverContractBalance(address recipient, uint256 amount) external onlyOwner nonReentrant {
        _transfer(address(this), recipient, amount);
        emit ContractBalanceRecovered(_msgSender(), recipient, amount);
    }

    function burnContractBalance(uint256 amount) external onlyOwner nonReentrant {
        _burn(address(this), amount);
        emit ContractBalanceBurned(_msgSender(), amount);
    }

    function pause() external onlyOwner {
        _pause();
        emit TransfersPaused(_msgSender());
    }

    function unpause() external onlyOwner {
        _unpause();
        emit TransfersUnpaused(_msgSender());
    }

    function _requireMintingOpen() internal view {
        if (migrationFinalized) {
            revert MigrationAlreadyFinalized();
        }
    }

    function _enforceSupplyCap(uint256 requestedTotalSupply) internal view {
        if (requestedTotalSupply > maxSupply) {
            revert CapExceeded(requestedTotalSupply, maxSupply);
        }
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && from != address(this)) {
            _requireNotPaused();
        }

        super._update(from, to, value);
    }
}
