# DemoThemis MVP

A working demo of the **DemoThemis arbitration court** for the World Foundation
Spark Track grant: a juror court gated by a **World ID proof verified on-chain
through the documented World ID Router**, running on
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

**Status: the case-liveness, automated-timing, and Router-gate release is implemented and tested (100 Foundry tests pass); mainnet
redeployment is required before the live capstone.** The previously deployed
v4 preview-verifier instance is source-verified historical evidence, but its immutable
3/3 court predates this fix and remains vulnerable both to a no-show stall and to
accepting a case whose parties leave fewer than three eligible jurors. Do not register
capstone jurors against the recorded Step-5 addresses. The replacement source keeps the
3-seat panel, fixes the question fee at 20 MUSD, fixes both voting windows at deployment with a five-minute minimum and no duration setter, checks the case-specific eligible pool before accepting funds, and gives every accepted case a
fixed one-hour first-draw escape. If no panel forms, anyone can unwind it: the unused fee
returns to the opener/payer and escrow principal returns to the payer. The same source lets
a slashed verified human rejoin with a fresh Permit2 bond and permissionlessly resolves
status quo if the separate one-hour retry window cannot form a new panel. A minimum of three
eligible jurors is fund-safe because of that unwind; the replacement deployment should use at
least four (`PANEL_SIZE + 1`) so one pre-draw withdrawal does not sacrifice adjudication
availability. The pool has no maximum. See
[docs/LIVENESS_RECOVERY.md](docs/LIVENESS_RECOVERY.md) for the lifecycle and cutover
checklist.

The browser sandbox and comparative "buy this verdict" attack demo are complete, and a
~20-juror scale demo with resolved cases runs on the World Chain **Sepolia cohort**.
The mainnet demo uses a single 3-seat panel on purpose: it proves the mechanism
end-to-end. Both the historical minimum-3 pool and the recommended minimum-4 replacement
remain cheaply flippable — this is a liveness/cost demo, not the security claim. Capture-
resistance is the at-scale property: because the panel is drawn at random after the question, an
attacker can't target it and must instead corrupt a near-majority of the whole pool, per case,
for only a probability — so cost rises with pool width (plus parallel pᴺ panels and the appeal
ladder above a value line). Widening the pool and panel and turning on parallel panels + appeals
is funded-milestone work, not a research risk; the full regime is shown in the labeled sandbox. The historical v4 adapter is exercised by three
Step-3.5 enforcement
traces (a valid registration, a forged-proof revert, a duplicate-human revert) —
using World ID **Simulator / Staging** identities, labeled as such. The
v4 preview path was exercised on the legacy deployment; it is not the production
dependency. The replacement uses the documented mainnet Router, and the live capstone is paused
until the recovery contracts are freshly deployed and wired (`docs/CAPSTONE_RUNBOOK.md`).
No real human has registered on the legacy preview-verifier instance yet
(`jurorCount() == 0`). See [docs/DEMO.md](docs/DEMO.md)
for the clickable explorer traces.

### What's real on-chain vs. what's simulated

| ✅ Real & on-chain today (mainnet, source-verified) | ◷ Simulated / roadmap (labeled, funded-milestone) |
|---|---|
| Replacement source verifies a Router-compatible Orb proof **in the transaction** (`WorldIDRouter.verifyProof`); deployment pending | Receipt-free MACI ballots — milestone #2 |
| Identity-derived **nullifier sybil gate** (one human, one seat, every wallet) | VRF / drand draw randomness — milestone #1 |
| **Wallet-bound** proof (a stolen proof reverts) | Appeal ladder (7→15→31 seats) — milestone #3 |
| Random panel drawn **after** the question | Parallel pᴺ panels above a value line — milestone #3 |
| Commit / reveal voting | Juror reputation / Wilson gate — milestone #3 |
| 70/20/10 fee split + 2% escrow fee; **slash-to-pool, never to winners** | Reward-pool cyclic payout — milestone #3 |
| **Atomic** escrow settlement (`resolve → escrow.settle`) | Work-based quote engine + reusable resolution SDK — milestones #3–4 |
| **No runtime admin override**: one-shot wiring, immutable voting windows, and permissionless lifecycle transitions | (external security review — milestone #5) |
| 100 passing Foundry tests, including Router binding/rejection, exact-3/3 party exclusion, first-draw unwind, retry recovery, invariants, and fuzz; replacement deployment pending | |

### How DemoThemis uses the World stack  (deeper than "we call IDKit")

- **On-chain World ID Router** — `WorldIDRouter.verifyProof` runs the Groth16 check
  **inside the registration transaction**, not a cloud callback. IDKit requests the
  supported v3 compatibility proof until the v4 verifier leaves preview.
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
  (labeled `MockSybilGate` stand-in; the supported Router path targets mainnet).

## Deployed contracts

**World Chain mainnet (chain 480) — legacy v4 preview-verifier instance with the former 2 MUSD question fee; do not use for the capstone**
(the historical bytecode is source-verified on [worldscan](https://worldscan.org), but it
does not contain the bounded case-liveness recovery implementation now in this repository).
Source and explicit capability status:
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

The current activation plan is [docs/MVP_UPGRADE_PLAN.md](docs/MVP_UPGRADE_PLAN.md);
every MVP vs full-design simplification is in
[docs/MECHANISM_DELTA.md](docs/MECHANISM_DELTA.md).

## Quickstart

Contracts (Foundry runs in WSL on the build machine; CI on ubuntu is the arbiter):

```bash
cd contracts
forge build
forge test          # full unit, fuzz, invariant, and exact-3/3 recovery suite
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
  `COMMIT_DURATION` / `REVEAL_DURATION` (defaults 7/14/300/300; both durations are immutable and reject values below 300 seconds), `WORLD_ID_ROUTER`, and
  `WORLD_ID_APP_ID` — set the Router to the documented World Chain mainnet address
  to deploy `WorldIDRouterGate`; leave it unset only for the disclosed cohort
  `MockSybilGate`. The deploy script cannot select the v4 preview verifier. RPCs are `foundry.toml`
  `[rpc_endpoints]` aliases (`worldchain_sepolia` / `worldchain_mainnet`).
  For the replacement three-seat capstone, explicitly set `PANEL_SIZE=3` and
  `MIN_POOL>=4`; three remains fund-safe but has no one-withdrawal adjudication reserve.
- **Web** (`web/.env.local`, see `web/.env.sample`): `NEXT_PUBLIC_CHAIN_ID` (480
  replacement mainnet after cutover / 4801 cohort read-only), `NEXT_PUBLIC_APP_ID`, `RP_ID`,
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
