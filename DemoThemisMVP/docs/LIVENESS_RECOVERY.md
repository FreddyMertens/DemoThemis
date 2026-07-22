# Case liveness recovery

Status: implemented in the source tree and covered by 100 passing Foundry tests, including five new Router-gate tests. The prior 95-test liveness snapshot measured 89.51% line, 86.67% statement, 76.11% branch, and 92.22% function overall; do not attribute that historical coverage run to the Router-gate release. A fresh World Chain deployment and app/keeper cutover are still required.

The historical 3-seat / minimum-3 deployment has two independent ways to accept a case that can never progress:

1. It checks the raw active-juror count when a case opens, then excludes the question opener or both escrow parties at draw time. An active party can therefore reduce a nominal pool of three to only one or two eligible jurors after the fee or escrow state has already been locked.
2. A no-show loses the full bond and leaves the active pool. After a quorum miss, excluding the no-show from the retry leaves too few eligible jurors to draw another three-seat panel. Even when two reveals settle the current case, one no-show leaves only two active jurors for the next one.

The replacement source closes both paths. The legacy Step-5 addresses do not change and remain affected.

## Opening and first-draw escape

Before either case type accepts funds or state, `DisputeCourt` computes the active jurors who are actually eligible for that case:

- subtract the question opener when that address is an active juror;
- subtract the escrow payer and payee when either is active, counting the same address only once; and
- require the remaining count to be at least `MIN_POOL` (`MIN_POOL` is constructor-checked to be at least `PANEL_SIZE`).

`openQuestion()` performs this preflight before pulling its 20 MUSD case fee. `DealEscrow.dispute()` calls the same check through `openFromEscrow()`; if it fails, the whole transaction reverts atomically, so the deal remains `Funded` and the principal plus fee stay in escrow. An exact-three pool therefore cannot accept a case opened by one of those three jurors.

Every accepted case receives a fixed `initialDrawDeadline` one hour after opening. Failed draws and blockhash re-arms do not move it. A successful first draw clears it. After it expires:

1. another draw is rejected and `phaseOf()` reports `Resolvable`;
2. anyone may call `resolve()`—neither party nor an operator can hold the escape path hostage;
3. the entire unused case fee is returned to `party1` and `InitialDrawTimedOut` records the beneficiary and amount; and
4. the case closes as an **initial-draw cancellation**, not a merits ruling. For ABI compatibility the court emits `Resolved(false, 0, 0)` and uses the existing escrow `settle(false)` callback, but `InitialDrawTimedOut` is the terminal-reason discriminator. Interfaces and receipts must render “unwound/refunded,” never question NO. For escrow, the payer receives the unused 2% court fee directly and the callback returns the full principal to that payer.

This deadline is a backstop for eligibility changing after acceptance—for example, a juror withdrawing before the first draw—not a substitute for the opening preflight.

## Quorum-miss retry

The replacement contracts also preserve the full no-show penalty and the invariant that every active juror has a full bond:

1. A no-show is fully slashed and deactivated.
2. The verified human may post a fresh full bond and rejoin without repeating World ID verification. World App uses `postBondWithPermit2()`; the classic allowance path remains available through `postBond()`.
3. A first quorum miss clears the first panel and opens one retry with a separate, fixed one-hour `redrawDeadline`.
4. Re-bonded jurors and any additional active jurors are eligible for that retry. Failed or delayed draw attempts never extend the deadline.
5. If a full panel is drawn before the recovery deadline, it receives normal seal and reveal windows. A second quorum miss resolves to status quo.
6. If the pool cannot recover before the deadline, `phaseOf()` reports `Resolvable` and anyone may call `resolve()`. The question resolves NO; a disputed escrow refunds its payer; the case fee is distributed exactly once under the normal no-winner path.

The browser ballot key includes the retry number, so a juror selected again receives a fresh salt instead of reusing a salt disclosed in the first round. Existing first-round secrets are migrated from the legacy key only into round zero; they are never carried into a retry.

## Pool and keeper behavior

`PANEL_SIZE` remains 3. The contract is fund-safe with `MIN_POOL = 3`: a later loss of eligibility cannot strand funds because the first-draw deadline unwinds the case. For the replacement deployment, use `MIN_POOL >= PANEL_SIZE + 1`—at least 4 for a three-seat court—so one eligible juror may withdraw before the draw without forcing a refund instead of an adjudication. This is an availability reserve, not a substitute for the case-specific preflight. The configured minimum is an eligible count, never a maximum active pool. The keeper now:

- checks `eligibleJurorCount()` before opening the official question and again before drawing;
- opens only when the case-specific eligible count is at least `MIN_POOL`;
- draws only when the case-specific eligible count is at least `PANEL_SIZE`;
- accepts a wider active pool; and
- finalizes an expired initial-draw or redraw deadline even when fewer than three jurors are active.

Additional verified humans therefore provide useful recovery capacity instead of pausing the official queue. The official opener remains a separate, non-juror wallet, but correctness no longer depends on that operational convention alone.

The keeper refuses every `--execute` run unless the selected deployment record marks the current source as deployed and all seven release capabilities as present, including immutable voting durations. It also checks `LIVENESS_RECOVERY_VERSION() == 2` on the court, `LIVENESS_RECOVERY_VERSION() == 1` on the registry, and `AUTOMATED_TIMING_VERSION() == 1` on the court, so metadata alone cannot unlock writes. Read-only inspection of the legacy instance remains available.

Commit and reveal durations are immutable constructor parameters and each must be at least five minutes. The replacement exposes no duration setter, so opening a case before its panel is drawn cannot create an administrative timing gap. Draws convert the fixed durations into case deadlines; every subsequent transition remains permissionless.

The official queue authenticates cases by type, URI, exact hash, and fixed opener. The keeper warns about but ignores nonofficial cases when enforcing its one-active-official-case rule, so an outsider cannot censor the official queue merely by opening refundable cases. Nonofficial cases can still compete for juror availability at the contract layer; this remains a controlled demo rather than contract-level admission control.

## Token scope

The timeout refund and escrow-principal return are direct token transfers inside the resolving transaction. Liveness therefore assumes the deployment's immutable, trusted MockUSD does not pause transfers or blacklist the opener/payer. That is true of this valueless demo token. A generalized production integration with a pausable, blacklistable, or otherwise adversarial token should credit a pull-based claim balance instead, so recipient-specific transfer policy cannot block terminal case state.

## Deployment boundary

The current mainnet registry, court, and escrow are immutable or wire-once contracts. Editing this repository does not change the contracts at the recorded addresses. The existing Step-5 deployment remains a legacy, affected instance and must not be used for the capstone.

Before resuming the capstone:

1. Run the complete Foundry suite and regenerate the committed ABIs.
2. Deploy a fresh registry, court, reward pool, and escrow through the normal deployment script, wired to the Production World ID verifier and canonical Permit2.
3. Source-verify the replacement contracts and record their addresses, deployment block, transactions, parameters, and all seven release capabilities in a new deployment record. Preserve the legacy record as history. Set the source-match and capability fields only after verification.
4. Confirm the replacement reports court liveness version 2, registry liveness version 1, and automated timing version 1; verify the immutable voting durations are at least 300 seconds each.
5. Update the Mini App addresses and deploy block, then add every replacement contract and `postBondWithPermit2()` call to the World Developer Portal permissions.
6. Deploy the Mini App, switch the scheduled keeper, and run it read-only before broadcasting.
7. Deploy the three-seat capstone with `MIN_POOL >= 4` and register at least four eligible humans; record the exact values. Also exercise the exact-3/3 source-level paths: party-exclusion rejection before funds lock, withdrawal after acceptance plus first-draw unwind, full participation, one no-show plus re-bond for the next case, quorum miss plus successful retry, and quorum miss plus timeout/status-quo finalization. Confirm both the question-fee refund and escrow fee/principal return from emitted events and balances.

Until those steps are complete, source-level tests prove the remediation logic but no public page should describe the legacy address as liveness-recovered or capstone-ready.
