// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ArcLock
/// @notice Programmable USDC commitments for outcome-based settlement on Arc.
///
/// A payer locks USDC against a commitment. The recipient submits evidence
/// that the committed conditions were met. A designated verifier (which may
/// be the payer, an oracle/AI-verification relay, or - for the deadline path -
/// anyone) resolves the commitment, releasing funds to the recipient on
/// approval or refunding the payer on rejection/expiry.
///
/// Design notes (Arc-specific):
/// - USDC on Arc is both a native coin (18 decimals) and an ERC-20 (6
///   decimals) view of the same balance. This contract intentionally uses
///   the ERC-20 interface (approve + transferFrom) via OpenZeppelin's
///   SafeERC20, instead of native value transfers, to avoid Arc's
///   native-transfer revert rules (forbidden zero-address transfers,
///   blocklist enforcement, self-destruct interactions). See:
///   https://docs.arc.io/arc/references/evm-differences
/// - The backend/off-chain verification engine is untrusted input. The
///   contract only accepts a verifier-signed-equivalent transaction
///   (msg.sender == commitment.verifier) to approve/reject - the AI never
///   has direct custody or control of funds.
contract ArcLock is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum Status {
        CREATED, // commitment metadata recorded, not yet funded
        FUNDED, // USDC locked in the contract
        EVIDENCE_SUBMITTED, // recipient has submitted evidence
        APPROVED, // verifier approved; awaiting settlement (auto-settled in same tx)
        REJECTED, // verifier rejected; awaiting refund (auto-refunded in same tx)
        SETTLED, // funds released to recipient
        REFUNDED, // funds returned to payer (rejection or expiry)
        EXPIRED // deadline passed, unresolved, refunded
    }

    struct Commitment {
        address payer;
        address recipient;
        address verifier; // address authorized to approve/reject (e.g. payer or verification relay)
        uint256 amount; // USDC amount, in the token's native decimals (6)
        uint256 deadline; // unix timestamp
        bytes32 conditionHash; // hash of the off-chain condition description
        bytes32 evidenceHash; // hash of the off-chain evidence package
        Status status;
    }

    IERC20 public immutable usdc;

    uint256 public nextCommitmentId = 1;
    mapping(uint256 => Commitment) public commitments;

    event CommitmentCreated(
        uint256 indexed commitmentId,
        address indexed payer,
        address indexed recipient,
        address verifier,
        uint256 amount,
        uint256 deadline,
        bytes32 conditionHash
    );
    event CommitmentFunded(uint256 indexed commitmentId, uint256 amount);
    event EvidenceSubmitted(uint256 indexed commitmentId, bytes32 evidenceHash);
    event CommitmentApproved(uint256 indexed commitmentId);
    event CommitmentRejected(uint256 indexed commitmentId);
    event FundsReleased(uint256 indexed commitmentId, address indexed recipient, uint256 amount);
    event FundsRefunded(uint256 indexed commitmentId, address indexed payer, uint256 amount);
    event CommitmentExpired(uint256 indexed commitmentId);

    error InvalidRecipient();
    error InvalidVerifier();
    error InvalidAmount();
    error InvalidDeadline();
    error NotPayer();
    error NotVerifier();
    error NotRecipient();
    error WrongStatus();
    error DeadlineNotPassed();
    error DeadlinePassed();

    constructor(address usdcAddress) Ownable(msg.sender) {
        if (usdcAddress == address(0)) revert InvalidAmount();
        usdc = IERC20(usdcAddress);
    }

    /// @notice Create a commitment. Does not move funds; call fundCommitment next.
    function createCommitment(
        address recipient,
        address verifier,
        uint256 amount,
        uint256 deadline,
        bytes32 conditionHash
    ) external returns (uint256 commitmentId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (verifier == address(0)) revert InvalidVerifier();
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        commitmentId = nextCommitmentId++;
        commitments[commitmentId] = Commitment({
            payer: msg.sender,
            recipient: recipient,
            verifier: verifier,
            amount: amount,
            deadline: deadline,
            conditionHash: conditionHash,
            evidenceHash: bytes32(0),
            status: Status.CREATED
        });

        emit CommitmentCreated(commitmentId, msg.sender, recipient, verifier, amount, deadline, conditionHash);
    }

    /// @notice Lock USDC for a commitment. Payer must have approved this
    /// contract for at least `amount` beforehand.
    function fundCommitment(uint256 commitmentId) external nonReentrant {
        Commitment storage c = commitments[commitmentId];
        if (c.payer != msg.sender) revert NotPayer();
        if (c.status != Status.CREATED) revert WrongStatus();
        if (block.timestamp >= c.deadline) revert DeadlinePassed();

        c.status = Status.FUNDED;
        usdc.safeTransferFrom(msg.sender, address(this), c.amount);

        emit CommitmentFunded(commitmentId, c.amount);
    }

    /// @notice Recipient records a hash of the off-chain evidence package.
    function submitEvidence(uint256 commitmentId, bytes32 evidenceHash) external {
        Commitment storage c = commitments[commitmentId];
        if (c.recipient != msg.sender) revert NotRecipient();
        if (c.status != Status.FUNDED) revert WrongStatus();
        if (block.timestamp >= c.deadline) revert DeadlinePassed();

        c.evidenceHash = evidenceHash;
        c.status = Status.EVIDENCE_SUBMITTED;

        emit EvidenceSubmitted(commitmentId, evidenceHash);
    }

    /// @notice Verifier approves the commitment; funds settle to the recipient immediately.
    function approveCommitment(uint256 commitmentId) external nonReentrant {
        Commitment storage c = commitments[commitmentId];
        if (c.verifier != msg.sender) revert NotVerifier();
        if (c.status != Status.EVIDENCE_SUBMITTED) revert WrongStatus();

        c.status = Status.SETTLED;
        emit CommitmentApproved(commitmentId);

        usdc.safeTransfer(c.recipient, c.amount);
        emit FundsReleased(commitmentId, c.recipient, c.amount);
    }

    /// @notice Verifier rejects the commitment; funds refund to the payer immediately.
    function rejectCommitment(uint256 commitmentId) external nonReentrant {
        Commitment storage c = commitments[commitmentId];
        if (c.verifier != msg.sender) revert NotVerifier();
        if (c.status != Status.EVIDENCE_SUBMITTED) revert WrongStatus();

        c.status = Status.REFUNDED;
        emit CommitmentRejected(commitmentId);

        usdc.safeTransfer(c.payer, c.amount);
        emit FundsRefunded(commitmentId, c.payer, c.amount);
    }

    /// @notice After the deadline, anyone can trigger a refund to the payer
    /// if the commitment never reached a terminal state.
    function expireCommitment(uint256 commitmentId) external nonReentrant {
        Commitment storage c = commitments[commitmentId];
        if (block.timestamp < c.deadline) revert DeadlineNotPassed();
        if (
            c.status != Status.FUNDED &&
            c.status != Status.EVIDENCE_SUBMITTED
        ) revert WrongStatus();

        c.status = Status.EXPIRED;
        emit CommitmentExpired(commitmentId);

        usdc.safeTransfer(c.payer, c.amount);
        emit FundsRefunded(commitmentId, c.payer, c.amount);
    }

    function getCommitment(uint256 commitmentId) external view returns (Commitment memory) {
        return commitments[commitmentId];
    }
}
