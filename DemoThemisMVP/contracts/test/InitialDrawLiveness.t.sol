// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {MockSybilGate} from "../src/sybil/MockSybilGate.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {RewardPool} from "../src/RewardPool.sol";
import {DisputeCourt} from "../src/DisputeCourt.sol";
import {DealEscrow} from "../src/DealEscrow.sol";
import {IDisputeCourt} from "../src/interfaces/IDisputeCourt.sol";

/// @dev ERC-20 test double that attempts to draw the case from inside the fee
///      refund transfer, modelling a token with an external transfer hook.
contract ReentrantDrawToken is ERC20 {
    address public hookCourt;
    address public hookRecipient;
    uint256 public hookCaseId;
    bool public hookArmed;
    bool public reentrySucceeded;
    bytes4 public reentryError;

    constructor() ERC20("Hook USD", "HUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address court, address recipient, uint256 caseId) external {
        hookCourt = court;
        hookRecipient = recipient;
        hookCaseId = caseId;
        hookArmed = true;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        bool transferred = super.transfer(to, value);
        if (hookArmed && msg.sender == hookCourt && to == hookRecipient) {
            hookArmed = false;
            bytes memory result;
            (reentrySucceeded, result) = hookCourt.call(abi.encodeWithSignature("draw(uint256)", hookCaseId));
            if (result.length >= 4) {
                bytes4 selector;
                assembly ("memory-safe") {
                    selector := mload(add(result, 0x20))
                }
                reentryError = selector;
            }
        }
        return transferred;
    }
}

/// @dev Regression coverage for cases opened against an exact 3/3 court whose
///      pool becomes undrawable before the first panel is selected.
contract InitialDrawLivenessTest is Test {
    uint256 internal constant BOND = 5 * 10 ** 6;
    uint256 internal constant CASE_FEE = 20 * 10 ** 6;
    uint256 internal constant AMOUNT = 50 * 10 ** 6;
    uint256 internal constant ESCROW_FEE = (AMOUNT * 200) / 10_000;

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

    event CaseOpened(uint256 indexed caseId, uint8 caseType, address indexed opener, uint256 feePool, string uri);
    event InitialDrawTimedOut(uint256 indexed caseId, address indexed refundTo, uint256 feeRefunded);

    function setUp() public {
        musd = new MockUSD();
        gate = new MockSybilGate();
        registry = new JurorRegistry(musd, gate);
        rewardPool = new RewardPool(musd);
        court = new DisputeCourt(musd, registry, address(rewardPool), protocol, 3, 3, 2 hours, 2 hours);
        escrow = new DealEscrow(musd, IDisputeCourt(address(court)));
        registry.setCourt(address(court));
        court.setEscrow(address(escrow));

        for (uint256 i; i < jurors.length; i++) {
            address juror = makeAddr(string.concat("initial-draw-juror-", vm.toString(i)));
            jurors[i] = juror;
            _fund(juror, 100 * 10 ** 6);
            vm.startPrank(juror);
            musd.approve(address(registry), type(uint256).max);
            registry.register(juror, abi.encode(uint256(keccak256(abi.encodePacked("initial-human", i))), juror));
            vm.stopPrank();
        }
    }

    function test_exact3_activeQuestionOpener_isRejectedBeforeFunding() public {
        address activeOpener = jurors[0];
        uint256 balanceBefore = musd.balanceOf(activeOpener);

        assertEq(registry.jurorCount(), 3);
        assertEq(court.eligibleJurorCount(activeOpener, address(0)), 2);
        vm.prank(activeOpener);
        vm.expectRevert(DisputeCourt.PoolTooSmall.selector);
        court.openQuestion(keccak256("question"), "ipfs://question");

        assertEq(court.caseCount(), 0);
        assertEq(musd.balanceOf(activeOpener), balanceBefore);
        assertEq(musd.balanceOf(address(court)), 0);
    }

    function test_exact3_questionCaseOpened_reportsFundedFeePool() public {
        _fund(opener, 100 * 10 ** 6);
        vm.startPrank(opener);
        musd.approve(address(court), type(uint256).max);
        vm.expectEmit(true, true, false, true, address(court));
        emit CaseOpened(0, 0, opener, CASE_FEE, "ipfs://question");
        uint256 caseId = court.openQuestion(keccak256("question"), "ipfs://question");
        vm.stopPrank();

        assertEq(court.getCase(caseId).feePool, CASE_FEE);
        assertEq(musd.balanceOf(address(court)), CASE_FEE);
    }

    function test_exact3_escrowCaseOpened_reportsFundedFeePool() public {
        _fund(address(escrow), ESCROW_FEE);
        vm.prank(address(escrow));
        musd.approve(address(court), ESCROW_FEE);

        vm.expectEmit(true, true, false, true, address(court));
        emit CaseOpened(0, 1, payer, ESCROW_FEE, "ipfs://terms");
        vm.prank(address(escrow));
        uint256 caseId = court.openFromEscrow(7, keccak256("terms"), "ipfs://terms", payer, payee, ESCROW_FEE);

        assertEq(court.getCase(caseId).feePool, ESCROW_FEE);
        assertEq(musd.balanceOf(address(court)), ESCROW_FEE);
    }

    function test_exact3_activeEscrowParty_rejectionIsAtomic() public {
        address activePayer = jurors[0];
        _fund(activePayer, 100 * 10 ** 6);
        vm.startPrank(activePayer);
        musd.approve(address(escrow), type(uint256).max);
        uint256 dealId = escrow.createDeal(payee, AMOUNT, keccak256("terms"), "ipfs://terms");
        vm.stopPrank();

        assertEq(court.eligibleJurorCount(activePayer, payee), 2);
        uint256 payerBefore = musd.balanceOf(activePayer);
        uint256 escrowBefore = musd.balanceOf(address(escrow));

        vm.startPrank(activePayer);
        vm.expectRevert(DisputeCourt.PoolTooSmall.selector);
        escrow.dispute(dealId);
        vm.stopPrank();

        DealEscrow.Deal memory d = escrow.getDeal(dealId);
        assertEq(uint256(d.status), uint256(DealEscrow.Status.Funded));
        assertEq(d.caseId, 0);
        assertEq(court.caseCount(), 0);
        assertEq(musd.balanceOf(activePayer), payerBefore);
        assertEq(musd.balanceOf(address(escrow)), escrowBefore);
        assertEq(musd.balanceOf(address(court)), 0);
        assertEq(musd.allowance(address(escrow), address(court)), 0);
    }

    function test_exact3_withdrawalAfterOpen_timeoutRefundsQuestionFee() public {
        uint256 caseId = _openQuestion();
        uint256 deadline = court.initialDrawDeadline(caseId);
        assertEq(deadline, block.timestamp + court.INITIAL_DRAW_WINDOW());

        _withdrawOne();
        vm.warp(deadline);
        vm.expectRevert(DisputeCourt.InitialDrawWindowNotExpired.selector);
        court.resolve(caseId);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Open));

        vm.warp(deadline + 1);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Resolvable));
        vm.expectEmit(true, true, false, true, address(court));
        emit InitialDrawTimedOut(caseId, opener, CASE_FEE);
        vm.prank(makeAddr("permissionless-question-finalizer"));
        court.resolve(caseId);

        DisputeCourt.Case memory resolved = court.getCase(caseId);
        assertEq(uint256(resolved.status), uint256(DisputeCourt.Status.Resolved));
        assertFalse(resolved.outcome);
        assertEq(resolved.feePool, 0);
        assertEq(court.initialDrawDeadline(caseId), 0);
        assertEq(musd.balanceOf(opener), 100 * 10 ** 6);
        assertEq(musd.balanceOf(address(court)), 0);
        assertEq(musd.balanceOf(address(rewardPool)), 0);
        assertEq(musd.balanceOf(protocol), 0);
    }

    function test_exact3_initialDeadline_cannotBeExtendedByFailedDraws() public {
        uint256 caseId = _openQuestion();
        uint256 deadline = court.initialDrawDeadline(caseId);
        _withdrawOne();

        _draw(caseId);
        assertEq(court.initialDrawDeadline(caseId), deadline);
        assertEq(court.panelOf(caseId).length, 0);

        vm.warp(deadline);
        _draw(caseId);
        assertEq(court.initialDrawDeadline(caseId), deadline);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Open));

        vm.warp(deadline + 1);
        vm.roll(block.number + 2);
        vm.expectRevert(DisputeCourt.InitialDrawWindowExpired.selector);
        court.draw(caseId);
        assertEq(court.initialDrawDeadline(caseId), deadline);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Resolvable));
    }

    function test_exact3_successfulFirstDraw_clearsInitialDeadline() public {
        uint256 caseId = _openQuestion();
        uint256 formerDeadline = court.initialDrawDeadline(caseId);

        _draw(caseId);

        assertEq(uint256(court.getCase(caseId).status), uint256(DisputeCourt.Status.Drawn));
        assertEq(court.panelOf(caseId).length, 3);
        assertEq(court.initialDrawDeadline(caseId), 0);
        vm.warp(formerDeadline + 1);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Commit));
    }

    function test_exact3_escrowInitialTimeout_refundsPrincipalAndUnusedFee() public {
        _fund(payer, 100 * 10 ** 6);
        vm.startPrank(payer);
        musd.approve(address(escrow), type(uint256).max);
        uint256 dealId = escrow.createDeal(payee, AMOUNT, keccak256("terms"), "ipfs://terms");
        escrow.dispute(dealId);
        vm.stopPrank();

        uint256 caseId = escrow.getDeal(dealId).caseId;
        assertEq(musd.balanceOf(payer), 100 * 10 ** 6 - AMOUNT - ESCROW_FEE);
        assertEq(musd.balanceOf(address(escrow)), AMOUNT);
        assertEq(musd.balanceOf(address(court)), ESCROW_FEE);

        _withdrawOne();
        vm.warp(court.initialDrawDeadline(caseId) + 1);
        vm.prank(makeAddr("permissionless-escrow-finalizer"));
        court.resolve(caseId);

        DealEscrow.Deal memory resolvedDeal = escrow.getDeal(dealId);
        DisputeCourt.Case memory resolvedCase = court.getCase(caseId);
        assertEq(uint256(resolvedDeal.status), uint256(DealEscrow.Status.Settled));
        assertEq(uint256(resolvedCase.status), uint256(DisputeCourt.Status.Resolved));
        assertFalse(resolvedCase.outcome);
        assertEq(resolvedCase.feePool, 0);
        assertEq(musd.balanceOf(payer), 100 * 10 ** 6);
        assertEq(musd.balanceOf(payee), 0);
        assertEq(musd.balanceOf(address(escrow)), 0);
        assertEq(musd.balanceOf(address(court)), 0);
        assertEq(musd.balanceOf(address(rewardPool)), 0);
        assertEq(musd.balanceOf(protocol), 0);
    }

    function test_exact3_initialTimeout_repeatResolveIsSafe() public {
        uint256 caseId = _openQuestion();
        _withdrawOne();
        vm.warp(court.initialDrawDeadline(caseId) + 1);
        court.resolve(caseId);

        uint256 openerAfter = musd.balanceOf(opener);
        uint256 courtAfter = musd.balanceOf(address(court));
        uint256 rewardAfter = musd.balanceOf(address(rewardPool));
        uint256 protocolAfter = musd.balanceOf(protocol);
        vm.expectRevert(DisputeCourt.NotDrawn.selector);
        court.resolve(caseId);

        assertEq(musd.balanceOf(opener), openerAfter);
        assertEq(musd.balanceOf(address(court)), courtAfter);
        assertEq(musd.balanceOf(address(rewardPool)), rewardAfter);
        assertEq(musd.balanceOf(protocol), protocolAfter);
        assertEq(uint256(court.getCase(caseId).status), uint256(DisputeCourt.Status.Resolved));
    }

    function _openQuestion() internal returns (uint256 caseId) {
        _fund(opener, 100 * 10 ** 6);
        vm.startPrank(opener);
        musd.approve(address(court), type(uint256).max);
        caseId = court.openQuestion(keccak256("question"), "ipfs://question");
        vm.stopPrank();
    }

    function _withdrawOne() internal {
        vm.prank(jurors[2]);
        registry.withdraw();
        assertEq(registry.jurorCount(), 2);
        assertEq(registry.bondOf(jurors[2]), 0);
        assertEq(musd.balanceOf(address(registry)), 2 * BOND);
    }

    function _draw(uint256 caseId) internal {
        vm.roll(block.number + 2);
        court.draw(caseId);
    }

    function _fund(address who, uint256 amount) internal {
        deal(address(musd), who, amount);
    }
}

contract InitialDrawCEITest is Test {
    uint256 internal constant BOND = 5 * 10 ** 6;
    uint256 internal constant CASE_FEE = 20 * 10 ** 6;

    function test_timeoutRefund_marksCaseTerminalBeforeTokenHookCanDraw() public {
        ReentrantDrawToken token = new ReentrantDrawToken();
        MockSybilGate gate = new MockSybilGate();
        JurorRegistry registry = new JurorRegistry(token, gate);
        RewardPool rewardPool = new RewardPool(token);
        DisputeCourt court =
            new DisputeCourt(token, registry, address(rewardPool), makeAddr("protocol"), 3, 3, 2 hours, 2 hours);
        registry.setCourt(address(court));

        address[3] memory jurors;
        for (uint256 i; i < jurors.length; i++) {
            address juror = makeAddr(string.concat("hook-juror-", vm.toString(i)));
            jurors[i] = juror;
            token.mint(juror, BOND);
            vm.startPrank(juror);
            token.approve(address(registry), BOND);
            registry.register(juror, abi.encode(uint256(keccak256(abi.encodePacked("hook-human", i))), juror));
            vm.stopPrank();
        }

        address opener = makeAddr("hook-opener");
        token.mint(opener, CASE_FEE);
        vm.startPrank(opener);
        token.approve(address(court), CASE_FEE);
        uint256 caseId = court.openQuestion(keccak256("hook-question"), "ipfs://hook-question");
        vm.stopPrank();

        vm.warp(court.initialDrawDeadline(caseId) + 1);
        vm.roll(uint256(court.getCase(caseId).drawBlock) + 1);
        token.arm(address(court), opener, caseId);
        court.resolve(caseId);

        assertFalse(token.reentrySucceeded());
        assertEq(token.reentryError(), DisputeCourt.NotOpen.selector);
        assertEq(uint256(court.getCase(caseId).status), uint256(DisputeCourt.Status.Resolved));
        assertEq(court.panelOf(caseId).length, 0);
        assertEq(court.getCase(caseId).feePool, 0);
        assertEq(token.balanceOf(opener), CASE_FEE);
        assertEq(token.balanceOf(address(court)), 0);
        for (uint256 i; i < jurors.length; i++) {
            assertEq(registry.activePanels(jurors[i]), 0);
        }
    }
}
