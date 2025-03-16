// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title escrow
 * @dev an escrow contract for handling transactions between buyers and sellers
 * with third-party arbitration support for dispute resolution.
 * supports both eth and erc-20 tokens.
 */
contract Escrow is Ownable(msg.sender) {
    using SafeERC20 for IERC20;

    // custom errors
    error InvalidState();
    error InvalidAmount();
    error InvalidAddress();
    error UnauthorizedCaller();
    error TransferFailed();
    error NotApprovedArbiter();
    error ArbiterAlreadyExists();
    error InvalidStateTransition();

    // use uint8 for state enum (1 byte)
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, SHIPPED, DISPUTED, COMPLETED, REFUNDED, CANCELLED }

    // constants for bitmap operations
    uint256 private constant BITMAP_WORD_SIZE = 256;
    
    // bitmap storage for arbiters
    // each uint256 can store 256 arbiters
    // arbiterIndex => bitmap where each bit represents an arbiter
    mapping(uint256 => uint256) private arbiterBitmaps;
    
    // mapping to track arbiter indices
    // address => (wordIndex, bitPosition)
    mapping(address => uint256) private arbiterIndices;
    
    // counter for next arbiter index
    uint256 private nextArbiterIndex;
    
    // packed struct - total 3 storage slots
    struct Deal {
        // slot 1 (20 + 1 + 11 padding = 32 bytes)
        address payable buyer;
        uint8 state;  // using uint8 instead of enum saves gas
        // slot 2 (20 + 20 = 40 bytes)
        address payable seller;
        address payable arbiter;
        // slot 3 (20 + 32 = 52 bytes)
        address tokenAddress;
        uint256 amount;
        // note: createdAt and disputeReason moved to separate mappings to optimize storage
    }

    // mapping from deal id to deal struct
    mapping(uint256 => Deal) public deals;
    
    // separate mapping for dispute reasons to save gas in the deal struct
    mapping(uint256 => string) public disputeReasons;
    
    mapping(uint256 => uint256) public dealCreationTimes;
    
    uint256 public nextDealId;

    // events with proper indexing
    event ArbiterAdded(address indexed arbiter, uint256 indexed wordIndex, uint256 indexed bitPosition);
    event ArbiterRemoved(address indexed arbiter, uint256 indexed wordIndex, uint256 indexed bitPosition);
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
    event DisputeResolved(uint256 indexed dealId, address indexed winner);
    event Refunded(uint256 indexed dealId);
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

    modifier inState(uint256 _dealId, uint8 _state) {
        if (deals[_dealId].state != _state) revert InvalidState();
        _;
    }

    modifier isApprovedArbiter(address _arbiter) {
        if (!_isArbiterApproved(_arbiter)) revert NotApprovedArbiter();
        _;
    }

    /**
     * @dev constructor - initializes 5 hardcoded arbiters using bitmap optimization
     * this approach is highly gas efficient as it:
     * 1. uses a single storage write for the bitmap
     * 2. pre-calculates the bitmap value instead of using bit operations in a loop
     * 3. properly initializes the indices mapping for lookups
     */
    constructor() {
        // initial arbiters (hardcoded test accounts)
        address[5] memory initialArbiters = [
            0xcd3B766CCDd6AE721141F452C550Ca635964ce71,
            0x2546BcD3c84621e976D8185a91A922aE77ECEc30,
            0xbDA5747bFD65F08deb54cb465eB87D40e51B197E,
            0xdD2FD4581271e230360230F9337D5c0430Bf44C0,
            0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
        ];
        
        // set all 5 arbiters in first word with a single storage write
        // binary 11111 = decimal 31 (2^0 + 2^1 + 2^2 + 2^3 + 2^4)
        arbiterBitmaps[0] = 31;
        
        // set indices and emit events
        for (uint256 i = 0; i < initialArbiters.length; i++) {
            // store index (1-based to distinguish from unset)
            arbiterIndices[initialArbiters[i]] = i + 1;
            
            // emit event with proper indexing
            emit ArbiterAdded(initialArbiters[i], 0, i);
        }
        
        // initialize counter for future additions
        nextArbiterIndex = 5;
    }

    /**
     * @dev internal function to get bitmap word index and bit position for an arbiter
     * @param arbiterIndex the sequential index of the arbiter
     * @return wordIndex the index of the word in the bitmap array
     * @return bitPosition the position of the bit in the word
     */
    function _getBitmapPosition(uint256 arbiterIndex) internal pure returns (uint256 wordIndex, uint256 bitPosition) {
        wordIndex = arbiterIndex / BITMAP_WORD_SIZE;
        bitPosition = arbiterIndex % BITMAP_WORD_SIZE;
    }

    /**
     * @dev check if an arbiter is approved
     * @param _arbiter the address to check
     * @return bool true if the arbiter is approved
     */
    function _isArbiterApproved(address _arbiter) public view returns (bool) {
        uint256 index = arbiterIndices[_arbiter];
        if (index == 0) return false;
        
        index--; // adjust for 1-based indexing
        (uint256 wordIndex, uint256 bitPosition) = _getBitmapPosition(index);
        return (arbiterBitmaps[wordIndex] & (1 << bitPosition)) != 0;
    }

    /**
     * @dev add an arbiter to the bitmap
     * @param _arbiter the address to add
     */
    function addArbiter(address _arbiter) external onlyOwner {
        if (_arbiter == address(0)) revert InvalidAddress();
        _addArbiter(_arbiter);
    }

    function _addArbiter(address _arbiter) internal {
        // check if arbiter already exists
        if (_isArbiterApproved(_arbiter)) revert ArbiterAlreadyExists();
        
        // increment counter and store index (1-based to distinguish from unset)
        nextArbiterIndex++;
        arbiterIndices[_arbiter] = nextArbiterIndex;
        
        // calculate bitmap position
        (uint256 wordIndex, uint256 bitPosition) = _getBitmapPosition(nextArbiterIndex - 1);
        
        // set bit in bitmap
        arbiterBitmaps[wordIndex] |= (1 << bitPosition);
        
        emit ArbiterAdded(_arbiter, wordIndex, bitPosition);
    }

    /**
     * @dev remove an arbiter from the bitmap
     * @param _arbiter the address to remove
     */
    function removeArbiter(address _arbiter) external onlyOwner {
        uint256 index = arbiterIndices[_arbiter];
        if (index == 0) revert NotApprovedArbiter();
        
        index--; // adjust for 1-based indexing
        (uint256 wordIndex, uint256 bitPosition) = _getBitmapPosition(index);
        
        // clear bit in bitmap
        arbiterBitmaps[wordIndex] &= ~(1 << bitPosition);
        
        // clear index
        delete arbiterIndices[_arbiter];
        
        emit ArbiterRemoved(_arbiter, wordIndex, bitPosition);
    }

    /**
     * @dev creates a new deal
     * @param _seller address of the seller
     * @param _arbiter address of the arbiter for dispute resolution
     * @param _tokenAddress address of the erc-20 token (zero address for eth)
     * @param _amount amount to be paid
     * @return deal id
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
            state: uint8(State.AWAITING_PAYMENT)
        });
        dealCreationTimes[dealId] = block.timestamp;
        
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
        inState(_dealId, uint8(State.AWAITING_PAYMENT))
    {
        // load only needed fields to memory
        address tokenAddress = deals[_dealId].tokenAddress;
        uint256 amount = deals[_dealId].amount;

        // checks
        if (tokenAddress != address(0)) revert InvalidState();
        if (msg.value != amount) revert InvalidAmount();
        
        // effects - direct storage write
        deals[_dealId].state = uint8(State.AWAITING_DELIVERY);
        
        emit PaymentReceived(_dealId);
    }

    /**
     * @dev buyer deposits erc-20 token payment
     * @param _dealId deal id
     */
    function depositToken(uint256 _dealId) 
        external 
        onlyBuyer(_dealId) 
        inState(_dealId, uint8(State.AWAITING_PAYMENT))
    {
        // checks
        Deal memory deal = deals[_dealId];
        if (deal.tokenAddress == address(0)) revert InvalidState();
        
        // effects
        deals[_dealId].state = uint8(State.AWAITING_DELIVERY);
        
        // interactions
        IERC20(deal.tokenAddress).safeTransferFrom(msg.sender, address(this), deal.amount);
        
        // emit event
        emit PaymentReceived(_dealId);
    }

    /**
     * @dev seller confirms shipment
     * @param _dealId deal id
     */
    function confirmShipment(uint256 _dealId) 
        external 
        onlySeller(_dealId) 
        inState(_dealId, uint8(State.AWAITING_DELIVERY))
    {
        // effects
        deals[_dealId].state = uint8(State.SHIPPED);
        
        // emit event
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
            // erc20 transfer
            IERC20(deal.tokenAddress).safeTransfer(recipient, deal.amount);
        }
    }

    /**
     * @dev internal function to complete a deal
     */
    function _completeDeal(uint256 _dealId, address payable recipient) internal {
        // effects
        deals[_dealId].state = uint8(State.COMPLETED);
        
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
        inState(_dealId, uint8(State.SHIPPED))
    {
        Deal memory deal = deals[_dealId];
        _completeDeal(_dealId, deal.seller);
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
        if (_isCancellationRequest) {
            if (deal.state != uint8(State.AWAITING_PAYMENT)) revert InvalidState();
        } else {
            if (deal.state != uint8(State.AWAITING_DELIVERY) && 
                deal.state != uint8(State.SHIPPED)) revert InvalidState();
        }
        
        // effects
        deals[_dealId].state = uint8(State.DISPUTED);
        disputeReasons[_dealId] = _reason;
        
        // emit event
        emit DisputeRaised(_dealId, _reason, msg.sender);
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
        inState(_dealId, uint8(State.DISPUTED))
    {
        Deal memory deal = deals[_dealId];
        address payable recipient = _refundToBuyer ? deal.buyer : deal.seller;

        // effects
        deals[_dealId].state = _refundToBuyer ? uint8(State.REFUNDED) : uint8(State.COMPLETED);
        
        // interactions
        _transferFunds(deal, recipient);
        
        // emit events
        if (_refundToBuyer) {
            emit Refunded(_dealId);
        } else {
            emit DealCompleted(_dealId);
        }
        emit DisputeResolved(_dealId, recipient);
    }

    /**
     * @dev cancel a deal (only in awaiting_payment state)
     * @param _dealId deal id
     */
    function cancelDeal(uint256 _dealId) 
        external 
        onlyBuyerOrSeller(_dealId)
        inState(_dealId, uint8(State.AWAITING_PAYMENT))
    {
        // effects
        deals[_dealId].state = uint8(State.CANCELLED);
        
        // emit event
        emit DealCancelled(_dealId);
    }

    // packed struct for deal details return value
    struct DealInfo {
        address buyer;
        address seller;
        address arbiter;
        address tokenAddress;
        uint256 amount;
        State state;
        string disputeReason;
        uint256 createdAt;
    }

    /**
     * @dev get deal details
     * @param _dealId deal id
     * @return info struct containing all deal details
     */
    function getDeal(uint256 _dealId) external view returns (DealInfo memory info) {
        Deal storage deal = deals[_dealId];
        return DealInfo({
            buyer: deal.buyer,
            seller: deal.seller,
            arbiter: deal.arbiter,
            tokenAddress: deal.tokenAddress,
            amount: deal.amount,
            state: State(deal.state),
            disputeReason: disputeReasons[_dealId],
            createdAt: dealCreationTimes[_dealId]
        });
    }
}