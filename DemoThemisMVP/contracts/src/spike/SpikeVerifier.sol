// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// THROWAWAY SPIKE CONTRACT (step 1, SPIKE.md item a).
// Proves that a World ID staging proof from the simulator passes verifyProof
// on the World Chain Sepolia router. Not part of the MVP court. Deleted once
// the spike memo has its answer; JurorRegistry (step 2) supersedes it.

interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}

library ByteHasher {
    /// @dev keccak256 hash shifted into the SNARK scalar field, per World ID docs.
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}

contract SpikeVerifier {
    using ByteHasher for bytes;

    error DuplicateNullifier(uint256 nullifierHash);

    /// @dev groupId 1 = Orb-verified credentials.
    uint256 public constant GROUP_ID = 1;

    IWorldID public immutable worldId;
    uint256 public immutable externalNullifierHash;

    mapping(uint256 nullifierHash => bool seen) public seenNullifiers;
    uint256 public verifiedCount;

    event Verified(address indexed signal, uint256 nullifierHash);

    constructor(IWorldID _worldId, string memory _appId, string memory _action) {
        worldId = _worldId;
        externalNullifierHash =
            abi.encodePacked(abi.encodePacked(_appId).hashToField(), _action).hashToField();
    }

    /// @param signal the wallet address bound into the proof on the client
    function verifyAndRecord(address signal, uint256 root, uint256 nullifierHash, uint256[8] calldata proof)
        external
    {
        if (seenNullifiers[nullifierHash]) revert DuplicateNullifier(nullifierHash);
        worldId.verifyProof(
            root, GROUP_ID, abi.encodePacked(signal).hashToField(), nullifierHash, externalNullifierHash, proof
        );
        seenNullifiers[nullifierHash] = true;
        verifiedCount++;
        emit Verified(signal, nullifierHash);
    }
}
