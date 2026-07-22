# Grant readiness — World Foundation application

**Verdict:** an unusually strong and unusually *honest* application that is **not yet
submittable** — the remaining gaps are the liveness-enabled replacement deployment, human
capstone, demo video, final vendor quote, and eligibility confirmation, **not application
structure**. The build
is genuinely real: 6 historical source-verified contracts live on World Chain mainnet,
including a clearly labeled v4 preview-verifier adapter with enforcement traces; the
replacement source uses the documented mainnet World ID Router, alongside the
comparative attack demo, 100 passing Foundry tests with Router-gate and exact-3/3 party-exclusion,
first-draw-unwind, and retry-recovery coverage, and a ~20-juror Sepolia
cohort. **One action — the three-seat capstone with at least four eligible humans — is the master key:** it moves
`jurorCount` off 0, flips the two most-scored axes from *partial* to *proven*, and
unblocks the video and the trace tables; the repository is already public.

*Live-verified 2026-07-14: mainnet `jurorCount()=0` and `caseCount()=0` (capstone has
never run) · repository public · live site 200 · legacy Portal configured · keeper
credential configured but execution paused until replacement · cohort ≈ 20 jurors.*

---

## Requirements vs. the published grant criteria

| Requirement | Status | The gap |
|---|---|---|
| Clear problem statement | ✅ strong | The problem is demonstrable in the attack demo and stated concisely in the application. |
| Working demo / prototype | ✅ real, **three holes** | Legacy deployment + source verification + sandbox + 3 real enforcement traces are real. Holes: the immutable legacy court lacks the two liveness fixes now in source; the three-seat / at-least-four-human replacement run has not executed; there is no demo video. |
| **Deep World ID usage** *(highest-scored)* | ⚠️ **partial** | Architecturally deep + historical preview evidence on the *negative* paths. But the affirmative proof — a **real human** verifying through the supported mainnet Router — doesn't exist yet; every trace to date is Simulator/**Staging preview**. The replacement capstone makes it proven. |
| Realistic milestones + timeline | ✅ complete | One milestone-gated **$50,000 / three-month** request funds M1–M6 through reviewed, integration-ready v1, with a bottom-up budget and acceptance artifact for every tranche. |
| Open source | ✅ **passed** | MIT LICENSE present, contracts source-verified, and [`FreddyMertens/DemoThemis`](https://github.com/FreddyMertens/DemoThemis) is public. |
| Sustainability | ✅ addressed | 70/20/10 fee economics are on-chain in valueless tokens (zero real revenue until launch). M4 publishes a versioned SDK and neutral reference integration so independent World Apps can submit questions or disputed deals without another court build phase. See GRANT_APPLICATION §10. |
| Eligibility — applicant location | ⚠️ written confirmation required | One co-founder is a UK resident; one is based in Baltimore, Maryland, United States on a work visa. The current grant-page disclaimer restricts U.S. residence/location, so the team must obtain Foundation guidance rather than assume a signatory or entity structure is eligible. |
| Eligibility — KYC / sanctions / payout | ⚠️ pending | Final status is not knowable from public docs alone. Each applicant must answer citizenship, tax residency, sanctions/export-control, KYC/AML, and grant-agreement questions directly; WLD/token payout remains geography- and compliance-dependent. |
| Honesty / labeling | ✅ a genuine strength | Consistent labeling everywhere. Only risk: the volume of disclaimers can *read* as "under-built" — a framing fix, not a failure. |

---

## What's left (the critical path)

**Owner key:** 🧑 you / demo-day · 🛠 buildable now · 🔀 either

1. **🧑 Run the three-seat mainnet capstone with at least four eligible humans** *(the gating deliverable — everything keys off it)*
   First deploy the recovery-enabled court and `WorldIDRouterGate` with `PANEL_SIZE = 3` and `MIN_POOL >= 4`, source-verify, allowlist, and cut it over. Then scan the Portal preview QR → register at least four Orb-verified humans through the documented mainnet Router → let the fixed-opener keeper complete official question one and confirm question two opens only afterward. Four supplies one pre-draw withdrawal reserve; three remains fund-safe only because the timeout can unwind instead of adjudicating. Follow only [`CAPSTONE_RUNBOOK.md`](CAPSTONE_RUNBOOK.md); the old Step-5 addresses and former manually opened question/escrow sequence are retired. Blockers: replacement deployment + Portal cutover + four verified humans and phones — not headless-runnable.
2. **🧑 Record + upload the demo video** (live question → real mainnet phone flow → permanent receipt → archived Step-3.5 reverts). Best filmed *during* the first official question so the Router-gated flow is real on camera. Highest persuasion-per-minute for a reviewer who won't install World App.
3. **🛠 Fill the DEMO.md Step-5 trace table** — paste the 3 registrations, official question transactions, juror actions, resolution, receipt, and question-two opening. (5-min edit; blocked only on #1.)
4. **✅ Public repository — DONE.** [`FreddyMertens/DemoThemis`](https://github.com/FreddyMertens/DemoThemis) is public; keep the final trace and video links current before submission.
5. **✅ Full production budget — DONE.** One $50,000 / three-month request funds M1–M6; each tranche has a verifiable acceptance artifact. Confirm the final M5 vendor quote before submission.
6. **✅ Differentiation scan + paragraph — DONE** ([`DIFFERENTIATION.md`](DIFFERENTIATION.md)). The 2026-06-20 scan of the World App catalog + every Wave 0/1 grant recipient confirmed **no World dispute-resolution/arbitration/escrow project exists** (closest = governance/voting), and that off-World courts (Kleros, UMA) are stake-weighted. The application-ready paragraph is written; drop it into the differentiation section.
7. **✅ Write the application copy — DONE.** The 12 sections request completion of DemoThemis itself and match the full funded roadmap.
8. **🧑 Obtain written eligibility guidance, then complete KYC.** Location facts are recorded, but the current U.S. restriction creates a threshold eligibility question. Keep the professor team-member-only.
9. **🛠 Add the "Live demo" link to the pitch site** (separate public repo) + **🛠 final link/QA sweep** (every cited URL resolves).

---

## What could be better (improvements, leverage-ranked)

1. **🔴 high — the 3-seat panel undercuts "truth isn't for sale."** The storyboard honestly notes the planned capstone panel's bribe floor is ~$6.50/juror → ~$13 to flip three seats; a skeptic can still connect the replacement demo to "$13 to flip." **Fix:** frame the 3-seat panel everywhere as a deliberate liveness/cost-demo size whose security property is *pool width* — a parameter sweep, **not** new research (the sandbox P(flip) curve shows the collapse). The claim becomes "the hard part (provable on-chain personhood) is shipped; scaling it is funded, not a research risk." Never let "$13 to flip" sit near "truth isn't for sale" without it.
2. **🔴 high — honesty protection in the README.** *(Applied)* "mainnet live" could read as "humans have used it" while `jurorCount=0`; softened to "deployed & wired; capstone pending."
3. **🔴 high — elevate the World-stack depth.** The strongest World-ID-specific assets (MiniKit walletAuth/SIWE, **sponsored gas**, Permit2 single-tap onboard, deep-link-to-case) are buried as caveats. During the capstone, capture a **sponsored-tx trace** and elevate the stack-depth list to a first-class application bullet — markedly deeper than "we call IDKit," on the highest-weighted axis.
4. **✅ sustainability — resolved.** M4 publishes a stable SDK and neutral reference integration for questions and disputed deals; the completed court can serve many independent World Apps rather than depending on one consumer. Fee volume supports the court after this one completion grant. See GRANT_APPLICATION §10 / GRANT_BUDGET "Sustainability".
5. **🟠 medium — reframe honesty from a wall of disclaimers into rigor.** Lead with **one** crisp "Real & on-chain vs Simulated/roadmap" table (stated once), then short-tag. Present `MECHANISM_DELTA` as "we know exactly what's left and priced it" (engineering maturity), not a confession list.
6. **🟢 low — surface execution credibility in the written feasibility section** (not the deck): report the release's measured test count and coverage, distinguish legacy source-verified bytecode from the replacement source, and state that no external audit is claimed — a security review is funded-milestone #5. Pre-empts "is this audited?" honestly.

---

## Do next, in order

1. **Run the capstone** (then immediately fill the trace table). It's the master key — it makes `jurorCount` non-zero and flips *Deep World ID usage* and *Working demo* from partial to proven.
2. **Record + link the video; update the public repo's evidence links** — gives the browser-only reviewer the most persuasive artifact and keeps the open-source proof current.
3. **In parallel (capstone-independent):** obtain written Foundation eligibility guidance,
   confirm the M5 review quote and M2 library, and complete the final citizenship, residence,
   tax, sanctions/export-control, KYC, entity, signatory, and payout-recipient details.
