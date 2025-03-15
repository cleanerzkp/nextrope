// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title NextropeToken
 * @dev the ERC20 token for the Nextrope platform
 */
contract NextropeToken is ERC20 {
    uint8 private _decimals;

    /**
     * @dev constructor that sets up the Nextrope token
     * @param decimals_ the number of decimals the token uses (default 18)
     */
    constructor(uint8 decimals_) ERC20("Nextrope", "NXT") {
        _decimals = decimals_;
    }

    /**
     * @dev function to mint tokens
     * @param to the address that will receive the minted tokens
     * @param amount the amount of tokens to mint
     * @return a boolean that indicates if the operation was successful
     */
    function mint(address to, uint256 amount) external returns (bool) {
        _mint(to, amount);
        return true;
    }

    /**
     * @dev override decimals function to allow custom decimals
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
} 