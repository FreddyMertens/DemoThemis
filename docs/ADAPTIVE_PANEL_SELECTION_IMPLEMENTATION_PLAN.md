# Adaptive Panel Selection Upgrade Plan

**Status:** Implemented in the complete-product chapter and reference attack lab; live MVP and run-through unchanged  
**Targets:** `break-the-court.html`, `demothemis.html`, shared panel-policy code, and validation  
**Companion review:** [`adaptive-panel-sizing-review.html`](../adaptive-panel-sizing-review.html)

## 1. Goal

Replace the current rule:

> case value → fixed 7 / 15 / 31 / parallel-panel tier

with a deterministic policy:

> locked exposure + conservative eligible cohort + published attack envelope → test legal configurations → select the first configuration that satisfies security, quality, liveness, capacity, and fee constraints

The requester never chooses the court's protection. Manual panel controls may exist only as clearly labelled Break the Court experiments.

## 2. Scope boundary

### Included

- A shared, versioned adaptive panel-policy engine.
- Exact finite-pool capture calculations for single and disjoint parallel panels.
- Automatic configuration selection and experimental overrides in Break the Court.
- Rewriting the DemoThemis panel, ceiling, and appeal sections around the adaptive policy.
- Model, smoke, build, accessibility, and cross-page consistency tests.

### Explicitly excluded

- `run-through.html` and `assets/run-through.*`.
- The live three-seat MVP, static MVP preview, contracts, World ID integration, and deployed behavior.
- OmenMarketMaker settlement, resolution-bond economics, governance, bootstrap, or grant artifacts.
- Mainnet implementation. This plan upgrades the complete-product explanation and reference model only.

The run-through's $118,000 seven-seat example remains unchanged. It is a frozen narrative example and will be checked against the reference policy only as a regression fixture.

## 3. Reference v2 calibration used by the implementation

No adaptive UI should ship until one immutable policy version contains all of the following.

| Decision | Recommended direction | Must be finalized |
|---|---|---|
| Legal configurations | `7 → 15 → 31 → 3×31 → 5×31` | Implemented |
| Parallel decision rule | 2-of-3 and 3-of-5 panel majorities; escalate exceptional splits | Implemented |
| Absolute capture ceiling | Provisional 1% ceiling | Implemented |
| Expected corrupted-value budget | Provisional `Lmax = $100`; require `V × Pcontrol ≤ Lmax` | Implemented |
| Quality floor | Provisional correct-ruling floor of 90% | Implemented |
| Liveness floor | Provisional panel-formation target of 99.9% | Implemented |
| Standby capacity | At least 20% or two seats, increased until the formation target is met | Implemented |
| Threat envelope | Provisional 25% attacker selection weight, 5% no-shows, and 2% shared-error rate | Implemented |
| Exposure definition | Maximum locked value a wrong ruling can redirect across linked backing and escrow | Implemented |
| Failure behavior | `SECURE_PANEL_UNAVAILABLE`; no fee consumption, draw, or unsafe fallback | Implemented |

External positions that cannot be measured are outside the guarantee. Economically linked on-protocol claims must be aggregated so one exposure cannot be split into many apparently small cases.

## 4. Target policy

### 4.1 Versioned candidates

Create `assets/panel-policy.js` with immutable candidate records:

```text
p7       = 1 panel  ×  7 seats; 1 panel required
p15      = 1 panel  × 15 seats; 1 panel required
p31      = 1 panel  × 31 seats; 1 panel required
p31x3    = 3 panels × 31 seats; 2 panels required
p31x5    = 5 panels × 31 seats; 3 panels required
```

The retired fixed-threshold adapter is removed; both public consumers load the adaptive policy directly.

### 4.2 Frozen inputs

Before funding or future randomness, freeze:

- `V`: maximum linked economic exposure from locked backing or a precommitted liability cap.
- Policy and threat-envelope version.
- A lagged, finalized eligibility epoch.
- Candidate-specific cohort roots after maturity, qualification, party/conflict exclusions, and every juror previously used in the dispute.
- Capacity and standby reservation.
- The selected configuration, deterministic fee, and case fingerprint.

New accounts cannot join an existing dispute. Unsolicited token dust must not let an attacker exclude jurors as alleged parties. Governance changes affect future cases only.

### 4.3 Risk calculation

For each candidate `C`, derive a conservative cohort `N_C`. A 31-seat candidate uses the qualified senior cohort, not the global juror count. Attacker capacity is an upper bound on **selection weight inside that cohort**, including the 3× reputation-weight cap—not merely a headcount.

For each published scenario `θ`, calculate capture under sampling without replacement. Single-panel probability uses the exact hypergeometric tail. Disjoint parallel panels use a sequential dynamic program implementing the actual 2-of-3 or 3-of-5 rule. Do not use `singlePanelProbability ^ panelCount`.

```text
riskLimit(V) = min(0.01, Lmax / V)
worstCapture(C) = max over θ of Pcontrol(C | θ)
```

A candidate passes only when all checks pass independently:

```text
worstCapture(C) ≤ riskLimit(V)
modeled correct-ruling probability ≥ Qmin
modeled formation/quorum/finality probability ≥ Fmin
N_C ≥ total seats + deterministic standbys
required fee is fully fundable within the published fee policy
bribery, rental, lazy-voting, and delay protections remain inside their limits
```

Select the first passing configuration in the published order. If none passes, return a structured `SECURE_PANEL_UNAVAILABLE` result. Never default invalid or missing inputs to seven seats, and never silently use 5×31 when it still fails.

### 4.4 Candidate-specific supply and fees

Every candidate needs its own workload, compensation, quality, and capacity evaluation because total seats alter demand. The security-critical cohort comes from the frozen conservative epoch; projected fee-driven retention may disqualify a candidate but may not inflate its security score. This avoids a circular claim that a larger fee will create the jurors needed to justify itself.

## 5. Implementation phases

### Phase 1 — add the inert policy engine

**Files**

- Add `assets/panel-policy.js`.
- Add it to `tools/build-site.js`.
- Add `tools/validate-panel-policy.js`.
- Validate the engine before migrating either public consumer (completed before the consumer switch).

**Policy API**

- Strict input validation.
- Exact single-panel and disjoint-panel probability functions.
- `evaluateCandidate(inputs, candidate)` returning every metric and failure reason.
- `selectConfiguration(inputs)` returning the first passing candidate or a fail-closed status.
- `nextAppealConfiguration(current, frozenInputs)` returning a strictly stronger feasible rung.
- Stable policy version and reproducible test vectors.

**Gate 1 acceptance**

- Exact dynamic-programming results match brute-force enumeration on small pools.
- Missing, zero, negative, non-finite, or unverifiable exposure fails closed.
- Raising exposure or attacker weight never selects a weaker configuration.
- Shrinking the eligible cohort never selects a weaker configuration.
- No candidate can require more seats than the cohort minus exclusions and standbys.
- Identical frozen inputs always produce byte-for-byte identical results.

### Phase 2 — migrate Break the Court's model

**Files**

- Update `break-the-court.html`.
- Update `assumptions.js` with labelled policy-envelope and lab-only parameters.
- Update `tools/validate-gamelab.js`.

**Model changes**

- Remove `panelFor(stake)` and value-tier automatic selection.
- Evaluate all candidates using the shared policy.
- Replace parallel `p^n` approximations with the exact policy result.
- Keep capture, quality, liveness, fee feasibility, rental risk, and panel availability as separate outputs.
- Extend simulated exposure beyond $25M so every candidate is exercisable.
- Include all parallel seats in workload, compensation, grading, and capacity.
- Use the published threat envelope as the minimum. Custom attack sliders may add a harsher scenario but cannot weaken the automatic recommendation.

**UI changes**

- Add a prominent **Automatic · protocol recommendation** result.
- Show chosen configuration, risk limit, worst scenario, capture probability, expected corrupted value, correct-ruling probability, finality probability, fee, and spare eligible seats.
- Add `Automatic / 7 / 15 / 31 / 3×31 / 5×31` under advanced controls.
- Label manual choices **Lab override only — requesters cannot choose court security**.
- Preserve the automatic result while an override demonstrates why another configuration passes or fails.
- Render `Case cannot safely open` with exact reasons when nothing qualifies.

**Gate 2 acceptance**

- Presets assert an automatic configuration and reason rather than a fixed dollar tier.
- Explicit fixtures cover invalid exposure, pool shortage, 50% attacker weight, no safe maximum configuration, fee failure, and successful recovery under a wider cohort.
- Existing one-draw, ballot privacy, rental, lazy-voting, appeal-delay, pricing, and attack-crossing tests still pass.
- Keyboard, focus, `aria-live`, mobile layout, and reduced-motion behavior remain sound.

### Phase 3 — migrate the DemoThemis chapter

**File:** `demothemis.html`

- Replace the dollar-threshold table with the adaptive algorithm and its fail-closed rule.
- Explain that value tightens the acceptable risk limit; value does not directly choose seat count.
- Replace fixed value-tier buttons in the ceiling widget with policy-driven examples using the shared engine.
- Show why the chosen configuration passes and why the previous one fails.
- Explain that larger panels cannot cure attacker weight near 50% or a shared evidence error.
- Change parallel-panel copy and simulation from unanimity to the approved 2-of-3 / 3-of-5 rule.
- Extend the appeal ladder and calculator through `31 → 3×31 → 5×31`.
- Every appeal moves strictly forward, uses a fresh disjoint cohort, and retains the original frozen exposure/cohort basis with the stricter approved threat envelope.
- Make 5×31 terminal and define its unresolved split as the published terminal evidence/finality outcome.
- Preserve appeal service-fee and security-principal accounting.
- State explicitly that neither administrators nor requesters can override the selection.

**Gate 3 acceptance**

- DemoThemis and Break the Court load the same policy version and return identical results for shared fixtures.
- No public copy presents the old $250k / $1M / $5M / $25M boundaries as protocol law.
- No copy claims independent `p^n` math for disjoint panels.
- The top-tier appeal path is complete and terminal.
- The run-through and live MVP files have zero diff.

### Phase 4 — remove compatibility and reconcile generated artifacts

- Remove the legacy fixed-threshold adapter and obsolete tests.
- Replace fixed-tier assertions in `tools/smoke-site.js` with shared policy, fail-closed, exact-parallel, and appeal-order assertions.
- Rebuild `dist/` and the unified Next public directory; never edit generated files by hand.
- Only after all gates pass, update the contradiction review to remove any findings genuinely resolved by the shipped public pages.

## 6. Cross-page invariants

1. One sealed draw per ruling configuration.
2. Parallel panels are disjoint.
3. No juror is reused anywhere in a dispute or its appeals.
4. Party and conflict exclusions apply before capacity is measured.
5. Security uses the worst published scenario, not an optimistic point estimate.
6. Value sensitivity comes from `min(1%, Lmax / V)`, not hidden dollar tiers.
7. Capture, correctness, liveness, and affordability remain independent gates.
8. Panel work is fully funded; adaptive sizing does not alter resolution-bond, escrow, or appeal-security semantics.
9. No administrator, requester, or gas-price auction chooses the panel.
10. No safe configuration means no case opening—not an undersized fallback and not an evidence-based “insufficient information” verdict.

## 7. Validation commands

Run in this order:

1. Panel-policy unit and exact-math validation.
2. Break the Court model validation.
3. Eight-page public smoke suite.
4. Unified public-site preparation.
5. Next.js production build and type checks.
6. Desktop and mobile visual/interaction QA for DemoThemis and Break the Court.
7. Repository diff assertion proving the run-through, MVP, contracts, and unrelated chapters were untouched.

## 8. Rollback strategy

Implement in four isolated commits:

1. Inert policy engine and tests.
2. Break the Court migration.
3. DemoThemis migration and appeal copy.
4. Compatibility removal and generated artifacts.

If a gate fails, revert only the latest consumer commit; the additive engine remains inert while old consumers still work. After rollback, regenerate public artifacts and rerun smoke/model validation. Never roll back by manually editing `dist/` or the Next public copy.

## 9. Definition of done

The upgrade is complete only when a reviewer can reproduce why a configuration was chosen; harsher exposure, attacker weight, or pool scarcity cannot produce weaker protection; no unsafe case silently opens; Break the Court clearly distinguishes protocol selection from lab overrides; DemoThemis teaches the same rule; the extended appeal ladder is complete; and all scoped validations pass with no changes to the run-through or live MVP.
