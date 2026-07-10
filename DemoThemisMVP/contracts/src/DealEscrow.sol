// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IDisputeCourt} from "./interfaces/IDisputeCourt.sol";
import {IEscrowSettlement} from "./interfaces/IEscrowSettlement.sol";

/// @title DealEscrow — demo case type A and the "arbitration service" story
/// @notice A payer funds a deal plus a 2% fee. Releasing pays the payee and
///         refunds the fee (no dispute, no court cost). Disputing locks the deal
///         and opens a court case funded by the 2% fee; the court's verdict
///         settles the payout. Parties to a disputed deal are excluded from its
///         own jury draw.
contract DealEscrow is IEscrowSettlement {
    using SafeERC20 for IERC20;

    uint256 public constant FEE_BPS = 200; // 2%

    IERC20 public immutable token;
    IDisputeCourt public immutable court;
    address public immutable courtAddr;

    enum Status {
        None,
        Funded,
        Released,
        Disputed,
        Settled
    }

    struct Deal {
        address payer;
        address payee;
        uint256 amount;
        uint256 fee;
        bytes32 termsHash;
        string uri;
        Status status;
        uint256 caseId;
    }

    Deal[] private _deals;

    event DealCreated(uint256 indexed dealId, address indexed payer, address indexed payee, uint256 amount, uint256 fee);
    event DealReleased(uint256 indexed dealId);
    event DealDisputed(uint256 indexed dealId, uint256 indexed caseId);
    event DealSettled(uint256 indexed dealId, bool payeeWins);

    error ZeroAmount();
    error NotParty();
    error NotFunded();
    error NotDisputed();
    error OnlyCourt();

    constructor(IERC20 _token, IDisputeCourt _court) {
        token = _token;
        court = _court;
        courtAddr = address(_court);
    }

    function dealCount() external view returns (uint256) {
        return _deals.length;
    }

    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return _deals[dealId];
    }

    function feeOf(uint256 amount) public pure returns (uint256) {
        return (amount * FEE_BPS) / 10_000;
    }

    /// @notice Payer funds `amount` to `payee` plus a 2% fee held on top.
    function createDeal(address payee, uint256 amount, bytes32 termsHash, string calldata uri)
        external
        returns (uint256 dealId)
    {
        if (amount == 0) revert ZeroAmount();
        uint256 fee = feeOf(amount);
        dealId = _deals.length;
        _deals.push(
            Deal({
                payer: msg.sender,
                payee: payee,
                amount: amount,
                fee: fee,
                termsHash: termsHash,
                uri: uri,
                status: Status.Funded,
                caseId: 0
            })
        );
        token.safeTransferFrom(msg.sender, address(this), amount + fee);
        emit DealCreated(dealId, msg.sender, payee, amount, fee);
    }

    /// @notice Payer releases: payee is paid, the fee is refunded to the payer.
    function release(uint256 dealId) external {
        Deal storage d = _deals[dealId];
        if (msg.sender != d.payer) revert NotParty();
        if (d.status != Status.Funded) revert NotFunded();
        d.status = Status.Released;
        token.safeTransfer(d.payee, d.amount);
        if (d.fee != 0) token.safeTransfer(d.payer, d.fee);
        emit DealReleased(dealId);
    }

    /// @notice Either party disputes: the deal locks and a court case opens,
    ///         funded by the 2% fee. The case question is "should the payee be
    ///         paid under the linked terms?" (vote YES = payee wins).
    function dispute(uint256 dealId) external {
        Deal storage d = _deals[dealId];
        if (msg.sender != d.payer && msg.sender != d.payee) revert NotParty();
        if (d.status != Status.Funded) revert NotFunded();
        d.status = Status.Disputed;
        // approve the court to pull exactly the fee that funds the case
        token.forceApprove(courtAddr, d.fee);
        uint256 caseId = court.openFromEscrow(dealId, d.termsHash, d.uri, d.payer, d.payee, d.fee);
        d.caseId = caseId;
        emit DealDisputed(dealId, caseId);
    }

    /// @notice Court-only callback: pay out per the verdict.
    function settle(uint256 dealId, bool payeeWins) external {
        if (msg.sender != courtAddr) revert OnlyCourt();
        Deal storage d = _deals[dealId];
        if (d.status != Status.Disputed) revert NotDisputed();
        d.status = Status.Settled;
        if (payeeWins) {
            token.safeTransfer(d.payee, d.amount);
        } else {
            token.safeTransfer(d.payer, d.amount);
        }
        emit DealSettled(dealId, payeeWins);
    }
}
