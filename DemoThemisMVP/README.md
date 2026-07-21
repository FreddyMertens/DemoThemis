# DemoThemis MVP

A working demo of the **DemoThemis arbitration court** for the World Foundation
Spark Track grant: a juror court gated by **on-chain World ID 4.0**, running on
World Chain, with a browser sandbox that simulates the full mechanism.

## Why it's different

The decentralized courts that exist — **Kleros** and **UMA** — pick jurors by
**stake**, so influence tracks capital; and inside the World ecosystem, no Mini App
or grant project does dispute resolution at all. **DemoThemis is, to our knowledge,
the first to gate the jury by _personhood_ instead of capital** — one verified human,
one vote — and the first dispute-resolution app in World App. Token-weighted courts (UMA, Kleros) are bought once — acquire a majority of stake, a fixed and
knowable price, and you own that verdict and every future one for free. DemoThemis removes that
target: the panel is drawn at random **after** the question, from the whole verified-human pool,
so an attacker can't know or pick who will judge their case. To land a bribed majority they'd have
to pre-corrupt a near-majority of the **entire pool** — and still only get a chance, not a verdict
(bribing ~19% of a 200k pool yields a ~2.9% shot at flipping one panel). It doesn't amortize: a
fresh panel is drawn for every case, so the whole pool-corruption cost is paid again, per case,
while the price climbs with pool width, case volume, and value at stake (above a value line,
independent panels must all agree, multiplying the odds ~1/5 → 1/125 → 1/3000, and any captured
panel is appealed into a larger one). Cost-to-capture scales with pool width × case volume ×
value-at-stake — never a flat panel bribe. Full scan +
comparison: [docs/DIFFERENTIATION.md](docs/DIFFERENTIATION.md).

**Status: Step 5 of 5 — mainnet deployed & wired; the live 3-human capstone is the
last step.** The court contracts are built and tested (77 Foundry tests, >90%
coverage); the browser sandbox and the comparative "buy this verdict" attack demo
are done; a ~20-juror scale demo with resolved cases runs on the World Chain
**Sepolia cohort**; and a capstone-ready 3/3 mainnet instance over the **Production**
World ID 4.0 verifier is **deployed and source-verified**, with a single-tap World App
juror onboard path (`registerWithPermit2`, sponsored-gas trace pending at the
capstone) and on-chain commit/reveal. The mainnet deployment uses a single 3-seat
panel on purpose: it proves the mechanism end-to-end. At 3/3 the pool equals the panel, so this
demo *is* cheaply flippable — that's a liveness/cost demo, not the security claim. Capture-
resistance is the at-scale property: because the panel is drawn at random after the question, an
attacker can't target it and must instead corrupt a near-majority of the whole pool, per case,
for only a probability — so cost rises with pool width (plus parallel pᴺ panels and the appeal
ladder above a value line). Widening the pool and panel and turning on parallel panels + appeals
is funded-milestone work, not a research risk; the full regime is shown in the labeled sandbox. On-chain World ID verification is **proven** by the three
Step-3.5 enforcement
traces (a valid registration, a forged-proof revert, a duplicate-human revert) —
using World ID **Simulator / Staging** identities, labeled as such. The
Production-verifier path is wired and awaiting the live **3-human capstone**
(`docs/CAPSTONE_RUNBOOK.md`); no real human has registered on the Production-verifier
instance yet (`jurorCount() == 0`). See [docs/DEMO.md](docs/DEMO.md)
for the clickable explorer traces.

### What's real on-chain vs. what's simulated

| ✅ Real & on-chain today (mainnet, source-verified) | ◷ Simulated / roadmap (labeled, funded-milestone) |
|---|---|
| World ID 4.0 verified **in the transaction** (`WorldIDVerifier.verify`, real Groth16) | Receipt-free MACI ballots — milestone #2 |
| Identity-derived **nullifier sybil gate** (one human, one seat, every wallet) | VRF / drand draw randomness — milestone #1 |
| **Wallet-bound** proof (a stolen proof reverts) | Appeal ladder (7→15→31 seats) — milestone #3 |
| Random panel drawn **after** the question | Parallel pᴺ panels above a value line — milestone #3 |
| Commit / reveal voting | Juror reputation / Wilson gate — milestone #3 |
| 70/20/10 fee split + 2% escrow fee; **slash-to-pool, never to winners** | Reward-pool cyclic payout — milestone #3 |
| **Atomic** escrow settlement (`resolve → escrow.settle`) | Work-based quote engine + reusable resolution SDK — milestones #3–4 |
| **No admin override** (wire-once + phase clock are the entire admin surface) | (external security review — milestone #5) |
| 77 Foundry tests (invariants + fuzz), >90% coverage, all sources verified | |

### How DemoThemis uses the World stack  (deeper than "we call IDKit")

- **On-chain World ID 4.0** — `WorldIDVerifier.verify` runs the real Groth16 check
  **inside the registration transaction**, not a cloud callback.
- **Sybil gate** — the identity-derived nullifier gives one human one seat on every
  wallet; a reused human reverts on-chain.
- **Wallet-bound proofs** — a stolen or replayed proof reverts before the check.
- **MiniKit walletAuth (SIWE)** — World App wallet sign-in for the juror session.
- **Permit2 single-tap onboard** — verify + faucet + bond in one sponsored batch
  (World App auto-revokes plain ERC-20 approvals, so the bond pulls through Permit2).
- **Sponsored gas** — verified humans pay nothing (to be captured as a worldscan trace
  at the capstone: gas paid by the sponsor, the user's balance unchanged).
- **Deep-link** — open the Mini App straight to onboarding or a specific case.

Three surfaces, one Next.js app:

- **`/sandbox`** — a pure-browser simulation of the full mechanism (ladder,
  reputation, reward-pool payout) and the flagship token-court-vs-human-court
  attack demo. No wallet needed. Everything here is labeled **simulated**.
- **`/` + the Mini App** (`/onboard`, `/home`, `/case/[id]`, `/dispute`, `/about`) —
  the World App Mini App. Read-only in a desktop browser; the capstone juror flow
  runs on mainnet through World App.
- The **Sepolia cohort** — seeded scale-and-history demo, rendered read-only
  (labeled `MockSybilGate` stand-in; the real World ID verifier path is on mainnet).

## Deployed contracts

**World Chain mainnet (chain 480) — capstone-ready Production-verifier instance**
(source-verified on [worldscan](https://worldscan.org); 3/3 demo panel over the real World
ID 4.0 Production verifier — a liveness/cost demo, cheaply flippable on purpose; the security
claim is the at-scale regime where, because panels are drawn at random per case, capture cost
scales with pool width, parallel panels, and appeals). Source:
`contracts/deployments/worldchain-mainnet.json`.

| Contract | Address |
|---|---|
| MockUSD | `0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a` |
| WorldIDGate | `0x0540f47842a31C681dce76E856b4b76fcCc53Fbe` |
| JurorRegistry | `0x226974149087b36769a54B998acfe4087eEb7F84` |
| RewardPool | `0xAF96A65A6b9643451E33cAf96717d071eDae04A0` |
| DisputeCourt | `0xCDF427D18da8C2e8CCf9a95310bC38857EEf795A` |
| DealEscrow | `0xefc898F9C4FC805111041676b720CB478BE67c47` |

**World Chain Sepolia (chain 4801) — the cohort** (scale/history demo, 7/14,
`MockSybilGate`, verified on Blockscout). Source:
`contracts/deployments/worldchain-sepolia.json`.

| Contract | Address |
|---|---|
| MockUSD | `0xeA5241F1becCE7B3F72bf501bEa16eA976f1600F` |
| JurorRegistry | `0x7677ad08d0844e1Df2693242F2195F2b2fD9c622` |
| RewardPool | `0x1509A82F35da8fCb9428449dCc9120C102c153A9` |
| DisputeCourt | `0x1bAa18851E3E425278aFfe041b75004727F500AF` |
| DealEscrow | `0x61110aDAca47eb0E82D5dE75F3de6F1f1b4fe596` |

## Layout

```
contracts/   Foundry project: MockUSD, JurorRegistry, DisputeCourt, DealEscrow, RewardPool
             + the ISybilGate abstraction (MockSybilGate cohort / WorldIDGate mainnet)
web/         Next.js app: / landing, the (protected) Mini App, /sandbox simulator, /app/dev
docs/        SPIKE, IMPLEMENTATION_PLAN context, DEMO (explorer traces), MECHANISM_DELTA,
             CAPSTONE_RUNBOOK (mainnet go-live)
scripts/     deploy/seed/keeper/capstone shell helpers (run in WSL)
```

The full build plan is [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); every MVP
vs full-design simplification is in [docs/MECHANISM_DELTA.md](docs/MECHANISM_DELTA.md).

## Quickstart

Contracts (Foundry runs in WSL on the build machine; CI on ubuntu is the arbiter):

```bash
cd contracts
forge build
forge test          # 77 tests
```

Web (Node 20+, pnpm 9):

```bash
cd web
pnpm install
pnpm gen:contracts  # regenerate ABIs from ../contracts/out (after a forge build)
pnpm dev            # http://localhost:3000
```

## Environment

- **Foundry** (repo-root `.env`, see `.env.example`): `PRIVATE_KEY` (deployer; never
  a personal key), optional `vm.envOr` overrides `PANEL_SIZE` / `MIN_POOL` /
  `COMMIT_DURATION` / `REVEAL_DURATION` (defaults 7/14/60/60), and `WORLD_ID_VERIFIER`
  — set it to deploy the real `WorldIDGate` (Staging `0x703a…` or Production
  `0x0000…94d7`); unset deploys the cohort `MockSybilGate`. RPCs are `foundry.toml`
  `[rpc_endpoints]` aliases (`worldchain_sepolia` / `worldchain_mainnet`).
- **Web** (`web/.env.local`, see `web/.env.sample`): `NEXT_PUBLIC_CHAIN_ID` (480
  mainnet capstone-ready / 4801 cohort read-only), `NEXT_PUBLIC_APP_ID`, `RP_ID`,
  `RP_SIGNING_KEY`, `AUTH_SECRET` / `AUTH_TRUST_HOST` / `HMAC_SECRET_KEY` / `AUTH_URL`,
  and for the B5 dev page `NEXT_PUBLIC_SHOW_DEV` + `DEV_PRIVATE_KEY` (keep off in
  production).

## Honesty rule

Simulated data is labeled simulated, everywhere, every time. The sandbox is a
simulation; the mainnet contracts and World ID verifier path are the non-simulated
on-chain slice; the test tokens (MockUSD) are valueless on every network. World App
gas sponsorship for the juror flow is verified on-device at the human capstone,
not claimed before.

## License

MIT — see [LICENSE](LICENSE).
