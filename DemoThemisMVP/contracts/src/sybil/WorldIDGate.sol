// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISybilGate} from "./ISybilGate.sol";
import {ByteHasher} from "../lib/ByteHasher.sol";

/// @title IWorldIDVerifier — the World ID 4.0 on-chain verifier
/// @notice Minimal interface for the upgradeable World ID 4.0 verifier proxies
///         officially deployed on World Chain. `verify`
///         reverts on an invalid proof and returns nothing on success — a live
///         `cast call` returned `0x` for a valid simulator proof and reverted
///         (`0x7fcdd1f4`) for a forged one (docs/STEP_3.5_KICKOFF.md). Declared
///         non-`view` so the gate reaches it with a plain CALL regardless of the
///         verifier's own state mutability.
/// @dev    Arg order is fixed by the deployed verifier and verified empirically:
///         verify(nullifier, action, rpId, nonce, signalHash, expiresAtMin,
///         issuerSchemaId, credentialGenesisIssuedAtMin, proof[5]).
/// @dev    SAFETY: the official interface returns nothing and reverts on a bad
///         proof. The gate therefore ignores returndata. The capstone runbook
///         still requires a forged-proof trace against the selected Production
///         proxy before registration opens.
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

/// @title WorldIDGate — production World ID 4.0 uniqueness-proof gate
/// @notice Runs a real on-chain
///         Groth16 verification through the deployed World ID 4.0
///         `WorldIDVerifier.verify` in the registration transaction, so the
///         proof check and a forged proof revert on-chain. New mainnet deployments
///         use the officially documented Production proxy (`0x0000…94d7`) and
///         require World ID 4.0 proofs. The Staging proxy (`0x703a…`) remains useful
///         only for explicitly labeled Simulator testing. This gate accepts only
///         proof-of-human schema 1; a Device-only credential cannot create a juror
///         seat. Any device-presence check is a separate post-Orb anti-rental step.
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

    /// @notice Release marker used by deployment tooling to reject v3-only gates.
    uint256 public constant WORLD_ID_PROTOCOL_VERSION = 4;

    /// @notice World ID issuer schema 1 is the proof-of-human credential required
    ///         for juror eligibility.
    uint64 public constant PROOF_OF_HUMAN_SCHEMA_ID = 1;

    /// @notice The World ID 4.0 verifier proxy this gate calls.
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
    /// @dev Device-only or another credential schema cannot create a juror seat.
    error IssuerSchemaMismatch();
    error ZeroVerifier();
    error ZeroAction();
    error ZeroRpId();

    constructor(address worldIdVerifier, uint256 action_, uint64 rpId_) {
        if (worldIdVerifier == address(0)) revert ZeroVerifier();
        if (action_ == 0) revert ZeroAction();
        if (rpId_ == 0) revert ZeroRpId();
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
        if (_issuerSchemaId != PROOF_OF_HUMAN_SCHEMA_ID) revert IssuerSchemaMismatch();

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
