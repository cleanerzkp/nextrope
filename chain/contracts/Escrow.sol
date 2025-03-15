// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title escrow
 * @dev contract for handling secure transactions between buyers and sellers, with arbitration
 */
contract Escrow is ReentrancyGuard {
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, DISPUTED, COMPLETED, REFUNDED }

    struct Deal {
        address payable buyer;
        address payable seller;
        address payable arbiter;
        address tokenAddress; // zero address for eth
        uint256 amount;
        State state;
        string disputeReason;
    }

    // mapping from deal id to deal struct
    mapping(uint256 => Deal) public deals;
    uint256 public nextDealId;

    // events
    event DealCreated(uint256 dealId, address buyer, address seller, address arbiter, address tokenAddress, uint256 amount);
    event PaymentReceived(uint256 dealId);
    event ItemShipped(uint256 dealId);
    event DealCompleted(uint256 dealId);
    event DisputeRaised(uint256 dealId, string reason);
    event DisputeResolved(uint256 dealId, address winner);
    event Refunded(uint256 dealId);

    // modifiers
    modifier onlyBuyer(uint256 _dealId) {
        require(msg.sender == deals[_dealId].buyer, "only buyer can call");
        _;
    }

    modifier onlySeller(uint256 _dealId) {
        require(msg.sender == deals[_dealId].seller, "only seller can call");
        _;
    }

    modifier onlyArbiter(uint256 _dealId) {
        require(msg.sender == deals[_dealId].arbiter, "only arbiter can call");
        _;
    }

    modifier inState(uint256 _dealId, State _state) {
        require(deals[_dealId].state == _state, "invalid state");
        _;
    }

    /**
     * @dev creates a new deal
     * @param _seller address of the seller
     * @param _arbiter address of the arbiter who will resolve disputes
     * @param _tokenAddress address of the erc20 token (use address(0) for eth)
     * @param _amount amount to be paid
     * @return deal id
     */
    function createDeal(
        address payable _seller,
        address payable _arbiter,
        address _tokenAddress,
        uint256 _amount
    ) external returns (uint256) {
        require(_seller != address(0), "invalid seller");
        require(_arbiter != address(0), "invalid arbiter");
        require(_amount > 0, "amount must be > 0");
        
        uint256 dealId = nextDealId++;
        
        deals[dealId] = Deal({
            buyer: payable(msg.sender),
            seller: _seller,
            arbiter: _arbiter,
            tokenAddress: _tokenAddress,
            amount: _amount,
            state: State.AWAITING_PAYMENT,
            disputeReason: ""
        });
        
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
        nonReentrant 
    {
        Deal storage deal = deals[_dealId];
        require(deal.tokenAddress == address(0), "deal requires erc20 token");
        require(msg.value == deal.amount, "incorrect amount");
        
        deal.state = State.AWAITING_DELIVERY;
        emit PaymentReceived(_dealId);
    }

    /**
     * @dev buyer deposits erc20 token payment
     * @param _dealId deal id
     */
    function depositToken(uint256 _dealId) 
        external 
        onlyBuyer(_dealId) 
        inState(_dealId, State.AWAITING_PAYMENT) 
        nonReentrant 
    {
        Deal storage deal = deals[_dealId];
        require(deal.tokenAddress != address(0), "deal requires eth");
        
        IERC20 token = IERC20(deal.tokenAddress);
        require(token.transferFrom(msg.sender, address(this), deal.amount), "transfer failed");
        
        deal.state = State.AWAITING_DELIVERY;
        emit PaymentReceived(_dealId);
    }

    /**
     * @dev seller marks item as shipped
     * @param _dealId deal id
     */
    function confirmShipment(uint256 _dealId) 
        external 
        onlySeller(_dealId) 
        inState(_dealId, State.AWAITING_DELIVERY) 
    {
        emit ItemShipped(_dealId);
    }

    /**
     * @dev buyer confirms receipt and releases payment
     * @param _dealId deal id
     */
    function confirmReceipt(uint256 _dealId) 
        external 
        onlyBuyer(_dealId) 
        inState(_dealId, State.AWAITING_DELIVERY) 
        nonReentrant 
    {
        Deal storage deal = deals[_dealId];
        deal.state = State.COMPLETED;
        
        if (deal.tokenAddress == address(0)) {
            // eth payment
            (bool success, ) = deal.seller.call{value: deal.amount}("");
            require(success, "transfer to seller failed");
        } else {
            // erc20 payment
            IERC20 token = IERC20(deal.tokenAddress);
            require(token.transfer(deal.seller, deal.amount), "token transfer failed");
        }
        
        emit DealCompleted(_dealId);
    }

    /**
     * @dev buyer raises a dispute
     * @param _dealId deal id
     * @param _reason reason for dispute
     */
    function raiseDispute(uint256 _dealId, string memory _reason) 
        external 
        onlyBuyer(_dealId) 
        inState(_dealId, State.AWAITING_DELIVERY) 
    {
        Deal storage deal = deals[_dealId];
        deal.state = State.DISPUTED;
        deal.disputeReason = _reason;
        
        emit DisputeRaised(_dealId, _reason);
    }

    /**
     * @dev arbiter resolves dispute
     * @param _dealId deal id
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
                // eth payment
                (bool success, ) = deal.buyer.call{value: deal.amount}("");
                require(success, "transfer to buyer failed");
            } else {
                // erc20 payment
                IERC20 token = IERC20(deal.tokenAddress);
                require(token.transfer(deal.buyer, deal.amount), "token transfer failed");
            }
            deal.state = State.REFUNDED;
            winner = deal.buyer;
            emit Refunded(_dealId);
        } else {
            // pay to seller
            if (deal.tokenAddress == address(0)) {
                // eth payment
                (bool success, ) = deal.seller.call{value: deal.amount}("");
                require(success, "transfer to seller failed");
            } else {
                // erc20 payment
                IERC20 token = IERC20(deal.tokenAddress);
                require(token.transfer(deal.seller, deal.amount), "token transfer failed");
            }
            deal.state = State.COMPLETED;
            winner = deal.seller;
            emit DealCompleted(_dealId);
        }
        
        emit DisputeResolved(_dealId, winner);
    }

    /**
     * @dev get deal details
     * @param _dealId deal id
     * @return buyer The buyer address
     * @return seller The seller address
     * @return arbiter The arbitrator address
     * @return tokenAddress The token address (0 for ETH)
     * @return amount The payment amount
     * @return state The current state of the deal
     * @return disputeReason The reason for dispute if any
     */
    function getDeal(uint256 _dealId) external view returns (
        address buyer,
        address seller,
        address arbiter,
        address tokenAddress,
        uint256 amount,
        State state,
        string memory disputeReason
    ) {
        Deal storage deal = deals[_dealId];
        return (
            deal.buyer,
            deal.seller,
            deal.arbiter,
            deal.tokenAddress,
            deal.amount,
            deal.state,
            deal.disputeReason
        );
    }
}