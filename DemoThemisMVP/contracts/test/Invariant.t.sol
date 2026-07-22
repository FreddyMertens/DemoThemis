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

/// @dev Drives randomized full case cycles (both types) plus juror churn. Each
///      action either completes a whole case or no-ops, so cases never get stuck.
contract Handler is Test {
    MockUSD public musd;
    JurorRegistry public registry;
    DisputeCourt public court;
    DealEscrow public escrow;

    uint256 public constant BOND = 5 * 10 ** 6;
    bytes32 internal constant SALT = bytes32(uint256(0x9e1));

    address[] public jurors;
    address public opener = makeAddr("h_opener");
    address public payer = makeAddr("h_payer");
    address public payee = makeAddr("h_payee");

    constructor(MockUSD _musd, JurorRegistry _registry, DisputeCourt _court, DealEscrow _escrow, uint256 nJurors) {
        musd = _musd;
        registry = _registry;
        court = _court;
        escrow = _escrow;
        for (uint256 i; i < nJurors; i++) {
            address j = address(uint160(uint256(keccak256(abi.encodePacked("hjuror", i)))));
            _mint(j, 100 * 10 ** 6);
            vm.startPrank(j);
            musd.approve(address(registry), type(uint256).max);
            registry.register(j, abi.encode(uint256(keccak256(abi.encodePacked("hhuman", i))), j));
            vm.stopPrank();
            jurors.push(j);
        }
        vm.prank(opener);
        musd.approve(address(court), type(uint256).max);
        vm.prank(payer);
        musd.approve(address(escrow), type(uint256).max);
    }

    function jurorsLength() external view returns (uint256) {
        return jurors.length;
    }

    function runQuestion(uint256 seed) external {
        if (registry.jurorCount() < court.MIN_POOL()) return;
        _mint(opener, 100 * 10 ** 6);
        vm.prank(opener);
        uint256 caseId = court.openQuestion(keccak256("q"), "ipfs://q");
        _progress(caseId, seed);
    }

    function runDeal(uint256 seed) external {
        if (registry.jurorCount() < court.MIN_POOL()) return;
        _mint(payer, 100 * 10 ** 6);
        vm.prank(payer);
        uint256 dealId = escrow.createDeal(payee, 50 * 10 ** 6, keccak256("t"), "ipfs://t");
        vm.prank(payer);
        escrow.dispute(dealId);
        _progress(escrow.getDeal(dealId).caseId, seed);
    }

    /// @dev Withdraw a free juror, or re-bond one that left.
    function churn(uint256 seed) external {
        address j = jurors[seed % jurors.length];
        if (registry.isActive(j)) {
            if (registry.activePanels(j) == 0) {
                vm.prank(j);
                registry.withdraw();
            }
        } else if (registry.bondOf(j) == 0) {
            _mint(j, 100 * 10 ** 6);
            vm.startPrank(j);
            musd.approve(address(registry), type(uint256).max);
            registry.postBond();
            vm.stopPrank();
        }
    }

    function _progress(uint256 caseId, uint256 seed) internal {
        vm.roll(block.number + 2);
        court.draw(caseId);
        if (court.phaseOf(caseId) != DisputeCourt.Phase.Commit) return; // re-armed
        address[] memory panel = court.panelOf(caseId);
        for (uint256 i; i < panel.length; i++) {
            bool v = (seed >> i) & 1 == 1;
            vm.prank(panel[i]);
            court.commit(caseId, keccak256(abi.encode(v, SALT, caseId, panel[i])));
        }
        DisputeCourt.Case memory c = court.getCase(caseId);
        vm.warp(uint256(c.commitDeadline) + 1);
        for (uint256 i; i < panel.length; i++) {
            bool v = (seed >> i) & 1 == 1;
            vm.prank(panel[i]);
            court.reveal(caseId, v, SALT);
        }
        vm.warp(uint256(c.revealDeadline) + 1);
        court.resolve(caseId);
    }

    function _mint(address to, uint256 amt) internal {
        deal(address(musd), to, amt, true); // adjusts totalSupply -> conservation stays exact
    }
}

contract InvariantTest is Test {
    MockUSD internal musd;
    MockSybilGate internal gate;
    JurorRegistry internal registry;
    RewardPool internal rewardPool;
    DisputeCourt internal court;
    DealEscrow internal escrow;
    Handler internal handler;

    uint256 internal constant N = 20;
    uint256 internal constant BOND = 5 * 10 ** 6;
    address internal protocol = makeAddr("inv_protocol");

    function setUp() public {
        musd = new MockUSD();
        gate = new MockSybilGate();
        registry = new JurorRegistry(musd, gate);
        rewardPool = new RewardPool(musd);
        court = new DisputeCourt(musd, registry, address(rewardPool), protocol, 7, 14, 300, 300);
        escrow = new DealEscrow(musd, IDisputeCourt(address(court)));
        registry.setCourt(address(court));
        court.setEscrow(address(escrow));

        handler = new Handler(musd, registry, court, escrow, N);
        targetContract(address(handler));
    }

    /// No MUSD is created or destroyed by the system: every token lives in a
    /// tracked actor or one of the three contracts.
    function invariant_tokenConservation() public view {
        uint256 sum = musd.balanceOf(address(registry)) + musd.balanceOf(address(court))
            + musd.balanceOf(address(escrow)) + musd.balanceOf(address(rewardPool)) + musd.balanceOf(protocol)
            + musd.balanceOf(handler.opener()) + musd.balanceOf(handler.payer()) + musd.balanceOf(handler.payee());
        for (uint256 i; i < handler.jurorsLength(); i++) {
            sum += musd.balanceOf(handler.jurors(i));
        }
        assertEq(sum, musd.totalSupply());
    }

    /// The registry holds exactly one bond per active juror — never short.
    function invariant_registrySolvent() public view {
        assertEq(musd.balanceOf(address(registry)), registry.jurorCount() * BOND);
    }

    /// An active juror always has a full bond at stake.
    function invariant_activeJurorsAreBonded() public view {
        for (uint256 i; i < handler.jurorsLength(); i++) {
            address j = handler.jurors(i);
            if (registry.isActive(j)) {
                assertEq(registry.bondOf(j), BOND);
            }
        }
    }
}
