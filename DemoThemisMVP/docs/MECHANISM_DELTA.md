# MECHANISM_DELTA — MVP vs the full DemoThemis design

The full mechanism lives in the pitch site (`reference/demothemis-site/`, chapters 2/3/8). The MVP deliberately builds a smaller thing: a complete, honest map of what's shipped vs. what's funded — we know exactly what's left and have priced it as the roadmap below. The honesty rule: simulated data is labeled simulated, everywhere. The source-verified Step-5 mainnet contracts already call the official World ID 4 Production proxy, but their court bytecode predates the eligible-party preflight, first-draw unwind, quorum-miss recovery, and immutable voting windows now implemented in source. The replacement keeps v4, disables legacy proofs, and deploys the current court. The old addresses are historical evidence, not the capstone target; real human usage begins only after a fresh replacement deployment. No human has registered yet.

### What's real on-chain vs. what's simulated

| ✅ Real & on-chain today (mainnet, source-verified) | ◷ Simulated / roadmap (labeled, funded-milestone) |
|---|---|
| Replacement source verifies a World ID 4 proof-of-human **in the transaction** (`WorldIDVerifier.verify`), with legacy proofs disabled; deployment pending | Receipt-free MACI ballots — milestone #2 |
| Identity-derived **nullifier sybil gate** (one human, one seat, every wallet) | VRF / drand draw randomness — milestone #1 |
| **Wallet-bound** proof (a stolen proof reverts) | Appeal ladder (7→15→31 seats) — milestone #3 |
| Random panel drawn **after** the question | Parallel pᴺ panels above a value line — milestone #3 |
| Commit / reveal voting | Juror reputation / Wilson gate — milestone #3 |
| 70/20/10 fee split + 2% escrow fee; **slash-to-pool, never to winners** | Reward-pool cyclic payout — milestone #3 |
| **Atomic** escrow settlement (`resolve → escrow.settle`) | Deterministic court-fee engine + reusable resolution SDK — milestones #3–4 |
| **No runtime admin override**: one-shot wiring, immutable voting windows, and permissionless lifecycle transitions | (external security review — milestone #5) |
| 100-test verified Foundry snapshot plus current v4 binding/schema, invariants, fuzz, and exact-3/3 party-exclusion, first-draw, and retry-recovery regressions; replacement deployment pending | |

## On-chain in the MVP (the five contracts)

| Area | Full design | MVP | Why / where it returns |
|---|---|---|---|
| Sybil gate | World ID proof verified on-chain in the registry | Abstracted behind `ISybilGate`. The **Sepolia cohort uses `MockSybilGate`**, a labeled stand-in. Both the immutable legacy mainnet instance and replacement source use the v4 verifier; only the replacement enforces the current v4-only release marker and proof-of-human schema. | Real personhood is demonstrated at the capstone after replacement deployment. The archived Staging/Simulator trace remains labeled test evidence. |
| Juror anonymity | One-case pseudonyms and receiving keys; encrypted ballots hide identity and vote; exact reputation, reserve, case history, individual payments, penalties, and refunds stay private. The public gets eligibility/reserve proofs, the aggregate tally, and aggregate accounting. | **Juror addresses and revealed votes are fully public on-chain.** | Encrypted/receipt-free ballots plus private consequence accounting are funded milestones #2–3. Commit/reveal stands in. |
| Ballot secrecy | Receipt-free (MACI-style threshold encryption + silent re-keying). The reference **explicitly rejects commit/reveal**: "a voting system that can prove obedience is a voting system with a payment rail bolted on" (breaking-the-court.html). | **Commit/reveal** — a juror can reveal their salt to prove their vote, so it is vote-buyable in principle. A known-insufficient *stand-in*, not the design. | Receipt-freeness is funded-milestone #2; the sandbox contrasts the two and the attack demo shows why it matters. |
| Slash destination | Every slashed dollar → the **reward pool, never to the winning jurors**; individual debits stay private while only the aggregate transfer and its proof are public. | **Honored on-chain but not private.** Slashes (and the 20% reward cut) flow to `RewardPool`; jurors are paid only the 70% fee cut. | The destination rule is implemented; private consequence accounting returns with funded milestones #2–3. |
| Fee split | 70 jurors / 20 reward pool / 10 protocol (run-through.html) | **70 / 20 / 10 on-chain.** | Implemented. |
| Reward-pool payout | The pool **pays active, high-quality jurors privately** through a gated cyclic distribution (Wilson-gated, recency-weighted); only the aggregate and its proof are public. It **rewards jurors, never compensates victims**. | **Passive sink on-chain.** `RewardPool` receives the 20% cut + every slash + rounding dust and exposes only `balance()`. It has **no payout/distribute function at all**. | The private gated distribution is funded-milestone #3 and is shown only in the sandbox. The MUSD-conservation invariant treats the pool as a terminal balance, so adding an on-chain payout would break it (and is flagged as scope creep in the plan, §11). |
| Wrong-side slashing | A private margin-scaled debit is settled **post-appeal** and privately reversed if vindicated; the public sees only proved aggregate accounting | **Deferred.** Minority voters are not slashed on-chain; only no-shows are penalized (a public liveness forfeit → reward pool). | First-round coherence slashing is the conformity machine the reference warns against — it needs the appeal ladder to be fair. Private slash-to-truth + ladder + vindication returns in milestone #3. |
| Draw randomness | drand / VRF | **`blockhash`-based** two-step draw (records `drawBlock = block.number + 1`, anyone cranks once it exists). Kills panel precompute, but is sequencer-influenceable in principle. | drand/VRF is funded-milestone #1. Documented limitation. |
| Voting clocks / administration | Fully automatic, immutable case rules. | Commit and reveal durations are immutable constructor parameters with an on-chain five-minute minimum. There is no duration setter; draw, timeout, and resolution transitions are permissionless. `setCourt` and `setEscrow` are one-shot deployment wiring and cannot be changed afterward. | Removes the open-before-draw timing-control gap without adding governance or an operator key. |
| Party eligibility + first draw | Parties are never eligible to judge their own case. | Before funds or escrow state lock, the court requires at least `MIN_POOL` active jurors after excluding the question opener or both escrow parties. Every accepted case gets a fixed one-hour first-draw deadline. If no panel forms, anyone can cancel/unwind without a merits ruling; the entire unused fee returns to the opener/payer and escrow principal returns to the payer. `InitialDrawTimedOut` distinguishes this from a NO ruling despite the compatibility `Resolved(false,0,0)` event. | An exact-three active party is rejected atomically instead of creating an undrawable case. The immutable deadline covers later withdrawals without letting funds wait forever. |
| Dispute ladder + parallel panels | Panels 7 → 15 → 31 with a conserved appeal quote: a non-refundable service fee pays panel work + delay once, and separate security principal returns on success or is forfeited on failure; **above a value line, N independent panels (1/3/5) that must all agree**, so capture odds multiply `pᴺ` and attack cost rises with the pot past the 31-seat ceiling | **Single panel**, one retry after a quorum miss, then status quo. The retry has a separate fixed one-hour recovery deadline; if no panel can form, anyone can finalize status quo. No ladder or parallel panels are on-chain. | All panel-scaling structure is sandbox-only; the bounded recovery prevents the MVP lifecycle and escrow principal from waiting forever after a quorum miss. |
| Juror reputation | Private baseline-credited reputation commitments, Wilson 0.70 suspension gate, and privately proved draw bands **capped at 3× a newcomer**; exact scores and case histories are never public | **None on-chain** — the MVP draws uniformly at random, so there is no reputation weighting to cap. | Sandbox-only; private commitments and proofs return in milestone #3. |
| Economic parameters | A deterministic court fee prices processing, expected panel work, reward-pool top-up, and capped operations from locked case inputs at request time. For prediction markets, an eligible caller posts that exact fee as a bond; YES/NO reimburses the caller pro rata from both sides, while Insufficient information does not. | **Fixed**: $5 bond, 20 MUSD question fee, 2% escrow fee, 7/14 (cohort). The recommended replacement is 3 seats / minimum 4 eligible; the contract remains fund-safe at minimum 3 through timeout/unwind, but then has no one-withdrawal adjudication reserve. The active pool has no maximum. | MVP uses the replacement source's fixed 20 MUSD question fee; the deterministic court-fee and caller-bond path is a design-track item, not an MVP one; capture-resistance scales with the funded pool width, not the minimum demo size. |
| Withdrawal / rejoin | — | A withdrawn or fully slashed juror's **nullifier stays spent** (one seat per human); they post a fresh full bond rather than re-verifying. World App uses `postBondWithPermit2()` and other clients may use `postBond()`. | Keeps the sybil gate strict, restores liveness after a no-show, and preserves the active-juror/full-bond invariant. |
| Token | USDC / WLD | **MockUSD**, a valueless 6-decimal token with a public faucet, on every instance. Timeout refunds and escrow principal return through direct transfers, so this demo assumes its immutable trusted token cannot pause or blacklist recipients. | Production token choice is a funded-milestone decision; no real money is at stake anywhere. A generalized token integration should use pull/claim credits so recipient transfer policy cannot block terminal state. |
| Tie / no-quorum | — | An expired first-draw deadline is a cancellation/unwind with no merits ruling and returns the unused fee plus any escrow principal. Once a panel has voted, tie → status quo (question NO / escrow refunds payer). Fewer than ⌈panel/2⌉+1 reveals → one retry; re-bonded humans may be drawn again, while a second miss or expired redraw deadline finalizes status quo permissionlessly. | One juror must never decide a deal alone and a depleted pool must not brick an accepted case. An explicit **Invalid/void outcome** for genuinely ambiguous questions remains funded-milestone #3; today ambiguity after a vote defaults to status-quo-NO. |

## Simulated in the sandbox only (clearly labeled)

The full dispute ladder, juror reputation (Wilson-interval gate), private invite rooms, and populations of simulated jurors. All generated data, badged as simulation. Every accepted case in the simulator uses the verified-human court path.

## Out of the MVP entirely

Governance (both tokens, voting, the constitutional firewall); the prediction market as a product (parimutuel pools, ERC-20 graduation, order books); the post-Orb, per-draw on-device presence/continuity check (an anti-rental backstop, not an alternative eligibility credential); the justice-clock collusion audit; the reward-pool payout (the `RewardPool` **is** on-chain and accrues slashes + the 20% cut, but it is a passive sink — the Wilson-gated, recency-weighted cyclic distribution to active jurors is sandbox-only, funded-milestone #3); juror seniority gates; external audits.

## Funded-milestone roadmap (what the grant pays for, post-MVP)

1. drand/VRF draw randomness + mainnet deployment of the core court.
2. Receipt-free ballots (MACI-style, bonded coordinator v1) — hides juror addresses and votes.
3. Deterministic court-fee engine + juror reputation + dispute ladder on-chain + the reward-pool gated cyclic payout (Wilson-gated, recency-weighted distribution to active jurors).
4. Resolution / oracle SDK + first prediction-market integration (escrow/marketplace a later consumer of the same SDK).
5. Security review. (No external audit is claimed anywhere in the MVP.)
6. Juror UX hardening + moderated user-testing — the final step and the roadmap's largest line; AI makes the build cheap, so the weight goes to getting real verified humans through the juror loop.

## Step 3 — sandbox build notes (appended as the simulation was built)

The `/sandbox` engine ports the reference math verbatim so its numbers match the pitch
site exactly. A few details where the simulation is narrower than the prose, or differs
from the on-chain core, are recorded here.

- **Appeal funding uses one conserved waterfall in the chapter and sandbox.**
  `panelCost = panel * FEE`; `delayCost = value * weeklyDelayRate * weeks`;
  `serviceFee = panelCost + delayCost`; and `securityBond = max(0,
  adjustedCaptureTarget - serviceFee)`. The public goal is exactly `serviceFee +
  securityBond`. A funded appeal consumes the service fee once. Success returns only the
  separately escrowed security principal pro-rata; failure sends only that security principal
  to the reward pool. A short round refunds every contribution and starts no work. The quote
  labels the source and destination of each component.

- **Case-fee number differs by widget, by design.** The replacement core court charges a
  **20 MUSD** case fee, and the sandbox core-court walkthrough mirrors that (with the
  70/20/10 split, integer-cent math, slashes + dust → reward pool). The reference
  attack/ladder math uses **FEE = $1.50** (`hybrid-juror-system.html`), and the
  bribe-price floor is `fee($1.50) + bondAtRisk($5) + reputationValue($0)`. Each sandbox
  widget keeps its own source-of-truth number rather than forcing one: the core-court
  widget mirrors the replacement court (20 MUSD), while the attack/ladder widgets mirror the reference ($1.50).
  Both are labeled.

- **`reputationValue = $0` in the bribe-price floor.** The full design adds the present
  value of a juror's future reward-pool income to the cost of corrupting them. The MVP has
  no on-chain reward-pool payout, so that term is zero. Noted in
  `web/src/lib/sim/attack.ts`.

- **The token-court model, based on systems like UMA and Kleros, is authored fresh** (no reference code exists for it):
  `P(flip) = 1` once `budget >= 0.5 * totalStake` at a chosen token price, plus a
  "second case free" reuse flag. The human-court side uses the ported combinatorics.

- **Everything in `/sandbox` is simulated.** Simulated juror populations, simulated
  per-juror accuracies, simulated cases. The route carries a fixed simulation badge and
  every widget carries a "simulated" tag. No sandbox number is presented as real usage.
  Every accepted case follows the verified-human court path. The seeded PRNG (mulberry32,
  fixed default seed) is for reproducibility of
  the curves and the "run 100 cases" sweep, not a randomness-security claim.

## Current production mapping — IDKit → `WorldIDVerifier.verify`

New mainnet deployments use `WorldIDGate` with the official World ID 4.0 Production
proxy `0x00000000009E00F9FE82CfeeBB4556686da094d7`, RP id
`rp_1ddcf8ba2efe3f36`, and action `juror-registration`. The World App requests
`proofOfHuman({ signal: wallet })`, requires `protocol_version === '4.0'`, and sets
`allow_legacy_proofs: false`. The gate decodes the v4 nine-field tuple below,
recomputes `hashToField(wallet)`, enforces RP/action binding and issuer schema 1,
then calls the verifier. The registry rejects a reused nullifier. The verifier,
RP id, and action are immutable; there is no administrator-controlled swap.

The release gate checks the deployment metadata and on-chain
`WORLD_ID_PROTOCOL_VERSION() == 4` marker before the mainnet keeper may broadcast.
The legacy `WorldIDRouterGate` remains only for reproducing v3 tests and deployments;
the deployment script cannot select it on World Chain mainnet.

## Archived Step 3.5 experiment — World ID 4.0 Staging verifier

This section preserves the historical experiment contract and encoding once shared by
the v4 gate (`contracts/src/sybil/WorldIDGate.sol`) and the archived probe
(`web/src/app/verify-onchain/page.tsx`). It is **empirically
verified** (a live `cast call` to the World ID 4.0 Staging verifier
`0x703a6316c975DEabF30b637c155edD53e24657DB` on WC mainnet returned `0x` for a valid World
ID Simulator `proof_of_human` v4 staging proof and reverted `0x7fcdd1f4` for a forged one).

The deployed verifier signature (arg order is fixed by the contract):
`verify(uint256 nullifier, uint256 action, uint64 rpId, uint256 nonce, uint256 signalHash, uint64 expiresAtMin, uint64 issuerSchemaId, uint256 credentialGenesisIssuedAtMin, uint256[5] proof)`
— it **reverts** on a bad proof and returns nothing on success.

| `verify` arg | type | source in the IDKit v4 response | notes |
|---|---|---|---|
| `nullifier` | uint256 | `responses[0].nullifier` | RP-scoped per-human nullifier; the registry rejects reuse (the sybil gate). Identity-derived, **independent of the signal** — so the same human on two wallets shares it. |
| `action` | uint256 | **computed**, not from the response: `uint256(keccak256("juror-registration")) >> 8` | The top-level `response.action` is the action *string*. The `>> 8` hashToField shift is REQUIRED: the un-shifted keccak exceeds the BN254 field and reverts `PublicInputNotInField()` (`0xa54f8e27`). Value: `0x00d6f0d2ac0113e07a903cc011df10d5da49fbd368c0ecc3c8257c9bce73e3ed`. |
| `rpId` | uint64 | the `rp_id` string with `rp_` stripped | `rp_1ddcf8ba2efe3f36` → `0x1ddcf8ba2efe3f36`. |
| `nonce` | uint256 | top-level `result.nonce` | The request nonce, echoed back. |
| `signalHash` | uint256 | `responses[0].signal_hash` | = idkit-core `hashSignal(signal)`. For an address signal (`0x`+40 hex) it is `keccak256(20 raw bytes) >> 8`, **byte-identical** to the gate's on-chain `uint256(keccak256(abi.encodePacked(addr))) >> 8`. The gate recomputes it from the registering wallet and asserts equality — **binding the proof to the wallet**, so a stolen proof fails. |
| `expiresAtMin` | uint64 | `responses[0].expires_at_min` | |
| `issuerSchemaId` | uint64 | `responses[0].issuer_schema_id` | `1` = proof_of_human. |
| `credentialGenesisIssuedAtMin` | uint256 | `0` | Absent in the response; pass 0. |
| `proof` | uint256[5] | `responses[0].proof` | First 4 elements are the Groth16 limbs, the **5th is the Merkle root**. Corrupting limbs 0–3 reverts `0x7fcdd1f4`; corrupting the Merkle root reverts `InvalidMerkleRoot()` (`0x9dd854d3`). |

**The gate's `bytes proof`** is `abi.encode(nullifier, action, rpId, nonce, signalHash, expiresAtMin, issuerSchemaId, credentialGenesisIssuedAtMin, uint256[5] proof)` — the eight v4 scalars in declared order plus the fixed `uint256[5]`. This is a **fully static** 416-byte blob; the array MUST be encoded as `uint256[5]` (fixed), never a dynamic `uint256[]`. This encoding is **distinct from `MockSybilGate`'s** 2-tuple `abi.encode(uint256 nullifier, address signal)` (the cohort/test gate) — do not conflate the two.

**The archived IDKit probe** (`verify-onchain/page.tsx`) used the `proofOfHuman` preset with
`allow_legacy_proofs: false` and **`environment: 'staging'`** (REQUIRED — it defaults to
`'production'`, which the World ID Simulator rejects outright), and passed the registering
**wallet address** as the `signal`. The historical Step-5 instance changed to the
Production environment and verifier. The current replacement uses that same official
Production proxy with stricter schema, configuration, and release checks.

**What is NOT simulated here:** the historical mainnet WorldIDGate ran a real proof check.
The only Step-3.5 concession is the **Staging** verifier + World ID **Simulator** identities
(so the path is proven human-free for cents); they are real v4 proofs verified by the real
verifier contract, labeled as Simulator-sourced in `docs/DEMO.md`. This proves the
v4 adapter behavior in Staging; production registration uses the v4 mapping above.

## Step 5 legacy court and v4 replacement

The legacy mainnet instance (chain 480) deploys the same five contracts against the
official World ID 4 **Production** verifier
(`0x00000000009E00F9FE82CfeeBB4556686da094d7`, capable of checking multiple credential schemas), with a 3-seat / minimum-3
court. It remains source-verified evidence for the Step-5 additions below, but its immutable
court lacks case-specific eligibility checks, a bounded first-draw unwind, and bounded quorum
recovery, so it must be replaced before the capstone. The replacement uses `WorldIDGate`
with v4-only proof-of-human verification and admits Orb-verified jurors only. Device-level verification is not an eligibility fallback;
the complete design uses a separate post-Orb presence/continuity check at each draw.
It keeps the three-seat panel, uses a recommended
`MIN_POOL >= 4`, adds Permit2 re-bond, checks the eligible pool before accepting funds,
returns unused fees and escrow principal when the first draw times out, and allows an active
pool wider than three. See `docs/LIVENESS_RECOVERY.md`.

- **Permit2 bond deposit (the World App onboard path).** `JurorRegistry.registerWithPermit2`
  is added in Step 5: it runs the same one-human-one-seat enrolment as `register`, but pulls
  the 5 MUSD bond through canonical **Permit2** (`0x000000000022D473030F116dDEE9F6B43aC78BA3`,
  confirmed on WC mainnet) instead of a direct ERC-20 allowance. World App auto-revokes plain
  `approve(registry)` allowances but auto-approves tokens to Permit2, so the classic
  approve-then-register breaks in World App. The onboard sends one sponsored batch:
  `Permit2.approve(bondToken, registry, BOND, 0)` then `registerWithPermit2(signal, proof)`,
  which pulls the bond with `Permit2.transferFrom`. This is the **Allowance-Transfer** pattern
  the World docs document for Mini Apps (`docs.world.org/mini-apps/commands/send-transaction`),
  not Permit2 SignatureTransfer — chosen because it is the documented, signature-placeholder-free
  path that the installed `@worldcoin/minikit-js` supports. The classic `register` (ERC-20
  allowance) remains for the desktop/dev/cohort path and the B5 page.

- **B5 — the `/app/dev` paste-a-proof page.** A dev-only (`NEXT_PUBLIC_SHOW_DEV`) desktop tool:
  paste a World ID Simulator completion JSON, and the server (`/api/dev-register`,
  `DEV_PRIVATE_KEY`) abi.encodes the gate proof for the active instance and runs faucet +
  classic approve + `register`. On the cohort it drives `MockSybilGate`; on mainnet the real
  `WorldIDGate`. It exists to exercise registration from a browser without World App; it is not
  a user-facing feature and is off in production.

- **Sponsored transactions — honest status.** World App sponsors gas for verified humans on
  whitelisted Mini App transactions; the onboard (register), commit, and reveal use
  `MiniKit.sendTransaction` against mainnet. This write path runs **only inside World App** and
  cannot be exercised in a desktop browser or CI, so it is **verified on-device at the human
  capstone**, not before. Until that trace exists the UI copy (GasBadge, dispute/case notes) is
  deliberately forward-looking and does not claim a specific sponsored tx has succeeded — the
  honesty rule applied to a deferred-until-on-device feature. The commit/reveal commitment binds
  `keccak256(abi.encode(vote, salt, caseId, juror))` to the voter's wallet (vote + salt persist
  to localStorage so reveal can replay them).

- **What stays simulated / labeled.** Everything in §"Simulated in the sandbox only" is
  unchanged. The retired capstone fixtures are no longer shipped in `web/public`; only the
  current question queue and the labeled `MockSybilGate` cohort scale demo remain public.
