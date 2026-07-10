#!/usr/bin/env bash
# Seeds the World Chain Sepolia cohort: registers NJURORS scripted jurors (via
# the MockSybilGate stand-in) and runs ONE question case end to end
# (open -> draw -> commit -> reveal -> resolve), proving the deployed contracts
# resolve on-chain. Reusable for step 4's fuller seeding.
#
# Env: PRIVATE_KEY MUSD REGISTRY COURT  (RPC, NJURORS, PHASE_WAIT optional)
#
# Robustness: explicit per-account nonces (the public RPC is load-balanced and
# returns stale getTransactionCount), and force-submit with set gas limits (the
# endpoint's eth_estimateGas is unreliable). Juror keys are derived from a
# project hash, NOT the well-known test mnemonic (whose accounts carry EIP-7702
# delegations on public testnets that break plain transfers). Testnet-only.
set -euo pipefail

CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC:-https://worldchain-sepolia.g.alchemy.com/public}"
NJURORS="${NJURORS:-14}"
PHASE_WAIT="${PHASE_WAIT:-65}"
MAXU=0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
SALT=0x0000000000000000000000000000000000000000000000000000000000000001

DPK="$(printf '%s' "$PRIVATE_KEY" | tr -d '"\r')"
DADDR="$("$CAST" wallet address --private-key "$DPK")"
dn=$("$CAST" nonce "$DADDR" --rpc-url "$RPC")

# xsend <pk> <nonce> <gaslimit> <args...> — explicit nonce + gas, force submit
xsend() { "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$2" --gas-limit "$3" "${@:4}" >/dev/null 2>&1 || true; }
# async variant: submits without waiting, so a whole panel's commits/reveals land
# within one short phase window instead of spilling past it (the timing bug that
# turned 5 of 7 revealers into no-shows on the first seed run).
xsenda() { "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$2" --gas-limit "$3" --async "${@:4}" >/dev/null 2>&1 || true; }
dsend() { xsend "$DPK" "$dn" "$1" "${@:2}"; dn=$((dn + 1)); }

echo ">> funding $NJURORS jurors (deployer nonce start $dn)"
declare -a JPK JADDR
for ((i = 1; i <= NJURORS; i++)); do
  pk=$("$CAST" keccak "demothemis-juror-$i")
  JPK[$i]=$pk
  JADDR[$i]=$("$CAST" wallet address --private-key "$pk")
  dsend 40000 "${JADDR[$i]}" --value 0.003ether
done

echo ">> registering jurors"
for ((i = 1; i <= NJURORS; i++)); do
  pk=${JPK[$i]}
  addr=${JADDR[$i]}
  proof=$("$CAST" abi-encode "f(uint256,address)" "$("$CAST" keccak "human-$i")" "$addr")
  xsend "$pk" 0 150000 "$MUSD" "faucet()"
  xsend "$pk" 1 80000 "$MUSD" "approve(address,uint256)" "$REGISTRY" "$MAXU"
  xsend "$pk" 2 500000 "$REGISTRY" "register(address,bytes)" "$addr" "$proof"
done
echo "   jurorCount = $("$CAST" call --rpc-url "$RPC" "$REGISTRY" 'jurorCount()(uint256)')"

echo ">> deployer opens a question case"
dsend 150000 "$MUSD" "faucet()"
dsend 80000 "$MUSD" "approve(address,uint256)" "$COURT" "$MAXU"
CID=$("$CAST" call --rpc-url "$RPC" "$COURT" 'caseCount()(uint256)')
dsend 300000 "$COURT" "openQuestion(bytes32,string)" "$("$CAST" keccak 'did-X-happen')" "ipfs://demo-question"
echo "   caseId = $CID"

echo ">> cranking draw"
for att in 1 2 3 4 5 6; do
  sleep 6
  dsend 3500000 "$COURT" "draw(uint256)" "$CID"
  phase=$("$CAST" call --rpc-url "$RPC" "$COURT" 'phaseOf(uint256)(uint8)' "$CID")
  echo "   attempt $att -> phase $phase"
  [ "$phase" = "1" ] && break
done

PANEL=$("$CAST" call --rpc-url "$RPC" "$COURT" 'panelOf(uint256)(address[])' "$CID")
PANEL=${PANEL//[\[\]]/}
PANEL=${PANEL//,/ }
echo ">> panel: $PANEL"

idx_for() {
  local t="${1,,}"
  for ((i = 1; i <= NJURORS; i++)); do [ "${JADDR[$i],,}" = "$t" ] && {
    echo "$i"
    return
  }; done
}

echo ">> commit (all YES)"
for a in $PANEL; do
  pk=${JPK[$(idx_for "$a")]}
  h=$("$CAST" keccak "$("$CAST" abi-encode 'f(bool,bytes32,uint256,address)' true "$SALT" "$CID" "$a")")
  xsenda "$pk" 3 150000 "$COURT" "commit(uint256,bytes32)" "$CID" "$h"
done
echo ">> wait out commit phase (${PHASE_WAIT}s)"
sleep "$PHASE_WAIT"

echo ">> reveal (all YES)"
for a in $PANEL; do
  pk=${JPK[$(idx_for "$a")]}
  xsenda "$pk" 4 200000 "$COURT" "reveal(uint256,bool,bytes32)" "$CID" true "$SALT"
done
echo ">> wait out reveal phase (${PHASE_WAIT}s)"
sleep "$PHASE_WAIT"

echo ">> resolve"
dsend 3500000 "$COURT" "resolve(uint256)" "$CID"
phase=$("$CAST" call --rpc-url "$RPC" "$COURT" 'phaseOf(uint256)(uint8)' "$CID")
echo "DONE: caseId $CID final phase = $phase (4 = Resolved)"
