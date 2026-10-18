// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LinearVesting} from "../src/LinearVesting.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract LinearVestingTest is Test {
    MockERC20 token;
    LinearVesting vesting;
    address beneficiary = makeAddr("beneficiary");

    uint64 constant START = 1_000;
    uint64 constant CLIFF = 100;
    uint64 constant DURATION = 1_000;
    uint256 constant TOTAL = 1_000 ether;

    event Released(address indexed beneficiary, uint256 amount);

    function setUp() public {
        token = new MockERC20();
        vesting = new LinearVesting(IERC20(address(token)), beneficiary, START, CLIFF, DURATION);
        token.mint(address(vesting), TOTAL);
    }

    function test_ScheduleIsStored() public view {
        assertEq(vesting.beneficiary(), beneficiary);
        assertEq(vesting.start(), START);
        assertEq(vesting.cliff(), START + CLIFF);
        assertEq(vesting.duration(), DURATION);
    }

    function test_NothingVestedBeforeStart() public {
        vm.warp(START - 1);
        assertEq(vesting.releasable(), 0);
    }

    function test_NothingVestedBeforeCliff() public {
        vm.warp(START + CLIFF - 1);
        assertEq(vesting.vestedAmount(uint64(block.timestamp)), 0);
        vm.expectRevert(LinearVesting.NothingToRelease.selector);
        vesting.release();
    }

    function test_CliffUnlocksProRataAmount() public {
        vm.warp(START + CLIFF);
        // 100 / 1000 of the schedule has elapsed
        assertEq(vesting.releasable(), 100 ether);
    }

    function test_ReleaseMidwayPaysHalf() public {
        vm.warp(START + DURATION / 2);

        vm.expectEmit(true, false, false, true);
        emit Released(beneficiary, 500 ether);
        vesting.release();

        assertEq(token.balanceOf(beneficiary), 500 ether);
        assertEq(vesting.released(), 500 ether);
    }

    function test_ReleaseAfterEndPaysEverything() public {
        vm.warp(START + DURATION + 10);
        vesting.release();
        assertEq(token.balanceOf(beneficiary), TOTAL);
        assertEq(token.balanceOf(address(vesting)), 0);
    }

    function test_MultipleReleasesNeverExceedTotal() public {
        vm.warp(START + 300);
        vesting.release();
        vm.warp(START + 700);
        vesting.release();
        vm.warp(START + DURATION);
        vesting.release();
        assertEq(token.balanceOf(beneficiary), TOTAL);
    }

    function test_SecondReleaseInSameBlockReverts() public {
        vm.warp(START + 500);
        vesting.release();
        vm.expectRevert(LinearVesting.NothingToRelease.selector);
        vesting.release();
    }

    function test_TopUpVestsOverSameSchedule() public {
        vm.warp(START + 500);
        vesting.release(); // 500 out, 500 left
        token.mint(address(vesting), 1_000 ether); // total allocation is now 2000
        // 50% of 2000 = 1000 vested, 500 already released
        assertEq(vesting.releasable(), 500 ether);
    }

    function test_AnyoneCanTriggerRelease() public {
        vm.warp(START + DURATION);
        vm.prank(makeAddr("stranger"));
        vesting.release();
        assertEq(token.balanceOf(beneficiary), TOTAL);
    }

    function test_ConstructorRejectsZeroAddresses() public {
        vm.expectRevert(LinearVesting.ZeroAddress.selector);
        new LinearVesting(IERC20(address(0)), beneficiary, START, CLIFF, DURATION);
        vm.expectRevert(LinearVesting.ZeroAddress.selector);
        new LinearVesting(IERC20(address(token)), address(0), START, CLIFF, DURATION);
    }

    function test_ConstructorRejectsBadSchedule() public {
        vm.expectRevert(LinearVesting.InvalidSchedule.selector);
        new LinearVesting(IERC20(address(token)), beneficiary, START, CLIFF, 0);
        vm.expectRevert(LinearVesting.InvalidSchedule.selector);
        new LinearVesting(IERC20(address(token)), beneficiary, START, DURATION + 1, DURATION);
    }

    function testFuzz_VestedAmountIsMonotonicAndBounded(uint64 a, uint64 b) public view {
        a = uint64(bound(a, 0, START + DURATION * 2));
        b = uint64(bound(b, a, START + DURATION * 2));
        uint256 va = vesting.vestedAmount(a);
        uint256 vb = vesting.vestedAmount(b);
        assertLe(va, vb);
        assertLe(vb, TOTAL);
    }
}
