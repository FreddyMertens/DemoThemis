// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISybilGate} from "./ISybilGate.sol";

/// @title MockSybilGate — SIMULATED sybil gate for the Sepolia cohort + tests
/// @notice NOT real World ID. It mimics the two properties the registry relies
///         on — a unique per-human nullifier, and binding of the proof to the
///         registrant's `signal` — so the cohort and the test suite exercise the
///         exact registry logic the real gate will drive on mainnet. The Sepolia
///         cohort is scripted-and-disclosed (see docs/MECHANISM_DELTA.md), so a
///         labeled stand-in here is honest; the real World ID slice is mainnet.
/// @dev    proof = abi.encode(uint256 nullifier, address boundSignal).
contract MockSybilGate is ISybilGate {
    error SignalMismatch();

    function verify(address signal, bytes calldata proof) external pure returns (uint256 nullifier) {
        address boundSignal;
        (nullifier, boundSignal) = abi.decode(proof, (uint256, address));
        // A real World ID proof can only be produced for the signal it was issued
        // for; the stand-in enforces the same binding so "someone else's proof"
        // (signal mismatch) is rejected exactly as it would be on-chain.
        if (boundSignal != signal) revert SignalMismatch();
    }
}
