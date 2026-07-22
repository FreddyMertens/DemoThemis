// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {MockSybilGate} from "../src/sybil/MockSybilGate.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {RewardPool} from "../src/RewardPool.sol";
import {DisputeCourt} from "../src/DisputeCourt.sol";
import {DealEscrow} from "../src/DealEscrow.sol";
import {IDisputeCourt} from "../src/interfaces/IDisputeCourt.sol";
import {IAllowanceTransfer} from "../src/lib/IPermit2.sol";
import {MockPermit2} from "./MockPermit2.sol";

/// @dev Regression harness for the exact 3-seat / 3-human mainnet configuration.
///      The regular court suite uses the buffered 7/14 cohort and therefore cannot
///      expose recovery failures caused by pool == panel.
contract MainnetLivenessTest is Test {
    uint256 internal constant BOND = 5 * 10 ** 6;
    uint256 internal constant CASE_FEE = 20 * 10 ** 6;
    bytes32 internal constant SALT = bytes32(uint256(0x51a7));
    address internal constant PERMIT2_ADDR = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    MockUSD internal musd;
    MockSybilGate internal gate;
    JurorRegistry internal registry;
    RewardPool internal rewardPool;
    DisputeCourt internal court;
    DealEscrow internal escrow;

    address internal protocol = makeAddr("protocol");
    address internal opener = makeAddr("opener");
    address internal payer = makeAddr("payer");
    address internal payee = makeAddr("payee");
    address[3] internal jurors;

    function setUp() public {
        musd = new MockUSD();
        gate = new MockSybilGate();
        registry = new JurorRegistry(musd, gate);
        rewardPool = new RewardPool(musd);
        court = new DisputeCourt(musd, registry, address(rewardPool), protocol, 3, 3, 300, 300);
        escrow = new DealEscrow(musd, IDisputeCourt(address(court)));
        registry.setCourt(address(court));
        court.setEscrow(address(escrow));
        MockPermit2 mockPermit2 = new MockPermit2();
        vm.etch(PERMIT2_ADDR, address(mockPermit2).code);

        for (uint256 i; i < jurors.length; i++) {
            address juror = makeAddr(string.concat("mainnet-juror-", vm.toString(i)));
            jurors[i] = juror;
            _fund(juror, 100 * 10 ** 6);
            vm.startPrank(juror);
            musd.approve(address(registry), type(uint256).max);
            registry.register(juror, abi.encode(uint256(keccak256(abi.encodePacked("mainnet-human", i))), juror));
            vm.stopPrank();
        }
    }

    function test_exact3_fullParticipation_resolvesAndNextCaseDraws() public {
        assertEq(court.LIVENESS_RECOVERY_VERSION(), 2);
        assertEq(registry.LIVENESS_RECOVERY_VERSION(), 1);

        uint256 firstCase = _openQuestion();
        _draw(firstCase);
        _voteAll(firstCase, true);

        assertEq(uint256(court.getCase(firstCase).status), uint256(DisputeCourt.Status.Resolved));
        assertEq(court.getCase(firstCase).feePool, 0);
        assertEq(registry.jurorCount(), 3);
        assertEq(musd.balanceOf(address(registry)), 3 * BOND);
        _assertNoActivePanels();

        uint256 secondCase = _openQuestion();
        _draw(secondCase);
        assertEq(uint256(court.getCase(secondCase).status), uint256(DisputeCourt.Status.Drawn));
        assertEq(court.panelOf(secondCase).length, 3);
    }

    function test_exact3_quorumMiss_twoNoShows_canRebondAndCompleteRetry() public {
        uint256 caseId = _openQuestion();
        _draw(caseId);
        address[] memory firstPanel = court.panelOf(caseId);

        _commit(firstPanel[0], caseId, true);
        _warpToReveal(caseId);
        _reveal(firstPanel[0], caseId, true);
        _warpToResolve(caseId);
        uint256 missedAt = block.timestamp;
        court.resolve(caseId);

        DisputeCourt.Case memory afterMiss = court.getCase(caseId);
        assertEq(uint256(afterMiss.status), uint256(DisputeCourt.Status.Open));
        assertEq(afterMiss.redraws, 1);
        assertEq(afterMiss.panel.length, 0);
        assertEq(court.redrawDeadline(caseId), missedAt + court.REDRAW_RECOVERY_WINDOW());
        assertEq(registry.jurorCount(), 1);
        assertEq(registry.bondOf(firstPanel[1]), 0);
        assertEq(registry.bondOf(firstPanel[2]), 0);
        assertEq(musd.balanceOf(address(rewardPool)), 2 * BOND);
        assertFalse(court.hasRevealed(caseId, firstPanel[0])); // retry starts with clean ballot state
        _assertNoActivePanels();

        // A failed draw while the pool is short may re-arm its block seed, but it
        // must not extend the fixed recovery deadline.
        uint256 fixedDeadline = court.redrawDeadline(caseId);
        _draw(caseId);
        assertEq(court.redrawDeadline(caseId), fixedDeadline);
        assertEq(court.panelOf(caseId).length, 0);

        _rebond(firstPanel[1]);
        _rebond(firstPanel[2]);
        assertEq(registry.jurorCount(), 3);
        assertEq(musd.balanceOf(address(registry)), 3 * BOND);

        _draw(caseId);
        assertEq(court.panelOf(caseId).length, 3);
        assertEq(court.redrawDeadline(caseId), 0);
        _voteAll(caseId, true);

        DisputeCourt.Case memory resolved = court.getCase(caseId);
        assertEq(uint256(resolved.status), uint256(DisputeCourt.Status.Resolved));
        assertTrue(resolved.outcome);
        assertEq(musd.balanceOf(address(court)), 0);
        assertEq(musd.balanceOf(protocol), CASE_FEE / 10);
        _assertNoActivePanels();
    }

    function test_exact3_allNoShow_canRebond_thenSecondMissFinalizesStatusQuo() public {
        uint256 caseId = _openQuestion();
        _draw(caseId);
        _warpToResolve(caseId);
        court.resolve(caseId);

        assertEq(registry.jurorCount(), 0);
        assertEq(musd.balanceOf(address(rewardPool)), 3 * BOND);
        for (uint256 i; i < jurors.length; i++) {
            assertEq(registry.bondOf(jurors[i]), 0);
            _rebond(jurors[i]);
        }

        assertEq(registry.jurorCount(), 3);
        _draw(caseId);
        assertEq(court.redrawDeadline(caseId), 0);

        // The retry remains bounded: another complete miss resolves immediately
        // to status quo rather than opening a third round.
        _warpToResolve(caseId);
        court.resolve(caseId);

        DisputeCourt.Case memory resolved = court.getCase(caseId);
        assertEq(uint256(resolved.status), uint256(DisputeCourt.Status.Resolved));
        assertFalse(resolved.outcome);
        assertEq(resolved.redraws, 1);
        assertEq(registry.jurorCount(), 0);
        assertEq(musd.balanceOf(address(registry)), 0);
        assertEq(musd.balanceOf(address(rewardPool)), 6 * BOND + (CASE_FEE * 9) / 10);
        assertEq(musd.balanceOf(protocol), CASE_FEE / 10);
        assertEq(musd.balanceOf(address(court)), 0);
        _assertNoActivePanels();

        uint256 rewardAfter = musd.balanceOf(address(rewardPool));
        uint256 protocolAfter = musd.balanceOf(protocol);
        vm.expectRevert(DisputeCourt.NotDrawn.selector);
        court.resolve(caseId);
        assertEq(musd.balanceOf(address(rewardPool)), rewardAfter);
        assertEq(musd.balanceOf(protocol), protocolAfter);
    }

    function test_exact3_recoveryTimeout_isPermissionlessStatusQuoAndCannotBeExtended() public {
        uint256 caseId = _openQuestion();
        _draw(caseId);
        address[] memory panel = court.panelOf(caseId);
        _commit(panel[0], caseId, true);
        _warpToReveal(caseId);
        _reveal(panel[0], caseId, true);
        _warpToResolve(caseId);
        court.resolve(caseId);

        uint256 deadline = court.redrawDeadline(caseId);
        vm.expectRevert(DisputeCourt.RedrawWindowNotExpired.selector);
        court.resolve(caseId);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Open));

        // Re-arming a short-pool draw leaves the original deadline untouched.
        _draw(caseId);
        assertEq(court.redrawDeadline(caseId), deadline);

        vm.warp(deadline + 1);
        vm.roll(block.number + 2);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Resolvable));
        vm.expectRevert(DisputeCourt.RedrawWindowExpired.selector);
        court.draw(caseId);

        vm.prank(makeAddr("permissionless-finalizer"));
        court.resolve(caseId);

        DisputeCourt.Case memory resolved = court.getCase(caseId);
        assertEq(uint256(resolved.status), uint256(DisputeCourt.Status.Resolved));
        assertFalse(resolved.outcome);
        assertEq(court.redrawDeadline(caseId), 0);
        assertEq(musd.balanceOf(address(rewardPool)), 2 * BOND + (CASE_FEE * 9) / 10);
        assertEq(musd.balanceOf(protocol), CASE_FEE / 10);
        assertEq(musd.balanceOf(address(court)), 0);
        _assertNoActivePanels();

        uint256 rewardAfter = musd.balanceOf(address(rewardPool));
        uint256 protocolAfter = musd.balanceOf(protocol);
        vm.expectRevert(DisputeCourt.NotDrawn.selector);
        court.resolve(caseId);
        assertEq(musd.balanceOf(address(rewardPool)), rewardAfter);
        assertEq(musd.balanceOf(protocol), protocolAfter);
    }

    function test_exact3_oneNoShow_resolvesThenRebondAllowsNextCase() public {
        uint256 caseId = _openQuestion();
        _draw(caseId);
        address[] memory panel = court.panelOf(caseId);

        for (uint256 i; i < 2; i++) {
            _commit(panel[i], caseId, true);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 2; i++) {
            _reveal(panel[i], caseId, true);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);

        assertEq(uint256(court.getCase(caseId).status), uint256(DisputeCourt.Status.Resolved));
        assertEq(registry.jurorCount(), 2);
        assertEq(registry.bondOf(panel[2]), 0);

        _rebondWithPermit2(panel[2]);
        assertEq(registry.jurorCount(), 3);
        assertEq(registry.bondOf(panel[2]), BOND);
        uint256 nextCase = _openQuestion();
        _draw(nextCase);
        assertEq(uint256(court.getCase(nextCase).status), uint256(DisputeCourt.Status.Drawn));
        assertEq(court.panelOf(nextCase).length, 3);
    }

    function test_exact3_escrowPrincipalReturnsOnRecoveryTimeout() public {
        _fund(payer, 100 * 10 ** 6);
        vm.startPrank(payer);
        musd.approve(address(escrow), type(uint256).max);
        uint256 dealId = escrow.createDeal(payee, 50 * 10 ** 6, keccak256("terms"), "ipfs://terms");
        escrow.dispute(dealId);
        vm.stopPrank();

        uint256 caseId = escrow.getDeal(dealId).caseId;
        _draw(caseId);
        address juror = court.panelOf(caseId)[0];
        _commit(juror, caseId, false);
        _warpToReveal(caseId);
        _reveal(juror, caseId, false);
        _warpToResolve(caseId);
        court.resolve(caseId);

        vm.warp(court.redrawDeadline(caseId) + 1);
        vm.prank(makeAddr("escrow-finalizer"));
        court.resolve(caseId);

        assertEq(uint256(escrow.getDeal(dealId).status), uint256(DealEscrow.Status.Settled));
        assertEq(musd.balanceOf(payer), 99 * 10 ** 6); // principal back; 1 MUSD dispute fee consumed
        assertEq(musd.balanceOf(payee), 0);
        assertEq(musd.balanceOf(address(escrow)), 0);
        assertEq(musd.balanceOf(address(court)), 0);
    }

    function _openQuestion() internal returns (uint256 caseId) {
        _fund(opener, 100 * 10 ** 6);
        vm.startPrank(opener);
        musd.approve(address(court), type(uint256).max);
        caseId = court.openQuestion(keccak256("question"), "ipfs://question");
        vm.stopPrank();
    }

    function _draw(uint256 caseId) internal {
        vm.roll(block.number + 2);
        court.draw(caseId);
    }

    function _commit(address juror, uint256 caseId, bool vote) internal {
        vm.prank(juror);
        court.commit(caseId, keccak256(abi.encode(vote, SALT, caseId, juror)));
    }

    function _reveal(address juror, uint256 caseId, bool vote) internal {
        vm.prank(juror);
        court.reveal(caseId, vote, SALT);
    }

    function _warpToReveal(uint256 caseId) internal {
        vm.warp(uint256(court.getCase(caseId).commitDeadline) + 1);
    }

    function _warpToResolve(uint256 caseId) internal {
        vm.warp(uint256(court.getCase(caseId).revealDeadline) + 1);
    }

    function _voteAll(uint256 caseId, bool vote) internal {
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < panel.length; i++) {
            _commit(panel[i], caseId, vote);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < panel.length; i++) {
            _reveal(panel[i], caseId, vote);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);
    }

    function _rebond(address juror) internal {
        vm.prank(juror);
        registry.postBond();
    }

    function _rebondWithPermit2(address juror) internal {
        vm.startPrank(juror);
        musd.approve(PERMIT2_ADDR, type(uint256).max);
        IAllowanceTransfer(PERMIT2_ADDR).approve(address(musd), address(registry), uint160(BOND), 0);
        registry.postBondWithPermit2();
        vm.stopPrank();
    }

    function _fund(address who, uint256 amount) internal {
        deal(address(musd), who, amount);
    }

    function _assertNoActivePanels() internal view {
        for (uint256 i; i < jurors.length; i++) {
            assertEq(registry.activePanels(jurors[i]), 0);
        }
    }
}
