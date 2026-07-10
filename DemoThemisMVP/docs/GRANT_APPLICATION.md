# DemoThemis — World Foundation Spark Track application

## 1. Summary

**DemoThemis is a decentralized arbitration court where every juror seat is gated by World ID
4.0 verified _on-chain_ — the real Groth16 proof is checked inside the registration
transaction, and a reused human reverts. One verified human, one juror seat; not one dollar,
one vote. The court is deployed and source-verified on World Chain mainnet — the live 3-human capstone is the last step.** It is, to our
knowledge, the first dispute-resolution Mini App in World App, and the first arbitration court
to seat its jurors by personhood rather than capital (dated 2026-06-20 scan — see §6).

## 2. The problem

Every marketplace, P2P trade, freelance deal, and prediction market needs a way to settle
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
**World ID 4.0 on-chain** (the Groth16 proof is checked inside the registration transaction)
and posting a small bond; the sybil gate gives **one human one seat on every wallet**. For each
case a panel is drawn **at random, after** the question is fixed — so an attacker cannot know
or choose who will sit on it. Jurors vote and the majority decides, with the fee split and the
settlement enforced atomically on-chain. Because seats are random verified people, not coins,
there is no panel to buy: to land a bribed majority on a specific case you must pre-corrupt a
near-majority of the **entire human pool** and merely hope the draw seats enough of them — for
only a *probability*, not certainty. Cost-to-capture therefore scales with **pool width**
(fraction needed × pool size × bribe-per-human), and because every case re-draws a fresh
random panel, **nothing carries over — you pay the whole pool-corruption cost again, per
case**, while high-value cases add parallel panels and appeals that raise the bar further (§7).
Unlike out-staking a stake-weighted oracle once and deciding every case for free, influence
here is not targetable, not reusable, and does not amortize.

Two case types ship today: an **escrow dispute** (fund a deal, raise a dispute, the court
decides who gets paid, settlement is atomic) and a **yes/no question** (the neutral resolver
surface). Three surfaces, one Next.js app: the **World App Mini App** (the live juror flow), a
**pure-browser sandbox** that simulates the full mechanism (so a reviewer needs no wallet), and
a read-only **scale cohort**.

The yes/no question type is the neutral resolver surface. Any World App, escrow flow,
marketplace, DAO, or data product can route an objective question to the court and receive a
personhood-resolved on-chain answer. **M4 funds the resolution SDK and the first neutral yes/no
pilot integration** to start the case-flow flywheel. If a prediction-style product later consumes
that resolver, it is a separate consumer of the court, not the grant-funded product.

> **Honest scope note (carried through this application):** the live mainnet instance runs a
> **3-seat panel drawn from a 3-juror pool (3/3)** — chosen to prove the full flow cheaply. With
> 3 jurors and 3 seats, every juror is always on the panel, so the random draw isn't doing real
> work yet: which jurors get drawn only starts to matter once the pool is larger than the panel
> (the M3b milestone widens the pool; the M1 VRF upgrade then hardens the randomness). The real
> capture-resistance — where flipping a verdict costs more as the pool grows, across parallel
> panels — is funded roadmap, not the shipped 3/3 demo. We say this up front rather than let a
> reviewer find it in the contract.

## 4. Why World — deep, on-chain World ID usage *(the core of the application)*

This is not "we call IDKit." World ID is the **load-bearing primitive of the mechanism**, used
on-chain and across the stack:

- **On-chain World ID 4.0.** `WorldIDVerifier.verify` runs the **real Groth16 check inside the
  registration transaction**, not as a cloud callback. Personhood is enforced by the chain.
- **Sybil gate.** The identity-derived nullifier gives one human one seat; a reused human
  **reverts on-chain**. This is what makes "one human, one vote" real.
- **Wallet-bound proofs.** The proof is bound to the registering wallet (`signalHash`
  recomputed on-chain), so a **stolen or replayed proof reverts** before the check.
- **MiniKit walletAuth (SIWE)** for the juror session; **Permit2 single-tap onboard** (verify +
  faucet + bond in one sponsored batch, because World App auto-revokes plain ERC-20 approvals);
  **sponsored gas** so verified humans pay nothing; **deep-link** straight to a case.
- **Open, permissionless onboarding.** Any Orb- or Device-verified human can juror — no wealth
  gate, no exam — so the bench scales to capable people anywhere, not just the well-capitalized
  (World's inclusion mission, applied to *who gets to judge*; juror quality-scoring is funded M3b).

World ID isn't a login here — it gates juror eligibility by personhood, not
capital. That is why we lead with it: the grant's most-valued axis is the project's
central mechanism, not a feature.

## 5. Working demo — what's real on-chain vs. what's roadmap

The MVP is **deployed and source-verified on World Chain mainnet today** (the live 3-human
capstone is the last step), built solo at the founder's expense. One honesty rule: **simulated data is labeled simulated, everywhere.**

| ✅ Real & on-chain today (mainnet, source-verified) | ◷ Roadmap (funded milestone) |
|---|---|
| World ID 4.0 verified **in the transaction** (real Groth16) | VRF/drand draw randomness — M1 |
| **Nullifier sybil gate** (one human, one seat) | Receipt-free MACI-style ballots — M2 |
| **Wallet-bound** proof (a stolen proof reverts) | Appeal ladder (7→15→31) + parallel pᴺ panels — M3b |
| Random two-step panel draw, **after** the question (exhaustive at the 3/3 demo size) | Juror reputation / Wilson gate — M3b |
| Commit/reveal voting *(receipt-ful — see §7)* | Reward-pool cyclic payout — M3a |
| 70/20/10 fee split + 2% escrow fee; **slash-to-pool, never to winners** | Optimistic fast path (~95% settle free) — M3a |
| **Atomic** escrow settlement | Resolution SDK + first neutral yes/no pilot integration — M4 |
| **No admin override**: no upgrade, no pause, no fund-extraction path, no override of any in-flight case | Independent security review — M5 |
| 6 source-verified contracts · 77 Foundry tests · **97.2% line / 93.7% statement coverage** (measured) · invariants + fuzz | |

**Status — one step remains.** On-chain World ID enforcement is **proven** by three Step-3.5
explorer traces (a valid registration, a forged-proof revert, a duplicate-human revert), using
World ID **Simulator/Staging** identities so the path is shown human-free for cents. The
capstone-ready **Production**-verifier instance is deployed and source-verified; the **3-human
mainnet capstone** — scheduled within the application window — is the last step, and everything
it depends on is already live. It is also **juror user-test #0**, the first run of the real
onboard → commit → reveal → payout loop with verified humans, which the funded **M6** milestone
then scales into moderated rounds. Until the capstone runs, `jurorCount() == 0`, stated plainly.

One residual assumption, disclosed: the gate relies on the verifier **reverting** (not
returning false) on a forged proof. This is empirically confirmed on the Staging verifier; the
equivalent **Production**-verifier forged-proof revert trace is a named **M1** acceptance
artifact, captured at the capstone.

**For the reviewer in 60 seconds** (no wallet needed): watch the *buy-this-verdict* attack demo
(a token court flips to the lie; the human court holds) → click through to the source-verified
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

- **The live ballot is receipt-_ful_.** Commit/reveal lets a juror reveal their vote — and the
  secret salt that hid it — to *prove* how they voted, so the **live MVP is vote-buyable in principle** — on the degenerate 3/3 panel (where the pool *is* the panel) a briber
  needs only the two known jurors and can verify compliance. At scale the personhood gate changes
  the attack entirely: because the panel is drawn at random after the question, there is no known
  set to buy, so a briber must pre-corrupt a near-majority of the **whole pool**, per case, for
  only a chance — and **receipt-free MACI-style
  ballots (M2)** remove even their ability to *verify* that corruption paid off. The court is un-buyable only with
  **both** — which is why M2 is the single highest-priority mechanism upgrade after the live
  court is hardened.
- **Capture-resistance scales with pool width, case volume, and the stakes — and that is roadmap, not the 3/3 demo.** Because the panel is drawn at random after the question, an attacker can't target it; to even attempt a flip they must pre-corrupt a near-majority of the whole pool and hope the draw cooperates. So the price tracks **pool width × case volume × value-at-stake**, never a flat panel bribe: widen the pool and a fixed budget's flip-probability collapses (in the sandbox, bribing ~19.2% of a 200k pool buys only a ~2.91% chance to flip a single panel); raise the stakes and several **independent parallel panels must all agree**, so odds multiply pᴺ — the chance of flipping collapses from ~1/5 to 1/125 to 1/3000 as panels go 1→3→5 (M3b) — while any captured panel is **appealed into a larger one (7→15→31)**, forcing re-capture at higher cost; and because every case re-draws, **none of it amortizes — the attacker pays again, per case**. The live 3-seat instance is a
  liveness/cost demo (where, by design, a small bribe flips the toy panel); it is **not** this
  security regime. The hard part — provable, sybil-resistant on-chain personhood at the juror
  draw — is **shipped**; widening it is funded engineering, not new research.
- **No admin override — an affirmative trust asset, verifiable from the source-verified
  bytecode.** No upgradeability, no pause, no fund-extraction path, no override of any in-flight
  case. The entire admin surface is `setEscrow`/`setCourt` (one-shot wiring, revert if already
  set) and a deployer phase-clock (`setDurations`, affecting only cases opened afterward).
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
- **Open edges, named (the honesty rule applied to attacks).** Two we don't yet close: *ambiguous
  questions* — today a tie or no-quorum resolves to status quo (question NO / escrow refunds the
  payer), so a genuinely unanswerable question defaults to NO; an explicit **Invalid/void
  outcome**, flagged when independent parallel panels split on a truly ambiguous question, is
  funded roadmap (M3). And *credential rental* — a verified human can rent their seat; the
  per-draw liveness check that closes it is out of MVP scope. We surface both rather than let a
  reviewer find them.

## 8. Traction & technical credibility

The MVP was **shipped solo by the founder in ~1 month** — the funded roadmap is delivered by
both co-founders in parallel (§9, §11) — to a standard meant to survive scrutiny:

- **6 source-verified contracts on World Chain mainnet** (5 core + the World ID gate; chain
  480, real Production World ID 4.0 verifier) + a **~20-juror Sepolia cohort** with resolved
  cases (scale/history demo).
- **77 Foundry tests** with real system invariants (token conservation, registry solvency,
  bonded-juror) plus fuzz; **97.2% line / 93.7% statement coverage** (measured via `forge
  coverage`, not asserted).
- **No external audit is claimed anywhere** — an independent security review is funded
  **milestone M5**, in the requested Spark tranche.
- The MVP went through an adversarial pre-submission review; the correctness items it surfaced
  (escrow timeout/refund, partial-slash guard, a Production-verifier forged-proof pre-check) are
  folded into **M1** rather than papered over.

## 9. Milestones, timeline & budget

The requested Spark grant funds the path from honest single-panel demo to a **hardened,
randomness-backed, independently-reviewed** live court with the first real human on-chain. The
larger mechanism build is pre-scoped as a Scale-track follow-on, unlocked by that live usage.
Every tranche releases only on a verifiable acceptance artifact; **no upfront tranche**,
clawback-compatible. Delivered by **two co-founders in parallel** (same person-effort, half the
calendar — Spark in ~1 month, the full roadmap in ~3), and **priced lean and capped at
US$50,000**, below comparable mainnet-protocol grants. AI makes development the cheap
part, so the weight is shifted into the human-intensive work it doesn't cheapen: the roadmap
**ends with juror UX + moderated user-testing (M6, the largest line)** — because whether
real humans complete the onboard → commit → *return-to-reveal* loop is the court's highest-risk
surface (a no-show forfeits a bond and can deadlock a panel) and is exactly what World rewards:
real usage.

**Spark grant requested — US$14,000 (~1 month):**

| # | Milestone | Acceptance artifact | Cost |
|---|---|---|---|
| M1 | VRF/drand randomness + correctness hardening + Production-verifier forged-proof pre-check | verified randomness contract + draw trace; expanded tests; the forged-proof revert trace | $4,000 |
| M5 | Independent security review of the live court | published report; criticals/highs resolved | $10,000 |

**Pre-scoped Scale follow-on — US$36,000 (Months 2–3):** M2 receipt-free ballots ($8k) ·
M3a optimistic path + reward payout ($4k) · M3b reputation + appeal ladder + parallel panels
($6k) · M4 resolution SDK + first neutral yes/no pilot integration ($5k) · **M6 juror UX
hardening + moderated user-testing ($13k) — the largest line, final step.** **Full roadmap:
US$50,000, ~3 months.**

Full bottom-up pricing, effort estimates, acceptance criteria, the timeline, the WLD payout
mapping, and unit economics: **[docs/GRANT_BUDGET.md](GRANT_BUDGET.md)**.

## 10. Sustainability & go-to-market

DemoThemis stays what §1 calls it — a **personhood-gated arbitration court** — and this section is about how that court goes from empty to self-sustaining. Two fees are built in already: a **2% escrow fee** (retained only when a deal is disputed; refunded on a clean release) and a **flat 2 MUSD per-question case fee** — two distinct mechanisms, both split 70/20/10 (jurors / reward pool / protocol) on-chain today, in **valueless test tokens, so there is no real fee revenue yet** (`jurorCount() == 0` until the capstone). The meter exists; what it lacks is a **first source of repeatable cases** to turn on.

A juror court is a **two-sided system**: it needs verified jurors *and* a steady stream of cases,
and it is useless empty. The cold-start plan therefore starts with the broadest grant-safe
surface: a **resolution SDK** that lets any World App consumer route a yes/no question to the
court, plus one controlled pilot integration that proves the path end to end. Escrow disputes
remain the headline application, but they are naturally sparse; repeatable yes/no resolutions
give the court enough case flow to train jurors, show earnings, and build public history.

The pilot is deliberately framed as a **consumer of the resolver**, not as the grant deliverable.
The grant builds neutral infrastructure: open SDK, documented API, source-verified settlement
path, and explorer-traced outcomes. DemoThemis takes no bet, sets no odds, holds no stake, and
does not require any reviewer to approve a market product in order to approve the court.
Prediction-style products are one possible high-volume consumer because they need objective
answers, but the same SDK serves escrow, marketplaces, DAO decisions, service-level disputes,
and any World App flow that needs a credibly neutral yes/no result.

That case flow compounds in two ways. First, every cleanly-settled case becomes a public answer
record that can grade jurors against reality; the same volume that funds the bench also calibrates
it (the §7 reputation scoring, live in the /sandbox demo). Second, the SDK makes adoption modular:
external apps do not need to build their own dispute desk, juror pool, World ID proof path, or
settlement contracts. They can call the court and inherit the public resolution history.

So the sustainability claim is simple: **fee volume, not a follow-on grant, is the path to
self-sustaining**. The 2% disputed-escrow fee and flat per-question fee are already modeled
on-chain in valueless tokens; M4 turns the question side into reusable infrastructure, and M6
tests whether real verified humans reliably complete the juror loop that earns those fees.

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
- **What is 100% certain from current public materials:** the current World Foundation Grants page
  lists Spark Track for small teams/early founders building Mini Apps, and World's June 2026
  developer update says the Mini App Grants Program is **"now open to United States builders"**.
  Therefore U.S. location is not presented here as an automatic application disqualifier.
- **What is also 100% certain from current legal terms:** applicants still need to satisfy
  sanctions/export-control restrictions, KYC/AML, tax, and lawful-use obligations; certain
  Worldcoin Grant features may not be available to New York residents/entities. Baltimore,
  Maryland is not New York.
- **What is not 100% certain from public sources:** whether any particular work-visa resident can
  personally receive WLD, whether the Foundation prefers a specific payee/signatory structure, and
  whether any grant-agreement-specific restriction changes the payout route. Final eligibility
  depends on KYC, sanctions screening, applicant citizenship/tax-residency answers, WLD/token
  availability, and the signed grant agreement.
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
| Live site (browser demo, no wallet) | `«https://… production URL — fill before submission»` |
| Buy-this-verdict attack demo (sandbox) | `«/sandbox on the live site — fill before submission»` |
| Source repository (MIT) | `«https://github.com/… — public at submission»` |
| Source-verified mainnet contracts | [worldscan.org](https://worldscan.org) — addresses in [README](../README.md#deployed-contracts) |
| On-chain World ID enforcement traces (Step 3.5) | [docs/DEMO.md](DEMO.md) |
| Sepolia scale cohort | [docs/DEMO.md](DEMO.md) |
| 3-human capstone traces (registrations + resolved cases) | `«paste after the capstone run»` |
| Sponsored-gas trace | `«capture during the capstone»` |
| Demo video (3–4 min) | `«Loom / YouTube-unlisted — record during the capstone»` |
| Honest scope & roadmap | [docs/MECHANISM_DELTA.md](MECHANISM_DELTA.md) |
| Budget & milestones | [docs/GRANT_BUDGET.md](GRANT_BUDGET.md) |
| Differentiation scan | [docs/DIFFERENTIATION.md](DIFFERENTIATION.md) |

---

### Pre-submission checklist (the artifacts this copy promises)

- [ ] Fill the demo entry points in §12 (live site, attack demo, repo) — **independent of the
      capstone; do these first.**
- [ ] Run the 3-human mainnet capstone → flip §5 status, fill the §12 capstone + sponsored-gas rows.
- [ ] Record + link the demo video (best filmed during the capstone).
- [ ] Flip the repo public (after the capstone traces land; pre-scan for secrets first).
- [ ] Confirm final citizenship, tax-residency, sanctions/export-control, KYC/AML, and payout-recipient answers for both co-founders (§11); do not use the old "non-US" shortcut.
- [ ] Fill every `«...»`: applicant name, production URL, repo URL, payout wallet.
- [ ] Confirm the final third-party audit quote for M5 and the MACI library for M2 (GRANT_BUDGET.md).
