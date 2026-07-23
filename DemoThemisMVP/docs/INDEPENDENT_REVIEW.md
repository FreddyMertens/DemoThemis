# Independent review — weak spots & what's left

An adversarial, multi-agent audit of the project run on 2026-06-20 (25 agents across
contracts, web, tests, grant-claims, and repo hygiene; serious findings were
re-verified by independent skeptics). It is separate from the team's own
[GRANT_READINESS.md](GRANT_READINESS.md): the job here was to verify the claims and find
the weak spots the self-assessment missed.

> **2026-07-22 remediation note:** the source tree now fixes both liveness paths in
> finding A1. It checks the eligible pool after excluding case parties before accepting
> funds, assigns every accepted case an immutable one-hour first-draw deadline, and lets
> anyone unwind an undrawn case with the unused fee and escrow principal returned to the
> payer. Permit2 re-bond, a separate fixed retry deadline, and permissionless status-quo
> finalization cover the no-show/quorum-miss path. Exact-3/3 question and escrow
> regressions cover both fixes. The recorded mainnet deployment is immutable and remains
> affected until replaced. The same replacement now uses the World ID 4 Production
> proxy with legacy proofs disabled; the immutable legacy court remains historical evidence.

## Bottom line

The build is **real and unusually honest** — it survived an adversarial audit. The
findings below preserve the original review record; remediation notes distinguish the
replacement source from the still-affected legacy deployment.

**Verified strengths (the defensible core):**

- The original audit snapshot had **77 Foundry tests** and **97.17% line / 93.66%
  statement / 92.86% function** coverage. The first quorum-recovery snapshot had 85
  tests and measured **89.60% line / 86.44% statement / 91.67% function** overall,
  including **98.49% line for `DisputeCourt`** and **100% line for `JurorRegistry`**.
  The current Router-gate/party-exclusion/first-draw release has **100 passing tests**.
  The prior 95-test liveness snapshot measured
  **89.51% line (529/591), 86.67% statement (598/690), 76.11% branch (86/113), and
  92.22% function (83/90)** coverage overall; `DisputeCourt` is **96.43% line
  (216/224)** and `JurorRegistry` is **100% line**. Do not attach either historical
  coverage figure to the current 100-test release.
- **Secrets are clean** — `.env` was never committed, history is scrubbed, `.gitignore`
  is correct.
- **Slash-to-pool, atomic settlement, fee conservation, commit/reveal binding,
  wallet-bound proofs, and "no admin override"** all check out against the code.
- **Historical v4 proof check in-transaction**; those traces genuinely exercise the
  Staging adapter but are not real-human or production-environment evidence. The supported
  replacement path is the v4-only `WorldIDGate` over the official Production proxy.
- The **honesty rule is implemented consistently in the UI**; nothing claims humans have
  used the mainnet court while `jurorCount()==0`.

## Weak spots that actually matter

### A. Smart-contract correctness & security

1. **🔴 Historical finding — fixed in replacement source; legacy deployment remains
   affected.** The old court checks raw active count before later excluding parties, and
   has no terminal path if an accepted case never draws. The replacement checks
   case-specific eligibility before `openQuestion()` pulls its fee or `dispute()` can
   commit escrow state. If eligibility later falls, its immutable first-draw deadline
   lets anyone cancel/unwind without a merits ruling and refund the entire unused fee;
   `InitialDrawTimedOut` distinguishes that terminal reason while the escrow callback
   returns principal to the payer. Separate Permit2 re-bond and redraw-timeout handling
   cover the no-show path. These guarantees require a fresh deployment.
2. **Resolved by removal from the production path.** The historical `WorldIDGate` ignores the verifier's
   return value and relies on it **reverting** on a forged proof — confirmed only against
   Staging. If the **Production** verifier returns `false` instead of reverting, the gate
   **fails open** and "a forged proof reverts" is falsified on camera at the capstone.
   → send a forged proof to the Production gate via `cast` and confirm it reverts *before*
   any human onboards. The replacement no longer depends on that assumption: it calls
   the documented Router, which reverts on invalid proofs. Keep the old concern attached
   only to the preview adapter and test a forged Router proof before the capstone.
3. **🟠 Partial-slash leaves an under-bonded juror in the draw pool** (latent today —
   the sole slasher always full-slashes — but breaks the stated invariant if a future
   partial slash lands; zero test coverage of the branch).
4. **🟠 A single $5 bond covers unlimited concurrent panels** — the liveness penalty
   doesn't scale with abandoned panels; untested overlapping-case path.
5. **🟠 No on-chain proof freshness** (nonce/expiry decoded but unchecked); anti-replay
   rests on the per-instance nullifier mapping only.

> Already fine (verified): the blockhash panel-randomness weakness is **not** an
> over-claim — it is disclosed as funded-milestone #1 in four docs, and the live chain is
> an OP-stack L2.

### B. The capstone is a one-shot with unguarded landmines

None of these are in the runbook, and each is invisible until a real phone runs it:

- **Historical 3/3 party-exclusion deadlock.** The legacy court can accept a case from
  an active opener/party and then find only 1–2 eligible jurors. The replacement rejects
  that case before funds or escrow state lock, and its fixed first-draw unwind protects
  against a later withdrawal. Keep the official opener non-juror and recruit a wider pool
  as operational reserves, then prove the source fix on the replacement deployment.
- **Historical duration sequencing trap — fixed in replacement source.** The legacy
  court's `setDurations` could change an open-but-undrawn case. The replacement removes
  that function, makes both durations immutable with a five-minute minimum, and exposes
  `AUTOMATED_TIMING_VERSION() == 1`; a fresh deployment is still required.
- **Faucet-in-batch revert** for a returning wallet on the 24h cooldown reverts the whole
  onboard batch — pre-fund the 3 wallets and rehearse on a throwaway.
- **Constructor immutables never `cast`-verified** against the deployment JSON — a wrong
  arg makes every real proof revert opaquely.
- **No contingency plan** if the capstone fails or the verifier misbehaves.

### C. Honesty / consistency leaks (the differentiator is honesty, so these hurt extra)

- **🟠 The deployment JSON** said *"mainnet-live… 3 real humans register here"* while
  `jurorCount()==0`. *(Fixed during this engagement.)*
- **🟠 "$13 to flip a 3-seat panel"** still sits inline on the cost-to-corrupt chart, one
  footnote from "can't be bought." Reframe as a deliberate liveness/cost demo whose
  security property is pool width.
- **🟠 "First dispute-resolution app in World App"** reads as absolute in the README vs the
  scoped evidence ("none found in one dated scan").
- **🟠 Differentiation gaps:** omit **Aragon Court**, and don't confront the *"World ID is
  itself a sybil primitive of the Proof-of-Humanity lineage"* reframing — the two
  strongest reviewer rebuttals. *(Both addressed in the new application copy.)*
- Contract NatSpec (in source-verified bytecode) still says "mainnet live instance" — can't
  be changed without redeploy; disclose rather than retroactively edit.

### D. Web & repo hygiene

- **🟠 `/api/dev-register` is an unauthenticated private-key relayer** when
  `NEXT_PUBLIC_SHOW_DEV='true'` — inert in prod (double-gated), but the only guard is an
  env boolean. Add real authz; hard-fail when `!IS_COHORT`.
- **🟠 The `(protected)` route group isn't actually access-controlled** (auth redirect
  commented out) — no fund risk, but contradicts the "protected" label.
- **🟠 [MECHANISM_DELTA.md](MECHANISM_DELTA.md) cites a non-existent `toupdate.md`** — the
  one dangling doc ref.
- Dead template scaffolding (Pay/Verify/UserInfo); root metadata still "Template Mini App";
  `.claude/` untracked but not gitignored (risks a careless `git add .` on the public flip).

## What's left to do before submitting

The team's own ordering ("capstone first") is sound. The critical path:

**Hard gates (binary — void the application):**

1. **Public repository — resolved.** The MIT-licensed repository is public; keep the final
   capstone and video evidence links current.
2. **Applicant location facts are recorded, but eligibility needs written guidance** — one
   co-founder is a UK resident; one is based in Baltimore, Maryland, United States on a work visa.
   The current grants disclaimer restricts U.S. residence/location. Do not infer that a signatory
   or entity arrangement cures it; obtain Foundation guidance, then complete citizenship,
   tax-residency, sanctions/export-control, and payout answers exactly as instructed.
3. **Applicant KYC** has no artifact — precondition for payout; can be slow; start now.

**MVP-completeness gates (the headline claim):**

4. **Liveness replacement not deployed.** Deploy and source-verify a three-seat court with
   `MIN_POOL >= 4`, confirm court liveness version 2 / registry version 1 / automated timing version 1 and all seven capability
   flags, then cut over the app, keeper, and Portal permissions. The legacy 3/3 addresses remain
   affected by both liveness findings.
5. **Three-seat mainnet capstone with at least four eligible humans never run** (`jurorCount()==0`) — the master technical key;
   flips "Deep World ID usage" + "Working demo" from partial to proven. Add the forged-proof
   pre-check, constructor-arg `cast` check, and duration check as runbook pre-flight gates.
6. **No demo video** (film it during the capstone).
7. **Fill the DEMO.md Step-5 trace table** (5-min paste, blocked on the capstone).

**Buildable-now writing track (capstone-independent — start in parallel today):**

8. **Price the milestones** — *done* ([GRANT_BUDGET.md](GRANT_BUDGET.md)).
9. **Write the application copy** — *done* ([GRANT_APPLICATION.md](GRANT_APPLICATION.md)).
10. **Unscored rubric dimensions:** license-fit, team/track-record (two co-founders — bus-factor de-risked),
   budget justification, milestone→acceptance-criteria mapping (covered in the new docs).
11. **Privacy/data-handling note** for a personhood Mini App (World App review expects it).

> The scheduling insight: eligibility/KYC and the writing track are **independent of the
> capstone**. They are the long pole that binds the submission date even after a perfect
> demo — so run them in parallel, not behind it.
