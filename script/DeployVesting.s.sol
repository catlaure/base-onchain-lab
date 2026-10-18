// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LinearVesting} from "../src/LinearVesting.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

/// Env: TOKEN_ADDRESS, BENEFICIARY, START (unix), CLIFF_SECONDS, DURATION_SECONDS
///   forge script script/DeployVesting.s.sol --rpc-url base_sepolia --broadcast --private-key $PRIVATE_KEY
/// After deploying, transfer the tokens to be vested to the printed address.
contract DeployVesting is Script {
    function run() external returns (LinearVesting vesting) {
        address token = vm.envAddress("TOKEN_ADDRESS");
        address beneficiary = vm.envAddress("BENEFICIARY");
        uint64 start = uint64(vm.envUint("START"));
        uint64 cliff = uint64(vm.envUint("CLIFF_SECONDS"));
        uint64 duration = uint64(vm.envUint("DURATION_SECONDS"));

        vm.startBroadcast();
        vesting = new LinearVesting(IERC20(token), beneficiary, start, cliff, duration);
        vm.stopBroadcast();

        console.log("LinearVesting deployed at:", address(vesting));
    }
}
