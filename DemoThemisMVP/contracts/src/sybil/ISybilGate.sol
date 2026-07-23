// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISybilGate — pluggable one-human-one-seat verification
/// @notice Decouples `JurorRegistry` from any specific World ID version. The
///         registry calls this interface and each deployment selects an
///         immutable concrete gate:
///           - Sepolia cohort + tests: MockSybilGate (labeled stand-in)
///           - new mainnet instances: WorldIDGate (World ID 4.0 Production proxy)
///           - legacy compatibility only: WorldIDRouterGate (World ID 3.0)
interface ISybilGate {
    /// @notice Verify a personhood proof bound to `signal`; return the unique
    ///         per-human nullifier. MUST revert if the proof is invalid or not
    ///         bound to `signal`. The caller (JurorRegistry) rejects reused
    ///         nullifiers — that rejection is the sybil gate.
    function verify(address signal, bytes calldata proof) external returns (uint256 nullifier);
}
