# Independent review — weak spots & what's left

An adversarial, multi-agent audit of the project run on 2026-06-20 (25 agents across
contracts, web, tests, grant-claims, and repo hygiene; serious findings were
re-verified by independent skeptics). It is separate from the team's own
[GRANT_READINESS.md](GRANT_READINESS.md): the job here was to verify the claims and find
the weak spots the self-assessment missed.

## Bottom line

The build is **real and unusually honest** — it survived an adversarial audit.
The gap to submission is **execution + writing, not engineering**. The findings below are
the things worth fixing or disclosing before a reviewer sees them.

**Verified strengths (the defensible core):**

- **"77 Foundry tests" is exact**, and **coverage is 97.17% line / 93.66% statement /
  92.86% function** (measured with `forge coverage` — the ">90%" claim is conservative).
- **Secrets are clean** — `.env` was never committed, history is scrubbed, `.gitignore`
  is correct.
- **Slash-to-pool, atomic settlement, fee conservation, commit/reveal binding,
  wallet-bound proofs, and "no admin override"** all check out against the code.
- **Real Groth16 World ID check in-transaction**; the Production verifier address is the
  genuine Production contract, not a mislabeled Staging one.
- The **honesty rule is implemented consistently in the UI**; nothing claims humans have
  used the mainnet court while `jurorCount()==0`.

## Weak spots that actually matter

### A. Smart-contract correctness & security

1. **🔴 Disputed escrow funds can be permanently locked.** `settle()` is the only exit
   from `Disputed`; if the court case can never fill a panel (the 3/3 pool drops below 3,
   or a single redraw no-show permanently excludes a juror), the principal is stranded
   with no timeout/refund. Turns "atomic settlement" into "atomic when it settles,
   unrecoverable when it doesn't." → add a party-callable timeout/refund (folded into
   funded milestone M1), or document it as an accepted MVP limit + add a test.
2. **🔴 The headline claim could be falsified live.** `WorldIDGate` ignores the verifier's
   return value and relies on it **reverting** on a forged proof — confirmed only against
   Staging. If the **Production** verifier returns `false` instead of reverting, the gate
   **fails open** and "a forged proof reverts" is falsified on camera at the capstone.
   → send a forged proof to the Production gate via `cast` and confirm it reverts *before*
   any human onboards (an M1 acceptance artifact).
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

- **3/3 deadlock** if any of the 3 humans is also the case opener / a deal party (the
  excluded party leaves 2 < 3, so the panel can never be drawn). Forbid it, or add a 4th
  human buffer.
- **Duration sequencing trap** — `setDurations` must run *before* the case is opened, or
  the 60s window deadlocks the demo.
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

1. **Repo is private** → open-source fails; a reviewer hits a 404. Flip public *after* the
   capstone traces land; pre-scan for secrets first.
2. **Applicant location facts are recorded, but final eligibility is KYC-dependent** — one
   co-founder is a UK resident; one is based in Baltimore, Maryland, United States on a work visa.
   Current public Mini App Grants materials say the program is open to United States builders;
   final citizenship, tax-residency, sanctions/export-control, and payout answers still need to
   be confirmed by the applicants.
3. **Applicant KYC** has no artifact — precondition for payout; can be slow; start now.

**MVP-completeness gates (the headline claim):**

4. **3-human mainnet capstone never run** (`jurorCount()==0`) — the master technical key;
   flips "Deep World ID usage" + "Working demo" from partial to proven. Add the forged-proof
   pre-check, constructor-arg `cast` check, and duration check as runbook pre-flight gates.
5. **No demo video** (film it during the capstone).
6. **Fill the DEMO.md Step-5 trace table** (5-min paste, blocked on the capstone).

**Buildable-now writing track (capstone-independent — start in parallel today):**

7. **Price the milestones** — *done* ([GRANT_BUDGET.md](GRANT_BUDGET.md)).
8. **Write the application copy** — *done* ([GRANT_APPLICATION.md](GRANT_APPLICATION.md)).
9. **Unscored rubric dimensions:** license-fit, team/track-record (two co-founders — bus-factor de-risked),
   budget justification, milestone→acceptance-criteria mapping (covered in the new docs).
10. **Privacy/data-handling note** for a personhood Mini App (World App review expects it).

> The scheduling insight: eligibility/KYC and the writing track are **independent of the
> capstone**. They are the long pole that binds the submission date even after a perfect
> demo — so run them in parallel, not behind it.
