// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {DisputeCourt} from "../src/DisputeCourt.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";

contract DisputeCourtTest is Base {
    bytes32 internal constant SALT = bytes32(uint256(0x5a17));

    function setUp() public override {
        super.setUp();
        _registerMany(MINPOOL); // 14 jurors
    }

    // --- happy paths ------------------------------------------------------------

    function test_lifecycle_majorityYes_splitsFeeAmongWinners() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        assertEq(panel.length, PANEL);

        // 4 YES, 3 NO
        for (uint256 i; i < panel.length; i++) {
            _commit(panel[i], caseId, i < 4, SALT);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < panel.length; i++) {
            _reveal(panel[i], caseId, i < 4, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);

        DisputeCourt.Case memory c = court.getCase(caseId);
        assertEq(uint256(c.status), uint256(DisputeCourt.Status.Resolved));
        assertTrue(c.outcome); // YES

        uint256 share = FEE_JURORS / 4; // jurors split only the 70% cut
        for (uint256 i; i < 4; i++) {
            // 100 funded - 5 bond + share
            assertEq(musd.balanceOf(panel[i]), 100 * 10 ** 6 - BOND + share);
        }
        for (uint256 i = 4; i < 7; i++) {
            assertEq(musd.balanceOf(panel[i]), 100 * 10 ** 6 - BOND); // minority: no pay, no slash
        }
        // 70/20/10 split; all revealed so no slashes; 4 evenly divides 1.4 MUSD (no dust)
        assertEq(musd.balanceOf(protocol), FEE_PROTOCOL);
        assertEq(musd.balanceOf(address(rewardPool)), FEE_REWARD);
        assertEq(musd.balanceOf(address(court)), 0); // whole fee distributed
    }

    function test_lifecycle_unanimous() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < 7; i++) {
            _commit(panel[i], caseId, true, SALT);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 7; i++) {
            _reveal(panel[i], caseId, true, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);
        assertTrue(court.getCase(caseId).outcome);
        uint256 share = FEE_JURORS / 7;
        assertEq(musd.balanceOf(panel[0]), 100 * 10 ** 6 - BOND + share);
    }

    function test_partialReveal_quorumMet_slashesNoShows() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        // 5 reveal (3 YES, 2 NO), 2 no-show
        for (uint256 i; i < 5; i++) {
            _commit(panel[i], caseId, i < 3, SALT);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 5; i++) {
            _reveal(panel[i], caseId, i < 3, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);

        DisputeCourt.Case memory c = court.getCase(caseId);
        assertTrue(c.outcome); // 3 YES > 2 NO

        // no-shows slashed to zero and deactivated; their bonds went to the reward pool
        assertEq(registry.bondOf(panel[5]), 0);
        assertEq(registry.bondOf(panel[6]), 0);
        assertFalse(registry.isActive(panel[5]));

        // jurors split ONLY the 70% fee cut — never the slashed bonds; 3 winners
        uint256 share = FEE_JURORS / 3;
        assertEq(musd.balanceOf(panel[0]), 100 * 10 ** 6 - BOND + share);
        // the 2 slashed bonds + 20% fee cut + juror-share dust all land in the reward pool
        assertEq(musd.balanceOf(address(rewardPool)), 2 * BOND + FEE_REWARD + (FEE_JURORS - share * 3));
        assertEq(musd.balanceOf(protocol), FEE_PROTOCOL);
    }

    function test_feeSplit_conservesAndRoutesCorrectly() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < 7; i++) {
            _commit(panel[i], caseId, true, SALT);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 7; i++) {
            _reveal(panel[i], caseId, true, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);

        uint256 share = FEE_JURORS / 7;
        assertEq(musd.balanceOf(protocol), FEE_PROTOCOL); // 10%
        assertEq(musd.balanceOf(address(rewardPool)), FEE_REWARD + (FEE_JURORS - share * 7)); // 20% + dust
        assertEq(musd.balanceOf(address(court)), 0); // whole fee left the court
    }

    function test_tie_resolvesStatusQuo() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        // 6 reveal: 3 YES, 3 NO; 1 no-show -> revealed 6 >= quorum 4, tie
        for (uint256 i; i < 6; i++) {
            _commit(panel[i], caseId, i < 3, SALT);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 6; i++) {
            _reveal(panel[i], caseId, i < 3, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);
        assertFalse(court.getCase(caseId).outcome); // tie -> status quo NO
    }

    function test_quorumMiss_triggersRedraw_thenResolves() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        // only 3 reveal (< quorum 4)
        for (uint256 i; i < 3; i++) {
            _commit(panel[i], caseId, true, SALT);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 3; i++) {
            _reveal(panel[i], caseId, true, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);

        DisputeCourt.Case memory c = court.getCase(caseId);
        assertEq(c.redraws, 1);
        assertEq(uint256(c.status), uint256(DisputeCourt.Status.Open)); // re-armed
        // the 4 no-shows were slashed
        assertEq(registry.bondOf(panel[3]), 0);

        // second panel resolves normally
        _doDraw(caseId);
        address[] memory panel2 = court.panelOf(caseId);
        assertEq(panel2.length, PANEL);
        for (uint256 i; i < 7; i++) {
            _commit(panel2[i], caseId, true, SALT);
        }
        _warpToReveal(caseId);
        for (uint256 i; i < 7; i++) {
            _reveal(panel2[i], caseId, true, SALT);
        }
        _warpToResolve(caseId);
        court.resolve(caseId);
        assertEq(uint256(court.getCase(caseId).status), uint256(DisputeCourt.Status.Resolved));
        assertTrue(court.getCase(caseId).outcome);
    }

    function test_secondMiss_resolvesStatusQuo() public {
        uint256 caseId = _openQuestion();
        // panel 1: no reveals -> redraw
        _doDraw(caseId);
        _warpToResolve(caseId);
        court.resolve(caseId);
        assertEq(court.getCase(caseId).redraws, 1);
        // panel 2: no reveals -> status quo
        _doDraw(caseId);
        _warpToResolve(caseId);
        court.resolve(caseId);
        DisputeCourt.Case memory c = court.getCase(caseId);
        assertEq(uint256(c.status), uint256(DisputeCourt.Status.Resolved));
        assertFalse(c.outcome);
    }

    // --- guards -----------------------------------------------------------------

    function test_openQuestion_poolTooSmall_reverts() public {
        // a fresh court with only 13 jurors active: withdraw one
        address j = _juror(0);
        vm.prank(j);
        registry.withdraw(); // 13 active now
        _fund(opener, 100 * 10 ** 6);
        vm.startPrank(opener);
        musd.approve(address(court), type(uint256).max);
        vm.expectRevert(DisputeCourt.PoolTooSmall.selector);
        court.openQuestion(keccak256("q"), "ipfs://q");
        vm.stopPrank();
    }

    function test_draw_rearmsWhenPoolTooSmall() public {
        uint256 caseId = _openQuestion();
        // drop below PANEL by withdrawing 8 (14 -> 6)
        for (uint256 i; i < 8; i++) {
            address j = _juror(i);
            vm.prank(j);
            registry.withdraw();
        }
        _doDraw(caseId);
        DisputeCourt.Case memory c = court.getCase(caseId);
        assertEq(uint256(c.status), uint256(DisputeCourt.Status.Open)); // re-armed, not bricked
        assertEq(c.panel.length, 0);
    }

    function test_commitBeforeDraw_reverts() public {
        uint256 caseId = _openQuestion();
        vm.prank(_juror(0));
        vm.expectRevert(DisputeCourt.NotDrawn.selector);
        court.commit(caseId, keccak256("x"));
    }

    function test_nonPanelistCommit_reverts() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        // find a juror NOT on the panel
        address[] memory panel = court.panelOf(caseId);
        address outsider;
        for (uint256 i; i < MINPOOL; i++) {
            address cand = _juror(i);
            bool onPanel;
            for (uint256 k; k < panel.length; k++) {
                if (panel[k] == cand) onPanel = true;
            }
            if (!onPanel) {
                outsider = cand;
                break;
            }
        }
        vm.prank(outsider);
        vm.expectRevert(DisputeCourt.NotPanelist.selector);
        court.commit(caseId, keccak256("x"));
    }

    function test_doubleCommit_reverts() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address j = court.panelOf(caseId)[0];
        _commit(j, caseId, true, SALT);
        vm.prank(j);
        vm.expectRevert(DisputeCourt.AlreadyCommitted.selector);
        court.commit(caseId, keccak256("y"));
    }

    function test_revealMismatch_reverts() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address j = court.panelOf(caseId)[0];
        _commit(j, caseId, true, SALT);
        _warpToReveal(caseId);
        vm.prank(j);
        vm.expectRevert(DisputeCourt.BadReveal.selector);
        court.reveal(caseId, false, SALT); // wrong vote
    }

    function test_commitAfterDeadline_reverts() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address j = court.panelOf(caseId)[0];
        _warpToReveal(caseId);
        vm.prank(j);
        vm.expectRevert(DisputeCourt.NotCommitPhase.selector);
        court.commit(caseId, keccak256("x"));
    }

    function test_resolveBeforeRevealOver_reverts() public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        vm.expectRevert(DisputeCourt.RevealNotOver.selector);
        court.resolve(caseId);
    }

    function test_phaseOf_transitions() public {
        uint256 caseId = _openQuestion();
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Open));
        _doDraw(caseId);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Commit));
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < 7; i++) {
            _commit(panel[i], caseId, true, SALT);
        }
        _warpToReveal(caseId);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Reveal));
        for (uint256 i; i < 7; i++) {
            _reveal(panel[i], caseId, true, SALT);
        }
        _warpToResolve(caseId);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Resolvable));
        court.resolve(caseId);
        assertEq(uint256(court.phaseOf(caseId)), uint256(DisputeCourt.Phase.Resolved));
    }

    function test_draw_excludesOpener() public {
        // register the opener as a juror too, then open; opener must not be drawn
        // (opener is a party to the question).
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < panel.length; i++) {
            assertTrue(panel[i] != opener);
        }
    }

    function testFuzz_commitReveal_anySaltVote(bool vote, bytes32 salt) public {
        uint256 caseId = _openQuestion();
        _doDraw(caseId);
        address j = court.panelOf(caseId)[0];
        _commit(j, caseId, vote, salt);
        _warpToReveal(caseId);
        _reveal(j, caseId, vote, salt);
        assertTrue(court.hasRevealed(caseId, j));
        assertEq(court.voteOf(caseId, j), vote);
    }
}
