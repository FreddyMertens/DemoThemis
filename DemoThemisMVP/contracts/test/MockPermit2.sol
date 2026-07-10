// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAllowanceTransfer} from "../src/lib/IPermit2.sol";

/// @title MockPermit2 — test stand-in for canonical Permit2 (Allowance Transfer)
/// @notice Reproduces the two observable effects the World App onboard depends on:
///         `approve` records a per-(owner, token, spender) allowance, and
///         `transferFrom` consumes it and moves the token via the owner's standing
///         ERC-20 approval to Permit2. Etch this at the canonical Permit2 address
///         with `vm.etch` so `JurorRegistry.PERMIT2` routes here in tests.
/// @dev    Storage-only (no immutables), so etching its runtime code at another
///         address keeps its mappings working.
contract MockPermit2 is IAllowanceTransfer {
    error InsufficientAllowance();

    /// @dev owner => token => spender => allowance
    mapping(address => mapping(address => mapping(address => uint160))) public allowance;

    function approve(address token, address spender, uint160 amount, uint48 /* expiration */ ) external {
        allowance[msg.sender][token][spender] = amount;
    }

    function transferFrom(address from, address to, uint160 amount, address token) external {
        uint160 allowed = allowance[from][token][msg.sender];
        if (allowed < amount) revert InsufficientAllowance();
        if (allowed != type(uint160).max) allowance[from][token][msg.sender] = allowed - amount;
        IERC20(token).transferFrom(from, to, amount);
    }
}
