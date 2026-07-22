#!/usr/bin/env bash
# Step 3.5: prove WorldIDGate enforcement on World Chain MAINNET (480) with three
# real transactions against the deployed JurorRegistry (0xbf7E…), whose gate runs
# the historical World ID 4.0 preview adapter (Staging verifier 0x703a…):
#
#   1. FORGED    register(deployer, corrupt(PROOF_A)) -> reverts INSIDE
#                WorldIDVerifier.verify (a flipped Groth16 limb fails the SNARK).
#   2. VALID     register(deployer, PROOF_A)          -> SUCCESS; the verifier runs
#                in-tx and passes, the human joins as juror #1, nullifier recorded.
#   3. DUPLICATE register(wallet2, PROOF_B)           -> reverts NullifierAlreadyUsed:
#                the SAME World ID identity on a DIFFERENT wallet is rejected. This
#                is the one-human-one-seat property (not the trivial same-wallet guard).
#
# PROOF_A must be bound to the deployer address, PROOF_B to WALLET2_ADDRESS, and
# BOTH must come from the SAME World ID Simulator identity (so they share a
# nullifier). Generate them at /register-onchain (set the signal field accordingly).
#
# Usage (from WSL):
#   PROOF_A=0x... PROOF_B=0x... REPO_ROOT=/mnt/c/dev/DemoThemisMVP \
#     bash scripts/prove-sybil-mainnet.sh
# Reads PRIVATE_KEY (deployer) + WALLET2_PRIVATE_KEY from repo-root .env; keys are
# never printed. Reverting txs are force-broadcast with --gas-limit so they LAND
# on-chain as reverted (a self-evidencing trace), instead of being aborted by
# local gas estimation.
set -euo pipefail
cd "${REPO_ROOT:-$(dirname "$0")/..}"
CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC:-https://worldchain-mainnet.g.alchemy.com/public}"
GAS=2000000

set -a; . ./.env; set +a
DEPLOYER_PK="$PRIVATE_KEY"
W2_PK="$WALLET2_PRIVATE_KEY"
DEPLOYER="$("$CAST" wallet address --private-key "$DEPLOYER_PK")"
W2="$("$CAST" wallet address --private-key "$W2_PK")"

REG=0xbf7E6F32E3BcfC419d8E6D3BD15e425638A51445
MUSD=0x117C7ba5bC479Ef62D9Edd64f1737c3dDF55022b
BOND=5000000

: "${PROOF_A:?set PROOF_A to the bytes proof bound to $DEPLOYER}"
: "${PROOF_B:?set PROOF_B to the bytes proof bound to $W2}"

echo "deployer = $DEPLOYER"
echo "wallet2  = $W2"

# Corrupt proof[0] (word 8 of the static 9-tuple) of PROOF_A -> a forged Groth16 limb.
CORRUPT_A=$(python3 - "$PROOF_A" <<'PY'
import sys
b = bytearray.fromhex(sys.argv[1][2:])
b[8 * 32 + 31] ^= 1
print('0x' + b.hex())
PY
)

send_expect_revert() {
  local pk="$1" from="$2" proof="$3" label="$4"
  echo "### $label"
  local tx
  tx="$("$CAST" send "$REG" "register(address,bytes)" "$from" "$proof" \
        --private-key "$pk" --rpc-url "$RPC" --gas-limit "$GAS" --async)"
  echo "tx: $tx"
  "$CAST" receipt "$tx" --rpc-url "$RPC" >/dev/null
  local st
  st="$("$CAST" receipt "$tx" --rpc-url "$RPC" --field status)"
  echo "status: $st  (expect 0x0 = reverted)"
  echo
}

# 0. Fund the deployer with MUSD for the bond, and wallet2 with a little gas.
echo "### 0. faucet MUSD + approvals + fund wallet2 gas"
"$CAST" send "$MUSD" "faucet()" --private-key "$DEPLOYER_PK" --rpc-url "$RPC" >/dev/null 2>&1 \
  && echo "faucet ok" || echo "faucet skipped (already claimed today?)"
"$CAST" send "$MUSD" "approve(address,uint256)" "$REG" "$BOND" \
  --private-key "$DEPLOYER_PK" --rpc-url "$RPC" >/dev/null && echo "approve ok"
"$CAST" send "$W2" --value 0.0004ether --private-key "$DEPLOYER_PK" --rpc-url "$RPC" >/dev/null \
  && echo "wallet2 funded for gas"
echo

# 1. FORGED -> revert inside the verifier.
send_expect_revert "$DEPLOYER_PK" "$DEPLOYER" "$CORRUPT_A" "1. FORGED proof (corrupted Groth16 limb)"

# 2. VALID -> success (the headline: WorldIDVerifier.verify runs in-tx and passes).
echo "### 2. VALID registration (real on-chain World ID verify)"
TX_VALID="$("$CAST" send "$REG" "register(address,bytes)" "$DEPLOYER" "$PROOF_A" \
            --private-key "$DEPLOYER_PK" --rpc-url "$RPC" --async)"
echo "tx: $TX_VALID"
"$CAST" receipt "$TX_VALID" --rpc-url "$RPC" >/dev/null
echo "status: $("$CAST" receipt "$TX_VALID" --rpc-url "$RPC" --field status)  (expect 0x1 = success)"
echo "jurorCount: $("$CAST" call "$REG" 'jurorCount()(uint256)' --rpc-url "$RPC")"
echo

# 3. DUPLICATE human (same identity, different wallet) -> NullifierAlreadyUsed.
send_expect_revert "$W2_PK" "$W2" "$PROOF_B" "3. DUPLICATE human (wallet2, same nullifier)"

echo "Done. Inspect traces with:  cast run <txhash> --rpc-url $RPC"
