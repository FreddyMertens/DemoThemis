# Live Demo MVP upgrade plan

Updated: 2026-07-14  
Status: the core three-juror oracle and UX refinement are deployed; the five-minute voting windows are configured; production activation still awaits the keeper secret, exactly three World ID jurors, and the first complete mainnet case

## Outcome

The MVP becomes a small verified-human resolution oracle:

> **One public question. Three verified humans. One on-chain answer.**

Jurors independently research a real public question, seal their votes, reveal them, and the contract records the majority answer and distributes the valueless demo fee.

This is a demonstration of the real court process. It is not an attack simulator, an escrow product demo, or a claim that a three-person pool proves security at scale.

## Implementation status

Already deployed at [demothemis.netlify.app/app](https://demothemis.netlify.app/app):

- The 21-question bank, exact-byte hashes, fixed official opener, and validator
- A dry-run-by-default keeper that enforces the queue, exact three-juror pool, five-minute minimum voting windows, and non-juror opener
- Chain-derived commitment, reveal, ruling, payment, and transaction receipts
- The focused **Live case** and **Submit a case** screens in both the proposal preview and full app
- Real World App sealing/reveal flow with the ballot secret saved before transaction submission
- Redirected legacy product routes and removed sandbox/testing status from primary navigation
- A five-minute keeper workflow that advances at most one operator step per run after its mainnet opener secret is configured
- Five-minute seal and reveal windows, configured on-chain in [transaction `0x429d…66ca`](https://worldscan.org/tx/0x429dfd1ad1aa5e0f628ea02c47950e440ad658b38540401d8ae045f3316866ca)

Included in this UX refinement release:

- A shorter hero that brings the live product into the first screen instead of placing it more than one screen below the page opening
- Reliable reveal behavior: hero actions and top navigation select, focus, and scroll to the requested Live case or Submit a case panel
- One mobile product switcher instead of two competing Live/Submit controls
- Complete keyboard behavior for the two tabs, including arrow, Home, and End keys
- Clearer form labels, separate helper text, a visible UTC conversion, and 16 px mobile inputs that avoid phone browser zoom
- Larger supporting text and stronger touch targets without adding new content or steps

Production activation still requires configuring the keeper secret, three real Production World ID registrations, and completing question one. The keeper deliberately blocks before those conditions are met. On 2026-07-14 the live court had **0 jurors**, **300-second seal and reveal windows**, **0 official questions filed**, and **no configured mainnet keeper secret**.

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
- Keep the configured five-minute commit and reveal windows for the official demo. This is operator configuration, not another public product step.

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

## Previous production baseline versus this release

Audited on 2026-07-14 by comparing production commit `c4fce46` at [demothemis.netlify.app/app](https://demothemis.netlify.app/app) with this release.

The previous comparison against the simulator-led MVP is now historical: commit `c4fce46` already deployed the new oracle concept. This release does not change the product model or add complexity. It makes that product quicker to find, easier to operate, and easier to read.

| Area | Previous production commit `c4fce46` | This UX refinement release |
|---|---|---|
| Product model | One public question, three verified humans, one on-chain answer | Unchanged |
| Main views | Live case and Submit a case | Unchanged |
| Question flow | One official question at a time from the 21-question queue | Unchanged |
| Hero depth | At 1365 × 768, the hero is about 821 px tall and the live panel begins around y=1010—below the first screen | The compact hero is about 480 px in local inspection and places the live panel within the first screen |
| Headline scale | About 89 px at the audited desktop width; it dominates the page and can wrap into six lines | Capped at 4 rem and held to three deliberate desktop lines while preserving the same message |
| Hero action | Selects Live case but does not reliably reveal the panel | Selects, focuses, and scrolls to the live panel |
| Top navigation | Submit a case changes the URL while the form remains below the fold | Both links target the matching panel and place it below the sticky header |
| Mobile navigation | A fixed Live/Submit dock repeats the product tabs | The duplicate dock is removed; one sticky tab switcher remains |
| Tab accessibility | Mouse/touch selection works, but keyboard tab behavior is incomplete | Roving focus plus Left, Right, Home, and End keys |
| Form clarity | Labels include helper copy in their accessible names; local time has no visible UTC check | Concise labels, connected helper text, and a visible stored-as-UTC value |
| Mobile inputs | Roughly 12.5 px and liable to trigger phone browser zoom | 16 px inputs with the same three-field form |
| Supporting text | Several status and juror details are around 10–11 px | Important supporting details are enlarged without lengthening the page |
| Touch targets | Some logo, receipt, and transaction links are smaller than a comfortable phone target | Key targets are at least 44 px tall |
| Horizontal overflow | None found | None found |
| Added product steps | None | None |

### Comparison verdict

- **Concept:** already upgraded and correctly focused on a simple three-juror oracle.
- **Usability:** the next release is a clear improvement because users reach the working product sooner and navigation visibly completes the action they requested.
- **Complexity:** unchanged; the release removes a duplicate mobile control and keeps the same two views and three submission fields.
- **On-chain proof:** unchanged until activation. The site cannot honestly demonstrate a completed live ruling until three jurors register, the keeper is enabled, and question one resolves.

## What this upgrade does not require

- No new arbitration contract for the controlled reviewer demo
- No new queue contract
- No change to the three-seat panel parameters
- No public free-form case filing
- No escrow workflow
- No simulation engine
- No claim that the three-person demo proves population-scale security

A hardened public launch would be a separate upgrade because it needs contract-level case admission control or an isolated court instance.
