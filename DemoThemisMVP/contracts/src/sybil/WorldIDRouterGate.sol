// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISybilGate} from "./ISybilGate.sol";
import {ByteHasher} from "../lib/ByteHasher.sol";

/// @notice Minimal interface for the World ID Router's documented v3-compatible
///         on-chain verification path. `verifyProof` reverts for an invalid proof.
interface IWorldIDRouter {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external;
}

/// @title WorldIDRouterGate — production World ID gate for current deployments
/// @notice Verifies an Orb proof through the World ID Router documented as
///         deployed on World Chain mainnet. The Router binds it to the wallet
///         signal and this app/action; the registry rejects reused nullifiers.
/// @dev Uses the supported v3 compatibility proof while the World ID 4.0
///      `WorldIDVerifier` remains preview. `ISybilGate` preserves a clean future
///      migration by deploying a new immutable gate/registry instance after audit.
contract WorldIDRouterGate is ISybilGate {
    using ByteHasher for bytes;

    /// @dev World ID group 1 is the Orb-verified credential group.
    uint256 public constant GROUP_ID = 1;

    IWorldIDRouter public immutable router;
    uint256 public immutable externalNullifierHash;

    error ZeroRouter();
    error EmptyAppId();
    error EmptyAction();

    constructor(address worldIdRouter, string memory appId, string memory action) {
        if (worldIdRouter == address(0)) revert ZeroRouter();
        if (bytes(appId).length == 0) revert EmptyAppId();
        if (bytes(action).length == 0) revert EmptyAction();

        router = IWorldIDRouter(worldIdRouter);
        externalNullifierHash = abi.encodePacked(abi.encodePacked(appId).hashToField(), action).hashToField();
    }

    /// @inheritdoc ISybilGate
    /// @param proof `abi.encode(root, nullifierHash, uint256[8] groth16Proof)`.
    function verify(address signal, bytes calldata proof) external returns (uint256 nullifier) {
        (uint256 root, uint256 nullifierHash, uint256[8] memory groth16Proof) =
            abi.decode(proof, (uint256, uint256, uint256[8]));

        router.verifyProof(
            root, GROUP_ID, abi.encodePacked(signal).hashToField(), nullifierHash, externalNullifierHash, groth16Proof
        );

        return nullifierHash;
    }
}
