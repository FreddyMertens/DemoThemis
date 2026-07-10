# MECHANISM_DELTA — MVP vs the full DemoThemis design

The full mechanism lives in the pitch site (`reference/demothemis-site/`, chapters 2/3/8). The MVP deliberately builds a smaller thing: a complete, honest map of what's shipped vs. what's funded — we know exactly what's left and have priced it as the roadmap below. The honesty rule: simulated data is labeled simulated, everywhere; the non-simulated chain slice is the source-verified mainnet contracts plus the World ID verifier path; real human usage begins only after the 3-human capstone runs. No human has registered yet.

### What's real on-chain vs. what's simulated

| ✅ Real & on-chain today (mainnet, source-verified) | ◷ Simulated / roadmap (labeled, funded-milestone) |
|---|---|
| World ID 4.0 verified **in the transaction** (`WorldIDVerifier.verify`, real Groth16) | Receipt-free MACI ballots — milestone #2 |
| Identity-derived **nullifier sybil gate** (one human, one seat, every wallet) | VRF / drand draw randomness — milestone #1 |
| **Wallet-bound** proof (a stolen proof reverts) | Appeal ladder (7→15→31 seats) — milestone #3 |
| Random panel drawn **after** the question | Parallel pᴺ panels above a value line — milestone #3 |
| Commit / reveal voting | Juror reputation / Wilson gate — milestone #3 |
| 70/20/10 fee split + 2% escrow fee; **slash-to-pool, never to winners** | Reward-pool cyclic payout — milestone #3 |
| **Atomic** escrow settlement (`resolve → escrow.settle`) | Optimistic fast path (~95% settle free) — milestone #3 |
| **No admin override** (wire-once + phase clock are the entire admin surface) | (external security review — milestone #5) |
| 77 Foundry tests (invariants + fuzz), >90% coverage, all sources verified | |

## On-chain in the MVP (the five contracts)

| Area | Full design | MVP | Why / where it returns |
|---|---|---|---|
| Sybil gate | World ID proof verified on-chain in the registry | Abstracted behind `ISybilGate`. The **Sepolia cohort uses `MockSybilGate`**, a labeled stand-in (the cohort wallets are scripted-and-disclosed anyway). The **mainnet capstone-ready instance uses real World ID 4.0** (`WorldIDVerifier.verify`). | The spike found World ID 4.0 moved verification to a new mainnet-only contract (docs/SPIKE.md). The interface abstraction lets the same registry logic run under either; real personhood is demonstrated at the capstone, while the non-simulated verifier path is deployed on mainnet. |
| Juror anonymity | One-case pseudonyms and receiving keys; encrypted ballots hide identity and vote; exact reputation, reserve, case history, individual payments, penalties, and refunds stay private. The public gets eligibility/reserve proofs, the aggregate tally, and aggregate accounting. | **Juror addresses and revealed votes are fully public on-chain.** | Encrypted/receipt-free ballots plus private consequence accounting are funded milestones #2–3. Commit/reveal stands in. |
| Ballot secrecy | Receipt-free (MACI-style threshold encryption + silent re-keying). The reference **explicitly rejects commit/reveal**: "a voting system that can prove obedience is a voting system with a payment rail bolted on" (breaking-the-court.html). | **Commit/reveal** — a juror can reveal their salt to prove their vote, so it is vote-buyable in principle. A known-insufficient *stand-in*, not the design. | Receipt-freeness is funded-milestone #2; the sandbox contrasts the two and the attack demo shows why it matters. |
| Slash destination | Every slashed dollar → the **reward pool, never to the winning jurors**; individual debits stay private while only the aggregate transfer and its proof are public. | **Honored on-chain but not private.** Slashes (and the 20% reward cut) flow to `RewardPool`; jurors are paid only the 70% fee cut. | The destination rule is implemented; private consequence accounting returns with funded milestones #2–3. |
| Fee split | 70 jurors / 20 reward pool / 10 protocol (the-design.html) | **70 / 20 / 10 on-chain.** | Implemented. |
| Reward-pool payout | The pool **pays active, high-quality jurors privately** through a gated cyclic distribution (Wilson-gated, recency-weighted); only the aggregate and its proof are public. It **rewards jurors, never compensates victims**. | **Passive sink on-chain.** `RewardPool` receives the 20% cut + every slash + rounding dust and exposes only `balance()`. It has **no payout/distribute function at all**. | The private gated distribution is funded-milestone #3 and is shown only in the sandbox. The MUSD-conservation invariant treats the pool as a terminal balance, so adding an on-chain payout would break it (and is flagged as scope creep in the plan, §11). |
| Wrong-side slashing | A private margin-scaled debit is settled **post-appeal** and privately reversed if vindicated; the public sees only proved aggregate accounting | **Deferred.** Minority voters are not slashed on-chain; only no-shows are penalized (a public liveness forfeit → reward pool). | First-round coherence slashing is the conformity machine the reference warns against — it needs the appeal ladder to be fair. Private slash-to-truth + ladder + vindication returns in milestone #3. |
| Draw randomness | drand / VRF | **`blockhash`-based** two-step draw (records `drawBlock = block.number + 1`, anyone cranks once it exists). Kills panel precompute, but is sequencer-influenceable in principle. | drand/VRF is funded-milestone #1. Documented limitation. |
| Optimistic fast path | Bonded assertion + challenge window settles ~95% of cases free, off the jury | **Not built as contracts.** Demo cases go straight to the jury on purpose (the court is the novel claim). | Established art (UMA); funded milestone. Represented in the sandbox funnel and as a grayed-out step in the Mini App timeline. |
| Dispute ladder + parallel panels | Panels 7 → 15 → 31 (three-floor rung bond, *not* a flat ×2), near-tie discount, two clocks; **above a value line, N independent panels (1/3/5) that must all agree**, so capture odds multiply `pᴺ` and attack cost rises with the pot past the 31-seat ceiling | **Single panel**, one automatic redraw on quorum miss, then status quo. No ladder, no parallel panels on-chain; the mainnet 3-seat panel is a deliberate demo size and security scales with pool width. | All panel-scaling structure is sandbox-only; the parallel-panels "pricing a takeover above the ceiling" is a centerpiece of the attack demo. |
| Reputation / watchers | Private baseline-credited reputation commitments, Wilson 0.70 suspension gate, and privately proved draw bands **capped at 3× a newcomer**; exact scores and case histories are never public | **None on-chain** — the MVP draws uniformly at random, so there is no reputation weighting to cap. | Sandbox-only; private commitments and proofs return in milestone #3. |
| Economic parameters | Endogenous — each value a function of its driver (`toupdate.md` part 2) | **Fixed**: $5 bond, 2 MUSD question fee, 2% escrow fee, 7/14 (cohort) or 3/3 (mainnet) panels. | MVP uses shipped constants; endogenous economics is a design-track item, not an MVP one; mainnet capture-resistance scales with the funded pool/panel width, not this demo size. |
| Withdrawal | — | A withdrawn juror's **nullifier stays spent** (one seat per human); they `postBond()` to rejoin rather than re-verifying. | Keeps the sybil gate strict and simple. |
| Token | USDC / WLD | **MockUSD**, a valueless 6-decimal token with a public faucet, on every instance. | Production token choice is a funded-milestone decision; no real money is at stake anywhere. |
| Tie / no-quorum | — | Tie → status quo (question NO / escrow refunds payer). Fewer than ⌈panel/2⌉+1 reveals → one free redraw, then status quo. | One juror must never decide a deal alone; cases must never brick. An explicit **Invalid/void outcome** for genuinely ambiguous questions (flagged when parallel panels split) is funded-milestone #3; today ambiguity defaults to status-quo-NO. |

## Simulated in the sandbox only (clearly labeled)

The case funnel (optimistic step + ~95% free settlement), the full dispute ladder, juror reputation (Wilson-interval gate), watchers / loser-side petitions, private invite rooms, and populations of simulated jurors. All generated data, badged as simulation.

## Out of the MVP entirely

Governance (both tokens, voting, the constitutional firewall); the prediction market as a product (parimutuel pools, ERC-20 graduation, order books); per-draw face check; the justice-clock collusion audit; the reward-pool payout (the `RewardPool` **is** on-chain and accrues slashes + the 20% cut, but it is a passive sink — the Wilson-gated, recency-weighted cyclic distribution to active jurors is sandbox-only, funded-milestone #3); juror seniority gates; external audits.

## Funded-milestone roadmap (what the grant pays for, post-MVP)

1. drand/VRF draw randomness + mainnet deployment of the core court.
2. Receipt-free ballots (MACI-style, bonded coordinator v1) — hides juror addresses and votes.
3. Optimistic assertion fast path + juror reputation + dispute ladder on-chain + the reward-pool gated cyclic payout (Wilson-gated, recency-weighted distribution to active jurors).
4. Resolution / oracle SDK + first prediction-market integration (escrow/marketplace a later consumer of the same SDK).
5. Security review. (No external audit is claimed anywhere in the MVP.)
6. Juror UX hardening + moderated user-testing — the final step and the roadmap's largest line; AI makes the build cheap, so the weight goes to getting real verified humans through the juror loop.

## Step 3 — sandbox build notes (appended as the simulation was built)

The `/sandbox` engine ports the reference math verbatim so its numbers match the pitch
site exactly. A few details where the simulation is narrower than the prose, or differs
from the on-chain core, are recorded here.

- **The appeal-bond "three floors" are two floors in the ported code.** The reference
  widget (`hybrid-juror-system.html` ~452-538) computes `bond = max(panelCost, capFloor)`
  where `panelCost = panel * FEE` (the juror-cost floor) and `capFloor = LAMBDA * odds *
  stake` (the anti-re-roll / capture floor). The surrounding prose names three floors
  (juror-cost, anti-re-roll, delay-rent), but the published JS has no delay-rent term. The
  sandbox ports the reference JS verbatim (two floors) so its bond figures match the pitch
  site; the delay-rent floor is described in copy as a roadmap refinement, not computed.
  Noted in `web/src/lib/sim/court-math.ts`.

- **Case-fee number differs by widget, by design.** The deployed core court charges a
  **2 MUSD** case fee, and the sandbox core-court walkthrough mirrors that (with the
  70/20/10 split, integer-cent math, slashes + dust → reward pool). The reference
  attack/ladder math uses **FEE = $1.50** (`hybrid-juror-system.html`), and the
  bribe-price floor is `fee($1.50) + bondAtRisk($5) + reputationValue($0)`. Each sandbox
  widget keeps its own source-of-truth number rather than forcing one: the core-court
  widget mirrors the chain ($2), the attack/ladder widgets mirror the reference ($1.50).
  Both are labeled.

- **`reputationValue = $0` in the bribe-price floor.** The full design adds the present
  value of a juror's future reward-pool income to the cost of corrupting them. The MVP has
  no on-chain reward-pool payout, so that term is zero. Noted in
  `web/src/lib/sim/attack.ts`.

- **The token-court model is authored fresh** (no reference code exists for it):
  `P(flip) = 1` once `budget >= 0.5 * totalStake` at a chosen token price, plus a
  "second case free" reuse flag. The human-court side uses the ported combinatorics.

- **Everything in `/sandbox` is simulated.** Simulated juror populations, simulated
  per-juror accuracies, simulated cases. The route carries a fixed simulation badge and
  every widget carries a "simulated" tag. No sandbox number is presented as real usage.
  The "~95% settle free" optimistic-funnel figure is attributed to the roadmap, never to
  MVP behavior. The seeded PRNG (mulberry32, fixed default seed) is for reproducibility of
  the curves and the "run 100 cases" sweep, not a randomness-security claim.

## Step 3.5 — on-chain World ID 4.0 (the IDKit → `WorldIDVerifier.verify` mapping)

This is the build contract that the gate (`contracts/src/sybil/WorldIDGate.sol`) and the
frontend (`web/src/app/register-onchain/page.tsx`) must agree on. It is **empirically
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

**The IDKit request** (`register-onchain/page.tsx`) must use the `proofOfHuman` preset with
`allow_legacy_proofs: false` and **`environment: 'staging'`** (REQUIRED — it defaults to
`'production'`, which the World ID Simulator rejects outright), and pass the registering
**wallet address** as the `signal`. Step 5 (real Orb/Device humans) drops back to the
`'production'` environment + the Production verifier `0x00000000009E00F9FE82CfeeBB4556686da094d7`;
the gate, action, rpId, and encoding are unchanged — only `WORLD_ID_VERIFIER` differs.

**What is NOT simulated here:** the mainnet WorldIDGate runs a *real* Groth16 verification.
The only Step-3.5 concession is the **Staging** verifier + World ID **Simulator** identities
(so the path is proven human-free for cents); they are real v4 proofs verified by the real
verifier contract, labeled as Simulator-sourced in `docs/DEMO.md`. The Step-5 capstone is where
real humans will use the Production verifier.

## Step 5 — mainnet capstone (Permit2 onboard, B5, sponsored transactions)

The capstone-ready mainnet instance (chain 480) deploys the same five contracts against
the **Production** World ID verifier
(`0x00000000009E00F9FE82CfeeBB4556686da094d7`, Orb/Device), 3/3 panel. Step-5 additions and
their honest status:

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
  unchanged. The Step-5 capstone cases (`web/public/cases/{q,escrow}-capstone.json`) are real
  mainnet cases (`simulated: false`); the cohort remains the labeled `MockSybilGate` scale demo.
