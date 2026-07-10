// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {MockSybilGate} from "../src/sybil/MockSybilGate.sol";
import {IAllowanceTransfer} from "../src/lib/IPermit2.sol";
import {MockPermit2} from "./MockPermit2.sol";

contract JurorRegistryTest is Base {
    /// @dev Canonical Permit2 address (= JurorRegistry.PERMIT2); MockPermit2 is
    ///      etched here in setUp so registerWithPermit2 routes to the stand-in.
    address internal constant PERMIT2_ADDR = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    function setUp() public override {
        super.setUp();
        MockPermit2 mock = new MockPermit2();
        vm.etch(PERMIT2_ADDR, address(mock).code);
    }

    // --- Permit2 onboarding (the World App path) --------------------------------

    /// @dev Register juror `i` through the Allowance-Transfer path, modelling the
    ///      World App sponsored batch: World App auto-approves the token to Permit2
    ///      (the `musd.approve(PERMIT2)`), the front end grants the registry a
    ///      Permit2 allowance (`PERMIT2.approve(token, registry, BOND, 0)`), then
    ///      `registerWithPermit2` pulls the bond via `PERMIT2.transferFrom`.
    function _registerPermit2(uint256 i) internal returns (address j) {
        j = _juror(i);
        _fund(j, 100 * 10 ** 6);
        vm.startPrank(j);
        musd.approve(PERMIT2_ADDR, type(uint256).max); // token -> Permit2 (World App does this)
        IAllowanceTransfer(PERMIT2_ADDR).approve(address(musd), address(registry), uint160(BOND), 0); // batch tx 1
        registry.registerWithPermit2(j, abi.encode(_nullifier(i), j)); // batch tx 2
        vm.stopPrank();
    }

    function test_registerWithPermit2_addsActiveJurorAndPullsBond() public {
        address j = _registerPermit2(0);
        assertTrue(registry.isActive(j));
        assertEq(registry.jurorCount(), 1);
        assertEq(registry.bondOf(j), BOND);
        assertEq(musd.balanceOf(address(registry)), BOND);
        assertEq(musd.balanceOf(j), 100 * 10 ** 6 - BOND);
        assertEq(registry.jurorAt(0), j);
    }

    function test_registerWithPermit2_thenWithdraw_returnsBond() public {
        address j = _registerPermit2(0);
        vm.prank(j);
        registry.withdraw();
        assertFalse(registry.isActive(j));
        assertEq(registry.bondOf(j), 0);
        assertEq(musd.balanceOf(j), 100 * 10 ** 6); // full balance back
    }

    function test_registerWithPermit2_noPermitAllowance_reverts() public {
        // Without the batch's PERMIT2.approve step, the registry's transferFrom
        // pull has no Permit2 allowance to draw on and the whole tx reverts.
        address j = _juror(0);
        _fund(j, 100 * 10 ** 6);
        vm.startPrank(j);
        musd.approve(PERMIT2_ADDR, type(uint256).max);
        vm.expectRevert(MockPermit2.InsufficientAllowance.selector);
        registry.registerWithPermit2(j, abi.encode(_nullifier(0), j));
        vm.stopPrank();
    }

    function test_registerWithPermit2_signalNotSender_reverts() public {
        address j = _juror(0);
        _fund(j, 100 * 10 ** 6);
        vm.startPrank(j);
        musd.approve(PERMIT2_ADDR, type(uint256).max);
        IAllowanceTransfer(PERMIT2_ADDR).approve(address(musd), address(registry), uint160(BOND), 0);
        vm.expectRevert(JurorRegistry.SignalNotSender.selector);
        registry.registerWithPermit2(opener, abi.encode(_nullifier(0), opener));
        vm.stopPrank();
    }

    function test_registerWithPermit2_signalMismatchInProof_reverts() public {
        address j = _juror(0);
        _fund(j, 100 * 10 ** 6);
        vm.startPrank(j);
        musd.approve(PERMIT2_ADDR, type(uint256).max);
        IAllowanceTransfer(PERMIT2_ADDR).approve(address(musd), address(registry), uint160(BOND), 0);
        // signal == msg.sender, but the proof is bound to a different signal.
        vm.expectRevert(MockSybilGate.SignalMismatch.selector);
        registry.registerWithPermit2(j, abi.encode(_nullifier(0), opener));
        vm.stopPrank();
    }

    function test_registerWithPermit2_doubleSameWallet_reverts() public {
        _registerPermit2(0);
        address j = _juror(0);
        vm.startPrank(j);
        IAllowanceTransfer(PERMIT2_ADDR).approve(address(musd), address(registry), uint160(BOND), 0);
        vm.expectRevert(JurorRegistry.AlreadyRegistered.selector);
        registry.registerWithPermit2(j, abi.encode(_nullifier(0), j));
        vm.stopPrank();
    }

    function test_registerWithPermit2_sameNullifierDifferentWallet_reverts() public {
        _register(0); // human 0 joins via the classic path
        // a second wallet presents the SAME human's nullifier through Permit2
        address j2 = _juror(99);
        _fund(j2, 100 * 10 ** 6);
        vm.startPrank(j2);
        musd.approve(PERMIT2_ADDR, type(uint256).max);
        IAllowanceTransfer(PERMIT2_ADDR).approve(address(musd), address(registry), uint160(BOND), 0);
        vm.expectRevert(JurorRegistry.NullifierAlreadyUsed.selector);
        registry.registerWithPermit2(j2, abi.encode(_nullifier(0), j2));
        vm.stopPrank();
    }

    // --- classic register path --------------------------------------------------

    function test_register_addsActiveJurorAndPullsBond() public {
        address j = _register(0);
        assertTrue(registry.isActive(j));
        assertEq(registry.jurorCount(), 1);
        assertEq(registry.bondOf(j), BOND);
        assertEq(musd.balanceOf(address(registry)), BOND);
        assertEq(registry.jurorAt(0), j);
    }

    function test_register_signalNotSender_reverts() public {
        address j = _juror(0);
        _fund(j, 100 * 10 ** 6);
        vm.startPrank(j);
        musd.approve(address(registry), type(uint256).max);
        // signal != msg.sender
        vm.expectRevert(JurorRegistry.SignalNotSender.selector);
        registry.register(opener, abi.encode(_nullifier(0), opener));
        vm.stopPrank();
    }

    function test_register_signalMismatchInProof_reverts() public {
        address j = _juror(0);
        _fund(j, 100 * 10 ** 6);
        vm.startPrank(j);
        musd.approve(address(registry), type(uint256).max);
        // signal == msg.sender, but proof is bound to a different signal
        vm.expectRevert(MockSybilGate.SignalMismatch.selector);
        registry.register(j, abi.encode(_nullifier(0), opener));
        vm.stopPrank();
    }

    function test_register_doubleSameWallet_reverts() public {
        _register(0);
        address j = _juror(0);
        vm.prank(j);
        vm.expectRevert(JurorRegistry.AlreadyRegistered.selector);
        registry.register(j, abi.encode(_nullifier(0), j));
    }

    function test_register_sameNullifierDifferentWallet_reverts() public {
        _register(0); // human 0 on wallet _juror(0)
        // a second wallet presents the SAME human's nullifier
        address j2 = _juror(99);
        _fund(j2, 100 * 10 ** 6);
        vm.startPrank(j2);
        musd.approve(address(registry), type(uint256).max);
        vm.expectRevert(JurorRegistry.NullifierAlreadyUsed.selector);
        registry.register(j2, abi.encode(_nullifier(0), j2));
        vm.stopPrank();
    }

    function test_withdraw_returnsBondAndDeactivates() public {
        address j = _register(0);
        vm.prank(j);
        registry.withdraw();
        assertFalse(registry.isActive(j));
        assertEq(registry.jurorCount(), 0);
        assertEq(registry.bondOf(j), 0);
        assertEq(musd.balanceOf(j), 100 * 10 ** 6); // full balance back
    }

    function test_withdraw_whileEmpaneled_reverts() public {
        _registerMany(MINPOOL);
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        vm.prank(panel[0]);
        vm.expectRevert(JurorRegistry.Empaneled.selector);
        registry.withdraw();
    }

    function test_postBond_rejoinsAfterWithdraw() public {
        address j = _register(0);
        vm.startPrank(j);
        registry.withdraw();
        musd.approve(address(registry), type(uint256).max);
        registry.postBond();
        vm.stopPrank();
        assertTrue(registry.isActive(j));
        assertEq(registry.bondOf(j), BOND);
    }

    function test_slash_onlyCourt() public {
        address j = _register(0);
        vm.expectRevert(JurorRegistry.OnlyCourt.selector);
        registry.slash(j, BOND, address(this));
    }

    function test_setCourt_onlyOnceAndDeployer() public {
        // already set in setUp(); a second set reverts
        vm.expectRevert(JurorRegistry.CourtAlreadySet.selector);
        registry.setCourt(address(0xdead));
    }

    function testFuzz_activeListStaysConsistent(uint8 n, uint8 withdrawIdx) public {
        n = uint8(bound(n, 1, 30));
        _registerMany(n);
        assertEq(registry.jurorCount(), n);
        withdrawIdx = uint8(bound(withdrawIdx, 0, n - 1));
        address j = _juror(withdrawIdx);
        vm.prank(j);
        registry.withdraw();
        assertEq(registry.jurorCount(), uint256(n) - 1);
        assertFalse(registry.isActive(j));
        // every remaining slot resolves to a still-active juror
        for (uint256 i; i < registry.jurorCount(); i++) {
            assertTrue(registry.isActive(registry.jurorAt(i)));
        }
    }
}
