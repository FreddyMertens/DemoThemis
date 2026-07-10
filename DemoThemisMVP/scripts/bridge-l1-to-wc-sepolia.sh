#!/usr/bin/env bash
# Bridges ETH from Ethereum Sepolia -> World Chain Sepolia (chain 4801) via the
# OP Standard Bridge, crediting the SAME deployer address on L2 (the bridge's
# receive() deposits to msg.sender). Uses the deployer key from repo-root .env;
# the key is never printed. Deposits credit on L2 in ~1 minute.
#
# Usage: REPO_ROOT=/mnt/c/dev/DemoThemisMVP bash scripts/bridge-l1-to-wc-sepolia.sh <amount_ether>
# Prereq: deployer holds Sepolia ETH (e.g. from https://sepolia-faucet.pk910.de).
set -euo pipefail

cd "${REPO_ROOT:-$(dirname "$0")/..}"
CAST="${CAST:-$HOME/.foundry/bin/cast}"

L1_BRIDGE="0xd7DF54b3989855eb66497301a4aAEc33Dbb3F8DE"   # WC Sepolia L1StandardBridgeProxy (on Ethereum Sepolia)
L1_RPC="${L1_RPC:-https://ethereum-sepolia-rpc.publicnode.com}"
AMT="${1:?amount in ether required, e.g. 0.2}"

PK="$(sed -n 's/^PRIVATE_KEY=//p' .env | tr -d '"' | tr -d '\r')"
[ -n "$PK" ] || { echo "no PRIVATE_KEY in .env" >&2; exit 1; }

echo "Bridging ${AMT} ETH: Ethereum Sepolia -> World Chain Sepolia (4801), recipient = deployer"
"$CAST" send "$L1_BRIDGE" --value "${AMT}ether" --rpc-url "$L1_RPC" --private-key "$PK" \
  | grep -iE "transactionHash|status|blockNumber"
echo "L1 deposit sent. Check L2 credit in ~1 min:"
echo "  cast balance \$DEPLOYER --rpc-url https://worldchain-sepolia.g.alchemy.com/public"
