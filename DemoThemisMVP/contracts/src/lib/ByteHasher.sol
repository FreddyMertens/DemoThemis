// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ByteHasher — keccak256 shifted into the SNARK scalar field
/// @notice The canonical World ID `hashToField`: a keccak256 right-shifted by 8
///         bits so the result always fits inside the BN254 scalar field that the
///         Groth16 verifier's public inputs live in. This is the same shift the
///         v3 spike used (`spike/SpikeVerifier.sol`) and the same one the World ID
///         client (idkit-core's `hashSignal`) applies off-chain, so an on-chain
///         `hashToField(abi.encodePacked(addr))` reproduces the `signal_hash`
///         IDKit puts in the proof for an address signal.
library ByteHasher {
    /// @dev keccak256 hash of `value`, right-shifted 8 bits into the SNARK field.
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}
