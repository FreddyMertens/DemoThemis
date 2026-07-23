# DemoThemis — World Foundation grant application for a production-ready v1

## 1. Summary

**DemoThemis is a decentralized arbitration court where every juror seat is gated by a
World ID 4 proof verified _on-chain_ through the official Production verifier — the Groth16 proof is checked inside the registration
transaction, and a reused human reverts. One verified human, one juror seat; not one dollar,
one vote. A historical court using that v4 Production verifier is deployed and source-verified on World Chain mainnet; its identity trace is evidence, but its court is not the capstone dependency. An exact-3/3 liveness review found both a no-show stall and a party-exclusion/first-draw lock; both recoveries and the hardened v4-only gate are now implemented in source, and a replacement deployment is required before the live capstone.** It is, to our
knowledge, the first dispute-resolution Mini App in World App, and the first arbitration court
to seat its jurors by personhood rather than capital (dated 2026-06-20 scan — see §6).

## 2. The problem

Every marketplace, P2P trade, freelance deal, and online service needs a way to settle
disputes. Today that means a centralized operator (a trust bottleneck) or a *decentralized*
court that decides by money. The two live decentralized courts decide by capital: **Kleros**
draws jurors in proportion to PNK **stake** (stake-weighted sortition), and **UMA's** DVM is a
**one-token-one-vote** oracle with no jury draw at all. Either way, influence tracks tokens, so
a well-capitalized actor can **buy a verdict** and reuse the position case after case. That is
the exact failure World ID was built to fix for voting — and nobody has applied it to
adjudication. Inside World App there is **no dispute-resolution primitive at all**,
so every marketplace flow runs its own siloed, operator-run dispute desk.

## 3. The solution

DemoThemis replaces *stake-weighting* with *personhood*. A juror joins by verifying with
the **World ID 4 Production verifier** (the Groth16 proof is checked inside the registration transaction)
and posting a small bond; the sybil gate gives **one human one seat on every wallet**. For each
case a panel is drawn **at random, after** the question is fixed — so an attacker cannot know
or choose who will sit on it. Jurors vote and the majority decides, with the fee split and the
settlement enforced atomically on-chain. Because seats are random verified people, not coins,
there is no known panel to target: to land a bribed majority on a specific case you must compromise
a large share of the **entire human pool** and merely hope the draw seats enough of them — for
only a *probability*, not certainty. That probability falls as the pool widens, while high-value
cases add non-overlapping parallel panels and larger appeals (§7). Once a juror serves on a
dispute, every later panel and appeal for that dispute excludes them; receipt-free ballots prevent
a briber from proving how any recruited juror voted.

Two case types ship today: an **escrow dispute** (fund a deal, raise a dispute, the court
decides who gets paid, settlement is atomic) and a **yes/no question** (the neutral resolver
surface). Three surfaces, one Next.js app: the **World App Mini App** (the live juror flow), a
**pure-browser sandbox** that simulates the full mechanism (so a reviewer needs no wallet), and
a read-only **scale cohort**.

The yes/no question type is the neutral resolver surface. Any World App, escrow flow,
marketplace, DAO, or data product can route a well-defined question to the court and receive a
personhood-resolved on-chain answer. **M4 funds the resolution SDK and a neutral reference
integration** that proves this path end to end. The grant completes DemoThemis itself: a stable,
general resolution interface that future applications can build against without waiting for
another court milestone or grant.

> **Honest scope note (carried through this application):** the recommended replacement mainnet design runs
> a **3-seat panel with a minimum eligible pool of 4 and no pool maximum**. Three remains fund-safe
> in the contract because an undrawn case can unwind, but has no one-withdrawal adjudication reserve.
> At four the random draw excludes only one juror, so it still does little security work; additional verified humans
> remain welcome as liveness reserves, while production-scale pool recruitment is
> still M3b and M1 hardens randomness. The real
> capture-resistance — where flipping a verdict costs more as the pool grows, across parallel
> panels — is funded roadmap, not the planned three-seat / minimum-four capstone. We say this up front rather than let a
> reviewer find it in the contract.

## 4. Why World — deep, on-chain World ID usage *(the core of the application)*

This is not "we call IDKit." World ID is the **load-bearing primitive of the mechanism**, used
on-chain and across the stack:

- **On-chain World ID 4 verifier.** `WorldIDVerifier.verify` runs the **Groth16 check inside the
  registration transaction**, not as a cloud callback. The app requires protocol 4,
  requests proof-of-human, and disables legacy proofs.
- **Sybil gate.** The identity-derived nullifier gives one human one seat; a reused human
  **reverts on-chain**. This is what makes "one human, one vote" real.
- **Wallet-bound proofs.** The proof is bound to the registering wallet (`signalHash`
  recomputed on-chain), so a **stolen or replayed proof reverts** before the check.
- **MiniKit walletAuth (SIWE)** for the juror session; **Permit2 single-tap onboard** (verify +
  faucet + bond in one sponsored batch, because World App auto-revokes plain ERC-20 approvals);
  **sponsored gas** so verified humans pay nothing; **deep-link** straight to a case.
- **Open, permissionless onboarding.** Any **Orb-verified** human can juror — no wealth gate,
  no exam — so the bench scales to capable people anywhere, not just the well-capitalized.
  Device-level verification alone never creates a seat. The funded design adds a separate,
  draw-bound on-device presence/continuity check *after* Orb enrollment so a buyer cannot simply
  operate a sold or rented juror account without the enrolled human participating again.

  **Current integration boundary:** Orb eligibility can be enforced on World Chain today. World
  also exposes [Selfie Check (Beta)](https://docs.world.org/world-id/credentials/11), including
  returning-user Face Auth, through IDKit and its production verification API. That result is not
  verified by the Orb-only legacy Router. M3b therefore treats it as a post-Orb presence signal,
  binds each fresh challenge to the draw, and relays an authenticated pass to the court; it does
  not call the lower-assurance Device credential a second identity check or claim the MVP ships it.

World ID isn't a login here — it gates juror eligibility by personhood, not
capital. That is why we lead with it: the grant's most-valued axis is the project's
central mechanism, not a feature.

## 5. Working demo — what's real on-chain vs. what's roadmap

The legacy MVP is **deployed and source-verified on World Chain mainnet today**, while the
recovery-enabled replacement is implemented and tested in source but not yet deployed. The live
capstone is paused until that cutover. One honesty rule: **simulated data is labeled simulated,
everywhere, and historical bytecode is not presented as the current source.**

| ✅ Real & on-chain today (mainnet, source-verified) | ◷ Roadmap (funded milestone) |
|---|---|
| Replacement source verifies a v4 proof-of-human **in the transaction**, with legacy proofs disabled; deployment pending | VRF/drand draw randomness — M1 |
| **Nullifier sybil gate** (one human, one seat) | Receipt-free MACI-style ballots — M2 |
| **Wallet-bound** Orb proof (a stolen proof reverts) | Appeals, parallel panels, Invalid/void, and post-Orb presence/decline/replacement — M3b |
| Random two-step 3-seat panel draw, **after** the question; active pool may exceed three | Juror reputation / Wilson gate — M3b |
| Commit/reveal voting *(receipt-ful — see §7)* | Reward-pool cyclic payout — M3a |
| 70/20/10 fee split + 2% escrow fee; **slash-to-pool, never to winners** | Deterministic court-fee engine + private reward-pool distribution — M3a |
| **Atomic** escrow settlement | Stable resolution SDK + neutral reference integration — M4 |
| **No admin override**: no upgrade, no pause, no fund-extraction path, no override of any in-flight case | Independent security review — M5 |
| **Replacement source only (not the legacy addresses):** eligible-party preflight, fixed first-draw unwind with unused-fee/principal return, Permit2 re-bond, and bounded retry | Deployment, source verification, app/keeper cutover, and capstone traces remain pending |
| 6 legacy source-verified contracts · a 100-test verified Foundry snapshot plus current v4 binding/schema, exact-3/3 party exclusion, first-draw unwind, no-show, re-bond, retry, and escrow recovery regressions · replacement deployment pending | |

**Status — remediation and redeployment remain before the human run.** On-chain World ID enforcement is **proven** by three Step-3.5
explorer traces (a valid registration, a forged-proof revert, a duplicate-human revert), using
World ID **Simulator/Staging** identities so the path is shown human-free for cents. The
legacy court's v4 **Production**-verifier identity path is deployed and source-verified as historical evidence. Its immutable court
cannot safely run the capstone after the no-show and party-exclusion liveness findings. The corrected registry/court
source, Permit2 re-bond UI, threshold keeper, and regression tests must be deployed, verified,
allowlisted, and cut over first. The **three-seat mainnet capstone with at least four eligible humans** is then **juror user-test #0**, the first run of the real
onboard → commit → reveal → payout loop with verified humans, which the funded **M6** milestone
then scales into moderated rounds. Until the capstone runs, `jurorCount() == 0`, stated plainly.
The recommended replacement configuration is `PANEL_SIZE = 3`, `MIN_POOL >= 4`: three
eligible humans is fund-safe because the fixed first-draw timeout can unwind, while four
preserves adjudication availability through one pre-draw withdrawal.

One residual assumption, disclosed: the gate relies on the verifier **reverting** (not
returning false) on a forged proof. This is empirically confirmed on the Staging verifier; the
equivalent **Production**-verifier forged-proof revert trace is a named **M1** acceptance
artifact, captured at the capstone.

**For the reviewer in 60 seconds** (no wallet needed): watch the *buy-this-verdict* attack demo
(a token-court model based on systems like UMA and Kleros flips to the lie; the human court holds) → click through to the source-verified
contracts and resolved cohort cases on the explorer → open the read-only Mini App over that
history. Links in §12.

## 6. Differentiation — and the expert rebuttals, handled

Decentralized arbitration is a real, respected category; we don't claim to have invented it. We
claim one defensible inversion — **the eligibility set for the juror draw**:

- **The draw is not the novelty; the eligibility set is.** Kleros already draws jurors randomly
  and post-question (so did Aragon Court, before it was deprecated) — so randomness isn't our
  claim. What we change is *who is eligible to be drawn*: bonded **stake** (them) vs
  **one-verified-human-one-seat** (us).
- **The live decentralized courts decide by capital.** Kleros sortition ∝ PNK stake; UMA is
  one-token-one-vote; Aragon Court (now deprecated — Aragon wound the project down) seated
  stake-/activation-based "guardians." Tellingly, even **Kleros's "Humanity Court,"** which rules
  on *who is a unique human*, still seats its **jurors by stake** — the registry is
  personhood-gated, the bench is not. DemoThemis gates the **bench**.
- **"But World ID is itself a sybil/dedup primitive — isn't this just a better sybil gate?"**
  Yes, and that is the point. Prior personhood systems (Proof-of-Humanity and descendants) gate
  *who may stake*; influence is still drawn by capital. Putting personhood at the **draw
  itself** is the novel step, and World ID is the first production-grade primitive that makes a
  personhood-gated eligibility set **cheap and sybil-hard**.
- **Inside World:** a June 2026 scan of the World App catalog and **every** Community Grant
  recipient (Wave 0 + Wave 1) found **no** dispute-resolution, arbitration, juror, or escrow
  project — the closest funded work is one-human-one-vote *governance/voting* (Wonderland,
  Votexx, zkSnap, Agora, World Poll), which makes collective decisions, not two-party
  adjudications with bonds, evidence, and settlement.

We scope the "first" claims honestly: "to our knowledge," "in the World ecosystem," from a dated
2026-06-20 scan — not an exhaustive crawl. Full scan: [docs/DIFFERENTIATION.md](DIFFERENTIATION.md).

## 7. Security model — stated honestly

What's bought today, and what isn't:

- **The MVP ballot is receipt-_ful_.** Commit/reveal lets a juror reveal their vote — and the
  secret salt that hid it — to *prove* how they voted, so the **MVP is vote-buyable in principle** — at the minimum 3/3 pool size a briber
  needs only the two known jurors and can verify compliance. At scale the personhood gate changes
  the attack entirely: because the panel is drawn at random after the question, there is no known
  set to buy, so a briber must compromise a large share of the **whole pool** and win the draw for
  only a chance — and **receipt-free MACI-style
  ballots (M2)** remove even their ability to *verify* that corruption paid off. The court is un-buyable only with
  **both** — which is why M2 is the single highest-priority mechanism upgrade after the
  liveness-enabled replacement is deployed and proven.
- **Capture-resistance scales with pool width and the stakes — and that is roadmap, not the three-seat demo.** Because the panel is drawn at random after the question, an attacker can't target it; to even attempt a flip they must compromise a large share of the whole pool and hope the draw cooperates. Widen the pool and a fixed budget's flip-probability collapses (in the sandbox, bribing ~19.2% of a 200k pool buys only a ~2.91% chance to flip a single panel); raise the stakes and several **independent parallel panels must all agree**, so odds multiply pᴺ — the chance of flipping collapses from ~1/5 to 1/125 to 1/3000 as panels go 1→3→5 (M3b) — while any captured panel is **appealed into a larger one (7→15→31)**. Every panel within the dispute is disjoint: a juror who served on an earlier panel or appeal cannot serve on a later one. The planned replacement three-seat / minimum-four capstone is a
  liveness/cost demo (where a small bribe can still flip the toy panel); it is **not** this
  security regime. The hard part — provable, sybil-resistant on-chain personhood at the juror
  draw — is **shipped**; widening it is funded engineering, not new research.
- **Every appeal conserves its funding.** The crowdfunding goal tags a non-refundable service
  fee (new-panel work + delay compensation) separately from the anti-re-roll security bond.
  Once funded, the service fee pays those costs exactly once. A successful appeal returns the
  security principal from its own escrow pro-rata; a failed appeal forfeits only that security
  principal to the reward pool. An underfunded round refunds every wallet and starts no jury.
- **No admin override — an affirmative trust asset, verifiable from the source-verified
  bytecode.** No upgradeability, no pause, no fund-extraction path, no override of any in-flight
  case. The only privileged calls are `setEscrow`/`setCourt`: one-shot deployment wiring that
  reverts forever after it is set. Commit and reveal durations are immutable deployment
  parameters with a five-minute on-chain minimum; there is no duration setter. Drawing,
  timeout recovery, and resolution are permissionless.
  `RewardPool` has no payout function in the MVP.
- **Quality is measured privately, not assumed (M3b).** Funded juror reputation pays **accuracy above an
  obvious-vote baseline** — leave-one-out scoring, a lenient Wilson-interval suspension gate,
  draw rate capped at 3× a newcomer — while exact scores, case histories, payments, penalties,
  and refunds remain private. Jurors prove only an eligible reputation band and correct private
  updates; the public sees aggregate accounting. This rewards being *right*, not merely agreeing, designing
  out the consensus-collapse/herding failure that stake courts share while protecting honest
  dissent. Panel sizes (7→15→31) follow the **Condorcet jury theorem**: odd panels of
  better-than-chance humans converge on the truth as they grow. This scoring is interactive today
  in the /sandbox reputation demo.
- **Open edges, named (the honesty rule applied to attacks).** Two the MVP does not yet close: *ambiguous
  questions* — today a tie or post-panel no-quorum resolves to status quo (question NO / escrow refunds the
  payer), so a genuinely unanswerable question defaults to NO; an explicit **Invalid/void
  outcome**, flagged when independent parallel panels split on a genuinely ambiguous question,
  is funded in M3b. And *credential rental or an unavailable juror* — M3b adds a draw-bound,
  on-device presence/continuity check after Orb eligibility plus a decline-and-replace protocol
  path, so a device credential alone never grants a seat and jurors serve only when they are
  present and assess themselves as capable; M6 hardens and tests that user flow. Both
  gaps are part of this grant's completion scope, not deferred to an unspecified later build.

## 8. Traction & technical credibility

The MVP was **shipped solo by the founder in ~1 month** — the funded roadmap is delivered by
both co-founders in parallel (§9, §11) — to a standard meant to survive scrutiny:

- **6 source-verified contracts on World Chain mainnet** (5 core + the World ID gate; chain
  480, historical v4 Production-verifier evidence; v4-only replacement pending) + a **~20-juror Sepolia cohort** with resolved
  cases (scale/history demo).
- **100-test verified Foundry snapshot plus current declared regressions with real system invariants** (token conservation, registry solvency,
  bonded-juror), fuzz, and exact-3/3 liveness regressions for eligible-party rejection before
  funds lock, immutable first-draw timeout, unused-fee and escrow-principal return, re-bond, and
  bounded retry. The count is taken from the current recovery release rather than the historical
  77-test snapshot. The prior 95-test liveness snapshot measured **89.51% line, 86.67% statement, 76.11% branch,
  and 92.22% function** overall; `DisputeCourt` was **96.43% line** and `JurorRegistry`
  was **100% line**; that historical coverage figure is not attributed to the new Router-gate release.
- **No external audit is claimed anywhere** — an independent review of the completed funded
  protocol is milestone **M5** in this request.
- The MVP went through an adversarial pre-submission review; the correctness items it surfaced
  include both the quorum-miss stall and the party-exclusion first-draw lock. Bounded retry,
  Permit2 re-bond, eligible-pool preflight, and a permissionless first-draw unwind are implemented
  in this release. Partial-slash guards and a Router forged-proof pre-check remain
  explicit follow-up work rather than being papered over.

## 9. Milestones, timeline & budget

This request funds every remaining milestone required to turn the honest single-panel MVP into a
**production-ready DemoThemis v1**: verifiable randomness, receipt-free ballots, deterministic
court fees and reward distribution, private reputation, expanding appeals, parallel panels, an
Invalid/void outcome, a stable integration SDK, an independent review of the completed protocol,
and real verified-human testing with per-draw presence and decline/replacement flows. No core
security, finality, juror-safety, or integration milestone depends on a hypothetical follow-on
grant.

Every tranche releases only on a verifiable acceptance artifact; **no upfront tranche**,
clawback-compatible. Two co-founders deliver the work in parallel in approximately **three
months**, priced lean and capped at **US$50,000**. M6 remains the largest line because the final
test is not whether the contracts compile, but whether verified humans reliably complete the
real juror loop on their own phones.

**Grant requested — US$50,000 (~3 months):**

| # | Milestone | Acceptance artifact | Cost |
|---|---|---|---|
| M1 | VRF/drand randomness + correctness hardening + Router forged-proof pre-check | verified randomness contract + draw trace; expanded tests; the forged-proof revert trace | $4,000 |
| M2 | Receipt-free ballots | unlinkable end-to-end ballot and consequence-accounting trace; threat model; tests | $8,000 |
| M3a | Deterministic court-fee engine + private reward-pool distribution | locked fee-input and private aggregate-payout traces | $4,000 |
| M3b | Private reputation + appeals + parallel panels + Invalid/void + juror liveness | source-verified contracts and traces for each path | $6,000 |
| M4 | Stable resolution SDK + neutral reference integration | published SDK/docs and traced mainnet question + escrow integrations | $5,000 |
| M5 | Independent review of the completed funded protocol | published report; every critical/high finding resolved | $10,000 |
| M6 | Juror UX hardening + moderated testing of presence and replacement flows | shipped UX, measured completion/return-to-finality rates, accessibility report | $13,000 |
|  | **Total** | **A reviewed, tested, integration-ready DemoThemis v1** | **$50,000** |

Full bottom-up pricing, effort estimates, acceptance criteria, the timeline, the WLD payout
mapping, and unit economics: **[docs/GRANT_BUDGET.md](GRANT_BUDGET.md)**.

## 10. Sustainability & go-to-market

DemoThemis stays what §1 calls it — a **personhood-gated arbitration court** — and this section is
about how the completed court becomes self-sustaining. Two fees are built in already: a **2%
escrow fee** (retained only when a deal is disputed; refunded on a clean release) and a **flat 20
MUSD per-question case fee**. Both are split 70/20/10 (jurors / reward pool / protocol) in the
replacement source using **valueless test tokens, so there is no real fee revenue yet** (`jurorCount() == 0` until
the capstone). The meter exists; what it lacks is a production-ready court and repeatable case
flow.

A juror court is a **two-sided system**: it needs verified jurors *and* a steady stream of cases,
and it is useless empty. The cold-start plan therefore starts with the broadest grant-safe
surface: a **resolution SDK** that lets any World App route a well-defined question or disputed
deal to the court, plus a neutral reference integration that proves both paths end to end.
Escrow disputes are naturally sparse; reusable question resolution gives the court additional
case flow to test juror reliability, show earnings, and build public history.

The grant deliverable is entirely DemoThemis: the court, juror system, open SDK, documented API,
source-verified settlement paths, stable lifecycle events, and explorer-traced outcomes. The
reference integration exists only to prove that an independent consumer can open a case, follow
its draw, ballot, and appeal lifecycle, receive YES, NO, or INVALID finality, and execute an optional
escrow ruling. The same interface can serve marketplaces, DAOs, service-level disputes,
community decisions, and any World App that needs a credibly neutral result.

That case flow compounds in two ways. First, every completed court case contributes to one shared
juror-quality record through difficulty-adjusted agreement, consistency with its written criteria,
and appeal survival; independently checkable outcomes can add later confirmation. The same volume
that funds the bench also calibrates it (the §7 reputation scoring, live in the /sandbox demo).
Second, the SDK makes adoption modular:
external apps do not need to build their own dispute desk, juror pool, World ID proof path, or
settlement contracts. They can call the court and inherit the public resolution history.

So the sustainability claim is simple: **this grant completes the reusable court; fee volume
supports it afterward**. The 2% disputed-escrow fee and flat per-question fee are already modeled
on-chain in valueless tokens; M4 makes both case types easy to integrate, and M6 verifies that
real humans reliably complete the juror loop that earns those fees.

## 11. Team & eligibility

- **Co-founders:** «founder legal name» and «co-founder legal name» — a two-person founding
  team. The founder **shipped the MVP solo in ~1 month** (the public commit history reflects a
  single implementer); the funded roadmap is split across both co-founders and delivered in
  parallel, which is why it completes in **half the calendar at the same person-effort** (and
  cost — see §9 and the budget).
- **Signatory of record:** «founder» signs the grant agreement and receives the grant funds/WLD
  if approved (the co-founders split internally), which keeps a **single KYC/payee chain**. This
  is a disbursement arrangement, not a statement of seniority — both are equal co-founders.
- **Advisor:** an academic advisor, **team member only** — kept out of the signatory/KYC chain.
- **Bus factor — actively de-risked:** two co-founders rather than a solo founder, on top of a
  fully open-source (MIT), source-verified, documented codebase whose tests + invariants make it
  legible to any successor. Continuity does not depend on any one person.
- **Eligibility facts recorded:** one co-founder is a **United Kingdom resident**; the other is
  based in **Baltimore, Maryland, United States on a work visa**. This records location/residency
  facts only; it does **not** assert U.S. citizenship or tax residency.
- **Current eligibility warning:** the current World Foundation Grants page says grants are not
  available to people or companies resident, located, incorporated, or represented by a
  registered agent in the United States or certain other restricted territories. That conflicts
  with an earlier developer announcement and must not be resolved by assumption.
- **Required before submission:** obtain written confirmation from the Foundation about whether
  and how this two-co-founder team may apply, then answer all citizenship, residence, tax,
  sanctions/export-control, KYC/AML, payout-recipient, and entity questions exactly as instructed.
  No particular signatory or payout structure is asserted as eligible in this draft.
- **Source links for the eligibility note:** [World Foundation Grants](https://world.org/grants),
  [World Dev Summer update](https://world.org/blog/developers/world-dev-summer-build-for-world-network-get-rewarded),
  and [World Foundation User Terms](https://world.org/legal/user-terms-and-conditions).
- **Open source:** MIT licensed; repository public at submission; all contracts source-verified.

## 12. Links & artifacts (one live artifact per claim)

> **Before submission, the demo entry points must not be empty** — the live-site, attack-demo,
> and repo links gate the "working demo" score and are independent of the capstone. The
> capstone / sponsored-gas / video rows may stay pending until the capstone run.

| Claim / item | Link |
|---|---|
| Live site (browser demo, no wallet) | [demothemis.netlify.app/app](https://demothemis.netlify.app/app) |
| Buy-this-verdict attack demo (sandbox) | [demothemis.netlify.app/sandbox](https://demothemis.netlify.app/sandbox) |
| Source repository (MIT) | [FreddyMertens/DemoThemis](https://github.com/FreddyMertens/DemoThemis) |
| Source-verified mainnet contracts | [worldscan.org](https://worldscan.org) — addresses in [README](../README.md#deployed-contracts) |
| On-chain World ID enforcement traces (Step 3.5) | [docs/DEMO.md](DEMO.md) |
| Sepolia scale cohort | [docs/DEMO.md](DEMO.md) |
| Three-seat / at-least-four-human capstone traces (registrations + resolved cases) | `«paste after the capstone run»` |
| Sponsored-gas trace | `«capture during the capstone»` |
| Demo video (3–4 min) | `«Loom / YouTube-unlisted — record during the capstone»` |
| Honest scope & roadmap | [docs/MECHANISM_DELTA.md](MECHANISM_DELTA.md) |
| Budget & milestones | [docs/GRANT_BUDGET.md](GRANT_BUDGET.md) |
| Differentiation scan | [docs/DIFFERENTIATION.md](DIFFERENTIATION.md) |

---

### Pre-submission checklist (the artifacts this copy promises)

- [ ] Confirm the live site, sandbox, and repository links still open from a signed-out browser.
- [ ] Run the three-seat mainnet capstone with at least four eligible humans → flip §5 status, fill the §12 capstone + sponsored-gas rows.
- [ ] Record + link the demo video (best filmed during the capstone).
- [ ] Obtain written eligibility guidance, then confirm citizenship, residence, tax,
      sanctions/export-control, KYC/AML, entity, signatory, and payout-recipient answers (§11).
- [ ] Fill every remaining `«...»`: legal names, team profiles, signatory, and payout wallet.
- [ ] Confirm the final third-party audit quote for M5 and the MACI library for M2 (GRANT_BUDGET.md).
