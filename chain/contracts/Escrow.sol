// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Escrow
 * @dev an escrow contract for handling transactions between buyers and sellers
 * with third-party arbitration support for dispute resolution.
 * supports both ETH and ERC-20 tokens.
 */
contract Escrow is ReentrancyGuard, Ownable(msg.sender) {
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, SHIPPED, DISPUTED, COMPLETED, REFUNDED, CANCELLED }

    struct Deal {
        address payable buyer;
        address payable seller;
        address payable arbiter;
        address tokenAddress; // zero address for ETH
        uint256 amount;
        State state;
        string disputeReason;
        uint256 createdAt;
    }

    // mapping of approved arbiters
    mapping(address => bool) public approvedArbiters;
    
    // mapping from deal ID to deal struct
    mapping(uint256 => Deal) public deals;
    uint256 public nextDealId;

    // events
    event ArbiterAdded(address indexed arbiter);
    event ArbiterRemoved(address indexed arbiter);
    event DealCreated(uint256 dealId, address buyer, address seller, address arbiter, address tokenAddress, uint256 amount);
    event PaymentReceived(uint256 dealId);
    event ItemShipped(uint256 dealId);
    event DealCompleted(uint256 dealId);
    event DisputeRaised(uint256 dealId, string reason, address initiator);
    event DisputeResolved(uint256 dealId, address winner);
    event Refunded(uint256 dealId);
    event DealCancelled(uint256 dealId);

    // modifiers
    modifier onlyBuyer(uint256 _dealId) {
        require(msg.sender == deals[_dealId].buyer, "Only buyer can call");
        _;
    }

    modifier onlySeller(uint256 _dealId) {
        require(msg.sender == deals[_dealId].seller, "Only seller can call");
        _;
    }

    modifier onlyArbiter(uint256 _dealId) {
        require(msg.sender == deals[_dealId].arbiter, "Only arbiter can call");
        _;
    }

    modifier onlyBuyerOrSeller(uint256 _dealId) {
        require(
            msg.sender == deals[_dealId].buyer || 
            msg.sender == deals[_dealId].seller,
            "Only buyer or seller can call"
        );
        _;
    }

    modifier inState(uint256 _dealId, State _state) {
        require(deals[_dealId].state == _state, "Invalid state");
        _;
    }

    modifier isApprovedArbiter(address _arbiter) {
        require(approvedArbiters[_arbiter], "Not an approved arbiter");
        _;
    }

    /**
     * @dev constructor - sets up initial hardcoded arbiters
     */
    constructor() {
        // hardcoded arbiters from test accounts
        address[5] memory _arbiters = [
            0xcd3B766CCDd6AE721141F452C550Ca635964ce71,
            0x2546BcD3c84621e976D8185a91A922aE77ECEc30,
            0xbDA5747bFD65F08deb54cb465eB87D40e51B197E,
            0xdD2FD4581271e230360230F9337D5c0430Bf44C0,
            0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
        ];
        
        for (uint i = 0; i < _arbiters.length; i++) {
            approvedArbiters[_arbiters[i]] = true;
            emit ArbiterAdded(_arbiters[i]);
        }
    }

    /**
     * @dev add an approved arbiter
     * @param _arbiter address of the arbiter to approve
     */
    function addArbiter(address _arbiter) external onlyOwner {
        require(_arbiter != address(0), "Invalid arbiter address");
        approvedArbiters[_arbiter] = true;
        emit ArbiterAdded(_arbiter);
    }
    
    /**
     * @dev remove an approved arbiter
     * @param _arbiter address of the arbiter to remove
     */
    function removeArbiter(address _arbiter) external onlyOwner {
        approvedArbiters[_arbiter] = false;
        emit ArbiterRemoved(_arbiter);
    }

    /**
     * @dev creates a new deal
     * @param _seller address of the seller
     * @param _arbiter address of the arbiter for dispute resolution
     * @param _tokenAddress address of the ERC-20 token (zero address for ETH)
     * @param _amount amount to be paid
     * @return deal ID
     */
    function createDeal(
        address payable _seller,
        address payable _arbiter,
        address _tokenAddress,
        uint256 _amount
    ) external isApprovedArbiter(_arbiter) returns (uint256) {
        require(_seller != address(0), "Invalid seller");
        require(_arbiter != address(0), "Invalid arbiter");
        require(_amount > 0, "Amount must be > 0");
        
        uint256 dealId = nextDealId++;
        
        deals[dealId] = Deal({
            buyer: payable(msg.sender),
            seller: _seller,
            arbiter: _arbiter,
            tokenAddress: _tokenAddress,
            amount: _amount,
            state: State.AWAITING_PAYMENT,
            disputeReason: "",
            createdAt: block.timestamp
        });
        
        emit DealCreated(dealId, msg.sender, _seller, _arbiter, _tokenAddress, _amount);
        return dealId;
    }

    /**
     * @dev buyer deposits ETH payment
     * @param _dealId deal ID
     */
    function depositETH(uint256 _dealId) 
        external 
        payable 
        onlyBuyer(_dealId) 
        inState(_dealId, State.AWAITING_PAYMENT) 
        nonReentrant 
    {
        Deal storage deal = deals[_dealId];
        require(deal.tokenAddress == address(0), "Deal requires ERC-20 token");
        require(msg.value == deal.amount, "Incorrect amount");
        
        deal.state = State.AWAITING_DELIVERY;
        emit PaymentReceived(_dealId);
    }

    /**
     * @dev buyer deposits ERC-20 token payment
     * @param _dealId deal ID
     */
    function depositToken(uint256 _dealId) 
        external 
        onlyBuyer(_dealId) 
        inState(_dealId, State.AWAITING_PAYMENT) 
        nonReentrant 
    {
        Deal storage deal = deals[_dealId];
        require(deal.tokenAddress != address(0), "Deal requires ETH");
        
        IERC20 token = IERC20(deal.tokenAddress);
        require(token.transferFrom(msg.sender, address(this), deal.amount), "Transfer failed");
        
        deal.state = State.AWAITING_DELIVERY;
        emit PaymentReceived(_dealId);
    }

    /**
     * @dev seller confirms shipment
     * @param _dealId deal ID
     */
    function confirmShipment(uint256 _dealId) 
        external 
        onlySeller(_dealId) 
        inState(_dealId, State.AWAITING_DELIVERY)
    {
        Deal storage deal = deals[_dealId];
        deal.state = State.SHIPPED;
        emit ItemShipped(_dealId);
    }

    /**
     * @dev buyer confirms receipt and releases payment
     * @param _dealId deal ID
     */
    function confirmReceipt(uint256 _dealId) 
        external 
        onlyBuyer(_dealId) 
        inState(_dealId, State.SHIPPED) 
        nonReentrant 
    {
        Deal storage deal = deals[_dealId];
        deal.state = State.COMPLETED;
        
        if (deal.tokenAddress == address(0)) {
            // ETH payment
            (bool success, ) = deal.seller.call{value: deal.amount}("");
            require(success, "Transfer to seller failed");
        } else {
            // ERC-20 payment
            IERC20 token = IERC20(deal.tokenAddress);
            require(token.transfer(deal.seller, deal.amount), "Token transfer failed");
        }
        
        emit DealCompleted(_dealId);
    }

    /**
     * @dev buyer or seller raises a dispute or requests cancellation
     * @param _dealId deal ID
     * @param _reason reason for dispute or cancellation
     * @param _isCancellationRequest whether this is a cancellation request
     */
    function raiseDispute(uint256 _dealId, string memory _reason, bool _isCancellationRequest) 
        external 
        onlyBuyerOrSeller(_dealId)
    {
        Deal storage deal = deals[_dealId];
        
        // check valid states for raising dispute
        require(
            deal.state == State.AWAITING_DELIVERY || deal.state == State.SHIPPED,
            "Invalid state for dispute"
        );
        
        // buyer can dispute in both AWAITING_DELIVERY and SHIPPED states
        // seller can dispute in AWAITING_DELIVERY state (if there's an issue with payment)
        if (msg.sender == deal.seller && deal.state == State.SHIPPED) {
            require(_isCancellationRequest, "Seller can only request cancellation in SHIPPED state");
        }
        
        deal.state = State.DISPUTED;
        
        // modify reason prefix if it's a cancellation request
        if (_isCancellationRequest) {
            deal.disputeReason = string(abi.encodePacked("Cancellation request: ", _reason));
        } else {
            deal.disputeReason = _reason;
        }
        
        emit DisputeRaised(_dealId, deal.disputeReason, msg.sender);
    }

    /**
     * @dev arbiter resolves dispute
     * @param _dealId deal ID
     * @param _refundToBuyer if true, refund to buyer; if false, pay seller
     */
    function resolveDispute(uint256 _dealId, bool _refundToBuyer) 
        external 
        onlyArbiter(_dealId) 
        inState(_dealId, State.DISPUTED) 
        nonReentrant 
    {
        Deal storage deal = deals[_dealId];
        address winner;
        
        if (_refundToBuyer) {
            // refund to buyer
            if (deal.tokenAddress == address(0)) {
                // ETH payment
                (bool success, ) = deal.buyer.call{value: deal.amount}("");
                require(success, "Transfer to buyer failed");
            } else {
                // ERC-20 payment
                IERC20 token = IERC20(deal.tokenAddress);
                require(token.transfer(deal.buyer, deal.amount), "Token transfer failed");
            }
            deal.state = State.REFUNDED;
            winner = deal.buyer;
            emit Refunded(_dealId);
        } else {
            // pay to seller
            if (deal.tokenAddress == address(0)) {
                // ETH payment
                (bool success, ) = deal.seller.call{value: deal.amount}("");
                require(success, "Transfer to seller failed");
            } else {
                // ERC-20 payment
                IERC20 token = IERC20(deal.tokenAddress);
                require(token.transfer(deal.seller, deal.amount), "Token transfer failed");
            }
            deal.state = State.COMPLETED;
            winner = deal.seller;
            emit DealCompleted(_dealId);
        }
        
        emit DisputeResolved(_dealId, winner);
    }

    /**
     * @dev cancel a deal (only in AWAITING_PAYMENT state)
     * @param _dealId deal ID
     */
    function cancelDeal(uint256 _dealId) 
        external 
        onlyBuyerOrSeller(_dealId)
        inState(_dealId, State.AWAITING_PAYMENT)
    {
        Deal storage deal = deals[_dealId];
        deal.state = State.CANCELLED;
        emit DealCancelled(_dealId);
    }

    /**
     * @dev get deal details
     * @param _dealId deal ID
     * @return buyer the buyer's address
     * @return seller the seller's address
     * @return arbiter the arbiter's address
     * @return tokenAddress the token address (zero for ETH)
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
        Deal storage deal = deals[_dealId];
        return (
            deal.buyer,
            deal.seller,
            deal.arbiter,
            deal.tokenAddress,
            deal.amount,
            deal.state,
            deal.disputeReason,
            deal.createdAt
        );
    }
}