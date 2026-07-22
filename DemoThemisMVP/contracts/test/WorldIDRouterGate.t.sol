// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {WorldIDRouterGate, IWorldIDRouter} from "../src/sybil/WorldIDRouterGate.sol";

contract MockWorldIDRouter is IWorldIDRouter {
    error ProofRejected();

    uint256 public constant GOOD_LIMB0 = 0xC0FFEE;
    uint256 public lastRoot;
    uint256 public lastGroupId;
    uint256 public lastSignalHash;
    uint256 public lastNullifierHash;
    uint256 public lastExternalNullifierHash;

    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external {
        if (proof[0] != GOOD_LIMB0) revert ProofRejected();
        lastRoot = root;
        lastGroupId = groupId;
        lastSignalHash = signalHash;
        lastNullifierHash = nullifierHash;
        lastExternalNullifierHash = externalNullifierHash;
    }
}

contract WorldIDRouterGateTest is Test {
    string internal constant APP_ID = "app_7bdfda4db4e2f59dd4a2427cd2bd860d";
    string internal constant ACTION = "juror-registration";
    uint256 internal constant BOND = 5 * 10 ** 6;
    uint256 internal constant ROOT = 0x1234;
    uint256 internal constant NULLIFIER = 0xABCD;
    uint256 internal constant GOOD_LIMB0 = 0xC0FFEE;

    MockUSD internal musd;
    MockWorldIDRouter internal router;
    WorldIDRouterGate internal gate;
    JurorRegistry internal registry;

    function setUp() public {
        musd = new MockUSD();
        router = new MockWorldIDRouter();
        gate = new WorldIDRouterGate(address(router), APP_ID, ACTION);
        registry = new JurorRegistry(musd, gate);
    }

    function _proof(uint256 nullifier, uint256 limb0) internal pure returns (bytes memory) {
        uint256[8] memory groth16Proof =
            [uint256(limb0), uint256(2), uint256(3), uint256(4), uint256(5), uint256(6), uint256(7), uint256(8)];
        return abi.encode(ROOT, nullifier, groth16Proof);
    }

    function _fundAndApprove(address who) internal {
        deal(address(musd), who, 100 * 10 ** 6);
        vm.prank(who);
        musd.approve(address(registry), type(uint256).max);
    }

    function test_register_forwardsWalletAndAppActionBinding() public {
        address juror = makeAddr("juror");
        _fundAndApprove(juror);

        vm.prank(juror);
        registry.register(juror, _proof(NULLIFIER, GOOD_LIMB0));

        assertTrue(registry.isActive(juror));
        assertTrue(registry.nullifierUsed(NULLIFIER));
        assertEq(registry.bondOf(juror), BOND);
        assertEq(router.lastRoot(), ROOT);
        assertEq(router.lastGroupId(), 1);
        assertEq(router.lastSignalHash(), uint256(keccak256(abi.encodePacked(juror))) >> 8);
        assertEq(router.lastNullifierHash(), NULLIFIER);
        assertEq(router.lastExternalNullifierHash(), gate.externalNullifierHash());

        uint256 appHash = uint256(keccak256(abi.encodePacked(APP_ID))) >> 8;
        uint256 expectedExternalNullifier = uint256(keccak256(abi.encodePacked(appHash, ACTION))) >> 8;
        assertEq(gate.externalNullifierHash(), expectedExternalNullifier);
    }

    function test_register_forgedProof_revertsInRouter() public {
        address juror = makeAddr("juror");
        _fundAndApprove(juror);

        vm.prank(juror);
        vm.expectRevert(MockWorldIDRouter.ProofRejected.selector);
        registry.register(juror, _proof(NULLIFIER, GOOD_LIMB0 ^ 1));
        assertFalse(registry.isActive(juror));
    }

    function test_register_reusedNullifier_revertsInRegistry() public {
        address first = makeAddr("first");
        address second = makeAddr("second");
        _fundAndApprove(first);
        _fundAndApprove(second);

        vm.prank(first);
        registry.register(first, _proof(NULLIFIER, GOOD_LIMB0));

        vm.prank(second);
        vm.expectRevert(JurorRegistry.NullifierAlreadyUsed.selector);
        registry.register(second, _proof(NULLIFIER, GOOD_LIMB0));
    }

    function test_gate_returnsNullifier() public {
        assertEq(gate.verify(makeAddr("juror"), _proof(NULLIFIER, GOOD_LIMB0)), NULLIFIER);
    }

    function test_constructor_rejectsIncompleteConfiguration() public {
        vm.expectRevert(WorldIDRouterGate.ZeroRouter.selector);
        new WorldIDRouterGate(address(0), APP_ID, ACTION);

        vm.expectRevert(WorldIDRouterGate.EmptyAppId.selector);
        new WorldIDRouterGate(address(router), "", ACTION);

        vm.expectRevert(WorldIDRouterGate.EmptyAction.selector);
        new WorldIDRouterGate(address(router), APP_ID, "");
    }
}
