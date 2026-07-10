// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SpikeVerifier, IWorldID, ByteHasher} from "../src/spike/SpikeVerifier.sol";

contract MockWorldID is IWorldID {
    bool public rejectAll;

    function setRejectAll(bool v) external {
        rejectAll = v;
    }

    function verifyProof(uint256, uint256, uint256, uint256, uint256, uint256[8] calldata) external view {
        require(!rejectAll, "invalid proof");
    }
}

contract SpikeVerifierTest is Test {
    using ByteHasher for bytes;

    MockWorldID internal router;
    SpikeVerifier internal spike;

    uint256[8] internal proof; // zeroed; the mock router does not check it

    function setUp() public {
        router = new MockWorldID();
        spike = new SpikeVerifier(IWorldID(address(router)), "app_staging_test", "juror-registration");
    }

    function test_externalNullifier_isDeterministic() public {
        SpikeVerifier again =
            new SpikeVerifier(IWorldID(address(router)), "app_staging_test", "juror-registration");
        assertEq(again.externalNullifierHash(), spike.externalNullifierHash());

        SpikeVerifier otherAction =
            new SpikeVerifier(IWorldID(address(router)), "app_staging_test", "spare-action");
        assertNotEq(otherAction.externalNullifierHash(), spike.externalNullifierHash());
    }

    function test_verifyAndRecord_recordsNullifier() public {
        spike.verifyAndRecord(address(0xBEEF), 123, 42, proof);
        assertTrue(spike.seenNullifiers(42));
        assertEq(spike.verifiedCount(), 1);
    }

    function test_verifyAndRecord_rejectsDuplicateNullifier() public {
        spike.verifyAndRecord(address(0xBEEF), 123, 42, proof);
        vm.expectRevert(abi.encodeWithSelector(SpikeVerifier.DuplicateNullifier.selector, 42));
        spike.verifyAndRecord(address(0xCAFE), 123, 42, proof);
    }

    function test_verifyAndRecord_bubblesRouterRevert() public {
        router.setRejectAll(true);
        vm.expectRevert(bytes("invalid proof"));
        spike.verifyAndRecord(address(0xBEEF), 123, 42, proof);
        assertEq(spike.verifiedCount(), 0);
    }
}
