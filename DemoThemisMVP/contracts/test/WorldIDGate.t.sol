// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {WorldIDGate, IWorldIDVerifier} from "../src/sybil/WorldIDGate.sol";

/// @dev Stand-in for the deployed World ID 4.0 verifier. The real verifier runs a
///      Groth16 check; here we accept exactly one "good" proof[0] limb and revert
///      on any other, mirroring the on-chain failure a corrupted limb produces.
///      NOT a real verifier — the actual Groth16 verification is proven on mainnet
///      (a `cast call` returns `0x` for a valid simulator proof and reverts
///      `0x7fcdd1f4` for a forged one, see docs/DEMO.md). This mock only exists to
///      drive the gate's decode/binding logic and the registry's nullifier gate.
contract MockWorldIDVerifier is IWorldIDVerifier {
    error ProofRejected();

    /// @dev The single accepted Groth16 limb-0; any other value is a "forged" proof.
    uint256 public constant GOOD_LIMB0 = 0xC0FFEE;

    // Records of the last call, so a test can assert the gate forwarded the right args.
    uint256 public lastAction;
    uint64 public lastRpId;
    uint256 public lastSignalHash;

    function verify(
        uint256,
        uint256 action,
        uint64 rpId,
        uint256,
        uint256 signalHash,
        uint64,
        uint64,
        uint256,
        uint256[5] calldata proof
    ) external {
        if (proof[0] != GOOD_LIMB0) revert ProofRejected();
        lastAction = action;
        lastRpId = rpId;
        lastSignalHash = signalHash;
    }
}

contract WorldIDGateTest is Test {
    MockUSD internal musd;
    MockWorldIDVerifier internal verifier;
    WorldIDGate internal gate;
    JurorRegistry internal registry;

    uint256 internal constant BOND = 5 * 10 ** 6;
    uint64 internal constant RP_ID = 0x1ddcf8ba2efe3f36;
    uint256 internal constant GOOD_LIMB0 = 0xC0FFEE;
    // The field-fitted action, exactly as Deploy.s.sol computes it.
    uint256 internal action;

    function setUp() public {
        action = uint256(keccak256("juror-registration")) >> 8;
        musd = new MockUSD();
        verifier = new MockWorldIDVerifier();
        gate = new WorldIDGate(address(verifier), action, RP_ID);
        registry = new JurorRegistry(musd, gate);
    }

    /// @dev Build the v4 9-tuple `bytes` the gate decodes, bound to `signal`. The
    ///      signal_hash is computed exactly as IDKit's hashSignal does for an
    ///      address (keccak of the 20 raw bytes, >> 8) — what the gate recomputes.
    function _proof(uint256 nullifier, address signal, uint256 limb0) internal view returns (bytes memory) {
        uint256 signalHash = uint256(keccak256(abi.encodePacked(signal))) >> 8;
        uint256[5] memory g = [uint256(limb0), uint256(2), uint256(3), uint256(4), uint256(5)];
        return abi.encode(
            nullifier,
            action,
            RP_ID,
            uint256(123), // nonce
            signalHash,
            uint64(0), // expiresAtMin
            uint64(1), // issuerSchemaId (1 = proof_of_human)
            uint256(0), // credentialGenesisIssuedAtMin
            g
        );
    }

    function _fundAndApprove(address who) internal {
        deal(address(musd), who, 100 * 10 ** 6);
        vm.prank(who);
        musd.approve(address(registry), type(uint256).max);
    }

    /// Valid proof → real verify path runs, juror joins, nullifier recorded.
    function test_register_validProof_recordsJuror() public {
        address j = makeAddr("juror0");
        _fundAndApprove(j);
        vm.prank(j);
        registry.register(j, _proof(uint256(0xABCD), j, GOOD_LIMB0));

        assertTrue(registry.isActive(j));
        assertEq(registry.bondOf(j), BOND);
        assertTrue(registry.nullifierUsed(0xABCD));
        assertEq(musd.balanceOf(address(registry)), BOND);
        // the gate forwarded its own immutable action/rpId, and the wallet-bound hash
        assertEq(verifier.lastAction(), action);
        assertEq(verifier.lastRpId(), RP_ID);
        assertEq(verifier.lastSignalHash(), uint256(keccak256(abi.encodePacked(j))) >> 8);
    }

    /// Forged proof (a corrupted Groth16 limb) → reverts INSIDE the verifier, the
    /// on-chain artifact §10's grant claim leans on (mirrors the mainnet revert).
    function test_register_forgedProof_revertsInVerifier() public {
        address j = makeAddr("juror0");
        _fundAndApprove(j);
        vm.prank(j);
        vm.expectRevert(MockWorldIDVerifier.ProofRejected.selector);
        registry.register(j, _proof(uint256(0xABCD), j, GOOD_LIMB0 ^ 1));
        // nothing was registered
        assertFalse(registry.isActive(j));
    }

    /// Duplicate human (same valid nullifier, second wallet) → reverts in the
    /// registry's nullifier mapping. This IS the sybil gate.
    function test_register_reusedNullifier_revertsInRegistry() public {
        address j1 = makeAddr("juror0");
        _fundAndApprove(j1);
        vm.prank(j1);
        registry.register(j1, _proof(uint256(0xABCD), j1, GOOD_LIMB0));

        address j2 = makeAddr("juror1");
        _fundAndApprove(j2);
        vm.prank(j2);
        vm.expectRevert(JurorRegistry.NullifierAlreadyUsed.selector);
        registry.register(j2, _proof(uint256(0xABCD), j2, GOOD_LIMB0));
    }

    /// Proof bound to someone else's wallet → reverts in the gate before Groth16.
    function test_register_signalMismatch_revertsInGate() public {
        address j = makeAddr("juror0");
        address other = makeAddr("other");
        _fundAndApprove(j);
        bytes memory p = _proof(uint256(0xABCD), other, GOOD_LIMB0);
        vm.prank(j);
        vm.expectRevert(WorldIDGate.SignalHashMismatch.selector);
        registry.register(j, p);
    }

    /// A valid proof_of_human for a different action cannot satisfy this gate.
    function test_register_wrongAction_revertsInGate() public {
        address j = makeAddr("juror0");
        _fundAndApprove(j);
        uint256 signalHash = uint256(keccak256(abi.encodePacked(j))) >> 8;
        uint256[5] memory g = [uint256(GOOD_LIMB0), uint256(2), uint256(3), uint256(4), uint256(5)];
        bytes memory p = abi.encode(
            uint256(0xABCD), action + 1, RP_ID, uint256(123), signalHash, uint64(0), uint64(1), uint256(0), g
        );
        vm.prank(j);
        vm.expectRevert(WorldIDGate.ActionMismatch.selector);
        registry.register(j, p);
    }

    /// A proof for a different RP id cannot satisfy this gate.
    function test_register_wrongRpId_revertsInGate() public {
        address j = makeAddr("juror0");
        _fundAndApprove(j);
        uint256 signalHash = uint256(keccak256(abi.encodePacked(j))) >> 8;
        uint256[5] memory g = [uint256(GOOD_LIMB0), uint256(2), uint256(3), uint256(4), uint256(5)];
        bytes memory p = abi.encode(
            uint256(0xABCD), action, uint64(RP_ID + 1), uint256(123), signalHash, uint64(0), uint64(1), uint256(0), g
        );
        vm.prank(j);
        vm.expectRevert(WorldIDGate.RpIdMismatch.selector);
        registry.register(j, p);
    }

    /// A stolen proof (bound to victim A) presented by wallet B with signal=A is
    /// stopped by the registry's signal==msg.sender check, before the gate.
    function test_register_stolenProof_signalNotSender_reverts() public {
        address victimA = makeAddr("victimA");
        address attackerB = makeAddr("attackerB");
        _fundAndApprove(attackerB);
        // B submits A's wallet as the signal (and a proof bound to A).
        bytes memory p = _proof(uint256(0xABCD), victimA, GOOD_LIMB0);
        vm.prank(attackerB);
        vm.expectRevert(JurorRegistry.SignalNotSender.selector);
        registry.register(victimA, p);
    }

    /// A malformed/truncated proof blob cannot be coerced into a passing decode.
    function test_register_truncatedProof_reverts() public {
        address j = makeAddr("juror0");
        _fundAndApprove(j);
        bytes memory full = _proof(uint256(0xABCD), j, GOOD_LIMB0);
        bytes memory truncated = new bytes(full.length - 32);
        for (uint256 i; i < truncated.length; i++) {
            truncated[i] = full[i];
        }
        vm.prank(j);
        vm.expectRevert(); // abi.decode of a short blob reverts
        registry.register(j, truncated);
        assertFalse(registry.isActive(j));
    }

    /// The gate returns the decoded nullifier on a valid proof.
    function test_gate_returnsNullifier() public {
        address j = makeAddr("juror0");
        uint256 n = gate.verify(j, _proof(uint256(0xBEEF), j, GOOD_LIMB0));
        assertEq(n, 0xBEEF);
    }
}
