# Funded-milestone plan, budget & timeline — World Spark Track

The post-MVP build the grant funds, priced bottom-up and tied to verifiable acceptance
criteria. The MVP is already built and source-verified on World Chain mainnet at the
founders' own expense; this grant funds the path from *honest single-panel demo* to a
*VRF-randomized, receipt-free, appeal-laddered, independently-reviewed* court — and ends with
**moderated juror user-testing**, the roadmap's single largest line, because whether real
humans complete the juror loop is what decides if the court works at all.

> ## The ask
>
> **Spark grant requested: US$14,000** — Milestones **M1 + M5**: verifiable randomness +
> correctness hardening + an **independent security review** of the already-live court. This
> makes the deployed single-panel court production-grade and gets the first real human
> on-chain. It is the highest-leverage, genuinely Spark-sized slice of the roadmap.
>
> **Pre-scoped Scale-track follow-on: US$36,000** — Milestones **M2–M4** (receipt-free ballots,
> the appeal-ladder/reputation/optimistic layer, and the resolution SDK + first neutral yes/no
> pilot integration) **plus M6 — juror UX hardening + moderated user-testing, the
> largest single line and the final step.** **Full roadmap: US$50,000.**
>
> **Where the money goes:** AI-assisted development is now the cheap part, so the build
> milestones are lean and the savings go into the human-intensive work AI does *not* cheapen —
> **moderated user testing & UX (M6, US$13,000, the biggest line)**, the true test of whether
> verified humans will juror through the court.
>
> **Delivered by two co-founders working in parallel** — the Spark milestones in **~1 month**,
> the full roadmap in **~3 months** — at the same person-effort, and the same cost, as a solo
> build (see *Why the budget holds at half the timeline*, below).
>
> Every tranche is released only on its acceptance criteria (each an on-chain or repo-
> verifiable artifact); **no upfront tranche**, clawback-compatible. Disbursed in **WLD** at
> the tranche-date rate per the grant agreement.

---

## Pricing method (stated so the numbers are auditable)

- **Labor is priced in person-effort, not calendar time** — a blended **US$2,200 /
  person-week** (≈ US$55/hr), well below market senior-Solidity contractor rates
  (US$150–250/hr). The two co-founders are mission-aligned and the grant funds focused build
  time, not agency overhead. The MVP — 6 source-verified mainnet contracts, 77 Foundry tests
  (>90% line coverage), a full browser sandbox, and the on-chain World ID 4.0 path — was
  **shipped solo by the founder in ~1 month of focused effort**, which is the capital-efficiency
  evidence behind this rate; the funded roadmap is split across **both co-founders** to deliver
  in parallel.
- **Development is the cheap part; user testing is where the money goes.** AI-assisted
  development compresses each build milestone, so the engineering lines are small
  and the **largest single line is M6 — moderated user testing & UX ($13k)**, which AI does not
  make cheaper (it is human time: recruiting World ID-verified testers, running sessions on real
  phones, instrumenting drop-off, and iterating). The cap is held at **US$50,000** by the
  sub-market rate and this dev→user-testing reallocation, not by cutting scope.
- **Milestone 5 (security review) is a third-party pass-through, not labor** — a quote for an
  independent firm, not founder time. Remediation of findings is folded into the M1 labor line
  (fixes land before M5's acceptance), so M5 is the review fee only.
- **Pass-throughs** (VRF/drand subscription, mainnet gas, infra, user-test participant
  incentives) are itemized — World App sponsors end-user gas; cranking gas is cents; the bulk of
  pass-through is M6's tester incentives + devices.
- Figures are **USD**; disbursement is in **WLD at each tranche's date** per the grant
  agreement. *(pw = person-week; milestone $ = labor + pass-through.)*

### Spark grant (the requested US$14,000)

| | Effort | Labor | Pass-through | **Total** |
|---|---|---|---|---|
| **M1** — VRF/drand randomness + core hardening | 1.5 pw | $3,300 | $700 | **$4,000** |
| **M5** — Independent security review (live court + M1) | — | — | $10,000 | **$10,000** |
| | | | | **$14,000** |

### Scale-track follow-on (pre-scoped, US$36,000)

| | Effort | Labor | Pass-through | **Total** |
|---|---|---|---|---|
| **M2** — Receipt-free ballots (MACI-library integration + bonded-coordinator wrapper) | 3.5 pw | $7,700 | $300 | **$8,000** |
| **M3a** — Optimistic fast path + reward-pool cyclic payout | 1.5 pw | $3,300 | $700 | **$4,000** |
| **M3b** — Juror reputation + appeal ladder + parallel pᴺ panels | 2.5 pw | $5,500 | $500 | **$6,000** |
| **M4** — Resolution SDK + first neutral yes/no pilot integration | 2.0 pw | $4,400 | $600 | **$5,000** |
| **M6** — Juror UX hardening + moderated user-testing *(largest line, final step)* | 4.0 pw | $8,800 | $4,200 | **$13,000** |
| | | | | **$36,000** |

**Full roadmap: US$50,000** (~15 person-weeks labor at $2,200/pw = $33,000 + ~$7,000
pass-throughs + the $10,000 third-party review). **Capped at US$50k** — dev held lean, the
weight shifted into user testing.

---

## Why the budget holds at half the timeline

**The budget prices person-effort, not calendar time** — ~15 person-weeks of work plus a fixed
third-party audit. That work does not get cheaper by finishing sooner: the same milestones are
delivered, just concurrently. DemoThemis is built by **two co-founders working in parallel**,
which compresses the same ~15 person-weeks into roughly **half the calendar at the same total
cost**.

For the Foundation this is **strictly better at an identical price**: the live, audited,
human-on-chain court — and every later milestone — lands sooner, the grant's capital is deployed
faster, and the **clawback-exposure window is shorter**. The rate stays the lean
**$2,200/person-week** — two mission-aligned builders, no agency overhead, no PM markup; we are
not charging for the parallelism, only delivering it.

One honest caveat: the one element that is **calendar-bound rather than team-bound** is the
external security review (M5) — two builders do not speed up the auditor — so we **overlap** it
with the build (it starts the moment M1 freezes the on-chain surface) rather than claiming the
team shortens it. The two-person team also directly **de-risks the bus-factor** concern a
solo-founder application raises.

## Timeline

The **Spark grant (M1 + M5) completes in ~1 month** from grant-agreement signing; the full
roadmap in **~3 months** — half the calendar of a solo build, identical person-effort.
Illustrative anchor: signed **July 2026** → Spark milestones done **early August 2026**; full
roadmap **October 2026**.

```
Month        1                    2                 3
  Spark  ├ M1 (wk 1–2) ┤
         ├──── M5 review ────┤   (external; overlaps the build)
  Scale            ├─ M2 ─┤
                          ├ M3a / M3b ┤   ← two co-founders, parallel tracks
                                      ├─ M4 ─┤
                                            ├ M6 ┤  ← juror UX + user-testing (the last step)
```

---

## Milestone detail (deliverable → acceptance criteria → cost)

Each milestone discharges against an **on-chain or repo-verifiable artifact**, in the same
self-evidencing style as the MVP (source-verified contracts + explorer traces, not prose).
With two builders, M1 is split (randomness on one track, the correctness-hardening items on the
other); in the Scale phase one co-founder drives M2 while the other drives M3a/M3b; both run the
M6 user-testing sessions jointly at the end.

### — Spark grant (requested) —

### M1 — VRF/drand draw randomness + core hardening — **$4,000** (Weeks 1–2)

**Deliverable.** Replace the MVP's `blockhash`-seeded two-step draw (a documented,
sequencer-influenceable stand-in) with a verifiable randomness source (drand beacon or
Chainlink VRF on World Chain), and land the correctness hardening surfaced by the MVP's own
pre-submission review:
- a party-callable **escrow timeout/refund** so a disputed deal can never strand principal if
  its court case can't fill a panel;
- a registry **partial-slash guard** (deactivate a juror whose bond drops below the full bond)
  so the "active juror is always fully bonded" invariant holds independent of the caller;
- zero-address guards on the one-shot wiring functions;
- a pre-onboard **forged-proof check against the Production World ID verifier**, captured as a
  trace — closing the one load-bearing assumption in the MVP's `WorldIDGate` (it relies on the
  verifier *reverting*, not returning false, on a bad proof; confirmed on Staging, to be
  confirmed on Production).

**Acceptance criteria.** New randomness contract deployed and **source-verified** on World
Chain; a panel-draw trace whose seed is the published beacon/VRF output; expanded Foundry suite
(incl. an escrow-stuck-funds test and a partial-slash test) green at >90% coverage; the
Production-verifier forged-proof revert trace in `docs/DEMO.md`.

**Cost.** 1.5 person-weeks ($3,300) + $700 (VRF subscription / mainnet gas). AI-assisted, split
across both builders — under a calendar week.

### M5 — Independent security review — **$10,000** (Weeks 1–4, overlaps the build — pass-through)

**Deliverable.** A third-party security review of the live court (the deployed five core
contracts + the World ID gate + the M1 changes — the code that will actually have humans and,
eventually, value on it) by an independent firm. The MVP **claims no audit anywhere**; this
funds the real thing. Priced as a **quote, not founder labor**, and **calendar-bound by the
firm, not the team** — it starts as soon as M1 freezes the surface and runs alongside the build.

**Acceptance criteria.** Published review report (or summary + resolved-findings log) linked
from the repo; all critical/high findings resolved with diffs.

**Cost.** $10,000 third-party pass-through — the **lean end** of the $10–15k range for a focused
review of ~1,300 lines of Solidity (no novel-cryptography surface yet — that arrives with M2,
which carries its own re-review share in the Scale phase).

### — Scale-track follow-on (pre-scoped) —

### M2 — Receipt-free ballots, MACI-style v1 — **$8,000** (Month 2)

**Deliverable.** Replace commit/reveal (which can *prove* how a juror voted, so it is
vote-buyable in principle — the MVP's own notes call it a "known-insufficient stand-in") with
receipt-free ballots: encrypted votes with a bonded coordinator, hiding both juror identity and
vote. **Scope is integration, not new cryptography** — built on an existing audited MACI library
plus the bonded-coordinator wrapper and the court tally adapter, which keeps the band tight. Driven by one co-founder in parallel with M3a/M3b.

**Acceptance criteria.** Encrypted-ballot contracts source-verified on mainnet; an end-to-end
resolved case where the explorer shows **no juror's vote is publicly linkable before or after the tally**, including through a payment, penalty, refund, reputation update, or reusable pseudonym; a
written threat-model note on the coordinator bond; encrypt → tally → resolve tests green. A
re-review of this novel-mechanism surface is included as M2's pass-through share.

**Cost.** 3.5 person-weeks ($7,700) + $300 (MACI tooling / re-review share).

### M3a — Optimistic fast path + reward-pool cyclic payout — **$4,000** (Months 2–3)

**Deliverable.** A bonded-assertion **optimistic fast path** (the ~95% free-settlement layer —
an established-art estimate for optimistic-assertion oracles à la UMA, not an MVP-measured
figure), and the **reward-pool gated cyclic payout** (recency-weighted private distribution to active
jurors, with only the aggregate and its correctness proof public), turning today's passive sink into a working juror incentive.

**Acceptance criteria.** Each feature deployed and source-verified, each with an explorer trace
(an optimistic settle that never reaches a jury; a proved aggregate reward-pool distribution that does not expose an individual juror's amount).

**Cost.** 1.5 person-weeks ($3,300) + $700 gas/infra.

### M3b — Juror reputation + appeal ladder + parallel panels — **$6,000** (Month 3)

**Deliverable.** **Private juror reputation commitments** (leave-one-out, Wilson-gated, draw-rate capped at 3× a
newcomer, with exact scores, case histories, penalties, and refunds hidden); the **appeal ladder** (7→15→31 seats); and **parallel pᴺ panels** above a value line,
so capture cost rises with the pot. This is the milestone that turns the live demo's single
3-seat panel into the real capture-resistant regime.

**Acceptance criteria.** Each sub-feature deployed and source-verified, each with an explorer
trace (a draw proved from a private eligible reputation band; an appeal escalating a panel and privately reversing a vindicated juror's update; parallel panels that must
agree). Public data exposes only one-case pseudonyms, required proofs, and aggregate accounting. Sandbox numbers and on-chain behavior reconciled.

**Cost.** 2.5 person-weeks ($5,500) + $500 gas/infra.

### M4 — Resolution SDK + first neutral yes/no pilot integration — **$5,000** (Month 3, Scale-track)

**Deliverable.** A thin TypeScript **resolution SDK** + documented API so any World App
consumer can route a yes/no question into the court for a neutral on-chain outcome in a few
lines, plus one controlled pilot integration that proves the resolver path on mainnet. This is
the cold-start engine: a juror court is two-sided (jurors *and* cases), so the SDK gives escrow
flows, marketplaces, DAOs, service-level disputes, and objective yes/no products a reusable way
to call the same personhood-gated court. Prediction-style products are one possible high-volume
consumer, but the grant-funded deliverable is the resolver infrastructure and pilot, not a
market. DemoThemis takes no bet, sets no odds, holds no stake.

**Acceptance criteria.** Published SDK (npm + docs) **and** a pilot integration resolving at
least one **personhood-resolved yes/no outcome** through DemoThemis on mainnet, traced on the
explorer, with the same SDK path shown resolving a disputed-deal case. The deliverable is solely
team-discharged and clawback-clean: SDK, docs, integration, and explorer trace.

**Cost.** 2.0 person-weeks ($4,400) + $600 (infra / integration).

### M6 — Juror UX hardening + moderated user-testing — **$13,000** (the final step; the largest line)

**Deliverable.** The last step before broad launch — and the one that decides whether real
humans complete the juror loop, which is why it is the **single largest line** in the
budget. AI compresses the build; it does not compress the cost of getting real humans through
the flow. Run **moderated user-testing sessions with real World ID-verified jurors** through the
full flow (onboard → faucet/bond → commit → **return to reveal** → payout), instrument
**completion and drop-off** at every step — especially the **reveal-return rate**, the court's
single highest-risk surface (a juror who doesn't come back to reveal no-shows, forfeits their
bond, and can deadlock a small panel) — fix the friction the sessions expose, and run an
**accessibility pass** (non-color state cues, clear phase timers, salt/redirect handling). The
3-human capstone is juror-test #0; this milestone scales it into iterative rounds.

**Acceptance criteria.** ≥2–3 moderated testing rounds with verified-human jurors; a measured
**juror-flow completion rate and reveal-return rate** with a before/after friction report; the
resulting fixes shipped to the live Mini App; a completed accessibility checklist.

**Cost.** 4.0 person-weeks ($8,800) + $4,200 (participant recruitment + incentives across rounds
+ test devices). The pass-through is large *on purpose* — recruiting and paying real verified
testers is the human cost AI cannot remove, and it is the most decisive spend in the plan.

---

## Sustainability past the grant

The grant is **one-time and milestone-gated**; it does not fund operations indefinitely. The court is fee-bearing by construction — a **2% escrow fee** (retained only when a deal is disputed; refunded on a clean release) and a **flat 2 MUSD per-question case fee** — two distinct mechanisms, both split 70/20/10 (jurors / reward pool / protocol) on-chain today, in valueless test tokens. **There is no real fee revenue yet** (`jurorCount() == 0` until the capstone), and a fee with no case flow earns nothing — so the cold-start question is where the *cases* come from.

The constraint is that a juror court is **two-sided**: it needs jurors *and* a steady stream of
cases, and it is useless empty. **Disputes are sparse and reactive** because they only fire when
a deal goes wrong, so they cannot seed the system early by themselves. M4 solves that without
making the grant about a market: it funds a reusable **resolution SDK** and one neutral pilot
integration so repeatable yes/no cases can flow through the same court that settles escrows.

The grant funds the resolver, never a market. DemoThemis takes no bet, sets no odds, holds no
stake, and does not depend on any one consumer. Prediction-style products can be high-volume
callers of the SDK because they need objective answers, but the same interface serves escrow,
marketplaces, DAO decisions, service-level disputes, and any World App flow needing a credibly
neutral yes/no outcome.

Illustrative unit economics remain simple and grant-safe: at the **2% escrow fee** a $1,000
disputed deal yields ~$20 across the 70/20/10 split, and each resolved question carries the
**flat 2 MUSD case fee** on the same split. A few hundred resolved cases/month would cover a
maintenance person-week. **Fee volume, not a follow-on grant, is the path to self-sustaining**;
the **Scale track** is the next step once the court has live usage.

## Payout mapping (how this lands on the grant's mechanics)

- **No upfront tranche.** Each milestone is paid on its acceptance criteria — the Foundation's
  exposure is never more than one milestone ahead of delivered, verifiable work.
- **WLD at the tranche-date rate**, per the grant agreement; USD figures above are the basis.
- **Clawback-compatible.** Every tranche is tied to an on-chain/repo artifact, so non-delivery
  is objectively checkable, and every milestone is **discharged solely by the team** (no gate
  hangs on a third party).
- **Two co-founders, one signatory of record.** DemoThemis is built by two co-founders;
  «founder» is the **signatory of record** for the grant agreement and the fund recipient (the
  co-founders split internally), which keeps a **single KYC/payee chain**. Recorded residency
  facts: one co-founder is a United Kingdom resident; the other is based in Baltimore, Maryland,
  United States on a work visa. Current public World Mini App Grants materials say the program is
  open to United States builders, so U.S. location is not treated as an automatic application
  blocker here. Final payout remains subject to KYC/AML, sanctions/export-control screening,
  applicant citizenship/tax-residency answers, WLD/token availability, and the signed grant
  agreement. The academic advisor remains a team member only.

> Placeholders to confirm before submission: «founder legal name», «co-founder legal name +
> citizenship/tax-residency/KYC answers», «WLD payout wallet», «final third-party audit quote
> (M5)», «MACI library chosen (M2)».
