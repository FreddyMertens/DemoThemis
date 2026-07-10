// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {DealEscrow} from "../src/DealEscrow.sol";
import {DisputeCourt} from "../src/DisputeCourt.sol";

contract DealEscrowTest is Base {
    bytes32 internal constant SALT = bytes32(uint256(0xdea1));
    address internal payer = makeAddr("payer");
    address internal payee = makeAddr("payee");
    uint256 internal constant AMOUNT = 50 * 10 ** 6;
    uint256 internal constant FEE = (AMOUNT * 200) / 10_000; // 1 MUSD

    function setUp() public override {
        super.setUp();
        _registerMany(MINPOOL);
        _fund(payer, 100 * 10 ** 6);
        vm.prank(payer);
        musd.approve(address(escrow), type(uint256).max);
    }

    function _createDeal() internal returns (uint256 dealId) {
        vm.prank(payer);
        dealId = escrow.createDeal(payee, AMOUNT, keccak256("terms"), "ipfs://terms");
    }

    function test_createDeal_pullsAmountPlusFee() public {
        uint256 dealId = _createDeal();
        assertEq(musd.balanceOf(address(escrow)), AMOUNT + FEE);
        assertEq(musd.balanceOf(payer), 100 * 10 ** 6 - AMOUNT - FEE);
        DealEscrow.Deal memory d = escrow.getDeal(dealId);
        assertEq(uint256(d.status), uint256(DealEscrow.Status.Funded));
        assertEq(d.amount, AMOUNT);
        assertEq(d.fee, FEE);
    }

    function test_release_paysPayee_refundsFee() public {
        uint256 dealId = _createDeal();
        vm.prank(payer);
        escrow.release(dealId);
        assertEq(musd.balanceOf(payee), AMOUNT);
        assertEq(musd.balanceOf(payer), 100 * 10 ** 6 - AMOUNT); // fee refunded
        assertEq(musd.balanceOf(address(escrow)), 0);
    }

    function test_release_onlyPayer_reverts() public {
        uint256 dealId = _createDeal();
        vm.prank(payee);
        vm.expectRevert(DealEscrow.NotParty.selector);
        escrow.release(dealId);
    }

    function test_dispute_opensEscrowCase() public {
        uint256 dealId = _createDeal();
        vm.prank(payer);
        escrow.dispute(dealId);
        DealEscrow.Deal memory d = escrow.getDeal(dealId);
        assertEq(uint256(d.status), uint256(DealEscrow.Status.Disputed));
        // case funded by the fee; court holds it
        assertEq(musd.balanceOf(address(court)), FEE);
        assertEq(court.getCase(d.caseId).feePool, FEE);
        // amount still locked in escrow
        assertEq(musd.balanceOf(address(escrow)), AMOUNT);
    }

    function test_dispute_payeeWins_paysPayee() public {
        uint256 dealId = _createDeal();
        vm.prank(payer);
        escrow.dispute(dealId);
        uint256 caseId = escrow.getDeal(dealId).caseId;

        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < 7; i++) {
            _commit(panel[i], caseId, true, SALT); // YES = payee wins
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 7; i++) {
            _reveal(panel[i], caseId, true, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);

        assertEq(uint256(escrow.getDeal(dealId).status), uint256(DealEscrow.Status.Settled));
        assertEq(musd.balanceOf(payee), AMOUNT);
        assertEq(musd.balanceOf(address(escrow)), 0);
    }

    function test_dispute_payerWins_refundsPayer() public {
        uint256 dealId = _createDeal();
        vm.prank(payee); // payee can dispute too
        escrow.dispute(dealId);
        uint256 caseId = escrow.getDeal(dealId).caseId;

        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < 7; i++) {
            _commit(panel[i], caseId, false, SALT); // NO = payer wins
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 7; i++) {
            _reveal(panel[i], caseId, false, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);

        assertEq(uint256(escrow.getDeal(dealId).status), uint256(DealEscrow.Status.Settled));
        // payer refunded the amount (lost only the 1 MUSD case fee)
        assertEq(musd.balanceOf(payer), 100 * 10 ** 6 - FEE);
        assertEq(musd.balanceOf(address(escrow)), 0);
    }

    function test_settle_onlyCourt_reverts() public {
        uint256 dealId = _createDeal();
        vm.prank(payer);
        escrow.dispute(dealId);
        vm.expectRevert(DealEscrow.OnlyCourt.selector);
        escrow.settle(dealId, true);
    }

    function test_dispute_excludesParties_evenIfRegistered() public {
        // register payer + payee as jurors, then dispute: neither may be drawn
        _fund(payer, 100 * 10 ** 6);
        _fund(payee, 100 * 10 ** 6);
        vm.startPrank(payer);
        musd.approve(address(registry), type(uint256).max);
        registry.register(payer, abi.encode(uint256(keccak256("payerHuman")), payer));
        vm.stopPrank();
        vm.startPrank(payee);
        musd.approve(address(registry), type(uint256).max);
        registry.register(payee, abi.encode(uint256(keccak256("payeeHuman")), payee));
        vm.stopPrank();

        // re-approve escrow for payer (balance topped up)
        vm.prank(payer);
        musd.approve(address(escrow), type(uint256).max);
        uint256 dealId = _createDeal();
        vm.prank(payer);
        escrow.dispute(dealId);
        uint256 caseId = escrow.getDeal(dealId).caseId;
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < panel.length; i++) {
            assertTrue(panel[i] != payer && panel[i] != payee);
        }
    }
}
