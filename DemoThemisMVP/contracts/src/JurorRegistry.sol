// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISybilGate} from "./sybil/ISybilGate.sol";
import {IAllowanceTransfer} from "./lib/IPermit2.sol";

/// @title JurorRegistry — the one-human-one-seat layer
/// @notice A human verifies once through the configured ISybilGate (World ID on
///         mainnet, a labeled stand-in on the Sepolia cohort), posts a $5 MUSD
///         refundable bond, and joins the drawable pool. Reused nullifiers are
///         rejected — that is the sybil gate. The bond gives even a one-vote
///         juror money on the line (the coherence-reward design in
///         reference/demothemis-site, ch. 2).
contract JurorRegistry {
    using SafeERC20 for IERC20;

    /// @dev 5 MUSD, 6 decimals.
    uint256 public constant BOND = 5 * 10 ** 6;

    /// @notice Uniswap's canonical Permit2, at the same address on every chain
    ///         (confirmed deployed on World Chain mainnet). `registerWithPermit2`
    ///         pulls the bond through it because World App auto-revokes plain
    ///         ERC-20 allowances but auto-approves tokens to Permit2.
    IAllowanceTransfer public constant PERMIT2 =
        IAllowanceTransfer(0x000000000022D473030F116dDEE9F6B43aC78BA3);

    IERC20 public immutable bondToken;
    ISybilGate public immutable gate;
    address public immutable deployer;

    /// @notice The DisputeCourt allowed to slash bonds and move jurors in/out of
    ///         panels. Set once, post-deploy (registry and court reference each
    ///         other, so one must be wired after the other exists).
    address public court;

    struct Juror {
        bool registered; // has ever verified a human via the gate
        uint256 bond; // MUSD currently staked
        uint256 activePanels; // number of live cases this juror is empaneled on
        uint256 idx; // 1-based index into activeList; 0 == not in the drawable pool
    }

    mapping(address => Juror) public jurors;
    mapping(uint256 => bool) public nullifierUsed;

    /// @dev The drawable pool. DisputeCourt indexes into this for the panel draw.
    address[] public activeList;

    event Registered(address indexed juror, uint256 indexed nullifier, uint256 jurorCount);
    event BondPosted(address indexed juror, uint256 amount);
    event Withdrawn(address indexed juror, uint256 bondReturned);
    event Slashed(address indexed juror, uint256 amount, address indexed to);
    event Activated(address indexed juror);
    event Deactivated(address indexed juror);
    event CourtSet(address indexed court);

    error OnlyDeployer();
    error OnlyCourt();
    error CourtAlreadySet();
    error SignalNotSender();
    error NullifierAlreadyUsed();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyActive();
    error BondStillStaked();
    error Empaneled();
    error NotActive();

    modifier onlyCourt() {
        if (msg.sender != court) revert OnlyCourt();
        _;
    }

    constructor(IERC20 _bondToken, ISybilGate _gate) {
        bondToken = _bondToken;
        gate = _gate;
        deployer = msg.sender;
    }

    function setCourt(address _court) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (court != address(0)) revert CourtAlreadySet();
        court = _court;
        emit CourtSet(_court);
    }

    // --- views used by the draw -------------------------------------------------

    function jurorCount() external view returns (uint256) {
        return activeList.length;
    }

    function jurorAt(uint256 i) external view returns (address) {
        return activeList[i];
    }

    function isActive(address who) public view returns (bool) {
        return jurors[who].idx != 0;
    }

    function bondOf(address who) external view returns (uint256) {
        return jurors[who].bond;
    }

    function activePanels(address who) external view returns (uint256) {
        return jurors[who].activePanels;
    }

    // --- registration / exit ----------------------------------------------------

    /// @notice Verify a human (bound to your own wallet) and join the pool with a
    ///         $5 bond pulled via a classic ERC-20 allowance. `proof` is
    ///         gate-specific; `signal` must be msg.sender so the proof binds to the
    ///         registrant. This is the desktop/dev/cohort path (and the B5 dev
    ///         page); World App uses `registerWithPermit2` instead, because it
    ///         auto-revokes plain ERC-20 allowances.
    function register(address signal, bytes calldata proof) external {
        uint256 nullifier = _enroll(signal, proof);
        bondToken.safeTransferFrom(msg.sender, address(this), BOND);
        emit Registered(msg.sender, nullifier, activeList.length);
    }

    /// @notice Same as `register`, but pulls the bond through Permit2's
    ///         allowance transfer instead of a direct ERC-20 allowance — the World
    ///         App onboard path. World App auto-approves the token to Permit2 and
    ///         auto-revokes plain `approve(registry)` allowances, so the sponsored
    ///         batch is `PERMIT2.approve(bondToken, registry, BOND, 0)` (the front
    ///         end) then this call, which pulls the bond via `PERMIT2.transferFrom`
    ///         from the caller. The token is fixed to `bondToken`, so the pool's
    ///         MUSD accounting can never be credited a bond in another token.
    function registerWithPermit2(address signal, bytes calldata proof) external {
        uint256 nullifier = _enroll(signal, proof);
        PERMIT2.transferFrom(msg.sender, address(this), uint160(BOND), address(bondToken));
        emit Registered(msg.sender, nullifier, activeList.length);
    }

    /// @dev Verify the human, reject a reused nullifier, and enrol the caller into
    ///      the drawable pool with a full bond recorded. Shared by both register
    ///      paths; the caller performs the actual bond transfer afterwards, so the
    ///      whole transaction reverts (rolling this state back) if the pull fails.
    function _enroll(address signal, bytes calldata proof) internal returns (uint256 nullifier) {
        if (signal != msg.sender) revert SignalNotSender();
        Juror storage j = jurors[msg.sender];
        if (j.registered) revert AlreadyRegistered();

        nullifier = gate.verify(signal, proof);
        if (nullifierUsed[nullifier]) revert NullifierAlreadyUsed();

        nullifierUsed[nullifier] = true;
        j.registered = true;
        j.bond = BOND;
        _activate(msg.sender);
    }

    /// @notice Re-post a bond after a slash or withdrawal to re-enter the pool.
    ///         No new proof needed — the human is already registered.
    function postBond() external {
        Juror storage j = jurors[msg.sender];
        if (!j.registered) revert NotRegistered();
        if (j.idx != 0) revert AlreadyActive();
        if (j.bond != 0) revert BondStillStaked();

        j.bond = BOND;
        _activate(msg.sender);

        bondToken.safeTransferFrom(msg.sender, address(this), BOND);
        emit BondPosted(msg.sender, BOND);
    }

    /// @notice Exit the pool and reclaim the bond. Blocked while empaneled. The
    ///         human stays registered (nullifier remains spent — one seat per
    ///         human); call postBond() to rejoin.
    function withdraw() external {
        Juror storage j = jurors[msg.sender];
        if (j.idx == 0) revert NotActive();
        if (j.activePanels != 0) revert Empaneled();

        uint256 amount = j.bond;
        j.bond = 0;
        _deactivate(msg.sender);

        if (amount != 0) bondToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // --- court-only -------------------------------------------------------------

    /// @notice Slash up to `amount` of a juror's bond to `to`. A juror whose bond
    ///         reaches zero is deactivated (not drawable) until they postBond().
    function slash(address juror, uint256 amount, address to) external onlyCourt {
        Juror storage j = jurors[juror];
        uint256 amt = amount > j.bond ? j.bond : amount;
        j.bond -= amt;
        if (j.bond == 0 && j.idx != 0) _deactivate(juror);
        if (amt != 0) bondToken.safeTransfer(to, amt);
        emit Slashed(juror, amt, to);
    }

    function enterPanel(address juror) external onlyCourt {
        jurors[juror].activePanels += 1;
    }

    function exitPanel(address juror) external onlyCourt {
        uint256 p = jurors[juror].activePanels;
        if (p != 0) jurors[juror].activePanels = p - 1;
    }

    // --- internal pool bookkeeping (swap-remove) --------------------------------

    function _activate(address who) internal {
        activeList.push(who);
        jurors[who].idx = activeList.length; // 1-based
        emit Activated(who);
    }

    function _deactivate(address who) internal {
        uint256 idx = jurors[who].idx;
        if (idx == 0) return;
        uint256 lastPos = activeList.length;
        if (idx != lastPos) {
            address moved = activeList[lastPos - 1];
            activeList[idx - 1] = moved;
            jurors[moved].idx = idx;
        }
        activeList.pop();
        jurors[who].idx = 0;
        emit Deactivated(who);
    }
}
