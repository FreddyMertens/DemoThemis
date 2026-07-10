#!/usr/bin/env bash
# Verifies the World Chain Sepolia cohort sources on the Blockscout explorer.
# Run from contracts/. Blockscout needs no API key.
set -euo pipefail
CAST="${CAST:-$HOME/.foundry/bin/cast}"
FORGE="${FORGE:-$HOME/.foundry/bin/forge}"
VURL="${VURL:-https://worldchain-sepolia.explorer.alchemy.com/api/}"

# Step-4 cohort (final economics). Source: contracts/deployments/worldchain-sepolia.json
MUSD=0xeA5241F1becCE7B3F72bf501bEa16eA976f1600F
GATE=0x4E223cB71eD4E350Cf1A7f687206eA336d32807E
REGISTRY=0x7677ad08d0844e1Df2693242F2195F2b2fD9c622
REWARDPOOL=0x1509A82F35da8fCb9428449dCc9120C102c153A9
COURT=0x1bAa18851E3E425278aFfe041b75004727F500AF
ESCROW=0x61110aDAca47eb0E82D5dE75F3de6F1f1b4fe596
PROTOCOL=0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c

v() { "$FORGE" verify-contract --chain-id 4801 --verifier blockscout --verifier-url "$VURL" --watch "$@" || true; }

v "$MUSD" src/MockUSD.sol:MockUSD
v "$GATE" src/sybil/MockSybilGate.sol:MockSybilGate
v "$REGISTRY" src/JurorRegistry.sol:JurorRegistry \
  --constructor-args "$("$CAST" abi-encode 'c(address,address)' "$MUSD" "$GATE")"
v "$REWARDPOOL" src/RewardPool.sol:RewardPool \
  --constructor-args "$("$CAST" abi-encode 'c(address)' "$MUSD")"
v "$COURT" src/DisputeCourt.sol:DisputeCourt \
  --constructor-args "$("$CAST" abi-encode 'c(address,address,address,address,uint256,uint256,uint64,uint64)' "$MUSD" "$REGISTRY" "$REWARDPOOL" "$PROTOCOL" 7 14 60 60)"
v "$ESCROW" src/DealEscrow.sol:DealEscrow \
  --constructor-args "$("$CAST" abi-encode 'c(address,address)' "$MUSD" "$COURT")"
echo "VERIFY DONE"
