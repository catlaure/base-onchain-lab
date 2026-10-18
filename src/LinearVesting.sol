// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title LinearVesting
/// @notice Holds an ERC-20 balance for a single beneficiary and releases it
///         linearly between `start` and `start + duration`, with an optional cliff.
/// @dev Tokens are funded by simply transferring them to this contract. The total
///      allocation is `balance + released`, so top-ups are vested over the same schedule.
contract LinearVesting {
    IERC20 public immutable token;
    address public immutable beneficiary;
    uint64 public immutable start;
    uint64 public immutable cliff;
    uint64 public immutable duration;

    uint256 public released;

    event Released(address indexed beneficiary, uint256 amount);

    error ZeroAddress();
    error InvalidSchedule();
    error NothingToRelease();
    error TransferFailed();

    constructor(IERC20 _token, address _beneficiary, uint64 _start, uint64 _cliffDuration, uint64 _duration) {
        if (address(_token) == address(0) || _beneficiary == address(0)) revert ZeroAddress();
        if (_duration == 0 || _cliffDuration > _duration) revert InvalidSchedule();

        token = _token;
        beneficiary = _beneficiary;
        start = _start;
        cliff = _start + _cliffDuration;
        duration = _duration;
    }

    /// @notice Total amount vested at `timestamp` (released + still claimable).
    function vestedAmount(uint64 timestamp) public view returns (uint256) {
        uint256 total = token.balanceOf(address(this)) + released;
        if (timestamp < cliff) return 0;
        if (timestamp >= start + duration) return total;
        return (total * (timestamp - start)) / duration;
    }

    /// @notice Amount that can be released right now.
    function releasable() public view returns (uint256) {
        return vestedAmount(uint64(block.timestamp)) - released;
    }

    /// @notice Sends all currently vested tokens to the beneficiary. Callable by anyone.
    function release() external returns (uint256 amount) {
        amount = releasable();
        if (amount == 0) revert NothingToRelease();

        released += amount;
        if (!token.transfer(beneficiary, amount)) revert TransferFailed();
        emit Released(beneficiary, amount);
    }
}
