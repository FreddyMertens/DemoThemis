# DemoThemis production-ready v1 — World Foundation grant budget & timeline

The post-MVP build the grant funds, priced bottom-up and tied to verifiable acceptance
criteria. The MVP is already built and source-verified on World Chain mainnet at the
founders' own expense. This single grant funds the complete path from *honest single-panel
demo* to a *VRF-randomized, receipt-free, appeal-laddered, independently-reviewed,
integration-ready* court. No core security, finality, juror-safety, or SDK milestone is deferred
to a later grant. The roadmap ends with **moderated verified-human testing**, because whether
real humans complete the juror loop is what decides if the court works at all.

> ## The ask
>
> **Grant requested: US$50,000** for milestones **M1–M6**, delivering the complete
> production-ready DemoThemis v1 in approximately **three months**: verifiable randomness,
> receipt-free ballots, deterministic work-based court fees, private rewards and reputation, expanding
> appeals, parallel panels, an Invalid/void outcome, a stable resolution SDK, an independent
> review of the completed protocol, per-draw presence and juror replacement, and moderated
> verified-human testing.
>
> **Where the money goes:** AI-assisted development is now the cheap part, so the build
> milestones are lean and the savings go into the human-intensive work AI does *not* cheapen —
> **moderated user testing & UX (M6, US$13,000, the biggest line)**, the true test of whether
> verified humans will juror through the court.
>
> **Delivered by two co-founders working in parallel** in **~3 months**, at the same
> person-effort and cost as a longer solo build (see *Why the budget holds at half the
> timeline*, below).
>
> Every tranche is released only on its acceptance criteria (each an on-chain or repo-
> verifiable artifact); **no upfront tranche**, clawback-compatible. Disbursed in **WLD** at
> the tranche-date rate per the grant agreement.

---

## Pricing method (stated so the numbers are auditable)

- **Labor is priced in person-effort, not calendar time** — a blended **US$2,200 /
  person-week** (≈ US$55/hr), well below market senior-Solidity contractor rates
  (US$150–250/hr). The two co-founders are mission-aligned and the grant funds focused build
  time, not agency overhead. The MVP — 6 legacy source-verified mainnet contracts and a
  100-test Foundry suite (including Router binding/rejection, exact-3/3 party-exclusion, first-draw unwind,
  and no-show recovery regressions; the prior 95-test liveness snapshot measured 89.51% line coverage), a full browser sandbox, and the on-chain World ID
  World ID 4 Production path (with the Staging/Simulator experiment preserved separately) — was
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
  independent firm to review the completed funded protocol after M1–M3b freeze its on-chain
  surface. Engineering milestones include ordinary remediation time; M5 is the review fee.
- **Pass-throughs** (VRF/drand subscription, mainnet gas, infra, user-test participant
  incentives) are itemized — World App sponsors end-user gas; cranking gas is cents; the bulk of
  pass-through is M6's tester incentives + devices.
- Figures are **USD**; disbursement is in **WLD at each tranche's date** per the grant
  agreement. *(pw = person-week; milestone $ = labor + pass-through.)*

### Full production grant requested — US$50,000

| | Effort | Labor | Pass-through | **Total** |
|---|---|---|---|---|
| **M1** — VRF/drand randomness + core hardening | 1.5 pw | $3,300 | $700 | **$4,000** |
| **M2** — Receipt-free ballots (MACI-library integration + bonded-coordinator wrapper) | 3.5 pw | $7,700 | $300 | **$8,000** |
| **M3a** — Deterministic court-fee engine + reward-pool cyclic payout | 1.5 pw | $3,300 | $700 | **$4,000** |
| **M3b** — Reputation + appeals + panels + Invalid/void + juror liveness | 2.5 pw | $5,500 | $500 | **$6,000** |
| **M4** — Stable resolution SDK + neutral reference integration | 2.0 pw | $4,400 | $600 | **$5,000** |
| **M5** — Independent review of the completed funded protocol | — | — | $10,000 | **$10,000** |
| **M6** — Juror UX hardening + moderated presence/replacement testing *(largest line, final step)* | 4.0 pw | $8,800 | $4,200 | **$13,000** |
| | | | | **$50,000** |

The request totals ~15 person-weeks of labor at $2,200/pw = $33,000, ~$7,000 of engineering,
infrastructure and testing pass-throughs, and a $10,000 independent review. **US$50,000 is the
complete request, not the first tranche of a larger plan.**

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
external security review (M5). It begins after the funded on-chain surface from M1–M3b is frozen
and overlaps the SDK, remediation, and testing work; two builders do not make the reviewer work
faster. The two-person team also directly **de-risks the bus-factor** concern a solo-founder
application raises.

## Timeline

The complete roadmap finishes in **~3 months** from grant-agreement signing — roughly half the
calendar of a solo build at identical person-effort. Illustrative anchor: signed **July 2026** →
production-ready v1 accepted in **October 2026**.

```
Month        1                    2                    3
  Core   ├ M1 ┤
         ├──── M2 ────┤
              ├──── M3a / M3b ────┤   ← two co-founders, parallel tracks
                                   ├── M4 ──┤
                                   ├──── M5 review + remediation ────┤
                                             ├──── M6 ────┤  ← presence, UX, testing, launch gate
```

---

## Milestone detail (deliverable → acceptance criteria → cost)

Each milestone discharges against an **on-chain or repo-verifiable artifact**, in the same
self-evidencing style as the MVP (source-verified contracts + explorer traces, not prose).
With two builders, M1 is split (randomness on one track, the correctness-hardening items on the
other); one co-founder then drives M2 while the other drives M3a/M3b; both freeze the reviewed
surface, complete M4, remediate M5 findings, and run M6 testing jointly.

### M1 — VRF/drand draw randomness + core hardening — **$4,000** (Weeks 1–2)

**Deliverable.** Replace the MVP's `blockhash`-seeded two-step draw (a documented,
sequencer-influenceable stand-in) with a verifiable randomness source (drand beacon or
Chainlink VRF on World Chain), and land the remaining correctness hardening surfaced by the MVP's
own pre-submission review. The replacement-source baseline already rejects cases with too few
eligible jurors before funds/state lock and gives every accepted case a fixed, permissionless
first-draw unwind that refunds the unused fee and escrow principal; M1 must preserve and re-verify
those invariants while adding:

- a registry **partial-slash guard** (deactivate a juror whose bond drops below the full bond)
  so the "active juror is always fully bonded" invariant holds independent of the caller;
- zero-address guards on the one-shot wiring functions;
- a pre-onboard **forged-proof check against the World ID 4 Production verifier**, captured as a
  trace — proving the replacement `WorldIDGate` fails closed before the human run.

**Acceptance criteria.** New randomness contract deployed and **source-verified** on World
Chain; a panel-draw trace whose seed is the published beacon/VRF output; expanded Foundry suite
(including the existing escrow preflight/unwind regressions and a new partial-slash test) green
at >90% coverage; the
Router forged-proof revert trace in `docs/DEMO.md`.

**Cost.** 1.5 person-weeks ($3,300) + $700 (VRF subscription / mainnet gas). AI-assisted, split
across both builders — under a calendar week.

### M2 — Receipt-free ballots, MACI-style v1 — **$8,000** (Month 2)

**Deliverable.** Replace commit/reveal (which can *prove* how a juror voted, so it is
vote-buyable in principle — the MVP's own notes call it a "known-insufficient stand-in") with
receipt-free ballots: encrypted votes with a bonded coordinator, hiding both juror identity and
vote. **Scope is integration, not new cryptography** — built on an existing audited MACI library
plus the bonded-coordinator wrapper and the court tally adapter, which keeps the band tight. Driven by one co-founder in parallel with M3a/M3b.

**Acceptance criteria.** Encrypted-ballot contracts source-verified on mainnet; an end-to-end
resolved case where the explorer shows **no juror's vote is publicly linkable before or after the tally**, including through a payment, penalty, refund, reputation update, or reusable pseudonym; a
written threat-model note on the coordinator bond; encrypt → tally → resolve tests green. The
completed ballot and private-accounting surface is included in M5's independent review.

**Cost.** 3.5 person-weeks ($7,700) + $300 (MACI tooling and integration infrastructure).

### M3a — Deterministic court-fee engine + reward-pool cyclic payout — **$4,000** (Months 2–3)

**Deliverable.** A **deterministic court-fee engine** that calculates processing, expected panel work,
reward-pool top-up, and capped operations from the locked case inputs at request time, plus the **reward-pool
gated cyclic payout** (recency-weighted private distribution to active jurors, with only the
aggregate and its correctness proof public), turning today's passive sink into a working juror incentive.

**Acceptance criteria.** Each feature deployed and source-verified, each with an explorer trace
(a court fee whose locked inputs and cap reproduce its charged total; a proved aggregate reward-pool distribution that does not expose an individual juror's amount).

**Cost.** 1.5 person-weeks ($3,300) + $700 gas/infra.

### M3b — Reputation, appeals, panels, Invalid/void + juror liveness — **$6,000** (Month 2)

**Deliverable.** **Private juror reputation commitments** (leave-one-out, Wilson-gated,
draw-rate capped at 3× a newcomer, with exact scores, case histories, penalties, and refunds
hidden); the **appeal ladder** (7→15→31 seats); **parallel pᴺ panels** above a configured risk
line; an explicit **Invalid/void** final outcome for ambiguous or unanswerable cases; a World
ID-based **per-draw presence check**; and a deterministic decline-and-replace path for jurors
who do not assess themselves as capable. This is the milestone that turns the live demo's
single 3-seat panel into the intended capture-resistant, live, and integration-safe finality
model.

**Acceptance criteria.** Each sub-feature deployed and source-verified, with explorer traces for
a draw proved from a private eligible reputation band, an appeal that expands the panel and
privately reverses a vindicated juror's update, parallel panels that must agree, and a divided or
unanswerable case that finalizes INVALID rather than defaulting to NO, and a timely decline that
replaces a juror without slashing them or deadlocking the case. Public data exposes only
one-case pseudonyms, required proofs, and aggregate accounting. Sandbox numbers and on-chain
behavior are reconciled. The appeal quote and tests must conserve every funded unit across
underfunded refund, successful appeal, and failed appeal: panel work + delay compensation are one
non-refundable service fee, while separate security principal alone returns or forfeits. Every
settlement destination must be funded and tagged in the quote before the appeal starts.

**Cost.** 2.5 person-weeks ($5,500) + $500 gas/infra.

### M4 — Stable resolution SDK + neutral reference integration — **$5,000** (Months 2–3)

**Deliverable.** A versioned TypeScript **resolution SDK** and documented API so any World App
can open a well-defined question or disputed deal, follow draw, ballot, and appeal
states, receive YES, NO, or INVALID finality, and optionally execute an escrow ruling. A neutral
reference integration proves the full path on mainnet. The SDK includes stable events,
idempotent reads, error handling, integration examples, and a migration policy so an external
application can build against DemoThemis without depending on unfinished court work.

**Acceptance criteria.** Published versioned SDK (npm + docs) and a reference integration that
resolves at least one personhood-resolved question and one disputed deal through DemoThemis on
mainnet, with transaction and finality traces on the explorer. Contract tests cover YES, NO,
INVALID, appeal, timeout, replacement, and idempotent status reads.

**Cost.** 2.0 person-weeks ($4,400) + $600 (infra / integration).

### M5 — Independent review of the completed protocol — **$10,000** (Months 2–3, pass-through)

**Deliverable.** A third-party security review of the complete funded on-chain court after
M1–M3b freeze its security surface: the five core contracts, World ID gate, verifiable
randomness, receipt-free ballot adapter, private consequence accounting, deterministic court-fee engine,
reward distribution, reputation, appeals, parallel panels, INVALID finality, per-draw presence,
decline/replacement, and the SDK-facing contract interface. The MVP **claims no audit anywhere**; this funds the independent review of
the version that will actually serve verified humans and external applications.

**Acceptance criteria.** Published report (or public summary plus full resolved-findings log)
linked from the repository; every critical and high-severity finding resolved and retested;
final reviewed commit and deployed source-verified addresses recorded in `docs/DEMO.md`.

**Cost.** $10,000 third-party pass-through, subject to a final written quote before submission.
The team owns scheduling and remediation; payment is tied to the published review artifact and
resolved critical/high findings.

### M6 — Juror UX hardening + moderated presence/replacement testing — **$13,000** (final launch gate)

**Deliverable.** Integrate the reviewed M3b presence and decline/replacement protocol paths into
a clear juror experience, then run moderated sessions with real World ID-verified jurors through
onboard → presence → accept/decline → private vote → return-to-finalize → payout. Instrument
completion and drop-off at every step, fix the friction the sessions expose, and complete an
accessibility pass (non-color state cues, clear phase timers, recovery and redirect handling).
The three-seat capstone with at least four eligible humans is juror-test #0; this milestone scales it into iterative production-
readiness rounds.

**Acceptance criteria.** ≥2–3 moderated rounds with verified humans; measured juror-flow
completion, decline/replacement success, and return-to-finality rates with a before/after report;
resulting UX fixes shipped to the live Mini App without changing the reviewed court security
surface; completed accessibility checklist.

**Cost.** 4.0 person-weeks ($8,800) + $4,200 (participant recruitment + incentives across rounds
+ test devices). The pass-through is large *on purpose* — recruiting and paying real verified
testers is the human cost AI cannot remove, and it is the most decisive spend in the plan.

---

## Sustainability past the grant

The grant is **one-time and milestone-gated**; it does not fund operations indefinitely. The court is fee-bearing by construction — a **2% escrow fee** (retained only when a deal is disputed; refunded on a clean release) and a **flat 20 MUSD per-question case fee** — two distinct mechanisms, both split 70/20/10 (jurors / reward pool / protocol) in the replacement source, using valueless test tokens. **There is no real fee revenue yet** (`jurorCount() == 0` until the capstone), and a fee with no case flow earns nothing — so the cold-start question is where the *cases* come from.

The constraint is that a juror court is **two-sided**: it needs jurors and a steady stream of
cases. Disputes are sparse and reactive because they occur only when something goes wrong. M4
therefore funds a reusable **resolution SDK** and neutral reference integration so well-defined
questions can provide additional case flow through the same court that settles disputed deals.

The completed grant deliverable is a general court, not a consumer application. It does not
depend on any one customer: the same versioned interface serves escrow flows, marketplaces,
DAOs, service-level disputes, community decisions, and other World App products that need a
credibly neutral result. Stable lifecycle events and YES, NO, or INVALID finality let those
applications begin integration without waiting for another DemoThemis build phase.

Illustrative unit economics remain simple and grant-safe: at the **2% escrow fee** a $1,000
disputed deal yields ~$20 across the 70/20/10 split, and each resolved question carries the
**flat 20 MUSD case fee** on the same split. A few dozen resolved cases/month would cover a
maintenance person-week. **The requested grant completes the reusable court; fee volume, not a
follow-on build grant, is the path to sustaining it.**

## Payout mapping (how this lands on the grant's mechanics)

- **No upfront tranche.** Each milestone is paid on its acceptance criteria — the Foundation's
  exposure is never more than one milestone ahead of delivered, verifiable work.
- **WLD at the tranche-date rate**, per the grant agreement; USD figures above are the basis.
- **Clawback-compatible.** Every tranche is tied to an on-chain, repository, test, user-research,
  or independent-review artifact, so non-delivery is objectively checkable. The team owns every
  milestone and is responsible for commissioning M5 and resolving its findings.
- **Eligibility must be confirmed before submission.** DemoThemis has two co-founders: one is a
  United Kingdom resident and the other is based in Baltimore, Maryland, United States on a work
  visa. The current World Foundation Grants page restricts grants involving United States
  residence, location, incorporation, or registered agents. This draft therefore does not assume
  that any signatory, entity, or payout arrangement is eligible. The team will obtain written
  Foundation guidance and then provide exact citizenship, residence, tax, sanctions/export-
  control, KYC/AML, entity, signatory, and payout-recipient information. The academic advisor
  remains a team member only.

> Placeholders to confirm before submission: «founder legal name», «co-founder legal name +
> citizenship/tax-residency/KYC answers», «WLD payout wallet», «final third-party audit quote
> (M5)», «MACI library chosen (M2)».
