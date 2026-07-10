// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAllowanceTransfer — minimal Permit2 allowance-transfer interface
/// @notice The subset of Uniswap's canonical Permit2
///         (`0x000000000022D473030F116dDEE9F6B43aC78BA3`, confirmed deployed on
///         World Chain mainnet) that the World App onboard path uses. World App
///         auto-approves a Mini App's ERC-20 tokens TO Permit2 and auto-revokes
///         plain token allowances to other contracts, so a classic
///         `approve(registry)` + `register` breaks in World App. Instead the
///         single sponsored batch is: (1) `PERMIT2.approve(token, registry, BOND,
///         0)` to grant the registry a one-shot Permit2 allowance, then (2)
///         `registry.registerWithPermit2(...)`, which pulls the bond with
///         `PERMIT2.transferFrom`. This is the Allowance-Transfer pattern from
///         docs.world.org/mini-apps/commands/send-transaction (the documented,
///         signature-free Mini App path), not Permit2 SignatureTransfer.
/// @dev    Signatures are fixed by the deployed Permit2: `uint160` amounts,
///         `uint48` expirations.
interface IAllowanceTransfer {
    /// @notice Set the Permit2 allowance `spender` may pull of `token` from the
    ///         caller. `expiration` is 0 in the Mini App batch (consumed and
    ///         revoked within the same transaction). Called by the front end, not
    ///         by the registry.
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;

    /// @notice Pull `amount` of `token` from `from` to `to` using the caller's
    ///         standing Permit2 allowance. The registry calls this; `from` must
    ///         have `approve`d the registry as spender (the batch's first tx).
    function transferFrom(address from, address to, uint160 amount, address token) external;
}
