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

/// @dev Shared harness: deploys + wires the full system (7/14 cohort params,
///      immutable five-minute durations) and provides juror/case helpers.
contract Base is Test {
    MockUSD internal musd;
    MockSybilGate internal gate;
    JurorRegistry internal registry;
    RewardPool internal rewardPool;
    DisputeCourt internal court;
    DealEscrow internal escrow;

    uint64 internal constant COMMIT_DUR = 300;
    uint64 internal constant REVEAL_DUR = 300;
    uint256 internal constant PANEL = 7;
    uint256 internal constant MINPOOL = 14;
    uint256 internal constant BOND = 5 * 10 ** 6;
    uint256 internal constant CASE_FEE = 20 * 10 ** 6;
    // 70/20/10 split of the case fee
    uint256 internal constant FEE_REWARD = (CASE_FEE * 2000) / 10_000; // 4 MUSD
    uint256 internal constant FEE_PROTOCOL = (CASE_FEE * 1000) / 10_000; // 2 MUSD
    uint256 internal constant FEE_JURORS = CASE_FEE - FEE_REWARD - FEE_PROTOCOL; // 14 MUSD

    address internal opener = makeAddr("opener");
    address internal protocol = makeAddr("protocol");

    function setUp() public virtual {
        musd = new MockUSD();
        gate = new MockSybilGate();
        registry = new JurorRegistry(musd, gate);
        rewardPool = new RewardPool(musd);
        court = new DisputeCourt(musd, registry, address(rewardPool), protocol, PANEL, MINPOOL, COMMIT_DUR, REVEAL_DUR);
        escrow = new DealEscrow(musd, IDisputeCourt(address(court)));
        registry.setCourt(address(court));
        court.setEscrow(address(escrow));
    }

    function _fund(address who, uint256 amt) internal {
        deal(address(musd), who, amt);
    }

    function _juror(uint256 i) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked("juror", i)))));
    }

    function _nullifier(uint256 i) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked("human", i)));
    }

    function _register(uint256 i) internal returns (address j) {
        j = _juror(i);
        _fund(j, 100 * 10 ** 6);
        vm.startPrank(j);
        musd.approve(address(registry), type(uint256).max);
        registry.register(j, abi.encode(_nullifier(i), j));
        vm.stopPrank();
    }

    function _registerMany(uint256 n) internal {
        for (uint256 i; i < n; i++) {
            _register(i);
        }
    }

    function _openQuestion() internal returns (uint256 caseId) {
        _fund(opener, 100 * 10 ** 6);
        vm.startPrank(opener);
        musd.approve(address(court), type(uint256).max);
        caseId = court.openQuestion(keccak256("q"), "ipfs://question");
        vm.stopPrank();
    }

    /// @dev Roll past the draw block (so blockhash is available) and crank draw.
    function _doDraw(uint256 caseId) internal {
        vm.roll(block.number + 2);
        court.draw(caseId);
    }

    function _commit(address j, uint256 caseId, bool vote, bytes32 salt) internal {
        vm.prank(j);
        court.commit(caseId, keccak256(abi.encode(vote, salt, caseId, j)));
    }

    function _reveal(address j, uint256 caseId, bool vote, bytes32 salt) internal {
        vm.prank(j);
        court.reveal(caseId, vote, salt);
    }

    function _warpToReveal(uint256 caseId) internal {
        DisputeCourt.Case memory c = court.getCase(caseId);
        vm.warp(uint256(c.commitDeadline) + 1);
    }

    function _warpToResolve(uint256 caseId) internal {
        DisputeCourt.Case memory c = court.getCase(caseId);
        vm.warp(uint256(c.revealDeadline) + 1);
    }
}
