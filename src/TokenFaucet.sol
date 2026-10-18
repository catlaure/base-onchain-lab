// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title TokenFaucet
/// @notice Drips a fixed amount of an ERC-20 to any address, at most once per cooldown period.
///         Intended for testnet tokens.
contract TokenFaucet {
    IERC20 public immutable token;
    address public owner;
    uint256 public dripAmount;
    uint256 public cooldown;

    mapping(address => uint256) public lastClaim;

    event Claimed(address indexed account, uint256 amount);
    event ConfigUpdated(uint256 dripAmount, uint256 cooldown);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error ZeroAddress();
    error CooldownActive(uint256 availableAt);
    error FaucetEmpty();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IERC20 _token, uint256 _dripAmount, uint256 _cooldown) {
        if (address(_token) == address(0)) revert ZeroAddress();
        token = _token;
        owner = msg.sender;
        dripAmount = _dripAmount;
        cooldown = _cooldown;
        emit OwnershipTransferred(address(0), msg.sender);
        emit ConfigUpdated(_dripAmount, _cooldown);
    }

    /// @notice Timestamp at which `account` may claim again (0 if it never claimed).
    function nextClaimAt(address account) public view returns (uint256) {
        uint256 last = lastClaim[account];
        return last == 0 ? 0 : last + cooldown;
    }

    function claim() external {
        uint256 availableAt = nextClaimAt(msg.sender);
        if (block.timestamp < availableAt) revert CooldownActive(availableAt);
        if (token.balanceOf(address(this)) < dripAmount) revert FaucetEmpty();

        lastClaim[msg.sender] = block.timestamp;
        if (!token.transfer(msg.sender, dripAmount)) revert TransferFailed();
        emit Claimed(msg.sender, dripAmount);
    }

    function setConfig(uint256 _dripAmount, uint256 _cooldown) external onlyOwner {
        dripAmount = _dripAmount;
        cooldown = _cooldown;
        emit ConfigUpdated(_dripAmount, _cooldown);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Sends the remaining faucet balance to the owner.
    function sweep() external onlyOwner {
        uint256 bal = token.balanceOf(address(this));
        if (!token.transfer(owner, bal)) revert TransferFailed();
    }
}
