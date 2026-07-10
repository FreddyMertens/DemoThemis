// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {JurorRegistry} from "./JurorRegistry.sol";
import {IEscrowSettlement} from "./interfaces/IEscrowSettlement.sol";

/// @title DisputeCourt — the juror court, the heart of the demo
/// @notice One case lifecycle: Open -> Commit -> Reveal -> Resolved. A panel is
///         drawn pseudo-randomly from the registry (two-step, blockhash-based, so
///         the opener cannot precompute it), jurors commit a hashed vote then
///         reveal it, the majority wins, the fee pool is split among coherent
///         revealers, and no-show jurors lose their bond. Every time-gated
///         transition is permissionless. PANEL_SIZE / MIN_POOL are constructor
///         params: 7/14 on the Sepolia cohort, 3/3 on the mainnet live instance.
contract DisputeCourt {
    using SafeERC20 for IERC20;

    uint8 internal constant QUESTION = 0;
    uint8 internal constant ESCROW = 1;

    /// @dev 2 MUSD fee to open a question case (6 decimals).
    uint256 public constant CASE_FEE = 2 * 10 ** 6;
    /// @dev blockhash() is only available for the last 256 blocks.
    uint256 internal constant BLOCKHASH_WINDOW = 256;

    // The case fee splits 70/20/10 — jurors / reward pool / protocol — the economic
    // "constitution" from the design (reference/demothemis-site, ch. 8). Protocol
    // takes the remainder so the split conserves exactly.
    uint256 internal constant BPS_REWARD = 2000;
    uint256 internal constant BPS_PROTOCOL = 1000;

    IERC20 public immutable token;
    JurorRegistry public immutable registry;
    address public immutable deployer;

    /// @notice Slashed bonds and the 20% reward cut of fees flow here — never to
    ///         the other jurors (so a majority earns nothing by convicting its
    ///         dissenters). A passive sink in the MVP (RewardPool has no payout).
    ///         @notice protocol receives the 10% protocol cut.
    address public immutable rewardPool;
    address public immutable protocol;

    /// @notice The DealEscrow allowed to open escrow-funded cases, and the target
    ///         of the settlement callback. Set once, post-deploy.
    address public escrow;

    uint256 public immutable PANEL_SIZE;
    uint256 public immutable MIN_POOL;

    // Phase durations (mutable: deployer flips to fast demo-mode minutes).
    uint64 public commitDuration;
    uint64 public revealDuration;

    enum Status {
        Open, // awaiting draw
        Drawn, // panel set; commit then reveal, gated by deadlines
        Resolved
    }

    // UI-facing phase (derived from time); not stored.
    enum Phase {
        Open,
        Commit,
        Reveal,
        Resolvable,
        Resolved
    }

    struct Case {
        uint8 caseType;
        Status status;
        uint8 redraws;
        address party1; // excluded from the draw (opener, or escrow payer)
        address party2; // excluded from the draw (escrow payee; else zero)
        bytes32 criteriaHash;
        string uri;
        uint256 dealId; // escrow linkage
        uint256 feePool;
        uint64 drawBlock;
        uint64 commitDeadline;
        uint64 revealDeadline;
        bool outcome; // true = YES / payee wins
        address[] panel;
    }

    Case[] private _cases;

    mapping(uint256 => mapping(address => bytes32)) public commitmentOf;
    mapping(uint256 => mapping(address => bool)) public isPanelist;
    mapping(uint256 => mapping(address => bool)) public hasRevealed;
    mapping(uint256 => mapping(address => bool)) public voteOf; // valid iff hasRevealed
    mapping(uint256 => mapping(address => bool)) public excludedFromRedraw;

    event CaseOpened(uint256 indexed caseId, uint8 caseType, address indexed opener, uint256 feePool, string uri);
    event PanelDrawn(uint256 indexed caseId, address[] panel, uint64 commitDeadline, uint64 revealDeadline);
    event DrawRearmed(uint256 indexed caseId, uint64 newDrawBlock, string reason);
    event Committed(uint256 indexed caseId, address indexed juror);
    event Revealed(uint256 indexed caseId, address indexed juror, bool vote);
    event Redrawn(uint256 indexed caseId);
    event NoShowSlashed(uint256 indexed caseId, address indexed juror, uint256 amount);
    event FeePaid(uint256 indexed caseId, address indexed juror, uint256 amount);
    event FeeDistributed(uint256 indexed caseId, uint256 toJurors, uint256 toReward, uint256 toProtocol);
    event Resolved(uint256 indexed caseId, bool outcome, uint256 yes, uint256 no);

    error OnlyDeployer();
    error OnlyEscrow();
    error EscrowAlreadySet();
    error PoolTooSmall();
    error NoSuchCase();
    error NotOpen();
    error DrawBlockNotReady();
    error NotDrawn();
    error NotPanelist();
    error NotCommitPhase();
    error NotRevealPhase();
    error AlreadyCommitted();
    error AlreadyRevealed();
    error NoCommitment();
    error BadReveal();
    error RevealNotOver();

    constructor(
        IERC20 _token,
        JurorRegistry _registry,
        address _rewardPool,
        address _protocol,
        uint256 panelSize,
        uint256 minPool,
        uint64 _commitDuration,
        uint64 _revealDuration
    ) {
        require(panelSize > 0 && minPool >= panelSize, "bad params");
        require(_rewardPool != address(0) && _protocol != address(0), "zero addr");
        token = _token;
        registry = _registry;
        rewardPool = _rewardPool;
        protocol = _protocol;
        deployer = msg.sender;
        PANEL_SIZE = panelSize;
        MIN_POOL = minPool;
        commitDuration = _commitDuration;
        revealDuration = _revealDuration;
    }

    function setEscrow(address _escrow) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (escrow != address(0)) revert EscrowAlreadySet();
        escrow = _escrow;
    }

    /// @notice Deployer-only phase-duration switch (the only admin power; e.g.
    ///         flip to demo-mode minutes). Affects only cases opened afterwards.
    function setDurations(uint64 _commitDuration, uint64 _revealDuration) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        commitDuration = _commitDuration;
        revealDuration = _revealDuration;
    }

    function caseCount() external view returns (uint256) {
        return _cases.length;
    }

    function panelOf(uint256 caseId) external view returns (address[] memory) {
        return _cases[caseId].panel;
    }

    function getCase(uint256 caseId) external view returns (Case memory) {
        return _cases[caseId];
    }

    // --- opening ----------------------------------------------------------------

    /// @notice Open a yes/no resolution question (demo case type B). `uri` points
    ///         to the question text + evidence. Pulls the 2 MUSD case fee.
    function openQuestion(bytes32 criteriaHash, string calldata uri) external returns (uint256 caseId) {
        if (registry.jurorCount() < MIN_POOL) revert PoolTooSmall();
        caseId = _open(QUESTION, msg.sender, address(0), criteriaHash, uri, 0);
        token.safeTransferFrom(msg.sender, address(this), CASE_FEE);
        _cases[caseId].feePool = CASE_FEE;
    }

    /// @notice Escrow-only entry point (demo case type A). The disputed deal's 2%
    ///         fee funds the case; pulled from the escrow (which must approve).
    function openFromEscrow(
        uint256 dealId,
        bytes32 criteriaHash,
        string calldata uri,
        address payer,
        address payee,
        uint256 feeAmount
    ) external returns (uint256 caseId) {
        if (msg.sender != escrow) revert OnlyEscrow();
        if (registry.jurorCount() < MIN_POOL) revert PoolTooSmall();
        caseId = _open(ESCROW, payer, payee, criteriaHash, uri, dealId);
        token.safeTransferFrom(msg.sender, address(this), feeAmount);
        _cases[caseId].feePool = feeAmount;
    }

    function _open(
        uint8 caseType,
        address party1,
        address party2,
        bytes32 criteriaHash,
        string calldata uri,
        uint256 dealId
    ) internal returns (uint256 caseId) {
        caseId = _cases.length;
        Case storage c = _cases.push();
        c.caseType = caseType;
        c.status = Status.Open;
        c.party1 = party1;
        c.party2 = party2;
        c.criteriaHash = criteriaHash;
        c.uri = uri;
        c.dealId = dealId;
        c.drawBlock = uint64(block.number + 1);
        emit CaseOpened(caseId, caseType, party1, 0, uri);
    }

    // --- draw (two-step, permissionless) ---------------------------------------

    /// @notice Crank the panel draw. Callable by anyone once the draw block exists.
    ///         Re-arms (does not brick) if the blockhash window lapsed or the pool
    ///         is too small right now.
    function draw(uint256 caseId) external {
        if (caseId >= _cases.length) revert NoSuchCase();
        Case storage c = _cases[caseId];
        if (c.status != Status.Open) revert NotOpen();
        if (block.number <= c.drawBlock) revert DrawBlockNotReady();

        bytes32 bh = blockhash(c.drawBlock);
        if (bh == bytes32(0)) {
            // window of 256 blocks lapsed before anyone cranked — re-arm
            c.drawBlock = uint64(block.number + 1);
            emit DrawRearmed(caseId, c.drawBlock, "blockhash-expired");
            return;
        }

        uint256 count = registry.jurorCount();
        if (count < PANEL_SIZE) {
            c.drawBlock = uint64(block.number + 1);
            emit DrawRearmed(caseId, c.drawBlock, "pool-too-small");
            return;
        }

        // Select PANEL_SIZE distinct jurors, excluding parties and prior no-shows.
        uint256 maxAttempts = PANEL_SIZE * 10 + 30;
        for (uint256 k; k < maxAttempts && c.panel.length < PANEL_SIZE; k++) {
            uint256 idx = uint256(keccak256(abi.encodePacked(bh, caseId, k))) % count;
            address cand = registry.jurorAt(idx);
            if (cand == c.party1 || cand == c.party2) continue;
            if (excludedFromRedraw[caseId][cand]) continue;
            if (isPanelist[caseId][cand]) continue;
            isPanelist[caseId][cand] = true;
            c.panel.push(cand);
        }

        if (c.panel.length < PANEL_SIZE) {
            // unlucky / too few eligible — wipe partial panel and re-arm
            _wipePanelFlags(c, caseId);
            c.drawBlock = uint64(block.number + 1);
            emit DrawRearmed(caseId, c.drawBlock, "could-not-fill");
            return;
        }

        for (uint256 i; i < c.panel.length; i++) {
            registry.enterPanel(c.panel[i]);
        }
        c.commitDeadline = uint64(block.timestamp) + commitDuration;
        c.revealDeadline = c.commitDeadline + revealDuration;
        c.status = Status.Drawn;
        emit PanelDrawn(caseId, c.panel, c.commitDeadline, c.revealDeadline);
    }

    // --- commit / reveal --------------------------------------------------------

    /// @param h = keccak256(abi.encode(vote, salt, caseId, juror))
    function commit(uint256 caseId, bytes32 h) external {
        Case storage c = _cases[caseId];
        if (c.status != Status.Drawn) revert NotDrawn();
        if (block.timestamp > c.commitDeadline) revert NotCommitPhase();
        if (!isPanelist[caseId][msg.sender]) revert NotPanelist();
        if (commitmentOf[caseId][msg.sender] != bytes32(0)) revert AlreadyCommitted();
        commitmentOf[caseId][msg.sender] = h;
        emit Committed(caseId, msg.sender);
    }

    function reveal(uint256 caseId, bool vote, bytes32 salt) external {
        Case storage c = _cases[caseId];
        if (c.status != Status.Drawn) revert NotDrawn();
        if (block.timestamp <= c.commitDeadline || block.timestamp > c.revealDeadline) revert NotRevealPhase();
        if (!isPanelist[caseId][msg.sender]) revert NotPanelist();
        bytes32 commitment = commitmentOf[caseId][msg.sender];
        if (commitment == bytes32(0)) revert NoCommitment();
        if (hasRevealed[caseId][msg.sender]) revert AlreadyRevealed();
        if (keccak256(abi.encode(vote, salt, caseId, msg.sender)) != commitment) revert BadReveal();
        hasRevealed[caseId][msg.sender] = true;
        voteOf[caseId][msg.sender] = vote;
        emit Revealed(caseId, msg.sender, vote);
    }

    // --- resolve (permissionless) ----------------------------------------------

    function resolve(uint256 caseId) external {
        Case storage c = _cases[caseId];
        if (c.status != Status.Drawn) revert NotDrawn();
        if (block.timestamp <= c.revealDeadline) revert RevealNotOver();

        // Tally revealed votes, penalize no-shows (bond -> reward pool), release panel.
        uint256 yes;
        uint256 no;
        uint256 len = c.panel.length;
        for (uint256 i; i < len; i++) {
            address juror = c.panel[i];
            registry.exitPanel(juror);
            if (hasRevealed[caseId][juror]) {
                if (voteOf[caseId][juror]) yes++;
                else no++;
            } else {
                // No-show = liveness penalty. The bond goes to the REWARD pool,
                // never to the other jurors. (Wrong-side/coherence slashing is the
                // design's real laziness floor but needs the appeal ladder to be
                // fair, so it is deferred — see docs/MECHANISM_DELTA.md.)
                uint256 b = registry.bondOf(juror);
                if (b != 0) {
                    registry.slash(juror, b, rewardPool);
                    emit NoShowSlashed(caseId, juror, b);
                }
                excludedFromRedraw[caseId][juror] = true;
            }
        }

        uint256 revealed = yes + no;
        uint256 quorum = PANEL_SIZE / 2 + 1;

        if (revealed < quorum) {
            if (c.redraws == 0) {
                c.redraws = 1;
                _clearPanel(c, caseId);
                c.drawBlock = uint64(block.number + 1);
                c.status = Status.Open;
                emit Redrawn(caseId);
                return;
            }
            _distributeFee(caseId, c, false); // second miss → status quo
            _finalize(caseId, c, false, yes, no);
            return;
        }

        bool outcome = yes > no; // tie -> false (status quo)
        _distributeFee(caseId, c, outcome);
        _finalize(caseId, c, outcome, yes, no);
    }

    // --- internals --------------------------------------------------------------

    /// @dev Split the case fee 70/20/10 (jurors / reward pool / protocol). The juror
    ///      share goes equally to revealers who matched the outcome; if there are
    ///      none, that share backs the reward pool. Slashed bonds are NOT in this
    ///      pool — they already went straight to the reward pool. Conserves exactly.
    function _distributeFee(uint256 caseId, Case storage c, bool outcome) internal {
        uint256 pool = c.feePool;
        if (pool == 0) return;
        uint256 toReward = (pool * BPS_REWARD) / 10_000;
        uint256 toProtocol = (pool * BPS_PROTOCOL) / 10_000;
        uint256 jurorPot = pool - toReward - toProtocol;

        uint256 len = c.panel.length;
        uint256 winners;
        for (uint256 i; i < len; i++) {
            address juror = c.panel[i];
            if (hasRevealed[caseId][juror] && voteOf[caseId][juror] == outcome) winners++;
        }

        uint256 paidToJurors;
        if (winners != 0) {
            uint256 share = jurorPot / winners;
            for (uint256 i; i < len; i++) {
                address juror = c.panel[i];
                if (hasRevealed[caseId][juror] && voteOf[caseId][juror] == outcome) {
                    token.safeTransfer(juror, share);
                    emit FeePaid(caseId, juror, share);
                }
            }
            paidToJurors = share * winners;
        }
        // unpaid juror share (rounding dust, or the whole pot if no coherent juror)
        // backs the reward pool, so the fee conserves exactly
        toReward += jurorPot - paidToJurors;

        if (toReward != 0) token.safeTransfer(rewardPool, toReward);
        if (toProtocol != 0) token.safeTransfer(protocol, toProtocol);
        emit FeeDistributed(caseId, paidToJurors, toReward, toProtocol);
    }

    function _finalize(uint256 caseId, Case storage c, bool outcome, uint256 yes, uint256 no) internal {
        c.status = Status.Resolved;
        c.outcome = outcome;
        if (c.caseType == ESCROW) {
            IEscrowSettlement(escrow).settle(c.dealId, outcome);
        }
        emit Resolved(caseId, outcome, yes, no);
    }

    /// @dev Reset per-juror flags + panel for a redraw (keeps feePool + excluded).
    function _clearPanel(Case storage c, uint256 caseId) internal {
        uint256 len = c.panel.length;
        for (uint256 i; i < len; i++) {
            address juror = c.panel[i];
            delete commitmentOf[caseId][juror];
            delete isPanelist[caseId][juror];
            delete hasRevealed[caseId][juror];
            delete voteOf[caseId][juror];
        }
        delete c.panel;
    }

    /// @dev Used when a draw attempt could not fill the panel: clear the partial
    ///      isPanelist flags so the re-armed draw starts clean.
    function _wipePanelFlags(Case storage c, uint256 caseId) internal {
        uint256 len = c.panel.length;
        for (uint256 i; i < len; i++) {
            delete isPanelist[caseId][c.panel[i]];
        }
        delete c.panel;
    }

    // --- UI helper --------------------------------------------------------------

    function phaseOf(uint256 caseId) external view returns (Phase) {
        Case storage c = _cases[caseId];
        if (c.status == Status.Resolved) return Phase.Resolved;
        if (c.status == Status.Open) return Phase.Open;
        if (block.timestamp <= c.commitDeadline) return Phase.Commit;
        if (block.timestamp <= c.revealDeadline) return Phase.Reveal;
        return Phase.Resolvable;
    }
}
