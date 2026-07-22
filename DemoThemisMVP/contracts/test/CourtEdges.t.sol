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

    function test_votingDurations_areImmutableDeploymentParameters() public view {
        assertEq(court.AUTOMATED_TIMING_VERSION(), 1);
        assertEq(court.commitDuration(), COMMIT_DUR);
        assertEq(court.revealDuration(), REVEAL_DUR);
    }

    function test_constructor_rejectsUnsafeVotingDurations() public {
        vm.expectRevert(DisputeCourt.DurationTooShort.selector);
        new DisputeCourt(musd, registry, address(rewardPool), protocol, 7, 14, 299, 300);
    }

    function test_setEscrow_alreadySet_reverts() public {
        vm.expectRevert(DisputeCourt.EscrowAlreadySet.selector);
        court.setEscrow(address(0xBEEF));
    }

    function test_setEscrow_onlyDeployer_reverts() public {
        // fresh court with no escrow set yet
        DisputeCourt fresh = new DisputeCourt(musd, registry, address(rewardPool), protocol, 7, 14, 300, 300);
        vm.expectRevert(DisputeCourt.ZeroAddress.selector);
        fresh.setEscrow(address(0));
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

    /// Opening rejects a deal that cannot leave three eligible jurors, and the
    /// revert rolls the escrow's attempted status/allowance changes back too.
    function test_openFromEscrow_tooFewEligible_revertsAtomically() public {
        MockUSD m = new MockUSD();
        MockSybilGate g = new MockSybilGate();
        JurorRegistry r = new JurorRegistry(m, g);
        RewardPool ip = new RewardPool(m);
        DisputeCourt c = new DisputeCourt(m, r, address(ip), protocol, 3, 3, 300, 300);
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
        vm.expectRevert(DisputeCourt.PoolTooSmall.selector);
        e.dispute(dealId);
        vm.stopPrank();

        assertEq(uint256(e.getDeal(dealId).status), uint256(DealEscrow.Status.Funded));
        assertEq(c.caseCount(), 0);
        assertEq(m.balanceOf(address(e)), 51 * 10 ** 6);
        assertEq(m.balanceOf(address(c)), 0);
        assertEq(m.allowance(address(e), address(c)), 0);
    }
}
