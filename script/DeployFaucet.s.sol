// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TokenFaucet} from "../src/TokenFaucet.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

/// Env: TOKEN_ADDRESS, DRIP_AMOUNT (wei), COOLDOWN_SECONDS
///   forge script script/DeployFaucet.s.sol --rpc-url base_sepolia --broadcast --private-key $PRIVATE_KEY
contract DeployFaucet is Script {
    function run() external returns (TokenFaucet faucet) {
        address token = vm.envAddress("TOKEN_ADDRESS");
        uint256 drip = vm.envUint("DRIP_AMOUNT");
        uint256 cooldown = vm.envUint("COOLDOWN_SECONDS");

        vm.startBroadcast();
        faucet = new TokenFaucet(IERC20(token), drip, cooldown);
        vm.stopBroadcast();

        console.log("TokenFaucet deployed at:", address(faucet));
    }
}
