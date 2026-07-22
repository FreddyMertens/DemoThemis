# Step 1 risk spike — answers

Status: spike (a) **answered** — and it reshapes the instance architecture. (b)/(c) reframed/deferred (see below). The Foundry → World Chain toolchain is proven on World Chain Sepolia. One decision is now owed (bottom of file).

> **2026-07-22 supersession note:** this file preserves the original spike decision and
> its “3 real humans” criterion as history. The liveness review changed the operational
> capstone: deploy a 3-seat court with `MIN_POOL >= 4` and register at least four eligible
> Production World ID humans, so one pre-draw withdrawal still leaves a drawable panel.
> Exact-3 remains a source-level fund-safety regression—eligible-party rejection plus a
> bounded cancellation/refund—not the recommended live availability configuration. See
> [LIVENESS_RECOVERY.md](LIVENESS_RECOVERY.md) and
> [CAPSTONE_RUNBOOK.md](CAPSTONE_RUNBOOK.md).
>
> The original conclusion that the v4 verifier was a supported production dependency
> is also superseded. Official documentation marks it preview. New deployments use
> `WorldIDRouterGate` over the documented World Chain mainnet Router; every v4 address,
> “Production” label, and instruction below is retained only as dated research history.

## Headline finding: World ID moved to 4.0, relocating on-chain verification to World Chain mainnet

The Developer Portal now onboards new apps onto **World ID 4.0** (preview). Our app `app_7bdfda4db4e2f59dd4a2427cd2bd860d` (**DemoThemis**, originally created as "DemoThemis Staging") is 4.0, Managed mode, RP id `rp_1ddcf8ba2efe3f36`. World ID 4.0 changes both the on-chain interface and *where it lives*:

| | Legacy v3 (what the plan + contracts assumed) | World ID 4.0 (current) |
|---|---|---|
| Call | `router.verifyProof(root, groupId, signalHash, nullifierHash, externalNullifierHash, uint256[8] proof)` | `WorldIDVerifier.verify(uint256 nullifier, uint256 action, uint64 rpId, uint256 nonce, uint256 signalHash, uint64 expiresAtMin, uint64 issuerSchemaId, uint256 credentialGenesisIssuedAtMin, uint256[5] proof)` |
| Contract | World ID Router (proxy) | WorldIDVerifier |
| WC mainnet | `0x17B354dD2595411ff79041f930e491A4Df39A278` | Production `0x00000000009E00F9FE82CfeeBB4556686da094d7` · Staging `0x703a6316c975DEabF30b637c155edD53e24657DB` |
| WC Sepolia | `0x57f928158C3EE7CDad1e4D8642503c4D0201f611` (still live, for v3 proofs) | **not deployed** |

Consequences:

- **World ID 4.0 has no World Chain Sepolia deployment.** Its *staging* and *production* are verification **environments on World Chain mainnet**, not separate chains. That is exactly why our one portal app shows both "Staging Active" and "Production Active" — it is not two apps' worth of state, it is 4.0's two environments on one chain.
- The plan's v3-era model (Sepolia router = staging tree, mainnet router = production tree, hence two instances on two chains, §2) no longer matches reality. On 4.0, credible on-chain World ID verification is **World Chain mainnet only**.
- `JurorRegistry` must call `WorldIDVerifier.verify(...)` (v4) if it consumes 4.0 proofs. The throwaway `contracts/src/spike/SpikeVerifier.sol` targets the v3 router and is therefore **superseded** — keep it only as a v3 reference.

## (a) Does a World ID proof verify on-chain? — answered structurally
The plan's literal test ("a simulator staging proof passes `verifyProof` on the WC Sepolia router") is now partly moot: the current, credible path is v4 `WorldIDVerifier.verify` on World Chain **mainnet** (Staging env `0x703a…` for simulator/staging proofs; Production `0x0000…94d7` for Orb/Device). The live end-to-end proof check becomes the first task of whichever mainnet instance we build, and depends on the decision below. The fallback the plan named (cloud verification + relayer) is no longer the only escape hatch — the on-chain v4 verifier is the supported route; it just lives on mainnet.

## (b) Sponsored mainnet `sendTransaction` from a draft Mini App — deferred
Needs a phone with World App + a whitelisted mainnet contract. Re-run once the architecture is locked and a mainnet instance exists (the `Ping` contract can be redeployed to mainnet and whitelisted as the throwaway target).

## (c) Does World App accept `chainId: 4801`? — reframed, largely moot
Since 4.0 verification is mainnet-only, the World-ID-gated step (registration) is mainnet-bound regardless of whether World App will sign Sepolia txs for anything else. World App `sendTransaction` remains documented mainnet-only (chainId 480). The "collapse to one instance" the plan hoped for *does* resolve — but onto **mainnet**, not Sepolia.

## Toolchain: proven on World Chain Sepolia (all on free testnet ETH)
The Alchemy WC Sepolia faucet is unusable for this project: it gates on Ethereum **mainnet transaction activity**, which a fresh project-only deployer can never have (balance alone does not satisfy it). Working path for a fresh key:

1. **pk910 Sepolia PoW faucet** → 0.33 SepETH to the deployer on Ethereum Sepolia. Gate-free, but requires a human to clear one hCaptcha.
2. **`cast send` to the OP Standard Bridge** `L1StandardBridge 0xd7DF54b3989855eb66497301a4aAEc33Dbb3F8DE` (OptimismPortal `0xFf6EBa109271fe6d4237EeeD4bAb1dD9A77dD1A4`) → 0.2 ETH credited to the same deployer address on WC Sepolia within ~1 min. Done with the deployer key from `.env`, no wallet UI. ([scripts/bridge-l1-to-wc-sepolia.sh])
3. **forge → WC Sepolia deploy confirmed:** `Ping` at `0x117C7ba5bC479Ef62D9Edd64f1737c3dDF55022b` (deployer nonce 1).

Deployer balances now: **0.2 ETH WC Sepolia · ~0.13 ETH Ethereum Sepolia · 0.003 ETH Ethereum mainnet.** More than enough testnet ETH for all of step 2's WC Sepolia work; re-mine from pk910 (12 h session) if it runs low.

## DECISION (locked 2026-06-14): Option A — Hybrid
World App (mainnet-only) and World ID 4.0 (mainnet-only verification) both point at World Chain **mainnet** for anything real. Locked on the criterion "what a Spark grant reviewer views most favorably":

- **Option A — Hybrid (CHOSEN).** Scale/cohort demo (≈20 scripted jurors, 8–10 cases) on **WC Sepolia** for the free explorer history; the credible, grant-citable World ID 4.0 registration + the 3 real humans on **WC mainnet**. The Sepolia cohort's juror gate uses either the legacy v3 router (if a 4.0 app can still issue v3 proofs — *open item*) or a clearly-labeled owner-gated stand-in (the cohort wallets are already scripted-and-disclosed, so this keeps the honesty rule). Cost: <$1 mainnet gas.
- **Option B — All on mainnet (v4 everywhere).** Rejected. Whole demo on WC mainnet; cohort's ~200+ seeding txs cost ~$5–8 of the ~$10 budget and commit everything to the thinner-documented v4 interface.

**Why A is the more reviewer-favorable choice (not merely cheaper):**
1. The scored criterion — deep, on-chain, sybil-resistant World ID with sponsored txs and real humans in the Mini App — is delivered **identically** by both (real World ID 4.0 + 3 humans on mainnet). That flagship is the crown jewel regardless.
2. The cohort jurors are *simulator/staging* identities either way and must be labeled "simulated." Putting clearly-fake activity on mainnet to look busier is the "fake activity as real usage" trap (§1, §10) — reads as padding, a credibility hit. The trusted pattern reviewers expect is exactly A: testnet for the scripted scale demo, mainnet for the one real case that ran in World App (already the §8 plan).
3. The "always mid-motion" keeper runs **free for the weeks-long review window** on Sepolia; on mainnet it's an open-ended real-ETH drain that could exhaust the ~$10 mid-review and leave a reviewer at a stalled dashboard.
4. Frugality reinforces the §10 sustainability story.

**What this locks for step 2:** `JurorRegistry` for the **mainnet** instance targets v4 `WorldIDVerifier.verify(...)` (Production `0x0000…94d7` / Staging `0x703a…57DB`). The **Sepolia cohort** instance gets a registration gate that is either the v3 router `0x57f9…` (pending the "can a 4.0 app issue v3 proofs?" open item) or a labeled owner-gated `mockRegister` — decided at the top of step 2 once that item is checked. The MockUSD / DealEscrow / DisputeCourt contracts are chain-agnostic and deploy to both. The plan's two-Developer-Portal-apps idea is dropped (one 4.0 app spans staging+production); `web/.env` keeps a single `app_id`.

### Open verification items before step 2 contracts are written
- Can a World ID **4.0** app issue **v3**-compatible proofs (needed for Option A's Sepolia cohort via the v3 router), or is it v4-only? If v4-only, Option A's cohort uses the labeled owner-gated stand-in.
- Exact v4 `WorldIDVerifier.verify` integration: how IDKit's `rp_id` / `action` / proof map into the call; confirm there is genuinely no WC Sepolia v4 address.

## Constants (verified 2026-06-14, against docs.world.org)
| Item | Value |
|---|---|
| World ID Router (v3), WC mainnet / Sepolia | `0x17B354dD2595411ff79041f930e491A4Df39A278` / `0x57f928158C3EE7CDad1e4D8642503c4D0201f611` |
| WorldIDVerifier (v4), WC mainnet Production / Staging | `0x00000000009E00F9FE82CfeeBB4556686da094d7` / `0x703a6316c975DEabF30b637c155edD53e24657DB` |
| WC Sepolia OP bridge: L1StandardBridge / OptimismPortal (on Ethereum Sepolia) | `0xd7DF54b3989855eb66497301a4aAEc33Dbb3F8DE` / `0xFf6EBa109271fe6d4237EeeD4bAb1dD9A77dD1A4` |
| Chain ids | 4801 (WC Sepolia) · 480 (WC mainnet) |
| Spike `Ping` on WC Sepolia | `0x117C7ba5bC479Ef62D9Edd64f1737c3dDF55022b` |
