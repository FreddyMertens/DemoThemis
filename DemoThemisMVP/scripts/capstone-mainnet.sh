#!/usr/bin/env bash
# Limited mainnet setup helpers (World Chain mainnet, chain 480).
#
# This former capstone helper now retains only the safe status report and the
# deployer-only voting-window update. Official question opening, drawing, and
# resolution belong to scripts/mainnet-question-keeper.mjs. The old manually
# opened question and escrow paths are retired and rejected below.
#
# Run from the repo root in WSL:
#   bash scripts/capstone-mainnet.sh <step> [args]
#
# Supported steps:
#   status              juror count, voting windows, cases, phases, and panels
#   durations [C] [R]   setDurations (deployer-only); default 300 300 (5 min each)
#
# The durations step reads PRIVATE_KEY (deployer) from the ignored repo-root
# .env. Follow docs/CAPSTONE_RUNBOOK.md for the complete current procedure.
set -euo pipefail

CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC:-https://worldchain-mainnet.gateway.tenderly.co}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEP="$ROOT/contracts/deployments/worldchain-mainnet.json"

addr() { node -e "process.stdout.write(require('$DEP').contracts.$1)"; }
REGISTRY="$(addr JurorRegistry)"
COURT="$(addr DisputeCourt)"

call() { "$CAST" call "$1" "$2" --rpc-url "$RPC"; }
send() { "$CAST" send --rpc-url "$RPC" --private-key "$DPK" --gas-limit "$1" "${@:2}"; }
casecount() { call "$COURT" 'caseCount()(uint256)'; }

step="${1:-status}"
case "$step" in
  status)
    echo "jurorCount: $(call "$REGISTRY" 'jurorCount()(uint256)')  (official queue requires exactly 3)"
    echo "commitDuration: $(call "$COURT" 'commitDuration()(uint64)') seconds"
    echo "revealDuration: $(call "$COURT" 'revealDuration()(uint64)') seconds"
    n=$(casecount); echo "caseCount: $n"
    PH=(Open Commit Reveal Resolvable Resolved)
    for ((c = 0; c < n; c++)); do
      p=$(call "$COURT" 'phaseOf(uint256)(uint8)' "$c")
      echo "  case $c: phase=${PH[$p]:-$p}  panel=$(call "$COURT" 'panelOf(uint256)(address[])' "$c" | tr '\n' ' ')"
    done
    ;;
  durations)
    C="${2:-300}"; R="${3:-300}"
    if [[ ! -f "$ROOT/.env" ]]; then
      echo "Missing $ROOT/.env with the authorized deployer PRIVATE_KEY." >&2
      exit 1
    fi
    set -a; source "$ROOT/.env"; set +a
    : "${PRIVATE_KEY:?PRIVATE_KEY is required in the ignored repo-root .env}"
    DPK="$(printf '%s' "$PRIVATE_KEY" | tr -d '"\r')"
    echo "setDurations($C, $R) on $COURT ..."
    send 80000 "$COURT" "setDurations(uint64,uint64)" "$C" "$R"
    ;;
  open-question|open-escrow|draw|resolve)
    echo "'$step' is retired and disabled in this helper." >&2
    echo "Use scripts/mainnet-question-keeper.mjs and follow docs/CAPSTONE_RUNBOOK.md." >&2
    exit 2
    ;;
  *)
    echo "unknown step: $step (supported: status, durations)" >&2; exit 1
    ;;
esac
