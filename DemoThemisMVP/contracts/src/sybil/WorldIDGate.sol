// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISybilGate} from "./ISybilGate.sol";
import {ByteHasher} from "../lib/ByteHasher.sol";

/// @title IWorldIDVerifier — the World ID 4.0 on-chain verifier
/// @notice Minimal interface for the deployed `WorldIDVerifier` on World Chain
///         mainnet (Staging `0x703a6316c975DEabF30b637c155edD53e24657DB`,
///         Production `0x00000000009E00F9FE82CfeeBB4556686da094d7`). `verify`
///         reverts on an invalid proof and returns nothing on success — a live
///         `cast call` returned `0x` for a valid simulator proof and reverted
///         (`0x7fcdd1f4`) for a forged one (docs/STEP_3.5_KICKOFF.md). Declared
///         non-`view` so the gate reaches it with a plain CALL regardless of the
///         verifier's own state mutability.
/// @dev    Arg order is fixed by the deployed verifier and verified empirically:
///         verify(nullifier, action, rpId, nonce, signalHash, expiresAtMin,
///         issuerSchemaId, credentialGenesisIssuedAtMin, proof[5]).
/// @dev    SAFETY: the gate ignores returndata and relies on `verify` REVERTING
///         on a bad proof (confirmed for the Staging verifier). Before the Step-5
///         Production verifier swap, re-confirm Production also reverts (rather
///         than returning a bool) on a forged proof — that is the single
///         load-bearing assumption behind the env-only swap.
interface IWorldIDVerifier {
    function verify(
        uint256 nullifier,
        uint256 action,
        uint64 rpId,
        uint256 nonce,
        uint256 signalHash,
        uint64 expiresAtMin,
        uint64 issuerSchemaId,
        uint256 credentialGenesisIssuedAtMin,
        uint256[5] calldata proof
    ) external;
}

/// @title WorldIDGate — the REAL one-human-one-seat gate (World ID 4.0, mainnet)
/// @notice The mainnet `ISybilGate` for `JurorRegistry`. It runs a real on-chain
///         Groth16 verification through the deployed World ID 4.0
///         `WorldIDVerifier.verify` in the registration transaction, so the
///         court's one-human-one-seat claim is provable from a mainnet explorer
///         trace (the verifier is called in-tx) and a forged proof reverts
///         on-chain. The same gate serves both World ID environments by address:
///         the Staging verifier (`0x703a…`) accepts World ID Simulator proofs
///         (Step 3.5, the human-free de-risk), the Production verifier
///         (`0x0000…94d7`) accepts Orb/Device proofs from real humans (Step 5).
///         Swapping environments is a constructor-argument change only.
/// @dev    `proof` is `abi.encode(uint256 nullifier, uint256 action, uint64 rpId,
///         uint256 nonce, uint256 signalHash, uint64 expiresAtMin, uint64
///         issuerSchemaId, uint256 credentialGenesisIssuedAtMin, uint256[5]
///         proof)` — the eight v4 scalar inputs in declared order plus the
///         `uint256[5]` (4 Groth16 limbs + Merkle root). This is a DIFFERENT
///         encoding from `MockSybilGate` (a 2-tuple `(nullifier, signal)`); the
///         frontend onboard path must produce exactly this tuple. The IDKit→verify
///         field mapping is documented in docs/MECHANISM_DELTA.md.
contract WorldIDGate is ISybilGate {
    using ByteHasher for bytes;

    /// @notice The deployed World ID 4.0 verifier this gate calls (Staging or Production).
    IWorldIDVerifier public immutable verifier;

    /// @notice The field-fitted action this gate accepts: `keccak256("juror-registration") >> 8`.
    /// @dev    Set at deploy; the proof's action must match it, so a proof issued
    ///         for any other action (or app) is rejected before the Groth16 check.
    uint256 public immutable action;

    /// @notice The RP id with the `rp_` prefix stripped, as `uint64`
    ///         (`rp_1ddcf8ba2efe3f36` → `0x1ddcf8ba2efe3f36`).
    uint64 public immutable rpId;

    /// @dev The off-chain signal_hash did not equal hashToField(signal): the proof
    ///      is not bound to the registering wallet.
    error SignalHashMismatch();
    /// @dev The proof's action is not this gate's action.
    error ActionMismatch();
    /// @dev The proof's RP id is not this gate's RP id.
    error RpIdMismatch();

    constructor(address worldIdVerifier, uint256 action_, uint64 rpId_) {
        verifier = IWorldIDVerifier(worldIdVerifier);
        action = action_;
        rpId = rpId_;
    }

    /// @inheritdoc ISybilGate
    /// @notice Decode the v4 proof tuple, bind it to `signal`, and run the on-chain
    ///         World ID verification. Reverts on a forged/expired/wrong-tree proof
    ///         (inside the verifier) or on a binding mismatch (here); returns the
    ///         per-human nullifier on success. The caller (`JurorRegistry`) rejects
    ///         a reused nullifier — that rejection is the sybil gate.
    function verify(address signal, bytes calldata proof) external returns (uint256 nullifier) {
        (
            uint256 _nullifier,
            uint256 _action,
            uint64 _rpId,
            uint256 _nonce,
            uint256 _signalHash,
            uint64 _expiresAtMin,
            uint64 _issuerSchemaId,
            uint256 _credentialGenesisIssuedAtMin,
            uint256[5] memory _proof
        ) = abi.decode(proof, (uint256, uint256, uint64, uint256, uint256, uint64, uint64, uint256, uint256[5]));

        // Bind the proof to the registering wallet. IDKit's `hashSignal` treats a
        // 0x-prefixed 20-byte address as raw bytes, so its off-chain signal_hash
        // equals this on-chain hashToField(abi.encodePacked(address)). A proof
        // generated for any other signal fails here before the Groth16 check.
        if (_signalHash != abi.encodePacked(signal).hashToField()) revert SignalHashMismatch();
        // The proof must be for THIS app's action and RP — never an attacker's, so a
        // valid proof_of_human for some other action/app cannot satisfy this gate.
        if (_action != action) revert ActionMismatch();
        if (_rpId != rpId) revert RpIdMismatch();

        // Real on-chain Groth16 verification. We pass our own immutable action/rpId
        // (asserted equal above) as the public inputs the verifier checks against.
        verifier.verify(
            _nullifier,
            action,
            rpId,
            _nonce,
            _signalHash,
            _expiresAtMin,
            _issuerSchemaId,
            _credentialGenesisIssuedAtMin,
            _proof
        );

        return _nullifier;
    }
}
