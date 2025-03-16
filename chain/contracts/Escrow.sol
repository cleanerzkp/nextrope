// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";

/**
 * @title escrow
 * @dev an escrow contract for handling transactions between buyers and sellers
 * with third-party arbitration support for dispute resolution.
 * supports both eth and erc-20 tokens.
 */
contract Escrow is Ownable {
    using SafeERC20 for IERC20;
    using BitMaps for BitMaps.BitMap;

    // custom errors
    error InvalidState();
    error InvalidAmount();
    error InvalidAddress();
    error UnauthorizedCaller();
    error TransferFailed();
    error NotApprovedArbiter();
    error ArbiterAlreadyExists();
    error DisputeReasonTooLong();

    // constants
    uint8 public constant MAX_DISPUTE_REASON_LENGTH = 200; // maximum length for dispute reasons

    enum State {
        AWAITING_PAYMENT,
        AWAITING_DELIVERY,
        SHIPPED,
        DISPUTED,
        COMPLETED,
        REFUNDED,
        CANCELLED
    }

    // bitmap for storing approved arbiters
    BitMaps.BitMap private arbiterBitmap;
    
    // mapping to store arbiter addresses by their index
    mapping(uint256 => address) private arbiterAddresses;
    
    // mapping to store arbiter indices
    mapping(address => uint256) private arbiterIndices;
    
    // counter for next arbiter index (starting at 1 to distinguish from unset values)
    uint256 private nextArbiterIndex = 1;
    
    // struct for deal storage
    struct Deal {
        // these will be packed according to solidity storage rules
        address payable buyer;      // 20 bytes
        address payable seller;     // 20 bytes
        State state;                // 1 byte
        address payable arbiter;    // 20 bytes
        address tokenAddress;       // 20 bytes
        uint256 amount;             // 32 bytes - always starts a new slot
        uint256 createdAt;          // 32 bytes - always starts a new slot
    }

    // mapping from deal id to deal struct
    mapping(uint256 => Deal) public deals;
    
    // separate mapping for dispute reasons (potentially large strings)
    mapping(uint256 => string) public disputeReasons;
    
    uint256 public nextDealId;

    // events with proper indexing
    event ArbiterAdded(address indexed arbiter, uint256 indexed bitIndex);
    event ArbiterRemoved(address indexed arbiter, uint256 indexed bitIndex);
    event DealCreated(
        uint256 indexed dealId,
        address indexed buyer,
        address indexed seller,
        address arbiter,
        address tokenAddress,
        uint256 amount
    );
    event PaymentReceived(uint256 indexed dealId);
    event ItemShipped(uint256 indexed dealId);
    event DealCompleted(uint256 indexed dealId);
    event DisputeRaised(uint256 indexed dealId, string reason, address indexed initiator);
    // consolidated dispute resolution event
    event DisputeResolved(
        uint256 indexed dealId, 
        address indexed winner, 
        bool isRefund, 
        State newState
    );
    event DealCancelled(uint256 indexed dealId);

    // modifiers
    modifier onlyBuyer(uint256 _dealId) {
        if (msg.sender != deals[_dealId].buyer) revert UnauthorizedCaller();
        _;
    }

    modifier onlySeller(uint256 _dealId) {
        if (msg.sender != deals[_dealId].seller) revert UnauthorizedCaller();
        _;
    }

    modifier onlyArbiter(uint256 _dealId) {
        if (msg.sender != deals[_dealId].arbiter) revert UnauthorizedCaller();
        _;
    }

    modifier onlyBuyerOrSeller(uint256 _dealId) {
        if (msg.sender != deals[_dealId].buyer && msg.sender != deals[_dealId].seller) 
            revert UnauthorizedCaller();
        _;
    }

    modifier inState(uint256 _dealId, State _state) {
        if (deals[_dealId].state != _state) revert InvalidState();
        _;
    }

    modifier isApprovedArbiter(address _arbiter) {
        if (!isArbiterApproved(_arbiter)) revert NotApprovedArbiter();
        _;
    }

    /**
     * @dev constructor - initializes 5 hardcoded arbiters
     */
    constructor() Ownable(msg.sender) {
        // initial arbiters (hardcoded test accounts)
        address[5] memory initialArbiters = [
            0xcd3B766CCDd6AE721141F452C550Ca635964ce71,
            0x2546BcD3c84621e976D8185a91A922aE77ECEc30,
            0xbDA5747bFD65F08deb54cb465eB87D40e51B197E,
            0xdD2FD4581271e230360230F9337D5c0430Bf44C0,
            0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
        ];
        
        // add each arbiter
        for (uint256 i = 0; i < initialArbiters.length; i++) {
            _addArbiter(initialArbiters[i]);
        }
    }

    /**
     * @dev check if an arbiter is approved
     * @param _arbiter the address to check
     * @return bool true if the arbiter is approved
     */
    function isArbiterApproved(address _arbiter) public view returns (bool) {
        uint256 index = arbiterIndices[_arbiter];
        if (index == 0) return false;
        
        return arbiterBitmap.get(index - 1); // adjust for 1-based indexing
    }

    /**
     * @dev add an arbiter
     * @param _arbiter the address to add
     */
    function addArbiter(address _arbiter) external onlyOwner {
        if (_arbiter == address(0)) revert InvalidAddress();
        _addArbiter(_arbiter);
    }

    /**
     * @dev internal function to add an arbiter
     * @param _arbiter the address to add
     */
    function _addArbiter(address _arbiter) internal {
        // check if arbiter already exists
        if (isArbiterApproved(_arbiter)) revert ArbiterAlreadyExists();
        
        // get index (using 1-based indexing to distinguish from unset values)
        uint256 bitIndex = nextArbiterIndex - 1;
        
        // store arbiter address and index mappings
        arbiterAddresses[bitIndex] = _arbiter;
        arbiterIndices[_arbiter] = nextArbiterIndex;
        
        // set bit in bitmap
        arbiterBitmap.set(bitIndex);
        
        // increment counter for next arbiter
        nextArbiterIndex++;
        
        emit ArbiterAdded(_arbiter, bitIndex);
    }

    /**
     * @dev remove an arbiter
     * @param _arbiter the address to remove
     */
    function removeArbiter(address _arbiter) external onlyOwner {
        uint256 index = arbiterIndices[_arbiter];
        if (index == 0) revert NotApprovedArbiter();
        
        // adjust for 1-based indexing
        uint256 bitIndex = index - 1;
        
        // clear bit in bitmap
        arbiterBitmap.unset(bitIndex);
        
        // clear index mappings
        delete arbiterAddresses[bitIndex];
        delete arbiterIndices[_arbiter];
        
        emit ArbiterRemoved(_arbiter, bitIndex);
    }

    /**
     * @dev creates a new deal
     * @param _seller address of the seller
     * @param _arbiter address of the arbiter for dispute resolution
     * @param _tokenAddress address of the erc-20 token (zero address for eth)
     * @param _amount amount to be paid
     * @return dealId the id of the created deal
     */
    function createDeal(
        address payable _seller,
        address payable _arbiter,
        address _tokenAddress,
        uint256 _amount
    ) external isApprovedArbiter(_arbiter) returns (uint256) {
        // checks
        if (_seller == address(0)) revert InvalidAddress();
        if (_arbiter == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();
        
        // effects
        uint256 dealId = nextDealId++;
        deals[dealId] = Deal({
            buyer: payable(msg.sender),
            seller: _seller,
            arbiter: _arbiter,
            tokenAddress: _tokenAddress,
            amount: _amount,
            state: State.AWAITING_PAYMENT,
            createdAt: block.timestamp
        });
        
        // emit event
        emit DealCreated(dealId, msg.sender, _seller, _arbiter, _tokenAddress, _amount);
        return dealId;
    }

    /**
     * @dev buyer deposits eth payment
     * @param _dealId deal id
     */
    function depositETH(uint256 _dealId) 
        external 
        payable 
        onlyBuyer(_dealId) 
        inState(_dealId, State.AWAITING_PAYMENT)
    {
        // load only needed fields to memory
        Deal memory deal = deals[_dealId];
        
        // checks
        if (deal.tokenAddress != address(0)) revert InvalidState();
        if (msg.value != deal.amount) revert InvalidAmount();
        
        // effects - direct storage write
        deals[_dealId].state = State.AWAITING_DELIVERY;
        
        emit PaymentReceived(_dealId);
    }

    /**
     * @dev buyer deposits erc-20 token payment
     * @param _dealId deal id
     */
    function depositToken(uint256 _dealId) 
        external 
        onlyBuyer(_dealId) 
        inState(_dealId, State.AWAITING_PAYMENT)
    {
        // load to memory
        Deal memory deal = deals[_dealId];
        
        // checks
        if (deal.tokenAddress == address(0)) revert InvalidState();
        
        // effects
        deals[_dealId].state = State.AWAITING_DELIVERY;
        
        // interactions
        IERC20(deal.tokenAddress).safeTransferFrom(msg.sender, address(this), deal.amount);
        
        emit PaymentReceived(_dealId);
    }

    /**
     * @dev seller confirms shipment
     * @param _dealId deal id
     */
    function confirmShipment(uint256 _dealId) 
        external 
        onlySeller(_dealId) 
        inState(_dealId, State.AWAITING_DELIVERY)
    {
        // effects
        deals[_dealId].state = State.SHIPPED;
        
        emit ItemShipped(_dealId);
    }

    /**
     * @dev internal function to transfer funds to recipient
     * @param deal the deal struct containing transfer details
     * @param recipient the address to receive the funds
     */
    function _transferFunds(Deal memory deal, address payable recipient) internal {
        if (deal.tokenAddress == address(0)) {
            // eth transfer
            (bool success, ) = recipient.call{value: deal.amount}("");
            if (!success) revert TransferFailed();
        } else {
            // erc-20 transfer
            IERC20(deal.tokenAddress).safeTransfer(recipient, deal.amount);
        }
    }

    /**
     * @dev internal function to complete a deal
     * @param _dealId deal id
     * @param recipient recipient of the funds
     */
    function _completeDeal(uint256 _dealId, address payable recipient) internal {
        // effects
        deals[_dealId].state = State.COMPLETED;
        
        // load deal into memory after state change
        Deal memory deal = deals[_dealId];
        
        // interactions
        _transferFunds(deal, recipient);
        
        emit DealCompleted(_dealId);
    }

    /**
     * @dev buyer confirms receipt and releases payment
     * @param _dealId deal id
     */
    function confirmReceipt(uint256 _dealId) 
        external 
        onlyBuyer(_dealId) 
        inState(_dealId, State.SHIPPED)
    {
        _completeDeal(_dealId, deals[_dealId].seller);
    }

    /**
     * @dev buyer or seller raises a dispute or requests cancellation
     * @param _dealId deal id
     * @param _reason reason for dispute or cancellation
     * @param _isCancellationRequest whether this is a cancellation request
     */
    function raiseDispute(
        uint256 _dealId,
        string calldata _reason,
        bool _isCancellationRequest
    ) 
        external 
        onlyBuyerOrSeller(_dealId)
    {
        // checks
        Deal memory deal = deals[_dealId];
        
        // validate state based on caller and request type
        if (_isCancellationRequest) {
            // cancellation requests should be handled by cancelDeal if in AWAITING_PAYMENT
            if (deal.state == State.AWAITING_PAYMENT) revert InvalidState();
            
            // seller can only request cancellation in SHIPPED state
            if (msg.sender == deal.seller && deal.state != State.SHIPPED) revert InvalidState();
        } else {
            // regular disputes must be in valid states
            if (deal.state != State.AWAITING_DELIVERY && 
                deal.state != State.SHIPPED) revert InvalidState();
        }
        
        // check reason length
        if (bytes(_reason).length > MAX_DISPUTE_REASON_LENGTH) revert DisputeReasonTooLong();
        
        // effects
        deals[_dealId].state = State.DISPUTED;
        
        // format reason based on request type
        string memory formattedReason;
        if (_isCancellationRequest) {
            formattedReason = string(abi.encodePacked("cancellation request: ", _reason));
        } else {
            formattedReason = _reason;
        }
        
        // store reason
        disputeReasons[_dealId] = formattedReason;
        
        emit DisputeRaised(_dealId, formattedReason, msg.sender);
    }

    /**
     * @dev cancel a deal (only in AWAITING_PAYMENT state)
     * @param _dealId deal id
     */
    function cancelDeal(uint256 _dealId) 
        external 
        onlyBuyerOrSeller(_dealId)
        inState(_dealId, State.AWAITING_PAYMENT)
    {
        // effects
        deals[_dealId].state = State.CANCELLED;
        
        emit DealCancelled(_dealId);
    }

    /**
     * @dev arbiter resolves dispute
     * @param _dealId deal id
     * @param _refundToBuyer if true, refund to buyer; if false, pay seller
     */
    function resolveDispute(
        uint256 _dealId,
        bool _refundToBuyer
    ) 
        external 
        onlyArbiter(_dealId)
        inState(_dealId, State.DISPUTED)
    {
        Deal memory deal = deals[_dealId];
        address payable recipient = _refundToBuyer ? deal.buyer : deal.seller;
        State newState = _refundToBuyer ? State.REFUNDED : State.COMPLETED;

        // effects
        deals[_dealId].state = newState;
        
        // interactions
        _transferFunds(deal, recipient);
        
        // emit consolidated event
        emit DisputeResolved(_dealId, recipient, _refundToBuyer, newState);
    }

    /**
     * @dev get deal details
     * @param _dealId deal id
     * @return buyer the buyer's address
     * @return seller the seller's address
     * @return arbiter the arbiter's address
     * @return tokenAddress the token address (zero for eth)
     * @return amount the amount of the deal
     * @return state the current state of the deal
     * @return disputeReason the reason for dispute if any
     * @return createdAt the timestamp when the deal was created
     */
    function getDeal(uint256 _dealId) external view returns (
        address buyer,
        address seller,
        address arbiter,
        address tokenAddress,
        uint256 amount,
        State state,
        string memory disputeReason,
        uint256 createdAt
    ) {
        Deal memory deal = deals[_dealId];
        return (
            deal.buyer,
            deal.seller,
            deal.arbiter,
            deal.tokenAddress,
            deal.amount,
            deal.state,
            disputeReasons[_dealId],
            deal.createdAt
        );
    }
}