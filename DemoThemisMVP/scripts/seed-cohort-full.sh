#!/usr/bin/env bash
# Step 4: full cohort seed on World Chain Sepolia (4801). Registers 20 scripted
# jurors via the MockSybilGate stand-in (reactivating any that were slashed),
# then runs question + escrow cases to resolution with varied outcomes, plus one
# case left advanceable and one left under-quorum (redraw + no-show slashing).
# All juror wallets + votes are scripted-and-disclosed (the honesty rule): the
# cohort is the labeled simulated scale demo.
#
# Reliability vs the flaky public RPC: drive by ACTUAL on-chain phase (not fixed
# sleeps); submit commits/reveals async then VERIFY and sync-retry any the RPC
# dropped (a dropped reveal would otherwise slash a juror as a no-show); dynamic
# nonces everywhere (wallets are reused across redeploys).
#
# Long-running (~25 min): run in the background and tail the log.
#   REPO_ROOT=/mnt/c/dev/DemoThemisMVP STAGE=cases bash scripts/seed-cohort-full.sh
set -uo pipefail

cd "${REPO_ROOT:-$(dirname "$0")/..}"
CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC:-https://worldchain-sepolia.g.alchemy.com/public}"
NJURORS="${NJURORS:-20}"
SALT=0x0000000000000000000000000000000000000000000000000000000000000001
MAXU=0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
ZERO32=0x0000000000000000000000000000000000000000000000000000000000000000

MUSD="${MUSD:-0xeA5241F1becCE7B3F72bf501bEa16eA976f1600F}"
REGISTRY="${REGISTRY:-0x7677ad08d0844e1Df2693242F2195F2b2fD9c622}"
COURT="${COURT:-0x1bAa18851E3E425278aFfe041b75004727F500AF}"
ESCROW="${ESCROW:-0x61110aDAca47eb0E82D5dE75F3de6F1f1b4fe596}"

set -a; . ./.env; set +a
STAGE="${STAGE:-all}"   # all | register | cases
DPK="$(printf '%s' "$PRIVATE_KEY" | tr -d '"\r')"
DADDR="$("$CAST" wallet address --private-key "$DPK")"

# All sends read the account's current nonce (the public RPC drifts; reuse-safe).
nonce() { "$CAST" nonce "$1" --rpc-url "$RPC"; }
dsend() { "$CAST" send --rpc-url "$RPC" --private-key "$DPK" --nonce "$(nonce "$DADDR")" --gas-limit "$1" "${@:2}" >/dev/null 2>&1 || true; }
ssend() { "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$(nonce "$2")" --gas-limit "$3" "${@:4}" >/dev/null 2>&1 || true; }
asend() { "$CAST" send --rpc-url "$RPC" --private-key "$1" --nonce "$(nonce "$2")" --gas-limit "$3" --async "${@:4}" >/dev/null 2>&1 || true; }
call() { "$CAST" call --rpc-url "$RPC" "$@"; }
phaseof() { call "$COURT" 'phaseOf(uint256)(uint8)' "$1"; }
casecount() { call "$COURT" 'caseCount()(uint256)'; }
crit() { "$CAST" keccak "0x$(xxd -p -c 0 "web/public/cases/$1.json" | tr -d '\n')"; }

declare -a JPK JADDR
for ((i = 1; i <= NJURORS; i++)); do
  JPK[$i]=$("$CAST" keccak "demothemis-juror-$i")
  JADDR[$i]=$("$CAST" wallet address --private-key "${JPK[$i]}")
done
idx_for() { local t="${1,,}"; for ((i = 1; i <= NJURORS; i++)); do [ "${JADDR[$i],,}" = "$t" ] && { echo "$i"; return; }; done; }

# --- registration / reactivation -------------------------------------------
if [ "$STAGE" != "cases" ]; then
echo ">> registering / reactivating $NJURORS jurors"
for ((i = 1; i <= NJURORS; i++)); do
  a=${JADDR[$i]}; pk=${JPK[$i]}
  [ "$(call "$REGISTRY" 'isActive(address)(bool)' "$a")" = "true" ] && { echo "   juror $i active"; continue; }
  registered=$(call "$REGISTRY" 'jurors(address)(bool,uint256,uint256,uint256)' "$a" | head -1)
  if [ "$registered" = "true" ]; then
    # slashed/withdrawn -> re-post the bond (already approved; has faucet MUSD)
    dsend 40000 "$a" --value 0.0004ether
    ssend "$pk" "$a" 200000 "$REGISTRY" "postBond()"
    echo "   juror $i reactivated (postBond)"
  else
    dsend 40000 "$a" --value 0.0004ether
    local_nonce=$(nonce "$a")
    proof=$("$CAST" abi-encode "f(uint256,address)" "$("$CAST" keccak "human-$i")" "$a")
    "$CAST" send --rpc-url "$RPC" --private-key "$pk" --nonce "$local_nonce" --gas-limit 150000 "$MUSD" "faucet()" >/dev/null 2>&1 || true
    "$CAST" send --rpc-url "$RPC" --private-key "$pk" --nonce "$((local_nonce + 1))" --gas-limit 80000 "$MUSD" "approve(address,uint256)" "$REGISTRY" "$MAXU" >/dev/null 2>&1 || true
    "$CAST" send --rpc-url "$RPC" --private-key "$pk" --nonce "$((local_nonce + 2))" --gas-limit 500000 "$REGISTRY" "register(address,bytes)" "$a" "$proof" >/dev/null 2>&1 || true
    echo "   juror $i registered"
  fi
done
echo "   jurorCount = $(call "$REGISTRY" 'jurorCount()(uint256)')"
fi
[ "$STAGE" = "register" ] && { echo ">> register stage done"; exit 0; }

# deployer MUSD for question fees
dsend 150000 "$MUSD" "faucet()"
dsend 80000 "$MUSD" "approve(address,uint256)" "$COURT" "$MAXU"

# --- drive helpers ----------------------------------------------------------
draw_case() { # CID -> crank until Commit phase
  local CID=$1
  for att in $(seq 1 10); do
    sleep 5
    dsend 4000000 "$COURT" "draw(uint256)" "$CID"
    [ "$(phaseof "$CID")" = "1" ] && return 0
  done
  echo "   !! draw($CID) never reached Commit"; return 1
}
wait_phase() { # CID target — poll until phaseOf >= target
  local CID=$1 target=$2
  for w in $(seq 1 40); do
    [ "$(phaseof "$CID")" -ge "$target" ] && return 0
    sleep 5
  done
}
declare -A PANEL_OF
vote_at() { [ "$1" -lt "$2" ] && echo true || echo false; } # idx yesN
commit_panel() { # CID YESN — async submit, then verify + sync-retry (within window)
  local CID=$1 YESN=$2 P i a v h
  P=$(call "$COURT" 'panelOf(uint256)(address[])' "$CID"); P=${P//[\[\]]/}; P=${P//,/ }
  PANEL_OF[$CID]="$P"
  i=0; for a in $P; do
    v=$(vote_at $i "$YESN"); h=$("$CAST" keccak "$("$CAST" abi-encode 'f(bool,bytes32,uint256,address)' "$v" "$SALT" "$CID" "$a")")
    asend "${JPK[$(idx_for "$a")]}" "$a" 150000 "$COURT" "commit(uint256,bytes32)" "$CID" "$h"; i=$((i + 1))
  done
  sleep 12
  i=0; for a in $P; do
    if [ "$(call "$COURT" 'commitmentOf(uint256,address)(bytes32)' "$CID" "$a")" = "$ZERO32" ]; then
      v=$(vote_at $i "$YESN"); h=$("$CAST" keccak "$("$CAST" abi-encode 'f(bool,bytes32,uint256,address)' "$v" "$SALT" "$CID" "$a")")
      ssend "${JPK[$(idx_for "$a")]}" "$a" 150000 "$COURT" "commit(uint256,bytes32)" "$CID" "$h"
    fi
    i=$((i + 1))
  done
}
reveal_panel() { # CID YESN REVN — reveal first REVN panelists, verify + sync-retry
  local CID=$1 YESN=$2 REVN=$3 i a v
  i=0; for a in ${PANEL_OF[$CID]}; do
    [ $i -ge "$REVN" ] && break
    v=$(vote_at $i "$YESN"); asend "${JPK[$(idx_for "$a")]}" "$a" 200000 "$COURT" "reveal(uint256,bool,bytes32)" "$CID" "$v" "$SALT"; i=$((i + 1))
  done
  sleep 12
  i=0; for a in ${PANEL_OF[$CID]}; do
    [ $i -ge "$REVN" ] && break
    if [ "$(call "$COURT" 'hasRevealed(uint256,address)(bool)' "$CID" "$a")" = "false" ]; then
      v=$(vote_at $i "$YESN"); ssend "${JPK[$(idx_for "$a")]}" "$a" 200000 "$COURT" "reveal(uint256,bool,bytes32)" "$CID" "$v" "$SALT"
    fi
    i=$((i + 1))
  done
}

run_question() { # slug YESN
  local slug=$1 YESN=$2 CID; CID=$(casecount)
  echo ">> question case $CID ($slug, ${YESN}/7 YES)"
  dsend 350000 "$COURT" "openQuestion(bytes32,string)" "$(crit "$slug")" "/cases/$slug.json"
  [ "$(casecount)" -gt "$CID" ] || { echo "   !! open failed (pool too small?)"; return 1; }
  draw_case "$CID" || return
  commit_panel "$CID" "$YESN"; wait_phase "$CID" 2
  reveal_panel "$CID" "$YESN" 7; wait_phase "$CID" 3
  dsend 4000000 "$COURT" "resolve(uint256)" "$CID"
  echo "   case $CID phase=$(phaseof "$CID") (4=Resolved)"
}
run_escrow() { # slug AMOUNT YESN n
  local slug=$1 amount=$2 YESN=$3 n=$4 PPK PADDR QADDR DID CID pn
  PPK=$("$CAST" keccak "demothemis-payer-$n"); PADDR=$("$CAST" wallet address --private-key "$PPK")
  QADDR=$("$CAST" wallet address --private-key "$("$CAST" keccak "demothemis-payee-$n")")
  dsend 40000 "$PADDR" --value 0.0004ether
  pn=$(nonce "$PADDR")
  "$CAST" send --rpc-url "$RPC" --private-key "$PPK" --nonce "$pn" --gas-limit 150000 "$MUSD" "faucet()" >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC" --private-key "$PPK" --nonce "$((pn + 1))" --gas-limit 80000 "$MUSD" "approve(address,uint256)" "$ESCROW" "$MAXU" >/dev/null 2>&1 || true
  DID=$(call "$ESCROW" 'dealCount()(uint256)')
  "$CAST" send --rpc-url "$RPC" --private-key "$PPK" --nonce "$((pn + 2))" --gas-limit 300000 "$ESCROW" "createDeal(address,uint256,bytes32,string)" "$QADDR" "$((amount * 1000000))" "$(crit "$slug")" "/cases/$slug.json" >/dev/null 2>&1 || true
  CID=$(casecount)
  echo ">> escrow case $CID ($slug, deal $DID, ${YESN}/7 YES = $([ "$YESN" -ge 4 ] && echo payee || echo payer))"
  "$CAST" send --rpc-url "$RPC" --private-key "$PPK" --nonce "$((pn + 3))" --gas-limit 600000 "$ESCROW" "dispute(uint256)" "$DID" >/dev/null 2>&1 || true
  [ "$(casecount)" -gt "$CID" ] || { echo "   !! dispute/open failed"; return 1; }
  draw_case "$CID" || return
  commit_panel "$CID" "$YESN"; wait_phase "$CID" 2
  reveal_panel "$CID" "$YESN" 7; wait_phase "$CID" 3
  dsend 4000000 "$COURT" "resolve(uint256)" "$CID"
  echo "   case $CID phase=$(phaseof "$CID") (4=Resolved)"
}

# --- the seed plan (cases 2+; cases 0-1 already exist from an earlier run) ---
run_question q-conference-held 7      # YES (unanimous)
run_question q-translation-quality 3  # NO (3-4)
run_question q-shipment-condition 5   # YES
run_escrow   e-website-build 40 6 1   # payee wins
run_escrow   e-logo-design   25 2 2   # payer wins
run_escrow   e-data-pipeline 60 5 3   # payee wins
run_escrow   e-copywriting 30 4 4      # payee wins (close 4-3)

# one case left advanceable (drawn, not resolved -> the "advance this case" UI)
LIVE=$(casecount)
echo ">> advanceable case $LIVE (q-api-uptime, drawn, left unresolved)"
dsend 350000 "$COURT" "openQuestion(bytes32,string)" "$(crit q-api-uptime)" "/cases/q-api-uptime.json"
draw_case "$LIVE" && commit_panel "$LIVE" 6 || true

# one case left under-quorum -> redraw + no-show slashing (LAST; slashes 4 jurors)
UQ=$(casecount)
echo ">> under-quorum case $UQ (q-dataset-deadline, 3 of 7 reveal -> redraw)"
dsend 350000 "$COURT" "openQuestion(bytes32,string)" "$(crit q-dataset-deadline)" "/cases/q-dataset-deadline.json"
draw_case "$UQ" || true
commit_panel "$UQ" 7; wait_phase "$UQ" 2
reveal_panel "$UQ" 7 3; wait_phase "$UQ" 3
dsend 4000000 "$COURT" "resolve(uint256)" "$UQ"
echo "   case $UQ phase=$(phaseof "$UQ") (0=Open again after redraw)"

echo ">> SEED COMPLETE. caseCount=$(casecount) jurorCount=$(call "$REGISTRY" 'jurorCount()(uint256)')"
