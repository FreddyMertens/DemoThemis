// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Implemented by DealEscrow; called back by DisputeCourt on resolution.
interface IEscrowSettlement {
    function settle(uint256 dealId, bool payeeWins) external;
}
