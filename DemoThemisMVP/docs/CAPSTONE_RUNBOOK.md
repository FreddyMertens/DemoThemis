# Step 5 capstone runbook — mainnet go-live

The operational checklist for the live mainnet slice: Developer Portal
whitelisting, Vercel config, the 3-human capstone, and going public. The live
instance (World Chain mainnet, chain 480) is deployed and source-verified — see
`contracts/deployments/worldchain-mainnet.json` and `web/src/lib/contracts.ts`
(`LIVE`). MockUSD is valueless; the 3/3 panel is a labeled demo parameter.

Live instance addresses:

| Contract | Address |
|---|---|
| MockUSD | `0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a` |
| WorldIDGate (→ Production verifier) | `0x0540f47842a31C681dce76E856b4b76fcCc53Fbe` |
| JurorRegistry (`registerWithPermit2`) | `0x226974149087b36769a54B998acfe4087eEb7F84` |
| RewardPool | `0xAF96A65A6b9643451E33cAf96717d071eDae04A0` |
| DisputeCourt (3/3) | `0xCDF427D18da8C2e8CCf9a95310bC38857EEf795A` |
| DealEscrow | `0xefc898F9C4FC805111041676b720CB478BE67c47` |
| Permit2 (canonical) | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

---

## 1. Developer Portal whitelisting (do this first — blocks every World App tx)

In the Developer Portal (developer.worldcoin.org), open the mainnet app
(`app_7bdfda4db4e2f59dd4a2427cd2bd860d`) → **Configuration → Advanced** (Mini App
permissions). A `sendTransaction` touching any non-whitelisted contract **or
token** is rejected with `invalid_contract`, so this must be complete before the
humans onboard.

**Contract Entrypoints** — add all six, plus Permit2 (the onboard calls
`Permit2.approve` directly):

- `0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a` — MockUSD (`faucet`)
- `0x226974149087b36769a54B998acfe4087eEb7F84` — JurorRegistry (`registerWithPermit2`)
- `0xCDF427D18da8C2e8CCf9a95310bC38857EEf795A` — DisputeCourt (`commit`, `reveal`)
- `0xefc898F9C4FC805111041676b720CB478BE67c47` — DealEscrow
- `0x0540f47842a31C681dce76E856b4b76fcCc53Fbe` — WorldIDGate
- `0x000000000022D473030F116dDEE9F6B43aC78BA3` — **Permit2** (required for the bond approve)

**Permit2 Tokens** — add:

- `0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a` — MockUSD (the bond token)

> The Sepolia cohort never transacts through World App, so it needs no
> whitelisting. This is the mainnet app only.

---

## 2. Vercel production config

For the World App QR to register on mainnet, the deployment World App opens must
target chain 480. Set on the Vercel **Production** environment:

- `NEXT_PUBLIC_CHAIN_ID=480` — point the live app at the mainnet instance (the
  default 4801 keeps the read-only cohort scale demo; pick per deployment).
- `NEXT_PUBLIC_SHOW_DEV=false` — keep `/app/dev` off in production. **Do not** set
  `DEV_PRIVATE_KEY` in production.
- Existing vars stay: `NEXT_PUBLIC_APP_ID`, `RP_ID`, `RP_SIGNING_KEY`,
  `AUTH_SECRET`, `AUTH_TRUST_HOST`, `HMAC_SECRET_KEY`, `AUTH_URL` (the production URL).

The App URL in the Developer Portal must match the production deployment so the
Mini App loads.

---

## 3. The 3-human capstone

The 3 World ID-verified humans (Orb preferred; the Production verifier also
accepts Device) do **register / commit / reveal themselves in World App** (gas
sponsored). The helper script `scripts/capstone-mainnet.sh` drives only the
non-juror parts from the deployer. Run it from the repo root in WSL.

Sequence (durations are extended so humans have time to vote):

1. **Extend phase durations** (deployer-only), so commit + reveal aren't a 60s
   scramble:
   ```bash
   bash scripts/capstone-mainnet.sh durations 600 600   # 10 min commit / 10 min reveal
   ```
2. **3 humans register.** Each opens the Mini App (via the QR / deep link),
   taps **Verify with World ID & join** on the Become-a-juror screen. Their
   registration runs `WorldIDVerifier.verify` (Production) in-tx and posts the
   5 MUSD bond via Permit2. Capture at least one registration worldscan trace
   showing the sponsored tx path (gas paid by the sponsor, the user's balance
   unchanged) for `docs/DEMO.md`. Watch the count:
   ```bash
   bash scripts/capstone-mainnet.sh status    # wait until jurorCount = 3
   ```
3. **Open the question case** (case type B), then crank the draw:
   ```bash
   bash scripts/capstone-mainnet.sh open-question   # prints the caseId, e.g. 0
   bash scripts/capstone-mainnet.sh draw 0
   ```
4. **3 humans commit, then reveal** on that case in World App (Case detail →
   Commit your vote → later, Reveal your vote). Then crank the resolve once the
   reveal window passes:
   ```bash
   bash scripts/capstone-mainnet.sh resolve 0
   ```
5. **Open + dispute the escrow deal** (case type A; payer = deployer, payee a
   non-juror wallet), draw, the humans commit + reveal, resolve:
   ```bash
   bash scripts/capstone-mainnet.sh open-escrow     # prints the caseId, e.g. 1
   bash scripts/capstone-mainnet.sh draw 1
   # humans commit + reveal in World App
   bash scripts/capstone-mainnet.sh resolve 1
   ```
6. **Leave both cases resolved on the explorer.** Capture the trace links and add
   them to `docs/DEMO.md` (the "Step 5 — mainnet capstone" section skeleton is
   already there). Include the sponsored-tx proof row: a World App transaction
   where worldscan shows sponsor-paid gas and the user's balance unchanged.

Notes:
- A 3-seat panel has no slack for exclusions, so the escrow parties must be
  non-juror wallets (the script uses the deployer as payer and a derived payee).
- Cranking (`draw`, `resolve`) is permissionless — anyone can run those steps; the
  script just uses the deployer for convenience.
- If a human misses the reveal window, their bond is forfeited to the reward pool
  and the case resolves by the revealed majority (or status quo under quorum). For
  a clean demo, keep all three reachable for both commit and reveal.

---

## 4. Going public (before submitting the application)

- [ ] Repo public + MIT `LICENSE` (already present) — flip visibility on GitHub.
- [ ] README quickstart + env contract current (done in Step 5).
- [ ] Vercel production deployed and reachable; the App URL in the Portal matches.
- [ ] `docs/DEMO.md` links all resolve (cohort + mainnet Step-3.5 traces + the new
      capstone traces + the sandbox + the QR/deep link).
- [ ] Demo video recorded (3–4 min; see `docs/DEMO.md` → video script) and linked.
- [ ] Pitch-site "Live demo" link added (separate repo `DemoThemis`).
- [ ] `§10` grant table (IMPLEMENTATION_PLAN.md) has a live artifact per row.
