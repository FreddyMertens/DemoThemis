# Pitch leverage review — neglected angles + the concision sweep

**Goal:** find superiority claims the storyboard/pitch missed or under-framed, rank
by leverage, apply the high-leverage ones, and tighten the writing.

**Method:** a 5-lens idea fan-out (World-grant reviewer · crypto/marketplace VC ·
mechanism-design researcher · marketplace founder · narrative strategist) →
leverage-ranked synthesis. Every code-level claim below was then **verified against
the deployed contracts** before being allowed into the pitch (log at the end). This
builds on the prior 4-lens accuracy audit that removed the false equivalences.

Leverage = grant impact × defensibility × low over-claim risk × low effort.

---

## ⭐ Single highest-leverage change — "Why now / why World ID"

The deck opens on an abstract capital-vs-personhood attack and **proves** on-chain
World ID verification (frame 6), but never states the counterfactual a World
reviewer scores hardest:

> **A one-human-one-vote court could not be built on-chain until World ID 4.0 moved
> verification on-chain. That is the unlock — and the reason this is a World project,
> now.** UMA and Kleros decide by capital because no on-chain personhood oracle
> existed when they were built; capital-weighting is a *substitute* for personhood,
> not a rejection of it.

Near-zero build (reframes assets already in the deck); answers "why World ID" and
"why now" in one line. **Caveat:** "the strongest on-chain personhood primitive,
newly callable in production v4" — not "the only one" (BrightID/Gitcoin Passport are
weaker, not nonexistent).

---

## Shortlist (apply these)

| # | Angle | Leverage | What it does | Applied |
|---|---|---|---|---|
| 1 | **Why-now / why-World ID** (above) | ★ highest | Answers the two hardest grant questions; reframes UMA/Kleros honestly | ✅ folded into frame 6 |
| 2 | **No admin can touch a verdict** (grep-it) | high | Turns vague "can't be leaned on" into a checkable property: no pause, no upgrade key, no verdict override, no fund-seizure — only one-time wiring + a future-cases phase clock | ✅ callout + matrix row |
| 3 | **Atomic settlement** | high | The *same tx* that tallies votes releases the funds (`resolve → escrow.settle`) — decision **is** enforcement; no claim button, no marshal. Categorical vs UMA/Kleros (emit a ruling), centralized (a human clicks refund), courts (a marshal) | ✅ frame 8 reword |
| 4 | **Ecosystem-fit GTM** | high | "Start neutral" → customers *and* jurors both already live in World App; the integration is two functions (open a dispute, receive the verdict); juror pool gated by World ID + a $5 bond, no token to buy | ✅ frame 13 reframe |
| 5 | **One human = one nullifier on every wallet** | med-high | Names *why* the duplicate-revert is unfakeable: the nullifier is identity-derived, wallet-independent — 10,000 wallets buy zero seats. The literal differentiator from capital systems | ✅ frame 6 caption + matrix |
| 6 | **Proofs bound to the wallet** | med | A stolen/replayed World ID proof reverts (signal-hash binding before the Groth16 check) — reinforces "no trusted middleman" | ✅ frame 6 footnote |

**Scoping caveats kept:** #2 — `setDurations` is a real (narrow) deployer power over
*future* cases, and the contracts are unaudited/non-upgradeable (say "no admin power
over any open verdict or payout," never "fully immutable"). #3 — atomic only over
funds the escrow custodies (valueless MockUSD today), not the real world. #4 — no
third-party integrates it yet, MockUSD is valueless, the platform stays
merchant-of-record and legally liable; present the network effect as the thesis the
grant funds, not traction. #5 — resists many-wallets, **not** bribing distinct humans
(kept separate from the bribe-floor discussion). #6 — anti-replay/theft, not
anti-coercion.

---

## Writing sweep (applied)

1. **Stale header** — the static intro said "10 frames"; the deck is 14 (~4:50). Fixed.
2. **De-dup the "illustrative / sandbox / single 3-seat panel" disclaimer** — it
   appeared 5+ times (frames 1, 2, 10 footnote+dagger, 11 sub+footnote). Said once,
   strongly, then short-tagged.
3. **Frame 1 narration** was overloaded (hook + a 50-word UMA/Kleros caveat) — caveat
   moved to a footnote; the spoken hook lands clean.
4. **Frame 11 sub** repeated the $13/$6.50 caveat already in its footnote — sub
   trimmed to the thesis.
5. **Frame 12** said "never paid to be right" in both the box and the narration —
   narration trimmed ~30%; box carries the detail.
6. **Lead with the verifiable claim** — "can't be leaned on" → the grep-it admin
   surface; "settled on-chain" → the atomic step; the duplicate revert → the
   wallet-independent nullifier. Wording upgrades, no added runtime.
7. **Absorb new angles as matrix rows, not new slides** — the matrix is the densest,
   cheapest place to add defensible differentiators.

---

## Discarded (and why — discipline matters)

- **Party-exclusion as its own beat** — real (the draw skips the named parties) but
  excludes only on-chain addresses, not a party's unrelated confederate; over-stating
  it as "collusion-proof" is risky. Kept as one clause, not a slide.
- **Draw-after-question as a separate "anti-packing" frame** — overlaps the existing
  narration, and at a 3-seat panel the unpredictability is weak (blockhash, not VRF).
  Folded, not elevated.
- **"Slashing funds a public good" (constructive framing)** — the *payout* is
  roadmap (RewardPool is a passive sink with no distribute function); claiming the
  court "finances its own honesty" today would over-claim. Kept the defensive line.
- **Hash-pinned evidence vs the 2026 AI-evidence fraud wave** — the hash proves the
  referenced content is unchanged, not that exhibits are authentic; the MVP doesn't
  detect AI-fabricated evidence. Competes with the stronger personhood why-now. Dropped.
- **Composable "money-lego beyond escrow"** — only one settlement consumer is built;
  absorbed into the ecosystem reframe, not a standalone slide.
- **Liveness / cases-can't-brick** — a defensive reassurance; best as one matrix row,
  not a frame.
- **"77 tests / source-verified" as a deck beat** — reads as filler to a non-technical
  reviewer and risks sounding like an audit claim (there is none). Belongs in the
  written application's feasibility section, framed "tested + source-verified; security
  review is funded-milestone #5 — not audited."

---

## Code-verification log (so the grep-it claims are safe)

- **No admin surface:** the only privileged functions across the 5 contracts are
  `DisputeCourt.setEscrow` (deployer, reverts `EscrowAlreadySet` after first call),
  `DisputeCourt.setDurations` (deployer, future cases only — each case snapshots its
  own deadlines), and `JurorRegistry.setCourt` (deployer, reverts after first call).
  `slash/enterPanel/exitPanel` are `onlyCourt` (the contract, per protocol — no human
  caller). **No** Ownable / onlyOwner / pause / upgradeTo / UUPS / proxy / delegatecall
  / selfdestruct anywhere. No function writes a case `outcome` except the vote tally.
- **Atomic settlement:** `DisputeCourt._finalize` (inside `resolve`) sets the outcome
  and, for an escrow case, calls `IEscrowSettlement(escrow).settle(dealId, outcome)` —
  same transaction (DisputeCourt.sol:398-405).
- **RewardPool:** exposes only `balance()` (view); no payout/distribute; immutable token.
- **Nullifier:** identity-derived, wallet-independent; `JurorRegistry.nullifierUsed`
  rejects reuse and stays spent through `withdraw` (one seat per human, ever).
- **Wallet binding:** `WorldIDGate.verify` reverts `SignalHashMismatch` (recomputed
  from the registering wallet) *before* the Groth16 check — a stolen proof fails.
