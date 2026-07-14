# DEMO — on-chain evidence

The self-evidencing artifacts behind the grant's claims: clickable explorer
traces, not markdown assertions. It holds the **Step 3.5** evidence (real on-chain
World ID 4.0 verification on World Chain mainnet, Staging verifier), the **Step 4**
Sepolia cohort history, and the **Step 5** Production-verifier question queue.
The Step-5 table is filled as the first official three-human question runs.

## Step 3.5 — World ID 4.0 verified on-chain (World Chain mainnet, chain 480)

The court's one-human-one-seat claim is carried by a real `WorldIDVerifier.verify`
(World ID 4.0 Groth16) running inside the juror-registration transaction, and a
forged/duplicate proof reverting on-chain. Proven here against the World ID 4.0
**Staging** verifier with World ID **Simulator** identities — real v4 proofs, real
verifier contract, no Orb, cents of gas. Step 5 swaps to the **Production** verifier
for the 3-human capstone (the only change is the verifier address).

> Honesty note: the registering identities below are World ID **Simulator** staging
> identities (labeled simulated). What is NOT simulated is the verification: the
> deployed `WorldIDVerifier` contract runs the real Groth16 check on-chain.

### Deployed instance (source of the addresses: `contracts/deployments/worldchain-mainnet.json`)

| Contract | Address | Deploy tx |
|---|---|---|
| JurorRegistry | [`0xbf7E6F32E3BcfC419d8E6D3BD15e425638A51445`](https://worldscan.org/address/0xbf7E6F32E3BcfC419d8E6D3BD15e425638A51445) | [`0xb1d95a…81ebd`](https://worldscan.org/tx/0xb1d95a21367bf77579d9f737cca2adfcdc2bac27ad15dc1eef4eaaff8b481ebd) |
| WorldIDGate | [`0x423a0F942EadEf2FFA54c2A9aa2f4B8b6836A3f7`](https://worldscan.org/address/0x423a0F942EadEf2FFA54c2A9aa2f4B8b6836A3f7) | [`0x5c14ad…d2864`](https://worldscan.org/tx/0x5c14adb418d28ee41f1591089cafb9bc230ec26fd9c62338797605ec15bd2864) |
| MockUSD | [`0x117C7ba5bC479Ef62D9Edd64f1737c3dDF55022b`](https://worldscan.org/address/0x117C7ba5bC479Ef62D9Edd64f1737c3dDF55022b) | [`0x14f30c…b91af`](https://worldscan.org/tx/0x14f30c03f9054a435d3bceb9849284431d0d1ba3cae2575426503e4f7b8b91af) |
| RewardPool | [`0xaDa374F411E798a58A5B79F205fcf82B1A4DC5C6`](https://worldscan.org/address/0xaDa374F411E798a58A5B79F205fcf82B1A4DC5C6) | — |
| DisputeCourt | [`0xAFC1c20700fB9961E2Fb848B0fa590c95095C523`](https://worldscan.org/address/0xAFC1c20700fB9961E2Fb848B0fa590c95095C523) | — |
| DealEscrow | [`0x00DA249677cf53c01e8A967Fd32d3a8C595e1E7F`](https://worldscan.org/address/0x00DA249677cf53c01e8A967Fd32d3a8C595e1E7F) | — |

The gate points at the World ID 4.0 **Staging** verifier
[`0x703a6316c975DEabF30b637c155edD53e24657DB`](https://worldscan.org/address/0x703a6316c975DEabF30b637c155edD53e24657DB)
(verified on-chain: `gate.verifier()` = `0x703a…`, `gate.action()` =
`keccak256("juror-registration") >> 8`, `gate.rpId()` = `0x1ddcf8ba2efe3f36`).

### The three enforcement transactions

Generated from two World ID Simulator proofs of the **same** identity (one bound to
the deployer, one to a second wallet), via `scripts/prove-sybil-mainnet.sh`.

| # | What | Expected | Tx |
|---|---|---|---|
| 1 | **Forged** proof (one Groth16 limb flipped) → `register` | reverts INSIDE `WorldIDVerifier.verify` (`0x7fcdd1f4`) | [`0xd955739e…becf5`](https://worldscan.org/tx/0xd955739e1f78ec9c46c83343ff87998c0ca6f3089ac9eecf9567158afe0becf5) — status 0, reverted |
| 2 | **Valid** proof → `register` | SUCCESS — `WorldIDVerifier.verify` called in-tx and passes; juror #1, nullifier stored | [`0xe1ad43e8…84c70`](https://worldscan.org/tx/0xe1ad43e86e500b3475da73de10829412126ec7a885654fb1003dfcca9b984c70) — status 1, 571k gas (the bulk is the on-chain Groth16 check) |
| 3 | **Duplicate** human (same nullifier, second wallet) → `register` | reverts `NullifierAlreadyUsed` in the registry — the one-human-one-seat gate | [`0x9f9946f6…4187d`](https://worldscan.org/tx/0x9f9946f658d16f431922f58f052e1aaab095828d14aed57a2709c5e88b24187d) — status 0, `0xcad2ae02` |

> Tx #2 is the headline: open it on worldscan and the internal-calls / trace shows
> `JurorRegistry.register` → `WorldIDGate.verify` → `WorldIDVerifier.verify` at
> `0x703a…` succeeding in the same transaction. Tx #1 shows that call reverting on a
> forged proof; Tx #3 shows a second wallet with the same human's nullifier rejected.

### Reproduce

1. `cd web && pnpm dev`, open `/register-onchain`, set the signal to the registering
   wallet, click **Generate**, paste the `connectorURI` into
   [simulator.worldcoin.org](https://simulator.worldcoin.org) (pick a "Verified (All)"
   identity), and copy the emitted `bytes proof`. Repeat for the second wallet using
   the **same** identity.
2. `PROOF_A=0x… PROOF_B=0x… REPO_ROOT=/mnt/c/dev/DemoThemisMVP bash scripts/prove-sybil-mainnet.sh`
3. Inspect any tx: `cast run <txhash> --rpc-url https://worldchain-mainnet.g.alchemy.com/public`

## Step 4 — the Sepolia cohort (chain 4801, simulated scale demo)

The free scale-and-history demo: ~20 scripted jurors and a mix of resolved cases
across both types, gated by the labeled `MockSybilGate` stand-in (the real on-chain
World ID claim lives on mainnet, above). All cohort data is **simulated and
disclosed** — the honesty rule. Source: `contracts/deployments/worldchain-sepolia.json`.

| Contract | Address |
|---|---|
| JurorRegistry | [`0x7677…c622`](https://worldchain-sepolia.explorer.alchemy.com/address/0x7677ad08d0844e1Df2693242F2195F2b2fD9c622) |
| DisputeCourt | [`0x1bAa…00AF`](https://worldchain-sepolia.explorer.alchemy.com/address/0x1bAa18851E3E425278aFfe041b75004727F500AF) |
| DealEscrow | [`0x6111…e596`](https://worldchain-sepolia.explorer.alchemy.com/address/0x61110aDAca47eb0E82D5dE75F3de6F1f1b4fe596) |
| RewardPool | [`0x1509…53A9`](https://worldchain-sepolia.explorer.alchemy.com/address/0x1509A82F35da8fCb9428449dCc9120C102c153A9) |
| MockUSD | [`0xeA52…600F`](https://worldchain-sepolia.explorer.alchemy.com/address/0xeA5241F1becCE7B3F72bf501bEa16eA976f1600F) |

Seeded via `scripts/seed-cohort-full.sh`: 20 jurors, ~8 resolved cases (question +
escrow, varied YES/NO question outcomes; all settled escrows resolved to the payee
on this snapshot), and case 1 left Open with an empty panel awaiting a fresh draw —
its first panel of 7 committed jurors all no-showed, were slashed, and the case was
redrawn. Kept mid-motion by the keeper (`.github/workflows/keeper.yml`), which drives
one full case per run.

### Sybil rejection on the cohort (the negative path)

Even behind the labeled `MockSybilGate`, the registry rejects a reused nullifier —
the one-human-one-seat guarantee. A fresh wallet re-presenting an already-used
human's nullifier reverts `NullifierAlreadyUsed` (`0xcad2ae02`), the same selector
as the mainnet duplicate revert above:

[`0x930212e9…40afcf`](https://worldchain-sepolia.explorer.alchemy.com/tx/0x930212e9fa1281ab664f9f1a88dcb95d06d4d399f10d33682a4ab0749540afcf) — status 0, reverted.

The Mini App surfaces this on the Become-a-juror screen alongside the two mainnet
World ID reverts (forged proof → verifier revert; same human second wallet →
NullifierAlreadyUsed).

## Step 5 — official three-juror question queue (chain 480)

This is the live demo slice: one public-research question at a time, decided by
exactly three Production World ID humans on World Chain mainnet. Jurors receive
the question and objective YES rule but no supplied evidence links; each juror
finds and evaluates public sources independently. MockUSD is valueless, and the
three-seat panel is an explicit demo parameter.

The same `WorldIDGate` proven against the Staging verifier in Step 3.5 now points
to the Production verifier
[`0x00000000009E00F9FE82CfeeBB4556686da094d7`](https://worldscan.org/address/0x00000000009E00F9FE82CfeeBB4556686da094d7).

### Deployed and source-verified instance

Source: `contracts/deployments/worldchain-mainnet.json`; deployment block
31,256,151.

| Contract | Address |
|---|---|
| MockUSD | [`0x70ECE5…497a`](https://worldscan.org/address/0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a#code) |
| WorldIDGate (→ Production verifier) | [`0x0540f4…3Fbe`](https://worldscan.org/address/0x0540f47842a31C681dce76E856b4b76fcCc53Fbe#code) |
| JurorRegistry (`registerWithPermit2`) | [`0x226974…7F84`](https://worldscan.org/address/0x226974149087b36769a54B998acfe4087eEb7F84#code) |
| RewardPool | [`0xAF96A6…04A0`](https://worldscan.org/address/0xAF96A65A6b9643451E33cAf96717d071eDae04A0#code) |
| DisputeCourt (3 seats / minimum pool 3) | [`0xCDF427…795A`](https://worldscan.org/address/0xCDF427D18da8C2e8CCf9a95310bC38857EEf795A#code) |
| Permit2 | [`0x000000…BA3`](https://worldscan.org/address/0x000000000022D473030F116dDEE9F6B43aC78BA3) |

On-chain reads confirm that `WorldIDGate.verifier()` is the Production verifier,
`action` is `keccak256("juror-registration") >> 8`, `rpId` is
`0x1ddcf8ba2efe3f36`, and `JurorRegistry.PERMIT2()` is canonical Permit2. Juror
onboarding batches `Permit2.approve` and `registerWithPermit2` for the valueless
bond; the first real World App run must supply the pending sponsored-gas trace.

### Current readiness

Audited on 2026-07-14:

| Check | State |
|---|---|
| Public app | [Netlify `/app`](https://demothemis.netlify.app/app) is deployed. |
| Official queue | **0 / 21 filed**; all deployed question files match the manifest. |
| Juror pool | **0 / exactly 3 required**. |
| Voting windows | **60s seal / 60s reveal**; both must be raised to at least 300s. |
| Unexpected cases | No unresolved nonofficial case. |
| Scheduled keeper | `MAINNET_QUESTION_KEEPER_PRIVATE_KEY` is absent; the workflow has no runs. |
| World App cutover | Portal App URL, name, countries, preview QR, and permissions must be verified. |

Question one is fixed by all four fields below:

| Field | Value |
|---|---|
| Type | `question` |
| URI | `/cases/queue/01-dimorphos-orbit-change.json` |
| Criteria hash | `0x60f23f692f9f0321f8088aaef33e9945439fd562b88919598aabe5393d990205` |
| Opener | `0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c` (fixed, never a juror) |

Use only the [mainnet question-queue runbook](CAPSTONE_RUNBOOK.md). The manifest
validator is `pnpm validate:question-queue`; the dry operator report is
`node scripts/mainnet-question-keeper.mjs`. The scheduled keeper advances at
most one non-juror transition per run and refuses to proceed with the wrong jury
size, short windows, an altered question, or an unresolved nonofficial case.

### First official run — evidence table

> Pending: no Production juror has registered and question one has not opened.
> Replace each `_pending_` cell with a direct Worldscan or permanent app link.

| # | Evidence | Tx / link |
|---|---|---|
| 1 | Human #1 registers; Production `WorldIDVerifier.verify` succeeds in-tx | _pending_ |
| 2 | Human #2 registers | _pending_ |
| 3 | Human #3 registers | _pending_ |
| 4 | Sponsored World App transaction; sponsor pays gas | _pending_ |
| 5 | Question one `CaseOpened` | _pending_ |
| 6 | Question one `PanelDrawn` with three jurors | _pending_ |
| 7 | Human #1 `Committed` | _pending_ |
| 8 | Human #2 `Committed` | _pending_ |
| 9 | Human #3 `Committed` | _pending_ |
| 10 | Human #1 `Revealed` | _pending_ |
| 11 | Human #2 `Revealed` | _pending_ |
| 12 | Human #3 `Revealed` | _pending_ |
| 13 | Question one `Resolved` | _pending_ |
| 14 | `FeePaid` | _pending_ |
| 15 | `FeeDistributed` | _pending_ |
| 16 | Permanent Netlify receipt: 3/3 seals, 3/3 reveals, tally, ruling, and payments | _pending_ |
| 17 | Question two `CaseOpened`, proving one-at-a-time advancement | _pending_ |
| — | Demo video (3–4 min) | _pending_ |

## Demo video script (3–4 min, captioned; Loom or YouTube-unlisted)

Show the small, real product from input to permanent result.

1. **The job (~0:20).** Open the live Netlify app and show question one: one
   objective public fact, an exact YES rule, and no supplied evidence links.
2. **How a question enters (~0:25).** Open the **Submit** tab to show the app-side
   submission view. Explain that the 21 demo questions and hashes are fixed in
   advance and the non-juror keeper files only the next official question.
3. **Three real jurors (~0:55).** In World App, show exactly three people joining
   through Production World ID. Point to the 3/3 panel and one sponsored
   registration transaction.
4. **Independent judgment (~0:55).** Each juror finds public evidence, then seals
   a YES or NO answer without exposing it during the commit window. Show all
   three seals and later all three reveals on-chain.
5. **A complete result (~0:45).** Show the ruling, 3/3 participation, valueless
   payments, distribution, Worldscan links, and the permanent receipt. Then show
   question two opening only after question one resolved.
6. **Why the chain claims are credible (~0:30).** Briefly show the source-verified
   contracts plus the historical forged-proof and duplicate-human reverts from
   Step 3.5. Close on [the live app](https://demothemis.netlify.app/app).

The attack simulator and Sepolia cohort can be optional supporting material, but
they should not interrupt the main MVP story: three verified humans complete one
real question entirely on-chain.
