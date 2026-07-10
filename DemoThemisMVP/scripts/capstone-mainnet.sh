#!/usr/bin/env bash
# Step-5 mainnet capstone helpers (World Chain mainnet, chain 480).
#
# The 3 World ID-verified humans do register / commit / reveal themselves in World
# App (sponsored gas). THIS script drives only the non-human, non-juror parts from
# the deployer wallet (which never registers as a juror, so it is a valid case
# party): extend the phase durations for live humans, open a question case,
# create + dispute an escrow deal, and crank the permissionless draw / resolve.
#
# Run from the repo root in WSL:
#   bash scripts/capstone-mainnet.sh <step> [args]
#
# Steps (run in this order, interleaving the humans' World App actions):
#   status              jurorCount, caseCount, and each case's phase + panel
#   durations [C] [R]   setDurations (deployer-only); default 600 600 (10 min each)
#                       -- do this BEFORE opening cases so humans have time to vote
#   open-question       faucet + approve + openQuestion(q-capstone); prints the caseId
#   open-escrow         faucet + approve + createDeal + dispute(escrow-capstone)
#   draw <CID>          draw(CID) once its draw block exists (retries)
#   resolve <CID>       resolve(CID) once the reveal deadline has passed
#
# Prereqs: 3 humans already registered (jurorCount >= 3) before opening a case;
# the contracts + MockUSD whitelisted in the Developer Portal (see
# docs/CAPSTONE_RUNBOOK.md). Reads PRIVATE_KEY (deployer) from repo-root .env.
set -euo pipefail

CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC:-https://worldchain-mainnet.gateway.tenderly.co}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEP="$ROOT/contracts/deployments/worldchain-mainnet.json"
MAXU=0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
ESCROW_AMOUNT="${ESCROW_AMOUNT:-50000000}" # 50 MUSD (6dp); + 2% fee held on top

addr() { node -e "process.stdout.write(require('$DEP').contracts.$1)"; }
MUSD="$(addr MockUSD)"; REGISTRY="$(addr JurorRegistry)"
COURT="$(addr DisputeCourt)"; ESCROW="$(addr DealEscrow)"

set -a; source "$ROOT/.env"; set +a
DPK="$(printf '%s' "$PRIVATE_KEY" | tr -d '"\r')"
DADDR="$("$CAST" wallet address --private-key "$DPK")"
# A fixed non-juror payee (deterministic, receives only — needs no gas).
PAYEE="$("$CAST" wallet address --private-key "$("$CAST" keccak 'demothemis-capstone-payee')")"

call() { "$CAST" call "$1" "$2" --rpc-url "$RPC"; }
send() { "$CAST" send --rpc-url "$RPC" --private-key "$DPK" --gas-limit "$1" "${@:2}"; }
crit() { "$CAST" keccak "0x$(xxd -p -c 0 "$ROOT/web/public/cases/$1.json" | tr -d '\n')"; }
casecount() { call "$COURT" 'caseCount()(uint256)'; }

step="${1:-status}"
case "$step" in
  status)
    echo "deployer (opener/payer): $DADDR"
    echo "jurorCount: $(call "$REGISTRY" 'jurorCount()(uint256)')  (need >= 3 to open a case)"
    n=$(casecount); echo "caseCount: $n"
    PH=(Open Commit Reveal Resolvable Resolved)
    for ((c = 0; c < n; c++)); do
      p=$(call "$COURT" 'phaseOf(uint256)(uint8)' "$c")
      echo "  case $c: phase=${PH[$p]:-$p}  panel=$(call "$COURT" 'panelOf(uint256)(address[])' "$c" | tr '\n' ' ')"
    done
    ;;
  durations)
    C="${2:-600}"; R="${3:-600}"
    echo "setDurations($C, $R) on $COURT ..."
    send 80000 "$COURT" "setDurations(uint64,uint64)" "$C" "$R"
    ;;
  open-question)
    send 150000 "$MUSD" "faucet()" || echo "(faucet skipped/cooldown)"
    send 80000 "$MUSD" "approve(address,uint256)" "$COURT" "$MAXU"
    send 350000 "$COURT" "openQuestion(bytes32,string)" "$(crit q-capstone)" "/cases/q-capstone.json"
    echo "opened question caseId = $(($(casecount) - 1))"
    ;;
  open-escrow)
    send 150000 "$MUSD" "faucet()" || echo "(faucet skipped/cooldown)"
    send 80000 "$MUSD" "approve(address,uint256)" "$ESCROW" "$MAXU"
    echo "createDeal(payee=$PAYEE, amount=$ESCROW_AMOUNT) ..."
    send 300000 "$ESCROW" "createDeal(address,uint256,bytes32,string)" "$PAYEE" "$ESCROW_AMOUNT" "$(crit escrow-capstone)" "/cases/escrow-capstone.json"
    did=$(($(call "$ESCROW" 'dealCount()(uint256)') - 1))
    echo "dispute(dealId=$did) -> opens a court case ..."
    send 600000 "$ESCROW" "dispute(uint256)" "$did"
    echo "opened escrow caseId = $(($(casecount) - 1))"
    ;;
  draw)
    CID="${2:?usage: draw <CID>}"
    for i in 1 2 3 4 5; do
      if send 500000 "$COURT" "draw(uint256)" "$CID"; then echo "drawn"; break; fi
      echo "draw not ready (block $i), waiting for the draw block..."; sleep 4
    done
    ;;
  resolve)
    CID="${2:?usage: resolve <CID>}"
    send 700000 "$COURT" "resolve(uint256)" "$CID"
    echo "resolved case $CID"
    ;;
  *)
    echo "unknown step: $step (see the header for usage)"; exit 1
    ;;
esac
