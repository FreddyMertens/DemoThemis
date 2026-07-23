# Resolution-time court fee and insufficient-information ruling plan

Updated: 2026-07-23  
Status: fee architecture remains a document design plan; the replacement MVP source implements only the three-choice ballot slice

## Implementation boundary for the current update

Only the MVP's `INSUFFICIENT_INFORMATION` ballot feature is being implemented now. That slice includes the minimum replacement-court, commit/reveal, tally, event, ABI, receipt, and UI support needed for the third button to produce an honest on-chain ruling. The currently deployed immutable courts remain Boolean until replacement addresses are deployed and their capability flag is enabled.

Everything concerning bonded permissionless resolution and resolution-time court fees remains design-only in this update. In particular, no Omen market contract, market settlement contract, court fee policy, escrow funding rule, bond escrow, reserve mechanism, quote path, or deployed address has been changed. Plan A below is the implementation specification for a later complete-product release, not a description of current MVP behavior.

The MVP slice also does not claim to implement the complete-product appeal, parallel-panel, prediction-market void, transferable-token redemption, or consumer settlement architecture in Plan B. Those remain design requirements. The present source change is deliberately limited to making the third juror answer real, sealed, tallyable, and readable.

## Outcome

This upgrade makes two connected changes to the complete product:

1. OmenMarketMaker no longer estimates, collects, or locks a jury reserve before betting. Any eligible caller may request resolution by posting the deterministic court fee as a bond. A final `YES` or `NO` ruling reimburses that bond from YES and NO backing pro rata; a final `INSUFFICIENT_INFORMATION` ruling uses the bond to pay the court and leaves market backing untouched.
2. A juror may answer `INSUFFICIENT_INFORMATION` when the locked question cannot be decided reliably from the permitted evidence. An early insufficient-information ruling reopens the market after a cooldown; the same final ruling at the locked backstop voids the market and returns its full backing under the precommitted rule.

These decisions remove the contradiction between a pre-betting jury target and a later work-based fee. They also replace the overloaded word `INVALID` with a precise merits ruling and keep court-operation failures separate from evidence insufficiency.

## Locked product decisions

- There is no pre-betting jury target, resolution reserve, reserve contribution percentage, reserve-funding gate, resolution top-up window, or initial-case quote object.
- The market discloses the immutable fee-policy version, not an estimated fee.
- The initial court fee is calculated when resolution is requested and paid up front from the caller's resolution bond before any juror is drawn.
- Fee calculation, fee transfer, case creation, case-content locking, and draw scheduling occur atomically. There is no interval in which an opened case can be repriced.
- The fee cannot change after case creation. Later workload, supply, governance, delays, replacements, no-shows, retries, or appeals cannot charge the original market again.
- The fee formula accepts no juror bid, selected-juror input, self-reported time, or administrator-entered case price. Jurors cannot choose the cases they receive or set their fees.
- A final `YES` or `NO` ruling reimburses the resolution bond from the market pool, with YES and NO bearing the fee pro rata. A final insufficient-information ruling does not charge the pool or reimburse the fee portion of the bond.
- A request cannot open if the market pool could not reimburse the bond after a directional ruling. At the backstop, such a market closes as `UNFUNDED_FOR_RESOLUTION` under its precommitted cancellation rule.
- OmenMarketMaker charges no product settlement fee when the final ruling is `INSUFFICIENT_INFORMATION`, when the pool cannot fund resolution, or when no panel is ever seated. Court work that actually occurred remains payable.
- Appeal funding remains separate. A voluntary appeal still needs a public funding goal because contributors must fund a new panel, delay compensation, and separate security before that new work begins. Removing the initial market quote does not remove the conserved appeal-funding waterfall.
- A technical failure is not an insufficient-information ruling. `INITIAL_DRAW_TIMEOUT`, `QUORUM_FAILURE`, and `INSUFFICIENT_INFORMATION` remain distinct in storage, events, receipts, callbacks, and user-facing copy.
- Every event-driven market locks an earliest request time, an objective close condition, and a final backstop. There is no permanently dateless market and no administrator-triggered close.
- Existing deployed Boolean contracts are not upgraded in place. This requires new contracts and version-aware readers; historical receipts retain their original YES/NO semantics.

## Terminology

Use these terms consistently everywhere:

| Term | Meaning |
| --- | --- |
| `court fee` | The deterministic service amount charged once when the initial case is submitted. |
| `fee policy` | The immutable/versioned formula that calculates the court fee from objective case and court state. It is not a quote or bidding system. |
| `resolution bond` | The caller-funded amount that pays the court up front. It is reimbursed from market backing only after a final YES or NO ruling. |
| `backstop` | The latest locked time at which the market must enter its final resolution path, even when the real-world event has no known date. |
| `INSUFFICIENT_INFORMATION` | A merits ruling: the permitted evidence does not support a reliable YES or NO answer. |
| `VOID` | OmenMarketMaker's settlement state after a final `INSUFFICIENT_INFORMATION` ruling. It is not a fourth court answer. |
| `technical failure` | The court could not complete adjudication, for example because no panel could be drawn or quorum could not be restored. |
| `appeal funding goal` | The amount voluntarily funded before a new appeal round. It remains separate from the initial court-fee path. |

Do not use `jury reserve`, `resolution reserve`, `jury target`, `initial quote`, or `INVALID` for this design after migration.

---

# Plan A: bonded permissionless resolution

## A1. Canonical lifecycle

The market lifecycle becomes:

1. **Create.** Lock the question, YES rule, evidence sources, earliest request time, objective close condition, final backstop, fee-policy version, and insufficient-information rule.
2. **Trade.** Keep every deposit as ordinary market collateral. There is no jury reserve.
3. **Request.** Once eligible, any caller posts the exact court fee as a resolution bond and supplies a content-addressed evidence bundle.
4. **Freeze and open.** In the same transaction, snapshot the pool and token supplies, pay DemoThemis from the bond, lock the case, and schedule the draw.
5. **Review.** Jurors return `YES`, `NO`, or `INSUFFICIENT_INFORMATION`; funded appeals use the separate appeal mechanism.
6. **Settle.** A final YES or NO shifts the court cost to the pool and returns the bond. Early insufficient information reopens the market; final insufficient information at the backstop voids it without charging the pool.

There is no `QuotePending`, `ReserveFunding`, `CreatorTopUp`, or administrator-only close state.

Request eligibility stays simple and automatic:

- an on-chain or authenticated event adapter may unlock requests immediately when its locked signal arrives;
- an evidence-driven market allows bonded requests after `earliestRequestAt`; and
- every market becomes requestable at `finalBackstopAt`.

The contract checks only these precommitted rules. It never asks an administrator whether the event is ready. For an evidence-driven request, the jury decides whether the permitted record supports YES, NO, or insufficient information.

## A2. Deterministic fee calculation

Add a versioned, non-upgradeable fee policy used by both the court and integrations. A first implementation can expose:

```solidity
struct CaseSpec {
    uint8 caseType;
    uint8 complexityClass;
    uint256 valueAtStake;
    uint256 expectedSeats;
    uint64 pricingEpoch;
}

interface ICourtFeePolicy {
    function caseFee(CaseSpec calldata spec) external view returns (uint256);
}
```

The production formula may use only objective inputs already committed by protocol rules:

- the standard case type;
- the final value at stake;
- the deterministic panel/parallel-panel plan selected from that value;
- the standard expected work for the case type;
- eligible supply and pending workload from the automatically selected pricing epoch;
- processing cost;
- reward-pool top-up under the published formula; and
- the immutable operations cap.

For the first Omen integration, every binary public-event market should use one standard complexity class. Do not let a market creator label a difficult case as “easy” to reduce its fee. Additional case types require their own versioned objective schedule.

The pricing epoch is derived mechanically from the accepted request block, or from the locked backstop when the backstop path is used. The caller cannot supply an epoch. Once the request opens a case, its fee is final.

Changing the formula requires deploying a new policy and a new compatible market/court version. There is no administrator function that changes the policy for an existing market or case.

## A3. Atomic market-to-court interface

Add a permissionless market request and a market-specific court entry point. The caller supplies a spending cap for transaction safety, never the price:

```solidity
function requestResolution(
    uint256 marketId,
    bytes32 evidenceHash,
    string calldata evidenceURI,
    uint256 maximumBond
) external returns (uint256 caseId, uint256 bondPosted);
```

The fee policy is the sole calculator. `maximumBond` only protects the caller if the required bond changes before execution; the transaction reverts rather than overcharging. The opening transaction must:

- verify the locked request condition and that no request is active;
- compute the panel plan and fee from locked inputs;
- require `0 < courtFee < grossPool` so a directional ruling can reimburse the caller;
- pull exactly `courtFee` from the caller into the market;
- pay exactly that amount to DemoThemis;
- store the fee and policy version on the case;
- lock the requester, evidence hash, URI, market snapshot, criteria, and panel plan;
- schedule the first draw; and
- return the case ID and bond actually posted.

Conflict exclusion must not rely on a caller-supplied list. The court calls the
immutable Omen integration's conflict check during selection so a seat holding exposure
to that market is deterministically skipped and replaced.

The market records the case only after opening succeeds. Use checks-effects-interactions, a reentrancy guard, exact token-balance checks, authenticated one-shot callbacks, and a one-active-request guard. No quote signature, quote expiry, user-selected epoch, or later top-up belongs in this interface.

## A4. Pro-rata court-fee accounting

For a final directional ruling:

```text
Y = gross collateral attributed to YES
N = gross collateral attributed to NO
T = Y + N
F = court fee
B = resolution bond = F

require 0 < F < T

YES court-fee share = floor(F × Y / T)
NO court-fee share  = F - YES court-fee share

YES net backing    = Y - YES court-fee share
NO net backing     = N - NO court-fee share
bond reimbursement = F
net pool            = T - F
```

Assign the rounding remainder to one explicitly named side as shown above so the charge always conserves exactly. Test that neither side's fee share can exceed its backing.

Example:

```text
YES backing:       $100
NO backing:        $200
Court fee:          $30

YES bears:          $10
NO bears:           $20
Net settlement:    $270
```

The market receipt must show the gross pool, bond payer, exact fee, fee share attributed to each side, bond reimbursement, remaining backing, court case ID, and fee-payment transaction.

## A5. YES and NO settlement

The bond pays the court before work begins. After a final directional ruling, the market reimburses it:

```text
net pool before Omen fee = T - F
Omen fee                 = omenFeeRate × (T - F)
winner redemption pool   = T - F - Omen fee
```

Only the winning outcome claims divide the winner-redemption pool. The court fee is deducted first and the Omen product fee is calculated afterward so the product does not charge a fee on money already paid to the court.

The contract must store the two fees separately. It must never describe the court fee as Omen revenue or include the appeal security bond in either fee.

After a final insufficient-information ruling:

```text
bond reimbursement = 0
market court-fee share = 0
Omen fee = 0
YES backing remains Y
NO backing remains N
```

Before the backstop, the market reopens after a cooldown. At or after the backstop, it becomes `VOID_INSUFFICIENT_INFORMATION` and each side redeems its full backing.

## A6. Transferable-token backing

Removing the reserve changes what a token can promise. After YES or NO, a token is a pro-rata claim on collateral after the court fee. After insufficient information, each side retains its gross backing because the resolution bond paid the court.

Required changes:

- Remove “fully funded resolution” from the tokenization/graduation gate.
- Remove claims that every winning token is already backed for a fixed dollar amount unaffected by resolution cost.
- At close, snapshot `yesSupply`, `noSupply`, `yesGrossBacking`, and `noGrossBacking` before fee allocation.
- Store gross and net backing per side, plus any bond reimbursement.
- Make redemption depend on token ownership at burn time, never on the current holder's historical purchase price.
- Expose `grossCollateral`, `courtFeePaid`, `netCollateral`, `ruling`, and per-token redemption through read functions and events.
- Require lending, vault, and parlay integrations to treat the tokens as variable-redemption claims rather than assuming a guaranteed one-dollar terminal value.

Secondary trades cannot be “refunded at their recorded purchase price.” That history is neither available nor meaningful once tokens are fungible. All current prose and simulations making that promise must be replaced by the on-chain backing rule.

## A7. Pool too small to reimburse the bond

Eliminating the target does not eliminate arithmetic. A ten-cent pool cannot promise to return a twenty-dollar resolution bond after a directional ruling without a subsidy.

The required automatic rule is:

```text
if courtFee >= grossPool:
    do not transfer a court fee
    do not open a court case
    set market terminal reason = UNFUNDED_FOR_RESOLUTION
    charge no Omen fee
    make the remaining backing redeemable under the locked cancellation rule
```

This check occurs only when resolution is requested; it is not a pre-betting target or graduation gate. A caller cannot be promised a full directional-outcome refund when the pool is smaller than the bond. The interface may disclose that very small pools can close without human resolution, but it must not show a fabricated estimated target.

If the product later promises human resolution for every market regardless of size, that is a separate, explicitly funded subsidy policy. It must not be silently taken from jurors or another market.

## A8. Other initial-resolution consumers

Use the same funding principle everywhere an asset pool exists:

| Consumer | Initial court-fee source | No-court / insufficient-information handling |
| --- | --- | --- |
| Public prediction market | Caller bond first; YES + NO collateral only after a directional ruling | No court if the pool cannot reimburse; final insufficient information returns full side backing. |
| Invite-only prediction room | Caller bond first; both stakes reimburse it only after a directional ruling | Return each side's full stake on a final insufficient-information ruling. |
| Marketplace/deal escrow | Disputed principal under the allocation rule locked in the deal | Apply the precommitted insufficient-information split; recommended default is return remaining principal to the payer when performance was not proven. |
| Standalone question with no asset pool | Submitter pays at submission | Record and display the ruling; there is no collateral settlement. |

Replace DealEscrow's separately prepaid two-percent arbitration fee for the complete product. An undisputed release pays no court fee. A dispute deducts the current fee from the locked principal under the deal's precommitted allocation and opens the case atomically. The fixed-fee MVP may remain versioned and clearly labeled until the complete-product contracts replace it.

## A9. Cancellation and technical recovery

If the court accepts a case but never seats the first panel, its bounded unwind returns the unused fee to the market contract, which immediately returns it to the recorded bond payer. Market backing was never charged and needs no restoration.

The market may make one permissionless resubmission under a fixed deadline. The resubmission is a new court case and uses the then-applicable fee; the old fee must already have been returned. If the deadline expires without a seated panel, terminate as `COURT_UNAVAILABLE` and return backing with no Omen fee.

A post-draw quorum failure is different because court work occurred. The market returns the unused bond portion and shows the amount consumed by completed work. It then reopens or cancels under its locked technical-failure rule; it must not pretend the answer was NO or `INSUFFICIENT_INFORMATION`.

## A10. Concise resolution-request UI

Use one calm card with progressive disclosure. The default view contains only:

- the evidence link or upload;
- **Bond: 30 MUSD**;
- “Returned after a YES or NO ruling. Pays the court if the evidence is insufficient.”; and
- one primary action: **Post bond and request review**.

Put fee policy, pool allocation, transaction identifiers, and raw evidence hashes behind **View details**. Never hide money movement, but do not make users decode protocol terminology before acting.

After submission, show a three-step status line: **Submitted → Jury review → Result**. Use the same short receipt pattern for every ending:

| Result | Primary message | Money line |
| --- | --- | --- |
| YES or NO | `Bond returned` | `30 MUSD charged to market: 10 YES · 20 NO` |
| Early insufficient information | `Not enough evidence — market reopened` | `30 MUSD bond paid the court` |
| Final insufficient information | `Market voided — full backing returned` | `No market fee · no Omen fee` |
| Technical failure | `Court could not complete review` | `Unused bond returned: X · completed work: Y` |

Use sentence case, plain-language labels, visible focus states, accessible contrast, and a single accent color per state. On mobile, stack the evidence field, bond summary, and action without changing their reading order. Do not add a dashboard, calculator, or pre-betting fee estimate.

---

# Plan B: add `INSUFFICIENT_INFORMATION` as a real ruling

## B1. Three-state answer model

Replace every Boolean vote and outcome in the new court version with explicit enums:

```solidity
enum Answer {
    Unset,
    No,
    Yes,
    InsufficientInformation
}

enum TerminalReason {
    None,
    MeritsRuling,
    InitialDrawTimeout,
    QuorumFailure
}
```

`Unset` prevents an unresolved case from appearing to contain a default NO. `TerminalReason` tells consumers whether an answer is a merits ruling at all.

Update the case record, vote mapping, reveal function, tally, final ruling, escrow callback, SDK types, event parser, receipts, simulation, and UI. Do not encode insufficient information as `false`, a tie flag, or a magic tally.

## B2. Ballot commitment v2

The new answer should be domain-separated and bound to the retry round:

```text
keccak256(abi.encode(
    "DEMOTHEMIS_BALLOT_V2",
    block.chainid,
    courtAddress,
    caseId,
    round,
    juror,
    answer,
    salt
))
```

The browser stores `{ answer, salt, wallet, round, courtAddress, chainId }`. The UI must reject legacy Boolean ballot secrets on the new contract instead of attempting to reinterpret them. Legacy contracts keep their existing Boolean encoding.

The ballot presents three equally available choices:

- **YES — the written YES rule is satisfied**
- **NO — the written YES rule is not satisfied**
- **INSUFFICIENT INFORMATION — the permitted evidence cannot reliably establish either answer**

The third choice is about the evidence and locked criteria, not personal uncertainty or failure to research. Juror instructions must say that declining before the draw is for incapability or conflict; insufficient information is for a capable juror who reviewed the permitted record and found it non-determinative.

## B3. Quorum and ruling rule

Quorum continues to count valid reveals, regardless of answer:

```text
revealed = yes + no + insufficient
quorum   = floor(panelSize / 2) + 1
```

If quorum is not met, use the bounded technical recovery path. Do not manufacture an insufficient-information ruling from absent jurors.

Once quorum is met, require a strict majority of the valid reveals for a directional answer:

```text
if yes × 2 > revealed:
    ruling = YES
else if no × 2 > revealed:
    ruling = NO
else:
    ruling = INSUFFICIENT_INFORMATION
```

This conservative rule means explicit insufficient-information votes, a YES/NO tie, or a three-way split that leaves neither directional answer with a majority all prevent the court from inventing certainty. The receipt must still show all three totals so users can distinguish an explicit insufficient-information majority from a divided panel.

## B4. Juror payment and quality updates

The complete design should pay the locked panel-work component for completed valid work, independent of whether a juror selected YES, NO, or insufficient information. Outcome-dependent bonuses would recreate pressure to guess the eventual majority.

Quality and reserve updates wait for the final post-appeal ruling:

- an insufficient-information answer can be credited when the final ruling remains insufficient;
- a later YES or NO appeal may vindicate a directional dissenter;
- later external evidence may update reputation without reopening settled money; and
- no juror is penalized merely because a technically failed case produced no merits ruling.

The current MVP's coherent-winner fee split is a different deployed mechanism. If the three-state answer is added to the MVP replacement, either migrate that version to completion pay in the same release or define and test its three-way coherent-payment rule explicitly. Do not silently let a no-majority ruling send the entire juror share to the reward pool because no Boolean voter matched it.

## B5. Appeal behavior

`INSUFFICIENT_INFORMATION` is provisional until the ordinary appeal window closes.

- Any eligible market participant may fund an appeal from an insufficient-information ruling; there is no single “losing side.”
- The appeal uses a larger panel disjoint from every earlier panel in the dispute.
- Appeal service fees and security remain separately tagged under the existing conserved waterfall.
- For bond settlement, an appeal succeeds when the later final merits ruling differs from the appealed ruling. Moving from insufficient information to YES or NO therefore succeeds; remaining insufficient fails. Moving from YES or NO to insufficient information also changes the ruling and succeeds.
- OmenMarketMaker holds all market collateral until the appeal ladder is final.
- A final insufficient-information ruling triggers the void path only once, after no further funded appeal remains.

The appeal UI should say “fund a new review” for an insufficient-information ruling rather than pretending YES or NO is the sole losing side.

## B6. Prediction-market void settlement

For a final insufficient-information ruling, the bond—not market backing—paid the court:

```text
YES refund pool = Y
NO refund pool  = N
bond refund     = 0
Omen fee        = 0
```

For pooled, non-tokenized claims, each side receives its full side backing pro rata by claim units.

For transferable claims:

```text
YES redemption per token = YES refund pool / final YES token supply
NO redemption per token  = NO refund pool / final NO token supply
```

The current token holder burns the token and receives that amount. The contract does not try to reverse secondary-market trades or recreate each holder's purchase price.

Use `VOID_INSUFFICIENT_INFORMATION` as the market terminal reason and retain the signed court ruling and tally in the permanent receipt.

## B7. Other consumer settlement policies

Every integration must commit its insufficient-information policy before assets lock:

- **Public and private prediction markets:** return each side's full backing because the resolution bond paid the court.
- **Deal escrow:** apply an immutable `insufficientPayerBps` stored with the deal. Use a documented default of 100% to the payer when the question is whether the payee proved performance; specialized agreements may precommit another split.
- **Parlays:** the safest first rule is that any final insufficient-information leg voids the entire parlay, returns the customer's locked stake, and releases the solver's unused maximum-payout backing. Do not invent new odds after purchase.
- **Lending/vaults:** use the underlying token's actual void-redemption value. A voided token is not automatically worth one dollar.
- **Standalone questions:** display the ruling and tally without a monetary callback.

The court returns a ruling; it never decides how a consumer's assets are divided. That release rule belongs to the consumer and must be hash-locked with the case.

## B8. Parallel panels

Replace the ambiguous provisional `INVALID` branch:

- If all required panels independently return the same answer, that answer is provisional.
- If parallel panels disagree, the combined provisional ruling is `INSUFFICIENT_INFORMATION` with reason `PANEL_DISAGREEMENT`.
- The result may be appealed normally.
- If it becomes final, the consumer applies its insufficient-information rule.

The receipt should retain each panel's aggregate tally plus the combined reason. `PANEL_DISAGREEMENT` explains why the court reached insufficient information; it is not a separate settlement outcome.

---

# Contract and application work

## C1. DemoThemis contracts

Create a new court release rather than mutating deployed semantics.

Primary files:

- `DemoThemisMVP/contracts/src/DisputeCourt.sol`
- `DemoThemisMVP/contracts/src/interfaces/IDisputeCourt.sol`
- `DemoThemisMVP/contracts/src/interfaces/IEscrowSettlement.sol`
- `DemoThemisMVP/contracts/src/DealEscrow.sol`
- new `ICourtFeePolicy.sol` and immutable fee-policy implementation
- new resolution-bond escrow and callback accounting
- deployment scripts and deployment manifest capability flags

Required changes:

- replace Boolean vote/outcome storage with `Answer`;
- add `TerminalReason` and three-way tally storage;
- add `openFromMarket` with internal fee calculation;
- bind each case to the market, request ID, requester, and posted bond;
- change callbacks from `bool payeeWins` to an explicit ruling/reason payload;
- add the ballot-v2 commitment domain;
- preserve party exclusion, non-reuse, bounded first draw, bounded retry, immutable clocks, and permissionless transitions;
- return unused pre-draw fees to the integration that paid them; and
- emit enough data to prove exact fee conservation and three-way settlement.

Suggested events:

```solidity
event MarketCaseOpened(
    uint256 indexed caseId,
    address indexed market,
    uint256 indexed marketId,
    address requester,
    uint256 feeCharged,
    uint256 valueAtStake,
    uint64 pricingEpoch,
    bytes32 feePolicyId
);

event Revealed(uint256 indexed caseId, address indexed juror, Answer answer);

event Resolved(
    uint256 indexed caseId,
    Answer ruling,
    TerminalReason reason,
    uint256 yes,
    uint256 no,
    uint256 insufficient
);
```

## C2. OmenMarketMaker contracts

No OmenMarketMaker Solidity implementation exists in the current repository, so this part is new product work rather than a patch to the live MVP.

Add a separate market package with, at minimum:

- market factory and immutable market terms;
- pooled-collateral accounting;
- YES and NO outcome tokens;
- locked earliest request time, close condition, and final backstop;
- permissionless `requestResolution` with caller bond and evidence hash;
- atomic market freeze, snapshot, bond payment, and case opening;
- court callback/proof verification;
- YES/NO bond reimbursement and pro-rata market settlement;
- insufficient-information void settlement;
- early insufficient-information reopen and cooldown;
- technical-failure settlement;
- burn-and-redeem functions; and
- exact fee/refund events.

Suggested market terminal states:

```text
Open
ResolutionRequested
InCourt
Appealable
ReopenedAfterInsufficientInformation
SettledYes
SettledNo
VoidInsufficientInformation
CancelledUnfundedForResolution
CancelledCourtUnavailable
```

Do not store reserve balances, target percentages, quote expiries, or creator top-up state.

## C3. Web app and SDK

Update:

- generated contract ABIs;
- `web/src/lib/calldata.ts`;
- `web/src/lib/court.ts` and all receipt/event types;
- `web/src/components/LiveBallot/index.tsx`;
- active-case tally and final receipt screens;
- escrow submission and settlement screens;
- the sandbox core-court simulation;
- resolution SDK result types; and
- deployment capability detection so Boolean legacy receipts remain readable.

The SDK should return a tagged union instead of a Boolean:

```ts
type CourtResult =
  | { kind: 'merits'; ruling: 'YES' | 'NO' | 'INSUFFICIENT_INFORMATION'; tally: Tally }
  | { kind: 'technical-failure'; reason: 'INITIAL_DRAW_TIMEOUT' | 'QUORUM_FAILURE' };
```

The market UI should show no pre-betting court-fee estimate. Before trading, disclose in one sentence that any eligible caller may post the resolution bond; YES or NO returns it from the pool, while insufficient information uses it to pay the court. At request time, show the exact bond and one plain-language consequence line. At settlement, show the bond result and any YES/NO allocation before advanced details.

## C4. Documentation, diagrams, and simulations

The following sources currently encode the superseded reserve/quote design and must be changed together during implementation:

- `prediction-market.md`
- `omenmarketmaker.html`
- `demothemis.html`
- `bootstrap-loop.html`
- `governance.html`
- `run-through.html`
- `assets/run-through.js`
- `assumptions.js`
- `break-the-court.html`
- `contradiction-review.html`
- proposal smoke tests and generated public copies
- `DemoThemisMVP/docs/MECHANISM_DELTA.md`
- grant application, budget, portal, and downloadable archive where they describe fee or outcome behavior

Required narrative replacements:

- “reserve funded before betting/draw” becomes “an eligible caller posts the deterministic court fee as a resolution bond when requesting review”;
- token graduation no longer depends on court funding;
- underfunded reserve/top-up branches disappear;
- initial `quote` language becomes `court fee` or `fee calculation`;
- `INVALID` becomes `INSUFFICIENT_INFORMATION`, with a defined void settlement;
- “tie or no quorum becomes NO/status quo” is removed from the new design;
- no-quorum remains a technical failure path;
- diagrams show the bond paying DemoThemis once and a directional ruling reimbursing the bond once from pooled collateral; and
- every settlement example reconciles gross collateral, posted bond, bond reimbursement, court fee, Omen fee, and holder redemptions.

Keep the current MVP's fixed 20 MUSD behavior explicitly versioned until new contracts are deployed. Do not rewrite historical deployed receipts as if they used the future market integration or three-state ruling.

---

# Test plan

## D1. Contract unit tests

Add tests for:

1. YES, NO, and explicit insufficient-information votes encode, commit, reveal, tally, and emit correctly.
2. No strict directional majority yields `INSUFFICIENT_INFORMATION` once quorum exists.
3. A missing quorum follows retry/technical failure and never yields insufficient information.
4. An unresolved case exposes `Answer.Unset`, never a default NO.
5. The market cannot maintain two active requests, reuse a case ID, or pay the court twice.
6. The court calculates the fee internally and rejects caller-selected fee amounts.
7. The pricing epoch is derived from the accepted request block or locked backstop, never caller input.
8. A successful request atomically freezes the market, takes the exact bond, pays the fee, and opens one case.
9. A failed opening leaves all market balances and state unchanged.
10. `maximumBond` reverts safely when it is below the policy fee and never changes the policy fee.
11. A first-draw timeout returns the unused fee through the market to the recorded bond payer.
12. A post-draw fee is never increased by workload, supply, retry, or time changes.
13. Party exclusion and same-dispute juror non-reuse still hold for every panel and appeal.
14. The escrow callback handles all three merits rulings and every technical terminal reason.
15. Legacy Boolean receipt decoding remains isolated to legacy deployments.
16. A directional final ruling reimburses the bond exactly once and charges YES/NO backing pro rata.
17. Insufficient information never reimburses the fee from market backing.
18. Early insufficient information reopens only after its cooldown; the backstop path voids permanently.
19. A market cannot be created without a deterministic close condition and final backstop.

## D2. Money examples

Use the same `$100 YES / $200 NO / $30 court fee` fixture everywhere:

- request: the caller posts a `$30` bond and the court receives it;
- YES or NO final: `$10 YES / $20 NO` reimburses the caller's `$30`; `$270` remains before the separately calculated Omen fee;
- insufficient information: the caller's `$30` pays the court; the full `$100 YES / $200 NO` remains, with no Omen fee;
- court never drawn: the unused `$30` returns to the caller; the market pool was never charged;
- fee at or above `$300`: no court case opens and the full pool follows the cancellation rule.

Add rounding fixtures with uneven six-decimal amounts and assert exact conservation.

## D3. Invariants and fuzzing

Required invariants:

```text
gross pool + resolution bond posted
= court fee retained
 + bond reimbursement
 + Omen fee paid
 + holder redemptions
 + collateral still locked
```

```text
directional ruling => YES fee share + NO fee share = bond reimbursement = court fee
insufficient information => YES fee share + NO fee share = bond reimbursement = 0
```

```text
No case ID => no bond or court fee may leave the requester
```

```text
One market => at most one active initial court case and one active resolution bond
```

```text
Technical failure != insufficient-information merits ruling
```

```text
No final ruling or terminal technical reason => no market redemption
```

Fuzz side ratios, fee sizes, token supplies, transfers before close, appeal outcomes, first-draw refunds, callback reentrancy, fee-on-transfer/unsupported tokens, and rounding at six decimals.

## D4. End-to-end acceptance

The release is complete only when all of the following are demonstrated:

- a market opens and trades without any jury reserve or estimated jury target;
- token graduation ignores court-funding state;
- every event-driven market has an objective close condition and final backstop;
- one permissionless transaction freezes the market, posts the caller's exact bond, pays DemoThemis, and opens a locked case;
- the panel UI offers all three answers and preserves/reveals the correct ballot secret;
- YES, NO, and insufficient-information cases each settle with exact receipts;
- a directional ruling reimburses the caller once from YES/NO backing pro rata;
- early insufficient information reopens after a cooldown, while the final backstop path returns full side backing and charges no Omen fee;
- a small pool cancels automatically without opening or underpaying a jury;
- a pre-draw court failure returns the unused bond without charging the market;
- a quorum failure is displayed as technical failure, never NO or insufficient information;
- an insufficient-information appeal can reach a fresh, disjoint larger panel;
- all docs, diagrams, calculators, simulations, generated copies, and the grant archive use the same lifecycle and money equations; and
- the contradiction review removes H-06 and M-07 only after these implementation and documentation checks pass.

---

# Implementation order

1. **Freeze the specification.** Add shared enums, terminal reasons, fee inputs, money equations, and consumer settlement policies to one mechanism specification.
2. **Build and prove court v3.** Implement the three-state ballot/tally, explicit technical reasons, immutable fee policy, market entry point, callbacks, events, and Foundry tests.
3. **Build Omen settlement contracts.** Implement pool accounting, outcome tokens, bonded permissionless requests, freeze/backstop rules, directional reimbursement, callbacks, reopen/void/cancellation, and invariants.
4. **Update escrow consumers.** Replace prepaid percentage fees in the complete-product path and lock an insufficient-information split with each agreement.
5. **Update SDK and applications.** Regenerate ABIs, add tagged result types, third ballot choice, three-way tallies, exact fee receipts, void redemption, and legacy-version routing.
6. **Update simulations and public material.** Remove every reserve/target/top-up branch, replace `INVALID`, and regenerate all public/build/archive copies from the new rules.
7. **Security review.** Audit reentrancy, double submission, fee rounding, callback authentication, token behavior, domain-separated ballots, technical recovery, and cross-version receipt parsing.
8. **Deploy as a new version.** Source-verify the fee policy, court, market, escrow, and token contracts; publish manifest capabilities; run real three-outcome and fee-conservation transactions; then switch supported integrations.

## Explicit non-goals

- This plan does not modify the immutable legacy deployment.
- It does not make a tiny pool capable of paying a human jury without enough collateral or an explicit subsidy.
- It does not remove the separate appeal-funding goal.
- It does not let the court decide market, escrow, parlay, or lending payouts; consumers precommit those rules.
- It does not treat lack of juror participation as lack of evidence.
- It does not promise fixed-dollar directional redemption after choosing to reimburse a future resolution bond from pooled collateral.
