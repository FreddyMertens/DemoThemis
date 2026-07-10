// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {RewardPool} from "../src/RewardPool.sol";

/// @dev The RewardPool is a passive sink: funds arrive by plain transfer (court
///      slashes + the 20% fee cut + dust) and only the running balance is exposed.
///      There is deliberately no payout/distribute path on-chain in the MVP — the
///      gated cyclic distribution lives in the /sandbox simulation. See
///      docs/MECHANISM_DELTA.md.
contract RewardPoolTest is Test {
    MockUSD internal musd;
    RewardPool internal pool;

    function setUp() public {
        musd = new MockUSD();
        pool = new RewardPool(musd);
    }

    function test_balance_tracksFunds() public {
        deal(address(musd), address(pool), 7_000_000, true);
        assertEq(pool.balance(), 7_000_000);
    }

    function test_balance_isZeroAtDeploy() public view {
        assertEq(pool.balance(), 0);
    }

    /// @dev Funds only accumulate: a second transfer adds to the terminal balance.
    function test_balance_accumulates() public {
        deal(address(musd), address(pool), 4_000_000, true);
        deal(address(musd), address(pool), 4_000_000 + 1_500_000, true);
        assertEq(pool.balance(), 5_500_000);
    }

    /// @dev The token is the immutable it was constructed with.
    function test_token_isImmutable() public view {
        assertEq(address(pool.token()), address(musd));
    }
}
