// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Test} from "forge-std/Test.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {MockSybilGate} from "../src/sybil/MockSybilGate.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {RewardPool} from "../src/RewardPool.sol";
import {DisputeCourt} from "../src/DisputeCourt.sol";
import {DealEscrow} from "../src/DealEscrow.sol";
import {IDisputeCourt} from "../src/interfaces/IDisputeCourt.sol";

contract CourtEdgesTest is Base {
    function setUp() public override {
        super.setUp();
        _registerMany(MINPOOL);
    }

    function test_setDurations_byDeployer() public {
        court.setDurations(60, 90);
        assertEq(court.commitDuration(), 60);
        assertEq(court.revealDuration(), 90);
    }

    function test_setDurations_onlyDeployer_reverts() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(DisputeCourt.OnlyDeployer.selector);
        court.setDurations(1, 1);
    }

    function test_setEscrow_alreadySet_reverts() public {
        vm.expectRevert(DisputeCourt.EscrowAlreadySet.selector);
        court.setEscrow(address(0xBEEF));
    }

    function test_setEscrow_onlyDeployer_reverts() public {
        // fresh court with no escrow set yet
        DisputeCourt fresh =
            new DisputeCourt(musd, registry, address(rewardPool), protocol, 7, 14, 180, 180);
        vm.prank(address(0xBEEF));
        vm.expectRevert(DisputeCourt.OnlyDeployer.selector);
        fresh.setEscrow(address(0xBEEF));
    }

    function test_draw_noSuchCase_reverts() public {
        vm.expectRevert(DisputeCourt.NoSuchCase.selector);
        court.draw(999);
    }

    function test_draw_blockNotReady_reverts() public {
        uint256 caseId = _openQuestion();
        // drawBlock = block.number + 1; calling draw at the same block is too early
        vm.expectRevert(DisputeCourt.DrawBlockNotReady.selector);
        court.draw(caseId);
    }

    function test_draw_blockhashExpired_rearms() public {
        uint256 caseId = _openQuestion();
        DisputeCourt.Case memory c0 = court.getCase(caseId);
        // roll far past the 256-block blockhash window
        vm.roll(uint256(c0.drawBlock) + 300);
        court.draw(caseId);
        DisputeCourt.Case memory c1 = court.getCase(caseId);
        assertEq(uint256(c1.status), uint256(DisputeCourt.Status.Open)); // re-armed
        assertGt(uint256(c1.drawBlock), uint256(c0.drawBlock));
        assertEq(c1.panel.length, 0);
    }

    function test_openFromEscrow_onlyEscrow_reverts() public {
        vm.expectRevert(DisputeCourt.OnlyEscrow.selector);
        court.openFromEscrow(0, keccak256("c"), "u", address(1), address(2), 0);
    }

    /// 3/3 mainnet-style court where two of only four jurors are the deal's
    /// parties: the draw cannot fill an eligible panel and must re-arm, not brick.
    function test_draw_couldNotFill_rearms() public {
        MockUSD m = new MockUSD();
        MockSybilGate g = new MockSybilGate();
        JurorRegistry r = new JurorRegistry(m, g);
        RewardPool ip = new RewardPool(m);
        DisputeCourt c = new DisputeCourt(m, r, address(ip), protocol, 3, 3, 180, 180);
        DealEscrow e = new DealEscrow(m, IDisputeCourt(address(c)));
        r.setCourt(address(c));
        c.setEscrow(address(e));

        address payer = makeAddr("p1");
        address payee = makeAddr("p2");
        address j3 = makeAddr("j3");
        address j4 = makeAddr("j4");
        address[4] memory who = [payer, payee, j3, j4];
        for (uint256 i; i < 4; i++) {
            deal(address(m), who[i], 100 * 10 ** 6, true);
            vm.startPrank(who[i]);
            m.approve(address(r), type(uint256).max);
            r.register(who[i], abi.encode(uint256(keccak256(abi.encodePacked("h", i))), who[i]));
            vm.stopPrank();
        }
        assertEq(r.jurorCount(), 4); // passes MIN_POOL=3

        vm.startPrank(payer);
        m.approve(address(e), type(uint256).max);
        uint256 dealId = e.createDeal(payee, 50 * 10 ** 6, keccak256("t"), "u");
        e.dispute(dealId); // opens an escrow case excluding payer + payee
        vm.stopPrank();

        uint256 caseId = e.getDeal(dealId).caseId;
        DisputeCourt.Case memory cc = c.getCase(caseId);
        vm.roll(uint256(cc.drawBlock) + 1);
        c.draw(caseId); // eligible = 4 - 2 parties = 2 < panel 3 -> re-arm
        assertEq(uint256(c.getCase(caseId).status), uint256(DisputeCourt.Status.Open));
        assertEq(c.panelOf(caseId).length, 0);
    }
}
