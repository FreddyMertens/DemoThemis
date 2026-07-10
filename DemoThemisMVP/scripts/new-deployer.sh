#!/usr/bin/env bash
# Generates a fresh deployer keypair and writes repo-root .env from .env.example.
# Prints ONLY the address; the private key goes straight into .env (gitignored).
# Refuses to overwrite an existing .env so a funded key can't be clobbered.
set -euo pipefail

# REPO_ROOT override exists because piping this script via stdin breaks $0 resolution
cd "${REPO_ROOT:-$(dirname "$0")/..}"

if [ -f .env ]; then
  echo "ERROR: .env already exists; refusing to overwrite. Delete it first if you really want a new key." >&2
  exit 1
fi

CAST="${CAST:-$HOME/.foundry/bin/cast}"
out="$($CAST wallet new)"
addr="$(printf '%s\n' "$out" | sed -n 's/^Address:[[:space:]]*//p')"
pk="$(printf '%s\n' "$out" | sed -n 's/^Private key:[[:space:]]*//p')"

if [ -z "$addr" ] || [ -z "$pk" ]; then
  echo "ERROR: could not parse cast wallet new output" >&2
  exit 1
fi

sed -e "s|^PRIVATE_KEY=$|PRIVATE_KEY=$pk|" \
    -e "s|^DEPLOYER_ADDRESS=$|DEPLOYER_ADDRESS=$addr|" \
    .env.example > .env

echo "deployer address: $addr"
echo ".env written (private key not displayed)"
