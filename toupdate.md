# To Update — DemoThemis design & copy notes

Working list of fixes and design changes from the review of the **juror quality-assurance (reputation) system** and its **economics**. Two parts:

- **Part 1** — Juror quality-assurance system (confidence gate, scoring, punishment levers).
- **Part 2** — Endogenous economics (no fixed values; parameters as relationships).

Legend: `[ ]` = action to take · *Finding* = rationale/analysis behind the action. Line numbers are approximate (at time of writing).

---

## Part 1 — Juror quality-assurance system

### 1.1 Copy/logic bug to fix first

- [ ] **Fix the suspension-trigger mislabel** in the parameters table of `hybrid-juror-system.html`.
  - Table (~line 477) says **`Suspension trigger | lower bound < 0.70`**.
  - But the prose (~line 349) says a juror is suspended only once *"the entire range of belief … the whole error bar, has sunk below the standard"*, and the widget JS (~lines 559–566) suspends only when **`ci.hi < 0.70`** (the *upper* bound).
  - `lower bound < 0.70` actually describes *leaving "Active"* (entering "building record"), **not** suspension. The reason column ("acts only on confident evidence") matches the upper-bound rule.
  - **Change** the setting cell to **`upper bound < 0.70`** (or "whole 95% interval < 0.70"). As written, the table understates how lenient the real rule is.

### 1.2 Finding — the thresholds are too lenient for *effort*, fine for *skill*

Settings reviewed: bar `0.70`, `z = 1.96` (95%), rolling window `50–150` cases.

- *Finding:* For **filtering low skill**, the settings are reasonable, even mildly conservative. Approx. cases-to-suspension (Wilson interval, observed = true skill):

  | True skill | Cases to suspension |
  |---|---|
  | 0.50 (coin) | ~20 |
  | 0.55 | ~38 |
  | 0.60 | ~85 |
  | 0.65 | **never** (150-case window caps CI half-width ≈ ±0.075) |
  | ≥0.70 | never (correct) |

- *Finding:* For **effort/shirking**, the gate is blind. Coherence is inflated by case base rates, so a low-effort juror who just votes the obvious answer can score ~0.80+ coherence on a lopsided docket and never trip the gate, keeping near-full weight.
- *Finding:* **Margin weighting makes this worse** — a shirker's confident agreement on lopsided cases is high-margin and heavily weighted, while their coin-flip noise on close cases is low-margin and lightly weighted. The mechanism meant to protect honest dissent inadvertently subsidizes the prior-voter.
- *Finding:* **Calibration is too thin per-juror to police individuals.** At 5–10% of a ≤150-case window that is ~8–15 known-answer cases; a Wilson interval on ~10 samples has half-width ±0.20–0.25 — far too wide to suspend on. Calibration is strong for **pool-wide drift**, weak for **individual effort**.
- *Equilibrium risk:* if shirking clears the bar and pays full fees for ~zero effort, low effort is a profitable deviation. Pushed to its limit the pool drifts to "everyone votes the prior" — accurate on easy cases that never needed a court, coin-flip on the contested ones that did.

### 1.3 Reference — the full control surface (6 lever families)

Punishment is one of six families. **Continuous levers (weight, draw, pay, rate-limit) do the real work; discrete suspension is the bluntest and most conformity-inducing.**

1. **Measurement** — M1 score baseline, M2 margin weight, M3 memory/window, M4 calibration share+blend, M5 confidence z, M6 newcomer prior.
2. **Influence** — I1 weight curve (log-odds), I2 weight cap, I3 probation weight.
3. **Selection** — S1 draw probability vs reputation, S2 panel size (7/15/31), S3 eligibility floor, S4 subcourts/topic routing.
4. **Punishment** — P1 threshold + bound, P2 duration/escalation (1wk→1mo→6mo), P3 forgiveness/decay rate, P4 rate-limit, P5 reputation-on-return.
5. **Economic** — E1 bond size, E2 slash fraction, E3 fee+split, E4 pay↔reputation coupling, E5 vindication bonus, E6 tiered bonds.
6. **Correction** — C1 appeal trigger, C2 appeal panel escalation, C3 rescoring depth, C4 optimistic window (2h).

Right tool per threat: low skill → I1+S1; shirking → M1+M4+E4; honest dissent → *protect* via E5/C1+M2; herding → M4+C1; bought/collusion → E1/E2 (truth-keyed)+anonymity+random panels; Sybil → personhood+earned rep+S1.

### 1.4 Prioritised changes (highest leverage first)

- [ ] **M1 — grade coherence *above the obvious-vote baseline*** so easy-case agreement no longer counts as skill (kills shirking at the source).
- [ ] **M4 — fold calibration performance into the reputation *score*, not just suspension**; consider raising the calibration share.
- [ ] **E4 — couple per-case pay to reputation/weight** so losing reputation cuts income; this lets suspension stay lenient (dissent-safe) while shirking becomes unprofitable.
- [ ] **E2 — key the bond slash to *truth*, not raw coherence** (see 2.x). Settle against post-appeal majority, refund on vindication, scale by margin.
- [ ] **P4 — add explicit rate-limiting** (cases/period) as a graduated penalty between full participation and suspension.
- [ ] **I1/S1 — steepen the weight and draw-rate gradient in the 0.60–0.70 band** so marginal jurors lose influence without needing suspension.
- [ ] **Consider split thresholds** — a lenient *suspension* bar (conformity protection) plus a stricter *full-weight* bar.
- [ ] **P3 — make the forgiveness/decay rate explicit** and match it to signal noise (noisier ⇒ forgive faster; contrite tit-for-tat beats grim trigger).

---

## Part 2 — Endogenous economics (no fixed values)

### 2.1 Principle

Fixed absolutes are a design smell. **Express every parameter as a relationship to the variable it must track, pinned to a few exogenous anchors, keyed only to inputs that are expensive to fake.** "Interdependent with the whole economy" is too vague — each value should track its *specific* driver, not everything at once.

### 2.2 Parameter → relationship

- [ ] **Replace the `$20` bond** in `juror-court.html` (~line 143) with **`bond = f(value at stake)`** + a plain-English explainer.
  - *Finding:* the bond must make corrupting a juror cost more than the payoff; the payoff scales with stake, so a flat `$20` is fine on a `$50` dispute and absurd on a `$5M` one.
  - **SUPERSEDED for the JUROR bond.** The final design keeps the juror bond **flat ($5)** on purpose. Its only job is the laziness floor; corrupting a juror is stopped by receipt-freeness + pool width + the permanent World-ID ban, not by bond size, and scaling it up *thins the pool* (the security parameter). This item now applies only to the **dispute/appeal bond** (the three floors, capture-odds × stake × 2) and the **assertion bond**, which are the value-scaled bonds. The juror bond stays flat.
- [ ] **Make the juror fee/wage a market-clearing price** in `zero-to-one.html` (the `$400/mo`, 70% split, ~lines 107–110) — a two-sided labor price (case demand vs juror supply), not a fixed figure. This is the "based on jury market demand" point.
- [ ] **Express slash/reward relative to bond + fee** (not absolute amounts).
- [ ] **Skill threshold** → relative to **pool skill distribution + panel size** (keep a juror while their marginal contribution to panel accuracy is positive), *not* market demand. The `0.70` is otherwise arbitrary.
- [ ] **Calibration share** → set by the detection power needed at target confidence vs case volume.
- [ ] **Window length** → set by how fast juror skill actually drifts (stationarity).
- *Already endogenous (keep/generalise):* panel size scales with stakes (7 → 15 → 31).

### 2.3 Three classes — what can and cannot float

1. **Economic/security** (bond, fee, slash) → float freely (market-clearing or stake-relative).
2. **Statistical** (threshold, z, window, calibration) → set by accuracy targets / pool distribution; *tuned against live data*; population-relative OK, **demand-relative not** OK.
3. **Structural rules** (one-human-one-vote, commit-reveal, leave-one-out scoring) → genuinely fixed. The constitution, not parameters.

### 2.4 Caveats to design for (where naive "everything floats" breaks)

- [ ] **Anchors (avoid circularity).** An all-relative web is underdetermined; ground it in two exogenous pegs: **value-at-stake** (from the dispute/market) and the **outside opportunity cost of a juror's time**.
- [ ] **Manipulation/reflexivity.** Float against quantities **expensive to fake** (escrowed disputed amount = real money). Never key off cheap-to-spoof metrics (reported volume, pool headcount) or an attacker can steer the parameter (e.g., Sybil-flood the pool to drag down a pool-relative skill bar; wash-trade volume to shrink the bond).
- [ ] **Predictability.** Each value should be a deterministic function of observable state **at commit time**, with rate-of-change caps, so jurors know bond/fee before acting and flash-manipulation can't whipsaw it.
- [ ] **Access.** Stake-scaled bonds can re-import the **wealth barrier** the court rejects; counter with sub-linear scaling, opt-in high-stakes tiers, or protocol-backed bonding.
- [ ] **Governance.** Compute the *function* from on-chain observables, **not** an admin — otherwise the magic number just moves into a multisig.

### 2.5 Copy changes

- [ ] Reframe **"Recommended parameters"** in `hybrid-juror-system.html` (~lines 466–483) as **"Recommended relationships"** — show each value as a function of its driver, not a constant.
- *Note:* the page already says parameters are *"meant to be tuned against live data rather than treated as fixed"* (~line 468) and pay *"scales with use"* (`zero-to-one.html` ~line 110) — build on this; the next step is to make the functions explicit.

---

## Part 3 — Cross-cutting / open decisions

- [ ] **Bond access vs security tension** — decide the bond-scaling curve (sub-linear? tiered pools? protocol bonding?) so stake-scaled bonds don't exclude small jurors.
- [ ] **Bond slash conformity risk** — the current rule ("vote against the majority → forfeit bond to the coherent") is keyed to *coherence*, i.e. it pays people to herd, in cash, every case. This is the strongest conformity pressure in the system and must be retrofitted with the vindication/calibration/margin protections.
- [ ] **Optional new content** — consider an objection callout near the confidence gate ("Wouldn't harsh punishment be optimal?") and a short "How strict should the gate be?" note capturing the shirker gap.
- [ ] **Decide where to surface the lever board** (Part 1.3) — a "The knobs, and what each does" section, or an interactive lever panel.

---

## Part 4 — Punishment, reward, and the money flow

Settled in the `victim-compensation.html` discussion. There is **no victim-compensation pool**. Every forfeited-money stream feeds one **reward pool** that pays the active, high-quality jurors. The freed fee slice funds it. Net direction: keep punishment (slash + permanent World-ID ban), drop victim payout, recycle the money into rewarding good jurors.

### 4.1 One reward pool, fed by every forfeiture, paid to good active jurors

- [ ] Replace the **insurance pool** everywhere with a **reward pool**. It pays jurors, never victims, and is fed by three streams:
  - the **20% fee slice** that used to fund insurance (split stays 70 / 20 / 10; the 20% is the reward pool now);
  - **slashed juror bonds** (no-reveal, wrong-side-of-lopsided, proven-collusion forfeits);
  - **forfeited dispute and appeal bonds** (a failed challenge or a failed climb up the ladder), which are stake-scaled and used to drain into insurance.
  - *Why not burn:* the system settles in **DAI**, so burning is pure deadweight loss. Burning only redistributes value through scarcity when a native token's supply shrinks, and there is no token here.
  - *Why a pool, not the winning panel:* paying the panel that won a vote is a `1/7`, verdict-coupled incentive to convict the dissenter. The reward pool is decoupled from any single verdict (gated on long-run quality, see 4.3), so it bends no vote.

### 4.2 Remove the victim-compensation function entirely

- [ ] No payout to bettors or parties harmed by a verdict. Retroactive justice = **slash + permanent World-ID ban** of proven colluders, whose forfeited bonds feed the reward pool. The "make victims whole" promise is gone.
  - *The actual attack (NOT juror capture):* the **data-control / manufactured-victim** attack. Control the ground truth and its timing, bet both sides, let the market settle honestly, then reveal the truth "changed" and claim the wronged side, with **honest jurors throughout**. Any pool that pays on a claim of harm is a honeypot this attack farms.
  - *No deterrence lost:* compensation never enters the attacker's expected value, so it deters nothing. Deterrence is prevention (cannot capture a verdict) + punishment (slash + ban).
  - *Defenses that close it:* no claimable pool + finality (settled markets never reopen for new evidence) + resolution criteria pinned to verifiable-by-deadline facts.
  - **KEEP, do not remove:** the **juror vindication** mechanism. A juror whose slash is overturned on appeal is refunded, with a bonus from the overturned majority's slashes. That is about jurors, not bettors, and it is anti-conformity. The sweep must not touch it.
  - *Doc status:* `victim-compensation.html` now has both diagrams (capture gauntlet + the manufactured-victim heist) and the redistribution diagram. Update its redistribution to the quality+recency model below.

### 4.3 The reward mechanism — quality bar + recency, self-sizing

- [ ] Pay the reward pool on a period (weekly/monthly), split among jurors who clear **two gates at once**:
  - **Quality:** above the existing **0.70 full-weight bar** (absolute, calibrated against settled answer keys). *Not a pool-relative median* — a median always excludes half regardless of true quality, doesn't track absolute quality, and is gameable by flooding bad jurors to drag it down.
  - **Recency / activity:** active in the window. Key it to **availability** (opted in, passing liveness when called), not realized draws, so a good juror who simply was not drawn is not punished by the random lottery.
  - *Why both gates — concentration:* spread across everyone who ever cleared the bar, the dividend is too small to motivate; gated to active above-bar jurors, the same dollars land on a small set and become meaningful per head. It also targets the security-relevant set (the active, high-quality pool that decides cases).
  - *Self-sizing:* per-head = pool ÷ eligible jurors, so as more clear the bar it dilutes toward each juror's opportunity cost, setting the equilibrium pool size at whatever fees support. As volume grows, the pool grows.
  - *Soft ramp at the bar* to avoid a hard cliff at 0.70 (threshold gaming).
  - *Early subsidy, if any, must be a published formula, never discretionary* — a company that can hand-tune juror pay has a lever over the bench (firewall).
  - *Real scaling lever is volume:* the prediction market manufactures fee-paying cases, so the pool grows with usage. Concentration + forfeiture streams + volume together make it bite.

### 4.4 Pages to sweep (relabel insurance → reward pool; remove victim payout; KEEP juror vindication)

- [ ] `governance.html` — invoice "20% insurance" → "20% reward pool"; widget note "funds the jurors and the insurance pool"; constitution row "slashes go to insurance: permanent" → "to the reward pool".
- [ ] `the-design.html` — pnode "slashes feed the insurance pool"; W3 widget label `#W3i` "Insurance pool" → "Reward pool"; note (~205) drop "pay the people their verdict hurt"; subsection h3 "The first cheater funds the victims" → funds the honest jurors; STEPS narration (slash → reward pool, no "victims paid").
- [ ] `juror-court.html` — bond section "an insurance pool that pays the victims of proven collusion, never to the winning jurors" → reward pool that pays active high-quality jurors, never the winning panel (KEEP the refund-on-vindication clause); life-of-a-seat node "slashes to the insurance pool".
- [ ] `hybrid-juror-system.html` — appeal "failed climb forfeits its bond to the insurance pool" → reward pool (KEEP the vindication-bonus line); justice-clock step "Victims paid from the insurance pool" → colluders slashed/banned, bonds feed the reward pool; **add a concise reward-pool paragraph** near the reputation dial (the quality + recency gate, funded by the 20% slice + forfeited bonds).
- [ ] `hybrid-juror-prediction-market-integration.html` — "the insurance pool exists to compensate proven wrongs" → drop the compensation framing; the safety is locality (the lie stays local), not a payout.
- [ ] `prediction-market.html` — fee-split budgetbar "20% insurance pool" → "20% reward pool".
- [ ] `compounding.html` — "the insurance pool that compensates proven wrongs" → reward pool that pays active high-quality jurors.
- [ ] `victim-compensation.html` — redistribution seg "All active jurors, evenly" → "Active jurors above the quality bar"; dek + closing prose "across the active jurors" → "across the active, high-quality jurors"; reflect the funding (20% slice + forfeited bonds).
- [ ] Orphaned review pages (`breaking/hardening/finishing/rebuilding-the-court.html`, `juror-reputation-system.html`) — **leave**; not in nav.

### 4.5 MVP impact (for the implementation plan)

- [ ] Rename `InsurancePool.sol` → `RewardPool.sol`; re-narrate it as accruing to reward jurors, not compensate victims. Contract logic is unchanged (a sink receiving slashes + the 20% slice). The **gated payout (quality + recency) stays out of MVP scope**, a v2 / funded-milestone feature like reputation and the ladder. The load-bearing rule "a majority earns nothing by convicting its dissenters" still holds, because the reward is decoupled from the per-case verdict.
