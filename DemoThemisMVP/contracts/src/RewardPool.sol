// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title RewardPool — the passive sink for the reward cut and every slash
/// @notice The reference design (reference/demothemis-site, ch. 2/3/8) routes the
///         20% reward cut of each case fee and every slashed or forfeited bond to
///         one pool, "never to the winning jurors, so a majority earns nothing by
///         convicting its dissenters" (juror-court.html). That pool funds the
///         reward payout to active, high-quality jurors (Wilson-gated, recency-
///         weighted) — the gated cyclic distribution.
///
///         In the MVP this contract is a PASSIVE SINK only. It receives funds by
///         plain transfer (court slashes + the 20% fee cut + rounding dust) and
///         exposes the running balance. It has NO payout or distribute function:
///         the gated cyclic distribution is a funded-milestone feature, shown only
///         in the /sandbox simulation. The MUSD-conservation invariant
///         (test/Invariant.t.sol) treats this balance as terminal, so adding a
///         payout here would break it. See docs/MECHANISM_DELTA.md.
contract RewardPool {
    IERC20 public immutable token;

    constructor(IERC20 _token) {
        token = _token;
    }

    /// @notice Funds arrive by plain transfer (court slashes + the 20% fee cut +
    ///         rounding dust); this is the running balance the demo can show growing.
    function balance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
