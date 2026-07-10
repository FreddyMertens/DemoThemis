// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice The slice of DisputeCourt that DealEscrow calls when a deal is disputed.
interface IDisputeCourt {
    function openFromEscrow(
        uint256 dealId,
        bytes32 criteriaHash,
        string calldata uri,
        address payer,
        address payee,
        uint256 feeAmount
    ) external returns (uint256 caseId);
}
