// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISybilGate — pluggable one-human-one-seat verification
/// @notice Decouples `JurorRegistry` from any specific World ID version. The
///         spike (docs/SPIKE.md) found World ID 4.0 replaced the v3
///         `router.verifyProof` with a new `WorldIDVerifier.verify`, deployed
///         only on World Chain mainnet. Rather than hardcode either, the
///         registry calls this interface; the concrete gate is chosen per
///         deployment:
///           - Sepolia cohort + tests: MockSybilGate (labeled stand-in)
///           - mainnet live instance:  a real World ID gate (added with the
///                                      mainnet slice; v3 router or v4 verifier)
interface ISybilGate {
    /// @notice Verify a personhood proof bound to `signal`; return the unique
    ///         per-human nullifier. MUST revert if the proof is invalid or not
    ///         bound to `signal`. The caller (JurorRegistry) rejects reused
    ///         nullifiers — that rejection is the sybil gate.
    function verify(address signal, bytes calldata proof) external returns (uint256 nullifier);
}
