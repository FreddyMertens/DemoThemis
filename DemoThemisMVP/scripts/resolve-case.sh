#!/usr/bin/env bash
# Drives a case to resolution on the deployed cohort: draws if needed, then
# commits + reveals the whole panel (all YES) and resolves. Commits/reveals are
# sent ASYNC with per-juror nonces so all land inside the (short) phase window
# instead of spilling past it. Reusable for step 4's many-case seeding.
#
# Usage: CID=<caseId> ... resolve-case.sh
# Env: PRIVATE_KEY COURT REGISTRY  (RPC, NJURORS, PHASE_WAIT optional)
set -euo pipefail

CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC:-https://worldchain-sepolia.g.alchemy.com/public}"
NJURORS="${NJURORS:-14}"
PHASE_WAIT="${PHASE_WAIT:-65}"
SALT=0x0000000000000000000000000000000000000000000000000000000000000001
CID="${CID:?set CID}"

DPK="$(printf '%s' "$PRIVATE_KEY" | tr -d '"\r')"
DADDR="$("$CAST" wallet address --private-key "$DPK")"

# address -> juror private key (deterministic keccak-derived keys)
declare -A PKOF
for ((i = 1; i <= NJURORS; i++)); do
  pk=$("$CAST" keccak "demothemis-juror-$i")
  PKOF["$("$CAST" wallet address --private-key "$pk" | tr 'A-Z' 'a-z')"]=$pk
done

dsend() { "$CAST" send --rpc-url "$RPC" --private-key "$DPK" --nonce "$("$CAST" nonce "$DADDR" --rpc-url "$RPC")" --gas-limit "$1" "${@:2}" >/dev/null 2>&1 || true; }
asend() { # pk addr gaslimit args... — async, per-account nonce
  "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$("$CAST" nonce "$2" --rpc-url "$RPC")" --gas-limit "$3" --async "${@:4}" >/dev/null 2>&1 || true
}

phase() { "$CAST" call --rpc-url "$RPC" "$COURT" 'phaseOf(uint256)(uint8)' "$CID"; }

if [ "$(phase)" = "0" ]; then
  echo ">> case Open; cranking draw"
  for att in 1 2 3 4 5 6; do
    sleep 6
    dsend 3500000 "$COURT" "draw(uint256)" "$CID"
    p=$(phase)
    echo "   attempt $att -> phase $p"
    [ "$p" = "1" ] && break
  done
fi

PANEL=$("$CAST" call --rpc-url "$RPC" "$COURT" 'panelOf(uint256)(address[])' "$CID")
PANEL=${PANEL//[\[\]]/}
PANEL=${PANEL//,/ }
echo ">> panel: $PANEL"

echo ">> commit (all YES, async)"
for a in $PANEL; do
  pk=${PKOF["${a,,}"]}
  h=$("$CAST" keccak "$("$CAST" abi-encode 'f(bool,bytes32,uint256,address)' true "$SALT" "$CID" "$a")")
  asend "$pk" "$a" 150000 "$COURT" "commit(uint256,bytes32)" "$CID" "$h"
done
echo ">> wait out commit phase (${PHASE_WAIT}s)"
sleep "$PHASE_WAIT"

echo ">> reveal (all YES, async)"
for a in $PANEL; do
  pk=${PKOF["${a,,}"]}
  asend "$pk" "$a" 200000 "$COURT" "reveal(uint256,bool,bytes32)" "$CID" true "$SALT"
done
echo ">> wait out reveal phase (${PHASE_WAIT}s)"
sleep "$PHASE_WAIT"

echo ">> resolve"
dsend 3500000 "$COURT" "resolve(uint256)" "$CID"
sleep 4
echo "DONE: caseId $CID final phase = $(phase) (4 = Resolved)"
