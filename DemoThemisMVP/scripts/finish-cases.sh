#!/usr/bin/env bash
# Drives a given list of EXISTING cohort cases to Resolved (recovery/top-up tool;
# the seed occasionally leaves a case undrawn when the RPC drops a draw tx).
# Reuses the hardened, verify-and-retry commit/reveal. Reactivates any slashed
# juror at the end so the pool stays healthy.
#   CIDS="4 6 8" REPO_ROOT=/mnt/c/dev/DemoThemisMVP bash scripts/finish-cases.sh
set -uo pipefail
cd "${REPO_ROOT:-$(dirname "$0")/..}"
CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC:-https://worldchain-sepolia.g.alchemy.com/public}"
NJURORS="${NJURORS:-20}"
SALT=0x0000000000000000000000000000000000000000000000000000000000000001
ZERO32=0x0000000000000000000000000000000000000000000000000000000000000000
REGISTRY="${REGISTRY:-0x7677ad08d0844e1Df2693242F2195F2b2fD9c622}"
COURT="${COURT:-0x1bAa18851E3E425278aFfe041b75004727F500AF}"
: "${CIDS:?set CIDS, e.g. CIDS=\"4 6 8\"}"

set -a; . ./.env; set +a
DPK="$(printf '%s' "$PRIVATE_KEY" | tr -d '"\r')"
DADDR="$("$CAST" wallet address --private-key "$DPK")"
nonce() { "$CAST" nonce "$1" --rpc-url "$RPC"; }
dsend() { "$CAST" send --rpc-url "$RPC" --private-key "$DPK" --nonce "$(nonce "$DADDR")" --gas-limit "$1" "${@:2}" >/dev/null 2>&1 || true; }
ssend() { "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$(nonce "$2")" --gas-limit "$3" "${@:4}" >/dev/null 2>&1 || true; }
asend() { "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$(nonce "$2")" --gas-limit "$3" --async "${@:4}" >/dev/null 2>&1 || true; }
call() { "$CAST" call --rpc-url "$RPC" "$@"; }
phaseof() { call "$COURT" 'phaseOf(uint256)(uint8)' "$1"; }

declare -a JPK JADDR
for ((i = 1; i <= NJURORS; i++)); do JPK[$i]=$("$CAST" keccak "demothemis-juror-$i"); JADDR[$i]=$("$CAST" wallet address --private-key "${JPK[$i]}"); done
idx_for() { local t="${1,,}"; for ((i = 1; i <= NJURORS; i++)); do [ "${JADDR[$i],,}" = "$t" ] && { echo "$i"; return; }; done; }
vote_at() { [ "$1" -lt "$2" ] && echo true || echo false; }
draw_case() { local CID=$1; for a in $(seq 1 12); do sleep 5; dsend 4000000 "$COURT" "draw(uint256)" "$CID"; [ "$(phaseof "$CID")" = "1" ] && return 0; done; return 1; }
commit_panel() {
  local CID=$1 YESN=$2 P i a v h; P=$(call "$COURT" 'panelOf(uint256)(address[])' "$CID"); P=${P//[\[\]]/}; P=${P//,/ }
  i=0; for a in $P; do v=$(vote_at $i "$YESN"); h=$("$CAST" keccak "$("$CAST" abi-encode 'f(bool,bytes32,uint256,address)' "$v" "$SALT" "$CID" "$a")"); asend "${JPK[$(idx_for "$a")]}" "$a" 150000 "$COURT" "commit(uint256,bytes32)" "$CID" "$h"; i=$((i + 1)); done
  sleep 12
  i=0; for a in $P; do if [ "$(call "$COURT" 'commitmentOf(uint256,address)(bytes32)' "$CID" "$a")" = "$ZERO32" ]; then v=$(vote_at $i "$YESN"); h=$("$CAST" keccak "$("$CAST" abi-encode 'f(bool,bytes32,uint256,address)' "$v" "$SALT" "$CID" "$a")"); ssend "${JPK[$(idx_for "$a")]}" "$a" 150000 "$COURT" "commit(uint256,bytes32)" "$CID" "$h"; fi; i=$((i + 1)); done
  echo "$P"
}
reveal_panel() {
  local CID=$1 YESN=$2 P=$3 i a v; i=0; for a in $P; do v=$(vote_at $i "$YESN"); asend "${JPK[$(idx_for "$a")]}" "$a" 200000 "$COURT" "reveal(uint256,bool,bytes32)" "$CID" "$v" "$SALT"; i=$((i + 1)); done
  sleep 12
  i=0; for a in $P; do if [ "$(call "$COURT" 'hasRevealed(uint256,address)(bool)' "$CID" "$a")" = "false" ]; then v=$(vote_at $i "$YESN"); ssend "${JPK[$(idx_for "$a")]}" "$a" 200000 "$COURT" "reveal(uint256,bool,bytes32)" "$CID" "$v" "$SALT"; fi; i=$((i + 1)); done
}
wait_phase() { local CID=$1 t=$2; for w in $(seq 1 40); do [ "$(phaseof "$CID")" -ge "$t" ] && return 0; sleep 5; done; }

for CID in $CIDS; do
  YESN=$(((CID % 5) + 3))
  for round in 1 2; do
    p=$(phaseof "$CID")
    echo ">> case $CID round $round phase=$p (YESN=$YESN)"
    [ "$p" = "4" ] && { echo "   resolved"; break; }
    if [ "$p" = "0" ]; then draw_case "$CID" || { echo "   draw failed"; break; }; p=1; fi
    if [ "$p" = "1" ]; then
      P=$(commit_panel "$CID" "$YESN"); wait_phase "$CID" 2; reveal_panel "$CID" "$YESN" "$P"; wait_phase "$CID" 3
    elif [ "$p" = "2" ]; then
      P=$(call "$COURT" 'panelOf(uint256)(address[])' "$CID"); P=${P//[\[\]]/}; P=${P//,/ }
      reveal_panel "$CID" "$YESN" "$P"; wait_phase "$CID" 3
    else
      wait_phase "$CID" 3
    fi
    dsend 4000000 "$COURT" "resolve(uint256)" "$CID"
    echo "   -> phase=$(phaseof "$CID")"
  done
done

echo ">> reactivating any slashed jurors"
for ((i = 1; i <= NJURORS; i++)); do
  a=${JADDR[$i]}
  [ "$(call "$REGISTRY" 'isActive(address)(bool)' "$a")" = "true" ] && continue
  [ "$(call "$REGISTRY" 'jurors(address)(bool,uint256,uint256,uint256)' "$a" | head -1)" = "true" ] || continue
  bal=$("$CAST" balance "$a" --rpc-url "$RPC"); (( bal < 150000000000000 )) && dsend 40000 "$a" --value 0.0004ether
  ssend "${JPK[$i]}" "$a" 200000 "$REGISTRY" "postBond()"
done
echo ">> DONE. jurorCount=$(call "$REGISTRY" 'jurorCount()(uint256)')"
