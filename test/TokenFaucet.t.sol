// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TokenFaucet} from "../src/TokenFaucet.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract TokenFaucetTest is Test {
    MockERC20 token;
    TokenFaucet faucet;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant DRIP = 10 ether;
    uint256 constant COOLDOWN = 1 days;

    event Claimed(address indexed account, uint256 amount);

    function setUp() public {
        vm.warp(1_000_000);
        token = new MockERC20();
        faucet = new TokenFaucet(IERC20(address(token)), DRIP, COOLDOWN);
        token.mint(address(faucet), 100 ether);
    }

    function test_InitialConfig() public view {
        assertEq(faucet.dripAmount(), DRIP);
        assertEq(faucet.cooldown(), COOLDOWN);
        assertEq(faucet.owner(), address(this));
        assertEq(faucet.nextClaimAt(alice), 0);
    }

    function test_FirstClaimPaysDrip() public {
        vm.expectEmit(true, false, false, true);
        emit Claimed(alice, DRIP);
        vm.prank(alice);
        faucet.claim();

        assertEq(token.balanceOf(alice), DRIP);
        assertEq(faucet.lastClaim(alice), block.timestamp);
    }

    function test_SecondClaimWithinCooldownReverts() public {
        vm.prank(alice);
        faucet.claim();

        uint256 availableAt = block.timestamp + COOLDOWN;
        vm.warp(block.timestamp + COOLDOWN - 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TokenFaucet.CooldownActive.selector, availableAt));
        faucet.claim();
    }

    function test_ClaimAgainAfterCooldown() public {
        vm.prank(alice);
        faucet.claim();
        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(alice);
        faucet.claim();
        assertEq(token.balanceOf(alice), 2 * DRIP);
    }

    function test_CooldownIsPerAddress() public {
        vm.prank(alice);
        faucet.claim();
        vm.prank(bob);
        faucet.claim();
        assertEq(token.balanceOf(bob), DRIP);
    }

    function test_ClaimRevertsWhenFaucetEmpty() public {
        faucet.sweep();
        vm.prank(alice);
        vm.expectRevert(TokenFaucet.FaucetEmpty.selector);
        faucet.claim();
    }

    function test_OwnerCanUpdateConfig() public {
        faucet.setConfig(1 ether, 1 hours);
        assertEq(faucet.dripAmount(), 1 ether);
        assertEq(faucet.cooldown(), 1 hours);
    }

    function test_NonOwnerCannotUpdateConfig() public {
        vm.prank(alice);
        vm.expectRevert(TokenFaucet.NotOwner.selector);
        faucet.setConfig(1, 1);
    }

    function test_SweepSendsBalanceToOwner() public {
        faucet.sweep();
        assertEq(token.balanceOf(address(this)), 100 ether);
        assertEq(token.balanceOf(address(faucet)), 0);
    }

    function test_NonOwnerCannotSweep() public {
        vm.prank(alice);
        vm.expectRevert(TokenFaucet.NotOwner.selector);
        faucet.sweep();
    }

    function test_TransferOwnership() public {
        faucet.transferOwnership(alice);
        assertEq(faucet.owner(), alice);
        vm.expectRevert(TokenFaucet.NotOwner.selector);
        faucet.sweep();
    }

    function test_ConstructorRejectsZeroToken() public {
        vm.expectRevert(TokenFaucet.ZeroAddress.selector);
        new TokenFaucet(IERC20(address(0)), DRIP, COOLDOWN);
    }
}
