#!/usr/bin/env bash
# Limited mainnet setup helpers (World Chain mainnet, chain 480).
#
# This former capstone helper now retains only the safe status report. Official
# question opening, drawing, timeout handling, and resolution belong to the
# permissionless scripts/mainnet-question-keeper.mjs workflow. Voting windows
# are immutable deployment parameters and cannot be changed here.
#
# Run from the repo root in WSL:
#   bash scripts/capstone-mainnet.sh <step> [args]
#
# Supported steps:
#   status              juror count, immutable voting windows, cases, phases, and panels
set -euo pipefail

CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="${RPC:-https://worldchain-mainnet.gateway.tenderly.co}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEP="$ROOT/contracts/deployments/worldchain-mainnet.json"

addr() { node -e "process.stdout.write(require('$DEP').contracts.$1)"; }
REGISTRY="$(addr JurorRegistry)"
COURT="$(addr DisputeCourt)"

call() { "$CAST" call "$1" "$2" --rpc-url "$RPC"; }
casecount() { call "$COURT" 'caseCount()(uint256)'; }

step="${1:-status}"
case "$step" in
  status)
    JC=$(call "$REGISTRY" 'jurorCount()(uint256)')
    PANEL=$(call "$COURT" 'PANEL_SIZE()(uint256)')
    MIN_POOL=$(call "$COURT" 'MIN_POOL()(uint256)')
    echo "jurorCount: $JC  (opening minimum $MIN_POOL; panel size $PANEL; no upper pool cap)"
    if COURT_VERSION=$(call "$COURT" 'LIVENESS_RECOVERY_VERSION()(uint256)' 2>/dev/null); then :; else COURT_VERSION=0; fi
    if REGISTRY_VERSION=$(call "$REGISTRY" 'LIVENESS_RECOVERY_VERSION()(uint256)' 2>/dev/null); then :; else REGISTRY_VERSION=0; fi
    if TIMING_VERSION=$(call "$COURT" 'AUTOMATED_TIMING_VERSION()(uint256)' 2>/dev/null); then :; else TIMING_VERSION=0; fi
    echo "versions: court-recovery=$COURT_VERSION registry-recovery=$REGISTRY_VERSION automated-timing=$TIMING_VERSION  (replacement requires 2/1/1)"
    if [ "$COURT_VERSION" = "2" ] && [ "$REGISTRY_VERSION" = "1" ] && [ "$TIMING_VERSION" = "1" ]; then
      echo "initial draw window: $(call "$COURT" 'INITIAL_DRAW_WINDOW()(uint64)') seconds  (eligible-party preflight + unused-fee refund enabled)"
      echo "timing control: immutable deployment parameters; no duration setter"
    else
      echo "capability: legacy/read-only; full recovery and immutable timing are not deployed"
    fi
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
    echo "'durations' is disabled: replacement voting windows are immutable deployment parameters." >&2
    exit 2
    ;;
  open-question|open-escrow|draw|resolve)
    echo "'$step' is retired and disabled in this helper." >&2
    echo "Use scripts/mainnet-question-keeper.mjs and follow docs/CAPSTONE_RUNBOOK.md." >&2
    exit 2
    ;;
  *)
    echo "unknown step: $step (supported: status)" >&2; exit 1
    ;;
esac
