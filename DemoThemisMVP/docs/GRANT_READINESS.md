# Grant readiness — World Spark Track

**Verdict:** an unusually strong and unusually *honest* application that is **not yet
submittable** — but the gap is execution and writing, **not engineering**. The build
is genuinely real: 6 source-verified contracts live on World Chain mainnet, an
on-chain World ID 4.0 sybil gate with self-evidencing enforcement traces, the
comparative attack demo, 77 Foundry tests (>90% coverage), and a ~20-juror Sepolia
cohort. **One action — the 3-human capstone — is the master key:** it moves
`jurorCount` off 0, flips the two most-scored axes from *partial* to *proven*, and
unblocks the video, the trace tables, and going public.

*Live-verified 2026-06-20: mainnet `jurorCount()=0` and `caseCount()=0` (capstone has
never run) · repo `isPrivate=true` · live site 200 · cohort ≈ 20 jurors.*

---

## Requirements vs. the Spark rubric

| Requirement | Status | The gap |
|---|---|---|
| Clear problem statement | ✅ strong (copy unwritten) | The problem is demonstrable (the attack demo), but the one-paragraph application framing isn't finalized. |
| Working demo / prototype | ✅ real, **two holes** | Live + source-verified + sandbox + 3 real enforcement traces. Holes: the 3-human mainnet run hasn't executed (`jurorCount=0`); no demo video. |
| **Deep World ID usage** *(highest-scored)* | ⚠️ **partial** | Architecturally deep + self-evidencing on the *negative* paths. But the affirmative proof — a **real human** verifying through the **Production** verifier — doesn't exist yet; every trace to date is Simulator/**Staging**. The capstone makes it *proven*. |
| Realistic milestones + timeline | ⚠️ partial | A coherent 5-item roadmap exists, but it's **unpriced** (no USD) and **untimed** (ordering only). Not yet a fundable plan. |
| Open source | ⚠️ **fails today** | MIT LICENSE present + contracts source-verified, but the repo is **PRIVATE** — a reviewer hits a 404. Must flip public before submission. |
| Sustainability | ✅ addressed | 70/20/10 fee economics on-chain (zero real revenue until the capstone). GTM resolved: a **first-party prediction market resolved by the personhood court** is the cold-start demand seed; the grant funds the **neutral resolver**, the market is a separate product (stakes/licensing out of scope). Circularity defused — demand is external/proven (Polymarket ~$26B in Q1 2026), the SDK is open to all consumers. See GRANT_APPLICATION §10. |
| Eligibility — applicant location | ✅ recorded / ⚠️ final KYC pending | Known facts: one co-founder is a UK resident; one is based in Baltimore, Maryland, United States on a work visa. Current public World Mini App Grants materials say the program is open to United States builders, so U.S. location is not treated as an automatic application blocker. |
| Eligibility — KYC / sanctions / payout | ⚠️ pending | Final status is not knowable from public docs alone. Each applicant must answer citizenship, tax residency, sanctions/export-control, KYC/AML, and grant-agreement questions directly; WLD/token payout remains geography- and compliance-dependent. |
| Honesty / labeling | ✅ a genuine strength | Consistent labeling everywhere. Only risk: the volume of disclaimers can *read* as "under-built" — a framing fix, not a failure. |

---

## What's left (the critical path)

**Owner key:** 🧑 you / demo-day · 🛠 buildable now · 🔀 either

1. **🧑 Run the 3-human mainnet capstone** *(the gating deliverable — everything keys off it)*
   Smoke-test by self-registering as juror #1 (Portal preview QR) → `capstone-mainnet.sh durations 600 600` → 3 humans register (Production verifier, in-tx) → run the question case → run the escrow case. Tooling is fully built (`scripts/capstone-mainnet.sh`, `docs/CAPSTONE_RUNBOOK.md`). Blocker: 3 verified humans + phones — not headless-runnable.
2. **🧑 Record + upload the demo video** (attack-demo hook → real mainnet phone flow → Step-3.5 reverts). Best filmed *during* the capstone so the Production-verifier flow is real on camera. Highest persuasion-per-minute for a reviewer who won't install World App.
3. **🛠 Fill the DEMO.md Step-5 trace table** — paste the 3 registration + 2 case tx links. (5-min edit; blocked only on #1.)
4. **🔀 Flip the repo public** — `gh repo edit FreddyMertens/DemoThemisMVP --visibility public`. Sequenced after #1–#2 so a cold reviewer sees real traces, not a "pending" table — but **must** flip before submission.
5. **🛠 Price the 5 milestones in USD** *(independent of the capstone — start now)*. Method: effort-weeks × blended rate + pass-throughs; milestone 5 (security review) priced as a third-party audit quote, not labor; milestone 3 carries the largest band; map onto the no-upfront-tranche / installment reality.
6. **✅ Differentiation scan + paragraph — DONE** ([`DIFFERENTIATION.md`](DIFFERENTIATION.md)). The 2026-06-20 scan of the World App catalog + every Wave 0/1 grant recipient confirmed **no World dispute-resolution/arbitration/escrow project exists** (closest = governance/voting), and that off-World courts (Kleros, UMA) are stake-weighted. The application-ready paragraph is written; drop it into the differentiation section.
7. **🛠 Write the application copy** (~12 sections; lead with the World ID axis; source the honesty/scope section verbatim from `MECHANISM_DELTA.md` so demo + application tell one story; link an artifact per claim using the §10 table).
8. **🧑 Confirm citizenship/tax residency + complete KYC** — location facts are recorded, but final eligibility/payout is still a KYC/grant-agreement gate. Keep the professor team-member-only.
9. **🛠 Add the "Live demo" link to the pitch site** (separate public repo) + **🛠 final link/QA sweep** (every cited URL resolves).

---

## What could be better (improvements, leverage-ranked)

1. **🔴 high — the 3-seat panel undercuts "truth isn't for sale."** The storyboard honestly notes the live court's bribe floor is ~$6.50/juror → ~$13 to flip a 3-seat panel; a skeptic connects "live court" to "$13 to flip." **Fix:** frame the 3-seat panel everywhere as a deliberate liveness/cost-demo size whose security property is *pool width* — a parameter sweep, **not** new research (the sandbox P(flip) curve shows the collapse). The claim becomes "the hard part (provable on-chain personhood) is shipped; scaling it is funded, not a research risk." Never let "$13 to flip" sit near "truth isn't for sale" without it.
2. **🔴 high — honesty protection in the README.** *(Applied)* "mainnet live" could read as "humans have used it" while `jurorCount=0`; softened to "deployed & wired; capstone pending."
3. **🔴 high — elevate the World-stack depth.** The strongest World-ID-specific assets (MiniKit walletAuth/SIWE, **sponsored gas**, Permit2 single-tap onboard, deep-link-to-case) are buried as caveats. During the capstone, capture a **sponsored-tx trace** and elevate the stack-depth list to a first-class application bullet — markedly deeper than "we call IDKit," on the highest-weighted axis.
4. **✅ sustainability — resolved.** GTM decided: the cold-start demand seed is a **first-party prediction market resolved by the personhood court** (Polymarket-scale demand, settled one-human-one-vote instead of by UMA's token vote); the grant funds the **neutral resolver / SDK**, the market is a separate product (its stakes/licensing out of grant scope). Escrow/marketplace flows are a **later** consumer of the same SDK. Circularity defused via external proven demand + an open SDK. See GRANT_APPLICATION §10 / GRANT_BUDGET "Sustainability".
5. **🟠 medium — reframe honesty from a wall of disclaimers into rigor.** Lead with **one** crisp "Real & on-chain vs Simulated/roadmap" table (stated once), then short-tag. Present `MECHANISM_DELTA` as "we know exactly what's left and priced it" (engineering maturity), not a confession list.
6. **🟢 low — surface execution credibility in the written feasibility section** (not the deck): "5 contracts, 77 Foundry tests incl. invariants + fuzz, >90% coverage, all sources verified; no external audit is claimed — a security review is funded-milestone #5." Pre-empts "is this audited?" honestly.

---

## Do next, in order

1. **Run the capstone** (then immediately fill the trace table). It's the master key — it makes `jurorCount` non-zero and flips *Deep World ID usage* and *Working demo* from partial to proven.
2. **Record + link the video; flip the repo public** — clears the open-source row and gives the browser-only reviewer the most persuasive artifact.
3. **In parallel (capstone-independent):** price the 5 milestones, run the catalog/RFP scan + write the differentiation paragraph, then draft the application copy. Also confirm citizenship/tax residency, sanctions/export-control status, KYC, and payout-recipient details — these remain final eligibility gates regardless of merit.
