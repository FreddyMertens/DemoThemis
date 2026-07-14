# Live Demo MVP upgrade plan

Updated: 2026-07-14  
Status: implemented in code; production activation awaits the keeper secret, exactly three World ID jurors, human-safe voting windows, and the first complete mainnet case

## Outcome

The MVP becomes a small verified-human resolution oracle:

> **One public question. Three verified humans. One on-chain answer.**

Jurors independently research a real public question, seal their votes, reveal them, and the contract records the majority answer and distributes the valueless demo fee.

This is a demonstration of the real court process. It is not an attack simulator, an escrow product demo, or a claim that a three-person pool proves security at scale.

## Implementation status

Implemented in this repository:

- The 21-question bank, exact-byte hashes, fixed official opener, and validator
- A dry-run-by-default keeper that enforces the queue, exact three-juror pool, five-minute minimum voting windows, and non-juror opener
- Chain-derived commitment, reveal, ruling, payment, and transaction receipts
- The focused **Live case** and **Submit a case** screens in both the proposal preview and full app
- Real World App sealing/reveal flow with the ballot secret saved before transaction submission
- Redirected legacy product routes and removed sandbox/testing status from primary navigation
- A five-minute keeper workflow that advances at most one operator step per run after its mainnet opener secret is configured

Production activation still requires configuring the keeper secret, three real Production World ID registrations, setting both voting windows to at least five minutes, and completing question one. The keeper deliberately blocks before those conditions are met.

The deployed registry has no hard maximum. The app stops offering new seats when it reads three active jurors, but a concurrent or direct registration can still take the pool above three. In that state the official queue pauses; an active juror can use **Leave jury** on the onboarding screen to return the pool to exactly three and recover the valueless demo bond.

The deployed court also accepts cases from other callers. The app quarantines anything that does not match the exact official type, URI, opener, and hash, and the keeper will not open or draw the next official case while an outside case is unresolved. This makes the upgrade suitable for a controlled reviewer demo, not an adversarial public launch: contract-level admission control or an isolated deployment would be required to prevent an outside caller from drawing the same jurors.

## Locked product decisions

- Use the deployed World Chain mainnet court with `PANEL_SIZE = 3` and `MIN_POOL = 3`.
- Register exactly three real World ID humans for the official demo.
- Use yes/no public-information questions only. Escrow is outside the primary MVP.
- Prepare 21 real questions in a fixed order, but expose only one active question at a time.
- File the next prepared question only after the current question resolves.
- The submitter supplies no evidence, links, or preferred sources.
- Jurors research independently before sealing their ballots.
- Keep attack, failure, testing-progress, simulation, and roadmap content out of the public MVP journey.
- Keep MUSD clearly described as a valueless demonstration token.
- Do not redeploy the contracts merely to add a queue. The official app/operator flow controls the sequence.
- Before question one opens, change the current 60-second commit and reveal windows to human-safe demo windows (recommended: five minutes each). This is operator configuration, not another public product step.

## The two-tab MVP

Both the `/mvp` preview and the full app should present the same two views.

### 1. Live case

This is the default tab. It shows only the current official question:

- The yes/no question
- **YES if:** the exact rule that makes the answer YES
- **Judged as of:** the relevant date or time
- Current phase: panel, seal, reveal, or resolved
- Ballots sealed: `0/3` to `3/3`
- Ballots revealed: `0/3` to `3/3`
- The one action available to the connected juror
- A Worldscan link for every completed on-chain stage

Juror instruction:

> Research the question independently using public information. Prefer primary records; when no single official record exists, confirm the answer with at least two credible sources. Do not coordinate with the other jurors.

After resolution, the view becomes a permanent receipt containing the three panel wallets, commitments, reveals, tally, ruling, fee distribution, and transaction links. The next question then becomes the live case; earlier receipts remain available in a compact history.

Do not display the 21-question bank as a public testing-progress tracker. Reviewers see the current case and previous rulings, not an internal test checklist.

### 2. Submit a case

This tab shows the app-style filing experience on the MVP page. It contains only:

1. **Yes/no question**
2. **YES if**
3. **Judged as of**
4. **Case fee: 2 MUSD**
5. **Review question**

It contains no evidence upload, evidence link, public-source field, or source recommendation. The submitter defines the question, not the research material.

During an active case, the tab may show the next prepared question but cannot activate it. Its concise state is:

> The next question opens after the current ruling.

For the official demo, only the separate non-juror opener/operator wallet activates a prepared question. This prevents the form from creating a second live case and keeps the 21-question sequence deterministic. The tab demonstrates the real submission payload without pretending that unrestricted public filing is part of this MVP.

## The 21-question bank

Store a version-controlled manifest and 21 immutable question files. A question contains only:

```json
{
  "sequence": 1,
  "title": "Short question label",
  "type": "question",
  "standard": "public-research",
  "question": "Did the stated public event occur by the specified time?",
  "yesRule": "Vote YES only if the event occurred on or before the stated time.",
  "judgedAsOf": "2026-07-01T18:00:00Z",
  "simulated": false
}
```

Every question must be:

- Answerable using publicly available information
- Binary and neutrally worded
- Governed by a precise YES rule
- Tied to a precise relevant time
- Suitable for independent research
- Free of private data and submitter-selected evidence
- Stable enough that three reasonable researchers can reach a defensible answer

The exact question file is hosted at its case URI and hash-anchored when opened. Changing its bytes breaks the on-chain fingerprint.
The manifest stores that exact hash and the fixed official opener address, so look-alike cases using the same URI are ignored by both the app and keeper.

## Sequential case operation

The official sequence is:

1. Three distinct humans register with World ID and post the valueless 5 MUSD bond.
2. The operator sets human-safe commit and reveal windows before the first question.
3. A separate non-juror opener files the next prepared question for 2 MUSD.
4. The operator/keeper draws the three-person panel.
5. All three jurors independently research and seal a vote.
6. All three jurors reveal the saved vote.
7. The keeper submits the permissionless resolution transaction.
8. The contract records the tally, ruling, and 70/20/10 fee distribution.
9. The resolved case becomes a permanent receipt.
10. The keeper files the next prepared question.

The opener must not be one of the three jurors because the deployed contract excludes a question's opener from its panel.

Add one small mainnet queue keeper that:

- Refuses to open a question unless three jurors are active
- Refuses to open a question while an official queue case is unresolved
- Selects the next unfiled manifest entry
- Hashes and opens that exact file
- Draws when the draw block is ready
- Resolves after the reveal period
- Opens the next question only after resolution succeeds

The deployed contract still permits other callers to open parallel cases. The honest claim is therefore **one active case in the official demo series**, not **the contract can contain only one case**. Enforcing a global single-case rule would require a wrapper or redeployment and is deliberately outside this minimal upgrade.

## Interface changes

### Replace

- Sandbox-led `/mvp` preview with the two-tab app view
- `/app` robustness missions with the live-case dashboard
- Generic `/home` case board and filters with one active case plus compact receipts
- `/dispute` escrow/question preview with the minimal submission view
- Local `/juror-preview` practice journey with the real active-case route
- Technical and failure demonstrations in the default juror view with one current action

### Remove from primary MVP navigation

- Sandbox and attack simulator
- “Test fresh panels” mission
- Simulated jurors and simulated case data
- Escrow submission and escrow examples
- Testing-progress, pending-capstone, and roadmap status
- Redraw, no-show, missing-secret, and failure demonstrations

Error handling remains in the product, but errors are no longer presented as the purpose of the demo.

### Keep and reuse

- Real World ID onboarding and nullifier protection
- 5 MUSD Permit2 bond flow
- Mainnet contract reads
- Real commit and reveal transactions
- Locally preserved ballot secret between commit and reveal
- Existing `openQuestion`, `draw`, and `resolve` contract methods
- Existing immutable court events

## Read model and receipts

Extend the app's chain reader to derive:

- The official unresolved queue case
- Commitment count across the three panel wallets
- Reveal count and revealed votes
- Final YES/NO tally
- Juror payments and the 70/20/10 distribution
- Transaction hashes for `CaseOpened`, `PanelDrawn`, `Committed`, `Revealed`, `Resolved`, `FeePaid`, and `FeeDistributed`

The app should never invent progress locally. The live state and every receipt come from World Chain reads and logs.

## Honest on-chain wording

Use:

- “All court actions, the ruling, and reward distribution are on-chain.”
- “The exact question is integrity-anchored on-chain.”
- “Votes remain sealed until reveal.”
- “The official demo presents one active case at a time.”

Do not use:

- “Every piece of information is on-chain.” Juror research and hosted question text are off-chain.
- “Only one case can exist.” The official queue, not the contract, provides that restriction.
- “Random selection protects this three-person demo.” With three jurors and three seats, all three are selected.
- “Votes stay private.” Revealed votes become public in this commit/reveal MVP.
- “World ID verifies the correct answer.” It verifies distinct humans.
- “Real payments.” MUSD has no monetary value.
- “The oracle guarantees truth.” It records the three humans' majority answer.

## Implementation order

1. Define and validate the 21-question schema, manifest, and files.
2. Add the queue-aware reader and mainnet keeper.
3. Build commitment/reveal counters and full event-backed receipts.
4. Replace the public MVP with the two-tab live-case/submission experience.
5. Simplify the real juror case screen to one current action.
6. Remove or redirect the simulated routes from the primary MVP journey.
7. Register three real humans and complete one mainnet case.
8. Verify that its receipt persists and the next question opens correctly.

## Acceptance criteria

- The main MVP has only **Live case** and **Submit a case** as its product tabs.
- The public MVP contains no attack, simulator, failure, testing-progress, or escrow-led journey.
- Three distinct Production World ID humans are active before question one opens.
- The opener is not one of the three jurors.
- No submission form, question file, or case screen asks for evidence or source links.
- Only one official queue question is unresolved at a time.
- The next prepared question cannot activate until the current one is resolved.
- Every active case displays its exact question, YES rule, and relevant time.
- All three commitments and all three reveals are real World Chain transactions.
- The resolved receipt shows the tally, ruling, payments, and transaction links.
- Resolved receipts survive refresh and remain available after the next case opens.
- At least one complete real three-juror case succeeds before the MVP is presented to reviewers.
- The scheduled keeper is enabled with the fixed opener secret, or an operator is assigned to run the same one-step command throughout the review.
- The default app experience works at 320 px width and with keyboard navigation.

## Current deployment versus this upgrade

Audited on 2026-07-14 at `https://demothemis.netlify.app`.

| Area | Current deployed MVP | Implemented upgrade |
|---|---|---|
| Main purpose | Stress-test court defenses | Demonstrate one real verified-human resolution |
| Landing message | “See why this verdict is hard to buy” | “One public question. Three verified humans. One on-chain answer” |
| Entry journey | Local sandbox and three guided missions | One live chain-backed question |
| Public surfaces | Play, Guided demo, and Court | Live case and Submit a case |
| Court view | Generic all/active/resolved case board | One official active case plus compact receipts |
| Live state | 3-seat/3-minimum contracts, 0 jurors, 0 cases | Three real jurors and a sequential case series |
| Voting windows | 60-second commit and reveal windows | Human-safe windows configured before question one |
| Case types | Escrow and yes/no question previews | Yes/no public questions only |
| Submission | Separate disabled preview, escrow selected by default | Minimal app-view tab with question, YES rule, time, and fee |
| Submitter material | Case JSON may contain selected evidence links | No evidence or source submission |
| Juror research | Guided by linked case evidence | Independent public research under one global rule |
| Juror experience | Local practice journey is promoted | Real World App commit/reveal is the only juror journey |
| Questions | Mixed sample and simulated cases | 21 pre-screened real questions in a fixed order |
| Concurrency | Contract and board support many cases | Official demo exposes one unresolved queue case |
| Resolution display | Short result card | Permanent event-backed receipt with Worldscan links |
| Advancement | Manual capstone script; no queue | Keeper advances only after a successful resolution |
| Automation | Two-hour cohort test keeper only | Five-minute mainnet queue workflow, activated only by the fixed opener secret |
| Admission boundary | Local sandbox is isolated from mainnet case admission | UI and keeper quarantine outside cases; the unchanged court remains permissionless, so this is a controlled demo |
| Tone | Robustness, attacks, simulation, and scope caveats | Successful process, independent judgment, and verifiable result |

## What this upgrade does not require

- No new arbitration contract for the controlled reviewer demo
- No new queue contract
- No change to the three-seat panel parameters
- No public free-form case filing
- No escrow workflow
- No simulation engine
- No claim that the three-person demo proves population-scale security

A hardened public launch would be a separate upgrade because it needs contract-level case admission control or an isolated court instance.
