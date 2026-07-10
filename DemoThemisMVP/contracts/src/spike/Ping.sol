// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// THROWAWAY SPIKE CONTRACT (step 1, SPIKE.md items b and c).
// Whitelisted as a Contract Entrypoint in the Developer Portal so a draft
// Mini App can attempt one sponsored sendTransaction on mainnet (item b)
// and one on Sepolia chainId 4801 (item c).

contract Ping {
    event Pinged(address indexed from, uint256 count);

    uint256 public count;

    function ping() external {
        count++;
        emit Pinged(msg.sender, count);
    }
}
