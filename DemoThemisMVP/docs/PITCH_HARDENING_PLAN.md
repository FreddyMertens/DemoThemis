# Implementation plan — pitch hardening (grant points 1, 2, 3, 5)

> **Archived baseline:** this copy-only plan predates the 2026-07-22 eligible-party,
> first-draw-unwind, and quorum-miss remediation. Its "no Solidity / no redeploy"
> guardrail, three-human/3/3 activation assumptions, and proposed "capstone is the last
> step" wording are historical, not current instructions. The replacement should use a
> three-seat panel with `MIN_POOL >= 4` and at least four eligible humans.
> Use `LIVENESS_RECOVERY.md` and `CAPSTONE_RUNBOOK.md` for the executable state.
> Its v4 “Production verifier” content is also superseded: new deployments use
> `WorldIDRouterGate`; `WorldIDGate` is historical preview evidence only.

**What this fixes** (from `docs/GRANT_READINESS.md`):
1. The 3-seat live panel undercuts "truth isn't for sale" (~$13 to flip) — reframe as a deliberate demo size whose security is **pool width**, a parameter sweep, not a research risk.
2. **Honesty:** nothing may read as "real humans have used the live court" while `jurorCount() == 0`. (The README was already softened — finish the sweep across all artifacts.)
3. **Elevate the World-stack depth** (on-chain v4 verify, nullifier gate, MiniKit walletAuth, Permit2 single-tap, sponsored gas, deep-link) from buried caveats to a first-class strength.
5. Turn the **wall of disclaimers** into one crisp "Real-on-chain vs Simulated/roadmap" table + an engineering-maturity frame.

> **Point 4 (sustainability/first-customer) is intentionally OUT OF SCOPE** per the owner: UMA's demand was Polymarket-supported; manufacturing demand another way is unrealistic, so do not touch it.

**This is a copy / framing change only.** No Solidity, no ABI, no redeploy, no sandbox-math change. Build + 77 tests must stay green; the honesty rule is sacrosanct — **every reframe must be *more* accurate, never less.**

---

## 0 · Guardrails (read before editing)

- **Do NOT** change any contract (`contracts/`), ABI (`web/src/abi/`), or the sandbox simulation math (`web/src/lib/sim/attack.ts`, `court-math.ts`). Copy/labels only.
- **Do NOT** run the capstone, make the repo public, or change Vercel — those are separate user gates.
- **Keep intact** the existing true labels: MockUSD is valueless; the Sepolia cohort is a `MockSybilGate` stand-in; the Step-3.5 traces are World ID **Simulator/Staging** identities.
- **Live fact to honour:** mainnet `jurorCount() == 0` — no human has registered on the live instance. Re-verify before finishing (command in §6).
- **Work on a branch** `pitch-hardening` off `main`; small commits per workstream; open a PR; **do not merge** (it redeploys prod — leave the merge to the owner).

---

## 1 · Canonical content blocks (write once, reuse verbatim)

Create these three blocks first; every workstream just *places* them. Keep wording tight.

### Asset A — the "Real vs Simulated/roadmap" table  *(point 5)*

```
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
| **No runtime admin override**: one-shot wiring, immutable voting windows, and permissionless lifecycle transitions | (external security review — milestone #5) |
| 77 Foundry tests (invariants + fuzz), >90% coverage, all sources verified | |
```

### Asset B — the "security is pool width" reframe  *(point 1)*

```
**The live court runs a single 3-seat panel — on purpose.** It proves the *mechanism*
end-to-end on mainnet: the World ID personhood gate, the random draw **after** the
question, commit/reveal, and atomic settlement. Capture-resistance is a function of
**pool width**, not seat count — a parameter sweep (the sandbox P(flip) curve shows the
cost collapsing as the pool grows), not new research. The hard part — provable on-chain
personhood — is shipped; scaling the panel and pool is funded-milestone work, not a
research risk. (A small demo panel's low bribe cost is a property of the demo size, not
of the design.)
```

**Rule:** never let a "~$13 / 3-seat / single-panel / $6.50 bribe-floor" admission, or a
"truth isn't for sale / can't be bought" claim, stand without Asset B (or a one-line
short-tag of it: *"— security scales with pool width; the live panel is a demo size, see below"*) adjacent.

### Asset C — the "World-stack depth" block  *(point 3)*

```
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
```

---

## 2 · WS1 — point 5: the table + the maturity frame

| File | Edit | Acceptance |
|---|---|---|
| `README.md` | Insert **Asset A** right after the status paragraph (before "Deployed — …"). | README opens with the real-vs-roadmap table. |
| `docs/MECHANISM_DELTA.md` | Insert **Asset A** near the top (after the intro paragraph). Reframe the **intro line** (line ~3) from "lists **every** simplification, so nothing… is mistaken for the finished design" (confession tone) → an **engineering-maturity** frame: *"a complete, honest map of what's shipped vs. what's funded — we know exactly what's left and have priced it as the roadmap below."* Keep every fact; change only the framing verb. | Intro reads as maturity, not apology; the table is at the top. |
| `docs/DEMO.md`, `docs/storyboard.html` | Where the full "this is simulated / see MECHANISM_DELTA" sentence repeats, keep the **first** occurrence strong and replace later ones with a short tag (e.g. *"(sandbox — see the real-vs-roadmap table)"*). The storyboard was largely de-duped already — verify, don't re-bloat. | Disclaimer stated once-strong, short-tagged thereafter. |

## 3 · WS2 — point 1: the pool-width reframe at every small-panel/"can't-buy" site

Place **Asset B** (or its short-tag) adjacent to each site below. Use `grep -rniE "3-seat|single .{0,6}panel|\$6\.50|\$13|can'?t be bought|truth.{0,4}isn|buy this verdict"` to confirm none is missed.

| File | Where | Edit |
|---|---|---|
| `README.md` | the status / mechanism summary | One sentence of Asset B after the 3/3 mention. |
| `docs/storyboard.html` | frame 1 footnote (`.wc`), frame 11 footnote, **frame 14 "A court you can't buy"** | Ensure the close's "can't be bought" is scoped (design) and the live-MVP single-panel reframe is one tap away; the frame-11 footnote should carry the short-tag of Asset B. |
| `web/src/app/page.tsx` | the landing hero ("a verdict you can't buy") + "See it's real" | Add a short pool-width line so "can't be buy" isn't left absolute for the live MVP. |
| `web/src/app/(protected)/about/page.tsx` | the explainer copy | One Asset-B sentence. |
| `web/src/app/sandbox/components/AttackDemo.tsx` | the "Above the ceiling: parallel panels" + the headline | Make the **live-vs-simulated boundary explicit**: the multiplied-panel/pool-width security is the *design* (sandbox); the live MVP is a single 3-seat panel. Copy only — do not touch the math. |
| `docs/MECHANISM_DELTA.md` | the panel-size / economic-parameters row | One clause of Asset B. |

## 4 · WS3 — point 3: elevate the World-stack depth

| File | Edit | Acceptance |
|---|---|---|
| `README.md` | Insert **Asset C** as its own section (after the table). | README has a first-class "How DemoThemis uses the World stack" block. |
| `docs/storyboard.html` | Fold a 3-4 bullet condensation of Asset C into **frame 6** ("the unlock") as a small caption/list, or add one short frame — keep it scannable, don't bloat runtime. Update the JS `titles`/`secs` arrays **only if** a frame is added. | The stack-depth strength is visible in the deck. |
| `web/src/app/(protected)/onboard/page.tsx`, `web/src/components/Badges/index.tsx` | Keep the GasBadge + Permit2 copy, but ensure the framing reads as "the World stack working for you," not only a hedge. (Honesty: gas-sponsorship stays forward-looking until the capstone trace exists — do not claim it's proven.) | Framing positive, claim still honest. |
| `docs/CAPSTONE_RUNBOOK.md`, `docs/DEMO.md` | Add a step + a trace-table row: **capture a sponsored-tx worldscan trace** at the capstone (gas paid by sponsor, user balance unchanged) as the affirmative sponsored-gas proof. | Runbook + trace table include the sponsored-tx capture. |

## 5 · WS4 — point 2: finish the honesty sweep (no "humans have used it" while jurorCount=0)

Fix every present-tense over-claim to forward-looking. Confirm with `grep -rniE "real humans|verified humans (have|decided)|mainnet live instance|non-simulated slice"`.

| File:line | Current (over-claims) | Fix |
|---|---|---|
| `docs/MECHANISM_DELTA.md:3` | "the only non-simulated slice **is** the mainnet live instance (real World ID, real humans)" | "…**will be** the mainnet live instance once the 3-human capstone runs — it's deployed and wired over the Production verifier; no human has registered yet." |
| `docs/MECHANISM_DELTA.md:~9` (sybil row) | "The mainnet live instance **uses** real World ID 4.0" | "…is **deployed over** the Production World ID 4.0 verifier; real-human registration is the **pending** capstone." |
| `web/src/app/(protected)/about/page.tsx:~46` | "the one non-simulated slice — real World ID 4.0 verification by real humans — **runs** on World Chain mainnet" | "…is **deployed** on World Chain mainnet over the Production verifier; the live 3-human capstone is the last step." |
| `docs/DEMO.md` (Step-5 section prose) | check it doesn't assert humans have registered | keep rows `_pending_`; make prose forward-looking. |
| `web/src/lib/contracts.ts`, `web/src/lib/chain.ts`, `web/src/lib/tx.ts` (code comments), `README.md:~102` | "mainnet **live** instance" (comments) | soften to "mainnet instance" / "the live (deployed) mainnet instance" — low priority, include for completeness. |

> The `case/[id]` "N verified humans decided this" panel is already `IS_COHORT`-gated and only renders for a *resolved* mainnet case (none exists) — leave it; it cannot currently render falsely.

---

## 6 · Verification gate (the "no hiccups" checklist — run after each WS that touches `web/src`, and once at the end)

```bash
# typecheck (Windows pnpm)
pnpm -C web exec tsc --noEmit            # must be clean

# contracts unchanged → tests still green (WSL)
wsl -e bash -lc 'cd /mnt/c/dev/DemoThemisMVP/contracts && ~/.foundry/bin/forge test' | tail -3   # 77 passed

# honesty re-check: live state still 0 (so all "pending" framing is correct)
wsl -e bash -lc '~/.foundry/bin/cast call 0x226974149087b36769a54B998acfe4087eEb7F84 "jurorCount()(uint256)" --rpc-url https://worldchain-mainnet.gateway.tenderly.co'
```

- **Browser-verify** every changed app screen with the preview tools (start the dev server, navigate, screenshot): landing `/`, `/about`, `/onboard`, `/sandbox`. Share screenshots as proof. (The storyboard is a static file — to preview it, copy to `web/public/storyboard.html`, view at `localhost:3000/storyboard.html`, then **delete the public copy** before committing.)
- **Link/anchor integrity:** no broken internal links; the storyboard's JS still runs (no console errors; `panels.length` matches `titles`/`secs`).
- **Diff hygiene:** no contract/ABI/sim-math files in the diff; no secrets.

## 7 · Definition of done

- README + MECHANISM_DELTA open with **Asset A**; the confession framing is gone.
- Every small-panel / "can't be bought" site carries **Asset B** (point 1) — grep returns none unqualified.
- README + storyboard surface **Asset C** (point 3); the runbook captures the sponsored-tx trace at the capstone.
- Grep for the over-claim patterns returns **only forward-looking** phrasing (point 2).
- `tsc` clean · `forge test` 77/77 · app screens browser-verified · `jurorCount` re-confirmed 0.
- Branch `pitch-hardening` pushed, **PR opened, not merged.**
- A reviewer skimming the README in 30 seconds now sees: a crisp real-vs-roadmap table, the pool-width security framing, the World-stack-depth strength, and **no** claim that humans have already used the live court.
