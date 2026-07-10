// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSD} from "../src/MockUSD.sol";

contract MockUSDTest is Test {
    MockUSD internal musd;
    address internal alice = makeAddr("alice");

    function setUp() public {
        musd = new MockUSD();
    }

    function test_metadata() public view {
        assertEq(musd.name(), "Demo USD");
        assertEq(musd.symbol(), "MUSD");
        assertEq(musd.decimals(), 6);
    }

    function test_faucet_mints() public {
        vm.prank(alice);
        musd.faucet();
        assertEq(musd.balanceOf(alice), 100 * 10 ** 6);
    }

    function test_faucet_cooldown() public {
        vm.startPrank(alice);
        musd.faucet();
        vm.expectRevert(abi.encodeWithSelector(MockUSD.FaucetCooldown.selector, block.timestamp + 1 days));
        musd.faucet();
        vm.stopPrank();
    }

    function test_faucet_afterCooldown() public {
        vm.startPrank(alice);
        musd.faucet();
        vm.warp(block.timestamp + 1 days);
        musd.faucet();
        vm.stopPrank();
        assertEq(musd.balanceOf(alice), 200 * 10 ** 6);
    }
}
