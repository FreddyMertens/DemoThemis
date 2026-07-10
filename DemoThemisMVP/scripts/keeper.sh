#!/usr/bin/env bash
# Cohort keeper: one full case per run (open -> draw -> commit -> reveal ->
# resolve), so the Sepolia cohort dashboard stays mid-motion. Driving a whole
# case per run cranks the draw seconds after the open, sidestepping the 256-block
# draw-window trap, and keeps the scripted jurors live. Cranking is permissionless,
# so a dead cron simply degrades to the UI's "advance this case" button.
#
# Reads PRIVATE_KEY from the environment (a GitHub Actions secret in CI — there is
# no .env there). Run by .github/workflows/keeper.yml on a cron.
#   PRIVATE_KEY=0x... bash scripts/keeper.sh
set -uo pipefail

CAST="${CAST:-$(command -v cast || echo "$HOME/.foundry/bin/cast")}"
# Tenderly's public gateway proved more reliable than the Alchemy public endpoint
# under the keeper's call volume (the Alchemy /public rate-limits / drops TLS).
RPC="${RPC:-https://worldchain-sepolia.gateway.tenderly.co}"
NJURORS="${NJURORS:-20}"
SALT=0x0000000000000000000000000000000000000000000000000000000000000001
MAXU=0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
ZERO32=0x0000000000000000000000000000000000000000000000000000000000000000

MUSD="${MUSD:-0xeA5241F1becCE7B3F72bf501bEa16eA976f1600F}"
REGISTRY="${REGISTRY:-0x7677ad08d0844e1Df2693242F2195F2b2fD9c622}"
COURT="${COURT:-0x1bAa18851E3E425278aFfe041b75004727F500AF}"

DPK="$(printf '%s' "${PRIVATE_KEY:?set PRIVATE_KEY}" | tr -d '"\r')"
DADDR="$("$CAST" wallet address --private-key "$DPK")"

nonce() { "$CAST" nonce "$1" --rpc-url "$RPC"; }
dsend() { "$CAST" send --rpc-url "$RPC" --private-key "$DPK" --nonce "$(nonce "$DADDR")" --gas-limit "$1" "${@:2}" >/dev/null 2>&1 || true; }
ssend() { "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$(nonce "$2")" --gas-limit "$3" "${@:4}" >/dev/null 2>&1 || true; }
asend() { "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$(nonce "$2")" --gas-limit "$3" --async "${@:4}" >/dev/null 2>&1 || true; }
call() { "$CAST" call --rpc-url "$RPC" "$@"; }
phaseof() { call "$COURT" 'phaseOf(uint256)(uint8)' "$1"; }

declare -a JPK JADDR
for ((i = 1; i <= NJURORS; i++)); do
  JPK[$i]=$("$CAST" keccak "demothemis-juror-$i")
  JADDR[$i]=$("$CAST" wallet address --private-key "${JPK[$i]}")
done
idx_for() { local t="${1,,}"; for ((i = 1; i <= NJURORS; i++)); do [ "${JADDR[$i],,}" = "$t" ] && { echo "$i"; return; }; done; }

# --- keep the bench healthy: top up gas + reactivate any slashed juror --------
echo ">> tending the bench"
BOND=5000000   # 5 MUSD, 6 decimals
MIN_POOL=14
for ((i = 1; i <= NJURORS; i++)); do
  a=${JADDR[$i]}; pk=${JPK[$i]}
  bal=$("$CAST" balance "$a" --rpc-url "$RPC")
  (( bal < 150000000000000 )) && dsend 40000 "$a" --value 0.0004ether
  [ "$(call "$REGISTRY" 'isActive(address)(bool)' "$a")" = "true" ] && continue
  [ "$(call "$REGISTRY" 'jurors(address)(bool,uint256,uint256,uint256)' "$a" | head -1)" = "true" ] || continue
  # A slashed juror re-bonds via postBond(), which pulls another 5 MUSD. Faucet
  # first if depleted (the daily faucet refills; cooldown reverts are harmless),
  # so the pool can't permanently brick below MIN_POOL after many slash cycles.
  musd=$(call "$MUSD" 'balanceOf(address)(uint256)' "$a")
  (( musd < BOND )) && ssend "$pk" "$a" 150000 "$MUSD" "faucet()"
  ssend "$pk" "$a" 200000 "$REGISTRY" "postBond()"
done
JC=$(call "$REGISTRY" 'jurorCount()(uint256)')
echo "   jurorCount = $JC"
(( JC < MIN_POOL )) && echo "   !! WARNING: jurorCount ($JC) < MIN_POOL ($MIN_POOL) — openQuestion will revert until the bench recovers"

# --- open + drive one question case ------------------------------------------
SLUGS=(q-api-uptime q-dataset-deadline q-conference-held q-translation-quality q-shipment-condition)
CID=$(call "$COURT" 'caseCount()(uint256)')
slug=${SLUGS[$((CID % ${#SLUGS[@]}))]}
YESN=$(((CID % 5) + 3)) # 3..7 -> varied outcomes
crit=$("$CAST" keccak "0x$(xxd -p -c 0 "$(dirname "$0")/../web/public/cases/$slug.json" | tr -d '\n')")

dsend 150000 "$MUSD" "faucet()"
dsend 80000 "$MUSD" "approve(address,uint256)" "$COURT" "$MAXU"
echo ">> open case $CID ($slug, ${YESN}/7 YES)"
dsend 350000 "$COURT" "openQuestion(bytes32,string)" "$crit" "/cases/$slug.json"
[ "$(call "$COURT" 'caseCount()(uint256)')" -gt "$CID" ] || { echo "   open failed (pool too small?)"; exit 0; }

for att in $(seq 1 10); do sleep 5; dsend 4000000 "$COURT" "draw(uint256)" "$CID"; [ "$(phaseof "$CID")" = "1" ] && break; done
[ "$(phaseof "$CID")" = "1" ] || { echo "   draw did not land; permissionless crank will catch it"; exit 0; }

PANEL=$(call "$COURT" 'panelOf(uint256)(address[])' "$CID"); PANEL=${PANEL//[\[\]]/}; PANEL=${PANEL//,/ }
vote_at() { [ "$1" -lt "$YESN" ] && echo true || echo false; }

echo ">> commit"
i=0; for a in $PANEL; do v=$(vote_at $i); h=$("$CAST" keccak "$("$CAST" abi-encode 'f(bool,bytes32,uint256,address)' "$v" "$SALT" "$CID" "$a")"); asend "${JPK[$(idx_for "$a")]}" "$a" 150000 "$COURT" "commit(uint256,bytes32)" "$CID" "$h"; i=$((i + 1)); done
sleep 12
i=0; for a in $PANEL; do if [ "$(call "$COURT" 'commitmentOf(uint256,address)(bytes32)' "$CID" "$a")" = "$ZERO32" ]; then v=$(vote_at $i); h=$("$CAST" keccak "$("$CAST" abi-encode 'f(bool,bytes32,uint256,address)' "$v" "$SALT" "$CID" "$a")"); ssend "${JPK[$(idx_for "$a")]}" "$a" 150000 "$COURT" "commit(uint256,bytes32)" "$CID" "$h"; fi; i=$((i + 1)); done

for w in $(seq 1 40); do [ "$(phaseof "$CID")" -ge 2 ] && break; sleep 5; done
echo ">> reveal"
i=0; for a in $PANEL; do v=$(vote_at $i); asend "${JPK[$(idx_for "$a")]}" "$a" 200000 "$COURT" "reveal(uint256,bool,bytes32)" "$CID" "$v" "$SALT"; i=$((i + 1)); done
sleep 12
i=0; for a in $PANEL; do if [ "$(call "$COURT" 'hasRevealed(uint256,address)(bool)' "$CID" "$a")" = "false" ]; then v=$(vote_at $i); ssend "${JPK[$(idx_for "$a")]}" "$a" 200000 "$COURT" "reveal(uint256,bool,bytes32)" "$CID" "$v" "$SALT"; fi; i=$((i + 1)); done

for w in $(seq 1 40); do [ "$(phaseof "$CID")" -ge 3 ] && break; sleep 5; done
echo ">> resolve"
dsend 4000000 "$COURT" "resolve(uint256)" "$CID"
echo "DONE: case $CID phase=$(phaseof "$CID") (4=Resolved)"
