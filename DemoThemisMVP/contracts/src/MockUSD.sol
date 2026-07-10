// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSD — valueless demo-dollar token (6 decimals)
/// @notice Stands in for USDC/WLD in the DemoThemis MVP. Anyone can self-serve
///         100 MUSD per day via `faucet()`. Has no value on any network; the
///         production token choice is a funded-milestone decision, not an MVP one.
contract MockUSD is ERC20 {
    uint8 private constant DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 100 * 10 ** DECIMALS; // 100 MUSD
    uint256 public constant FAUCET_INTERVAL = 1 days;

    mapping(address => uint256) public lastFaucet;

    error FaucetCooldown(uint256 availableAt);

    constructor() ERC20("Demo USD", "MUSD") {}

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Mint 100 MUSD to the caller, at most once per `FAUCET_INTERVAL`.
    function faucet() external {
        uint256 last = lastFaucet[msg.sender];
        if (last != 0 && block.timestamp < last + FAUCET_INTERVAL) {
            revert FaucetCooldown(last + FAUCET_INTERVAL);
        }
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
