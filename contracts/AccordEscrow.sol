// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Minimal ERC-20 Interface for USDC (6 decimals on Base Sepolia)
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title AccordEscrow
 * @notice Production-grade programmatic escrow ledger for the Accord protocol on Base Sepolia.
 * Secures ERC-20 USDC rewards for competitive AI agent tournaments and releases funds strictly
 * to the deterministic winner selected by multi-agent consensus verification.
 */
contract AccordEscrow {
    enum EscrowStatus {
        NONE,
        HELD,
        RELEASED,
        REFUNDED
    }

    struct Escrow {
        bytes32 bountyIdHash;
        string bountyId;
        address depositor;
        address recipient;
        uint256 amount;
        uint256 feeAmount;
        uint256 blockTimestamp;
        EscrowStatus status;
        bytes32 verificationProofHash;
    }

    // State Variables
    IERC20 public immutable usdcToken;
    address public immutable protocolOperator;
    address public protocolFeeRecipient;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

    // Mapping from bountyIdHash -> Escrow
    mapping(bytes32 => Escrow) private _escrows;

    // Mutex for reentrancy protection
    bool private _locked;

    // Events
    event EscrowDeposited(
        string indexed bountyIdString,
        bytes32 indexed bountyIdHash,
        address indexed depositor,
        uint256 amount,
        uint256 blockTimestamp
    );

    event EscrowReleased(
        string indexed bountyIdString,
        bytes32 indexed bountyIdHash,
        address indexed winnerAddress,
        uint256 netPayout,
        uint256 protocolFee,
        bytes32 verificationProofHash,
        uint256 blockTimestamp
    );

    event EscrowRefunded(
        string indexed bountyIdString,
        bytes32 indexed bountyIdHash,
        address indexed refundRecipient,
        uint256 amount,
        uint256 blockTimestamp
    );

    event ProtocolFeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    // Errors
    error OnlyProtocolOperator();
    error ReentrancyGuardReentrantCall();
    error InvalidZeroAddress();
    error InvalidAmount();
    error EscrowAlreadyExists(string bountyId);
    error EscrowNotFound(string bountyId);
    error EscrowNotHeld(string bountyId, EscrowStatus currentStatus);
    error AmountMismatch(uint256 expected, uint256 actualTotal);
    error UnauthorizedRefund(string bountyId);
    error TransferFailed();

    modifier nonReentrant() {
        if (_locked) revert ReentrancyGuardReentrantCall();
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyOperator() {
        if (msg.sender != protocolOperator) revert OnlyProtocolOperator();
        _;
    }

    /**
     * @param _usdcToken Address of USDC ERC-20 contract (0x036CbD53842c5426634e7929541eC2318f3dCF7e on Base Sepolia)
     * @param _protocolOperator Authorized Accord backend operator wallet that executes finalized settlements
     * @param _protocolFeeRecipient Accord protocol treasury address
     */
    constructor(
        address _usdcToken,
        address _protocolOperator,
        address _protocolFeeRecipient
    ) {
        if (_usdcToken == address(0) || _protocolOperator == address(0) || _protocolFeeRecipient == address(0)) {
            revert InvalidZeroAddress();
        }
        usdcToken = IERC20(_usdcToken);
        protocolOperator = _protocolOperator;
        protocolFeeRecipient = _protocolFeeRecipient;
    }

    /**
     * @notice Locks ERC-20 USDC in escrow for a specified Accord bounty.
     * Caller must have approved this contract for at least `amount` USDC.
     */
    function depositEscrow(string calldata bountyId, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        bytes32 bountyIdHash = keccak256(bytes(bountyId));

        if (_escrows[bountyIdHash].status != EscrowStatus.NONE) {
            revert EscrowAlreadyExists(bountyId);
        }

        _escrows[bountyIdHash] = Escrow({
            bountyIdHash: bountyIdHash,
            bountyId: bountyId,
            depositor: msg.sender,
            recipient: address(0),
            amount: amount,
            feeAmount: 0,
            blockTimestamp: block.timestamp,
            status: EscrowStatus.HELD,
            verificationProofHash: bytes32(0)
        });

        bool success = usdcToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        emit EscrowDeposited(bountyId, bountyIdHash, msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Releases escrowed USDC to the winning autonomous AI agent.
     * Can only be called by the Accord protocol operator after tournament rankings are finalized.
     * Strictly prevents double release and validates recipient address and fee amounts.
     */
    function releaseEscrow(
        string calldata bountyId,
        address winnerAddress,
        uint256 netPayout,
        uint256 protocolFee,
        bytes32 verificationProofHash
    ) external onlyOperator nonReentrant {
        if (winnerAddress == address(0)) revert InvalidZeroAddress();
        bytes32 bountyIdHash = keccak256(bytes(bountyId));
        Escrow storage escrow = _escrows[bountyIdHash];

        if (escrow.status == EscrowStatus.NONE) {
            revert EscrowNotFound(bountyId);
        }
        if (escrow.status != EscrowStatus.HELD) {
            revert EscrowNotHeld(bountyId, escrow.status);
        }
        if (netPayout + protocolFee != escrow.amount) {
            revert AmountMismatch(escrow.amount, netPayout + protocolFee);
        }

        // Update state immutably before external transfers (Checks-Effects-Interactions)
        escrow.status = EscrowStatus.RELEASED;
        escrow.recipient = winnerAddress;
        escrow.feeAmount = protocolFee;
        escrow.verificationProofHash = verificationProofHash;

        // Transfer net payout to winning agent
        bool payoutSuccess = usdcToken.transfer(winnerAddress, netPayout);
        if (!payoutSuccess) revert TransferFailed();

        // Transfer fee to protocol treasury if non-zero
        if (protocolFee > 0) {
            bool feeSuccess = usdcToken.transfer(protocolFeeRecipient, protocolFee);
            if (!feeSuccess) revert TransferFailed();
        }

        emit EscrowReleased(
            bountyId,
            bountyIdHash,
            winnerAddress,
            netPayout,
            protocolFee,
            verificationProofHash,
            block.timestamp
        );
    }

    /**
     * @notice Refunds escrowed USDC back to the depositor if bounty expires without a valid winner.
     */
    function refundEscrow(string calldata bountyId) external nonReentrant {
        bytes32 bountyIdHash = keccak256(bytes(bountyId));
        Escrow storage escrow = _escrows[bountyIdHash];

        if (escrow.status == EscrowStatus.NONE) {
            revert EscrowNotFound(bountyId);
        }
        if (escrow.status != EscrowStatus.HELD) {
            revert EscrowNotHeld(bountyId, escrow.status);
        }
        if (msg.sender != protocolOperator && msg.sender != escrow.depositor) {
            revert UnauthorizedRefund(bountyId);
        }

        escrow.status = EscrowStatus.REFUNDED;
        uint256 refundAmount = escrow.amount;

        bool success = usdcToken.transfer(escrow.depositor, refundAmount);
        if (!success) revert TransferFailed();

        emit EscrowRefunded(bountyId, bountyIdHash, escrow.depositor, refundAmount, block.timestamp);
    }

    /**
     * @notice Updates the protocol fee recipient address.
     */
    function setProtocolFeeRecipient(address newRecipient) external onlyOperator {
        if (newRecipient == address(0)) revert InvalidZeroAddress();
        address old = protocolFeeRecipient;
        protocolFeeRecipient = newRecipient;
        emit ProtocolFeeRecipientUpdated(old, newRecipient);
    }

    // View Functions
    function getEscrow(string calldata bountyId) external view returns (Escrow memory) {
        bytes32 bountyIdHash = keccak256(bytes(bountyId));
        Escrow memory escrow = _escrows[bountyIdHash];
        if (escrow.status == EscrowStatus.NONE) {
            revert EscrowNotFound(bountyId);
        }
        return escrow;
    }

    function isEscrowHeld(string calldata bountyId) external view returns (bool) {
        bytes32 bountyIdHash = keccak256(bytes(bountyId));
        return _escrows[bountyIdHash].status == EscrowStatus.HELD;
    }

    function getEscrowStatus(string calldata bountyId) external view returns (EscrowStatus) {
        bytes32 bountyIdHash = keccak256(bytes(bountyId));
        return _escrows[bountyIdHash].status;
    }
}
