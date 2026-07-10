#!/usr/bin/env bash
# Bridges ETH from Ethereum MAINNET -> World Chain MAINNET (chain 480) via the
# OP Standard Bridge, crediting the SAME deployer address on L2 (the bridge's
# receive() deposits to msg.sender). Mirrors bridge-l1-to-wc-sepolia.sh with the
# mainnet L1StandardBridge + L1 RPC. Reads the deployer key from repo-root .env;
# the key is never printed. Deposits credit on L2 in ~1-3 minutes.
#
# Usage: REPO_ROOT=/mnt/c/dev/DemoThemisMVP bash scripts/bridge-l1-to-wc-mainnet.sh <amount_ether>
# REAL MONEY. The L1 bridge address below is triple-verified (superchain-registry
# + Etherscan label + on-chain MESSENGER()=0xf931a81D...=World Chain L1XDM,
# OTHER_BRIDGE()=0x4200...0010, version 2.8.0).
set -euo pipefail

cd "${REPO_ROOT:-$(dirname "$0")/..}"
CAST="${CAST:-$HOME/.foundry/bin/cast}"

L1_BRIDGE="0x470458C91978D2d929704489Ad730DC3E3001113"   # World Chain mainnet L1StandardBridgeProxy (on Ethereum mainnet)
L1_RPC="${L1_RPC:-https://ethereum-rpc.publicnode.com}"
AMT="${1:?amount in ether required, e.g. 0.0028}"

PK="$(sed -n 's/^PRIVATE_KEY=//p' .env | tr -d '"' | tr -d '\r')"
[ -n "$PK" ] || { echo "no PRIVATE_KEY in .env" >&2; exit 1; }
RECIPIENT="$("$CAST" wallet address --private-key "$PK")"

echo "Bridging ${AMT} ETH: Ethereum mainnet -> World Chain mainnet (480), recipient = $RECIPIENT"
# World Chain mainnet bridge v2.8.0 reverts on a bare receive() send; use the
# explicit bridgeETHTo(to, minGasLimit, extraData) entrypoint instead.
"$CAST" send "$L1_BRIDGE" "bridgeETHTo(address,uint32,bytes)" "$RECIPIENT" 200000 0x --value "${AMT}ether" --rpc-url "$L1_RPC" --private-key "$PK"
echo "L1 deposit sent. Check L2 credit in ~1-3 min:"
echo "  cast balance 0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c --rpc-url https://worldchain-mainnet.g.alchemy.com/public"
