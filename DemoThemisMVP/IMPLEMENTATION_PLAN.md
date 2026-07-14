# DemoThemis MVP — implementation plan

> This is the historical build plan for the deployed MVP. The current post-deployment simplification is defined in [`docs/MVP_UPGRADE_PLAN.md`](docs/MVP_UPGRADE_PLAN.md).

Goal: a working demo of the **arbitration court** strong enough to anchor a World Foundation **Spark Track Mini App grant** application, built in about one month. The grant funds the court, so the MVP is the court. The prediction market is out of scope as a product; it appears only as one of two demo case types so the application can tell the "first customer" story.

Decisions already made (2026-06-12):

| Decision | Choice |
|---|---|
| Demo case types | Both: escrow deal dispute (headline) + market-style resolution question (secondary) |
| On-chain scope | Core court only; ladder/reputation/watchers simulated in the browser sandbox |
| Timeline | ~4 weeks before submitting the application |
| Stack | Official World stack: Next.js + MiniKit Mini App, Foundry for Solidity, World Chain (mainnet 480 live + Sepolia 4801 cohort) |

The full mechanism design lives in `reference/demothemis-site/` (a clone of the pitch site). Treat it as the source of truth for how the court is *supposed* to work; this plan defines the deliberately smaller thing we build now.

### On-chain World ID verification — the settled approach (read this first)

Per the step-1 spike (`docs/SPIKE.md`, authoritative), the Developer Portal onboards apps onto **World ID 4.0**; our app is 4.0 (RP id `rp_1ddcf8ba2efe3f36`). The settled facts:

- **On-chain verification is World ID 4.0 `WorldIDVerifier.verify`, and it is deployed on World Chain mainnet** — **Staging** verifier `0x703a6316c975DEabF30b637c155edD53e24657DB` (verifies simulator/staging proofs — **confirm empirically in Step 3.5; not stated in docs.world.org**) and **Production** verifier `0x00000000009E00F9FE82CfeeBB4556686da094d7` (Orb/Device — **likewise confirm empirically; the credential-type qualifier is a spike assertion, not doc-sourced**). It is **mainnet-only**: World ID 4.0 has no World Chain Sepolia deployment. The legacy v3 Router `verifyProof` is still live on both chains; a 4.0 app **can** accept v3 proofs via `allow_legacy_proofs: true` during the Phase-2 compatibility window (resolved O1, see below), but that path needs un-upgraded clients and expires 2027-04-01, so it stays an optional nice-to-have, never the claim-bearer.
- **`JurorRegistry`'s `WorldIDGate` calls `WorldIDVerifier.verify(...)`** in the registration transaction and rejects reused nullifiers. A reviewer sees the verifier invoked in the mainnet registration trace and a forged proof revert on-chain. This is the self-evidencing on-chain claim, not a doc.
- **The claim is provable cheaply, before the 3 humans:** deploy the gate to mainnet against the **Staging** verifier `0x703a…` and register a **simulator/IDKit staging proof** — a real on-chain v4 `verify`, no Orb, a few cents of mainnet gas (Step 3.5). The 3 humans (Orb-verified preferred for the strongest one-human guarantee; the Production verifier also accepts Device) then use the **Production** verifier in the step-5 capstone (same `WorldIDGate`, different verifier address).
- **The Sepolia cohort does NOT carry the on-chain claim.** Per the spike's locked Option A, the cohort is the free scale-and-history demo on Sepolia, gated by `MockSybilGate` (clearly labeled simulated, consistent with the honesty rule). The on-chain-World-ID claim lives on mainnet v4. (Open item O1 is resolved: a 4.0 app can accept legacy v3 proofs via `allow_legacy_proofs: true` through the Phase-2 window, which expires 2027-04-01 and depends on un-upgraded clients — so the optional on-chain v3 cohort path stays a labeled nice-to-have, not the claim-bearer.)

Wherever an early section below still reads like the pre-spike v3/two-tree design, **this block and Step 3.5 govern.** The v4 arg list — `verify(uint256 nullifier, uint256 action, uint64 rpId, uint256 nonce, uint256 signalHash, uint64 expiresAtMin, uint64 issuerSchemaId, uint256 credentialGenesisIssuedAtMin, uint256[5] proof)` — is fact-checked against docs.world.org, and the IDKit→`verify` field mapping is resolved (O2, dropped into Step 3.5). The one thing left to confirm **empirically** in Step 3.5: that the Staging verifier `0x703a…` actually accepts a Simulator/staging proof (the de-risk path hinges on it; the docs do not state it).

---

## 1. Scope

### In the MVP (on-chain)

- Juror registration gated by **World ID 4.0 verification on mainnet** (one human, one juror seat) with a **$5 bond** in a mock dollar token. On the Sepolia cohort the same registry runs behind `MockSybilGate` (scripted registration, no proof).
- **Escrow contract**: create a deal, release funds, or raise a dispute that opens a court case (demo case type A).
- **Question case**: open a yes/no resolution question directly with a fee (demo case type B, the market-resolution flavor).
- **Panel draw**: jurors drawn pseudo-randomly from the registry (7 on the cohort, 3 on the mainnet live instance).
- **Commit/reveal ballot**: keccak commitment in the commit phase, salt-revealed vote in the reveal phase, majority verdict.
- **Payout**: fee pool split among jurors who revealed with the majority; bond slashed for jurors who fail to reveal; escrow released to the winning side.
- **Reward pool** (`RewardPool.sol`): a **passive on-chain sink** that receives the 20% reward share of each case fee and every slashed or forfeited bond. In the MVP it only accrues — it has **no payout function at all**. The gated cyclic distribution to active, high-quality jurors (Wilson gate + recency) is a funded-milestone feature, shown only in the sandbox. The pool exists in the MVP so the 70/20/10 economics and the slash routing are real on-chain.
- Configurable phase durations with a **fast demo mode** (minutes, not days).

### In the sandbox only (client-side simulation, clearly labeled)

- The **case funnel**: every simulated case first passes the optimistic assertion step (bonded answer + challenge window); ~95% settle there free, and only challenged cases reach a panel. The stat readout makes the economics visible: the jury is the backstop, not the everyday cost.
- The **dispute ladder** (escalating bonds, growing panels 7 → 15 → 31, near-tie discount, the two clocks).
- **Juror reputation** (baseline-credited scoring, the Wilson-interval suspension gate) and the **reward-pool payout** (the gated cyclic distribution the on-chain pool does not do).
- **Watchers / loser-side petitions**.
- **Private invite-only rooms** (concept walkthrough).
- Populations of simulated jurors so a reviewer can watch hundreds of cases resolve.

### Out of the MVP entirely

- Governance (both tokens, voting, the constitutional firewall) — referenced in the pitch site only.
- The prediction market as a product (parimutuel pools, ERC-20 graduation, order books, standing offers).
- The **optimistic assertion fast path as contracts** (bonded answer + challenge window, the design's ~95% free path). It is established art — UMA's optimistic oracle is exactly this — so it carries no research risk; it returns as a funded milestone. Demo cases go straight to the jury on purpose: the court is the novel claim. The fast path is *represented* in the sandbox funnel and as a grayed-out step in the Mini App case timeline.
- MACI-style receipt-free ballots and the re-keying committee (commit/reveal stands in; the sandbox explains the difference and the roadmap).
- Per-draw face check (World ID registration is the only biometric-backed step in the MVP).
- drand/VRF randomness (blockhash-based draw stands in; documented limitation, funded-milestone roadmap item).
- The **reward-pool payout mechanism** (the on-chain pool only accrues; the gated cyclic distribution is sandbox-only), juror seniority gates, and external audits.

The honesty rule for everything above: **simulated data is labeled simulated, everywhere, every time.** The application is from KYC'd individuals; nothing in the demo may present fake activity as real usage.

---

## 2. Architecture

```
World App (phone, mainnet 480)            Any browser
        │                                      │
        ▼                                      ▼
┌─────────────────────────────────────────────────────┐
│  Next.js app (one deployment, e.g. Vercel)          │
│  /            reviewer funnel (watch -> real -> try)│
│  /app         Mini App UI (MiniKit, runs in World   │
│               App webview; degrades to read-only    │
│               in a normal browser)                  │
│  /sandbox     courtroom simulator, pure client-side │
└──────────────────────────┬──────────────────────────┘
                           │ viem
                           ▼
┌─────────────────────────────────────────────────────┐
│  mainnet 480 (live, via World App)                  │
│  Sepolia 4801 (cohort, scripted wallets only)       │
│  MockUSD ─ JurorRegistry ─ DisputeCourt ─ DealEscrow│
│              │                     │                │
│         ISybilGate            RewardPool            │
│   (WorldIDGate: WorldIDVerifier.verify on 480)      │
└─────────────────────────────────────────────────────┘
```

One Next.js app serves everything: the Mini App route is what World App loads, the sandbox route is what a grant reviewer opens on a laptop. One contracts package holds all Solidity. The sandbox shares TypeScript mechanism logic with nothing on-chain — it is its own simulation, mirroring the contract rules plus the ladder/reputation/reward-payout layers that are not on-chain in the MVP.

### One World ID instance, on mainnet (post-spike, World ID 4.0)

Per the step-1 spike, World App's `sendTransaction` is mainnet-only and verification is World ID 4.0. So:

1. **Mainnet 480 — the live instance.** The Mini App inside World App, on-chain verification via `WorldIDVerifier.verify` (v4, Production verifier), Permit2 bond, sponsored gas, a small panel of real verified humans (demo parameters: 3-seat panel with the minimum pool set equal to the panel, so three verified humans suffice; disclosed in the UI). One Developer Portal app. MockUSD is valueless, so no real money is at stake.
2. **Sepolia 4801 — the cohort.** ~20 scripted jurors registered through `MockSybilGate` (labeled simulated; the on-chain-World-ID claim lives on mainnet v4, Step 3.5, not here), 8–10 resolved cases, the keeper, the explorer history. All transactions come from scripted wallets and the desktop dev page. World App never touches this instance.

The same contracts deploy to both chains, differing only in the `ISybilGate` they inject and the `PANEL_SIZE`/`MIN_POOL` constructor parameters.

### Repo layout (this folder becomes the monorepo root)

```
DemoThemisMVP/
├── IMPLEMENTATION_PLAN.md      ← this file
├── README.md                   ← quickstart, links, env contract, honest status
├── LICENSE                     ← MIT (grant requires open source)
├── .gitignore                  ← node_modules, .env*, out/, cache/, reference/
├── contracts/                  ← Foundry project
│   ├── src/
│   │   ├── MockUSD.sol
│   │   ├── sybil/{ISybilGate,MockSybilGate}.sol   (WorldIDGate.sol is added in Step 3.5 — absent today)
│   │   ├── JurorRegistry.sol
│   │   ├── RewardPool.sol
│   │   ├── DisputeCourt.sol
│   │   └── DealEscrow.sol
│   ├── test/                   ← unit + invariant tests
│   ├── script/                 ← Deploy.s.sol, DeploySpike.s.sol (cohort seeding lives in repo-root scripts/seed-cohort.sh, resolve-case.sh, verify-cohort.sh — there is no SeedDemo.s.sol)
│   └── foundry.toml
├── web/                        ← Next.js app (from create-mini-app template)
│   ├── public/cases/           ← case uri JSON blobs (served same-origin)
│   ├── src/app/                ← routes: /, /app/**, /app/dev, /sandbox
│   ├── src/lib/contracts.ts    ← hand-authored addresses + chain metadata (no ABIs yet; no gen:contracts script — addresses sourced from contracts/deployments/*.json; mainnet LIVE fields blank)
│   ├── src/lib/sim/            ← sandbox mechanism engine (TS); attack.ts
│   └── ...
├── docs/
│   ├── SPIKE.md                ← the step-1 spike outcome (World ID 4.0 resolution) — authoritative
│   ├── DEMO.md                 ← explorer links, demo script, video link
│   └── MECHANISM_DELTA.md      ← MVP vs full design: every simplification listed
└── reference/demothemis-site/  ← pitch-site clone (gitignored; it has its own repo)
```

`reference/` stays out of the published repo — it is already its own public repo (gitignored here via `.gitignore: reference/`, ABSENT from this checkout) and would double the size of this one. To act on ANY §7/§12 line-numbered citation into `reference/demothemis-site/*.html`, a fresh agent must first clone that pitch-site repo (`https://github.com/FreddyMertens/DemoThemis.git`) locally into `reference/demothemis-site/` — it is not vendored.

---

## 3. Prerequisites and accounts (do once, ~half a day)

| # | Item | Notes |
|---|---|---|
| 1 | Node 20+, pnpm, Git | `winget install OpenJS.NodeJS.LTS` etc. |
| 2 | Foundry | Windows: install via WSL or use foundryup in Git Bash; WSL recommended for Foundry tooling |
| 3 | GitHub repo `DemoThemisMVP` | Private during build, **public + MIT before the application is submitted** |
| 4 | World **Developer Portal** account | developer.worldcoin.org — create **one app** (the mainnet live instance, World ID 4.0). Actions: `juror-registration` + one spare. The pre-spike staging/production two-app split is gone; the Sepolia cohort uses no World ID app |
| 5 | World App on a phone | For Mini App testing against the mainnet instance (Developer Portal shows a QR / link) |
| 6 | World ID **Simulator** | simulator.worldcoin.org — generates **staging proofs that verify on-chain against the mainnet Staging verifier** `0x703a…` (Step 3.5, the de-risk path, no physical Orb). The Production verifier needs a real Orb/Device proof |
| 7 | Deployer wallet | Fresh keypair used only for this project; never a personal key. Fund via faucet |
| 8 | World Chain Sepolia ETH | Alchemy faucet (alchemy.com/faucets/world-chain-sepolia) — note Alchemy faucets gate claims on the wallet holding a small mainnet ETH balance; fallback is bridging Sepolia ETH from Ethereum Sepolia via the OP standard bridge. Public RPC: `worldchain-sepolia.g.alchemy.com/public` |
| 8b | ~$10 of ETH on World Chain **mainnet** | For deploying and cranking the live instance (gas is cents; user transactions inside World App are sponsored). Bridge via the official World Chain bridge |
| 8c | 3 **verified humans by step 5** | The mainnet live panel needs three distinct World IDs — any three humans, founders or not (the sybil gate makes one person one seat). Steps 1–4 need none. Best: 3 Orb-verified (the strongest one-human guarantee, what the grant values); fine: Device-level, instant in World App — the **Production verifier `0x0000…` accepts both**. Pick people reachable on demo day — commit/reveal needs each juror twice, plus video retakes |
| 9 | Block explorer | worldchain-sepolia.explorer.alchemy.com and worldscan.org (mainnet) — used for contract **source verification** |
| 10 | Vercel account (or Netlify) | Mini Apps need a public HTTPS URL; during dev use the template's ngrok flow |
| 11 | World docs for the agent | docs.world.org/llms.txt and the World Docs MCP — wire into Claude Code when building |
| 12 | Working clone **outside OneDrive** | This folder stays the plan/docs home; the build clone lives in WSL `~/` or `C:\dev`. OneDrive locks fight git, and WSL on synced paths is slow. GitHub is canonical |

Key constants (confirm against `docs/SPIKE.md` and docs.world.org/world-id at build time):

- **World ID 4.0 `WorldIDVerifier.verify`** (the deployed on-chain path — see the governing block + Step 3.5), **World Chain mainnet 480 only**: Staging `0x703a6316c975DEabF30b637c155edD53e24657DB`, Production `0x00000000009E00F9FE82CfeeBB4556686da094d7`. (Legacy v3 Router still live — mainnet `0x17B354dD2595411ff79041f930e491A4Df39A278`, Sepolia `0x57f928158C3EE7CDad1e4D8642503c4D0201f611` — but a 4.0 app issuing v3 proofs is an open item; not the path.)
- The Sepolia World ID router is **not used** — the cohort runs without World ID (`MockSybilGate`).
- Chain ids: 480 (mainnet live), 4801 (Sepolia cohort).

`.env` contract (as actually wired today — repo-root `.env`, see `.env.example`): Foundry scripts read `PRIVATE_KEY` (the deployer key, `Deploy.s.sol` via `vm.envUint`) plus optional `vm.envOr` deploy overrides `PANEL_SIZE`/`MIN_POOL`/`COMMIT_DURATION`/`REVEAL_DURATION` (defaults 7/14/60/60). RPC endpoints are NOT env vars — they are `foundry.toml` `[rpc_endpoints]` literals named `worldchain_sepolia`/`worldchain_mainnet`, selected via `--rpc-url worldchain_sepolia`; `.env` also carries informational `RPC_WORLDCHAIN_SEPOLIA`/`RPC_WORLDCHAIN_MAINNET` strings that no Solidity reads, and the web app hardcodes the same URLs in `web/src/lib/contracts.ts`. World ID config today is the v3 routers `WORLD_ID_ROUTER`/`WORLD_ID_ROUTER_MAINNET` plus the two-app `WORLD_APP_ID_STAGING`/`WORLD_APP_ID_PROD` placeholders. Web reads `NEXT_PUBLIC_APP_ID` (in `web/src/components/Verify/index.tsx`), plus server `RP_ID`/`RP_SIGNING_KEY` and next-auth `AUTH_SECRET`/`AUTH_TRUST_HOST`/`AUTH_URL`/`HMAC_SECRET_KEY`. STEP-3.5 MUST ADD (none exist today): a `WORLD_ID_VERIFIER` var for the new `WorldIDGate` deploy path (Staging `0x703a…`, Production `0x0000…94d7`). `DEPLOYER_PRIVATE_KEY`, `DEV_PRIVATE_KEY`, `KEEPER_SEED`, `APP_ID`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_SHOW_DEV`, and `RPC_SEPOLIA`/`RPC_MAINNET` are planned-but-absent and read by no code. `src/lib/contracts.ts` is currently hand-authored: it hardcodes the cohort addresses (from `contracts/deployments/worldchain-sepolia.json`) and chain metadata, carries no ABIs yet, and leaves the mainnet `LIVE` addresses blank (including `WorldIDGate: ''`). A `pnpm gen:contracts` generator and ABI wiring are still to be built (Step 4); there is no `addresses.<chainId>.json` file.

---

## 4. Smart contracts (Foundry)

Design principle: smallest credible surface. Five contracts (four active + a passive `RewardPool`) plus the `ISybilGate` abstraction (`MockSybilGate` for the cohort, `WorldIDGate` wrapping `WorldIDVerifier` for mainnet), no upgradeability, no admin powers beyond a phase-duration setter held by the deployer. Solidity ^0.8.24.

### 4.1 MockUSD.sol

ERC-20, 6 decimals, name "Demo USD". Public `faucet()` mints 100 MUSD per call per address per day (so any reviewer can self-serve). This stands in for USDC/WLD; the production token choice is a funded-milestone decision, not an MVP one.

### 4.2 JurorRegistry.sol

The one-human-one-seat layer. It depends on an injected `ISybilGate` so the same contract serves both chains.

- `ISybilGate.verify(address signal, bytes proof) returns (uint256 nullifier)` — the abstraction (as built: reverts on an invalid proof; the registry rejects reused nullifiers, which is the sybil gate). The **mainnet `WorldIDGate` calls `WorldIDVerifier.verify(...)`** (v4 — arg list in the governing block + Step 3.5; Staging verifier for the de-risk, Production for the 3 humans). `MockSybilGate` is the Sepolia cohort + test gate. On-chain verification is v4 on mainnet, not v3.
  - **The opaque `bytes proof` decode contract (build this exactly).** `bytes proof` is `abi.encode(uint256 nullifier, uint256 action, uint64 rpId, uint256 nonce, uint256 signalHash, uint64 expiresAtMin, uint64 issuerSchemaId, uint256 credentialGenesisIssuedAtMin, uint256[5] proof)` — the eight v4 scalar inputs in declared order plus the Groth16 `uint256[5]`. `WorldIDGate.verify` `abi.decode`s these, computes `signalHash = uint256(keccak256(abi.encodePacked(signal))) >> 8` on-chain from the wallet `signal` and asserts the decoded `signalHash` equals it (binding the proof to the wallet), confirms the decoded `action` equals its constructor `action`, calls `WorldIDVerifier.verify(...)`, and returns the decoded `nullifier`. `MockSybilGate.verify` takes `proof = abi.encode(uint256 nullifier, address boundSignal)` — a 2-tuple, NOT the v4 9-tuple the WorldIDGate decodes — `abi.decode`s both, reverts `SignalMismatch()` if `boundSignal != signal`, and returns the decoded `nullifier` (the caller chooses it; the registry rejects reused nullifiers). The cohort/test and desktop/dev callers must therefore `abi.encode(nullifier, signal)`; passing the wallet as the nullifier is a test convention, not contract behavior. This 2-tuple encoding is distinct from the WorldIDGate's v4 tuple. The frontend (IDKit page B5 and the MiniKit onboard path) must produce this exact `abi.encode` so the gate and the registry agree on the calldata.
- `register(address signal, bytes proof)`:
  - calls `sybilGate.verify(signal, proof)`, where `signal` is bound to the wallet address and the action derives from `APP_ID` + `"juror-registration"`;
  - rejects a reused nullifier (mapping) — the sybil gate;
  - pulls the **5 MUSD bond** via `register(address signal, bytes proof)` using a classic ERC-20 allowance (`safeTransferFrom`). `registerWithPermit2(...)` does NOT exist in the contract yet — the Permit2 World-App path is deferred to step 5. The only other bond entry point built today is `postBond()`, which re-enters the pool after a withdraw or slash with no new proof (and `withdraw()` exits the pool);
  - appends the juror to an address array used by the draw.
- `withdraw()`: exits the pool and returns the bond if the juror is not in any active panel (track an `activePanels` counter per juror).
- Views: `jurorCount()`, `isActive(address)`.
- Bond slashing is executed by `DisputeCourt` via a restricted `slash(address juror, uint256 amount, address to)` callable only by the court address set at deploy; the court always passes `rewardPool` as `to`, so the slashed amount is forwarded to `RewardPool`. A juror whose bond reaches zero is **deactivated** — not drawable — until they post a fresh bond.

Edge cases to test: double registration with same nullifier (different wallets), registration with a mismatched signal, withdraw while empaneled.

### 4.3 DisputeCourt.sol

Case lifecycle, the heart of the demo.

Stored `Status` enum per case: `Open → Drawn → Resolved` (DisputeCourt.sol:56-60). Commit and Reveal are NOT stored statuses — they are time-derived sub-phases of `Drawn`, exposed only through the UI-helper `Phase` enum {Open, Commit, Reveal, Resolvable, Resolved} via `phaseOf(caseId)`. An agent indexing the on-chain `Status` field for 'Commit'/'Reveal' would be wrong.

- `openQuestion(bytes32 criteriaHash, string uri)` + case fee (2 MUSD): demo case type B — a yes/no question; `uri` points to a same-origin JSON blob (see §8 B2). `criteriaHash` = `keccak256` of the canonical JSON; it is a tamper-evidence anchor only, never verified on-chain.
- `openFromEscrow(...)`: restricted entry point for `DealEscrow` (case type A); the disputed deal's 2% fee funds the case.
- **Open checks**: `PANEL_SIZE` and `MIN_POOL` are constructor parameters — 7/14 (the 2× rule) on the cohort; 3/3 on the mainnet live instance so three verified humans are a working court (labeled demo parameters in the UI). Opening reverts below `MIN_POOL`.
- **Draw, two-step**: opening records `drawBlock = block.number + 1`. Once that block exists, *anyone* may call `draw(caseId)`, which selects distinct jurors via `keccak256(blockhash(drawBlock), caseId, i) % jurorCount`, re-rolling duplicates and the case's parties — so the opener cannot precompute the panel. If nobody cranks within 256 blocks (~8.5 min at ~2 s blocks), or fewer than `PANEL_SIZE` jurors are active, `draw` re-arms `drawBlock`. *Documented limitation:* still sequencer-influenceable; drand/VRF is funded milestone #1. Drawn jurors get `registry.enterPanel(juror)` (court-only), which increments their `activePanels`; `resolve` calls `registry.exitPanel(juror)` to decrement. The court does not mutate `activePanels` inline — JurorRegistry owns that state.
- **Phase durations** are stored as `commitDuration` and `revealDuration` (seconds), set in the constructor and changeable only by the immutable `deployer` via `setDurations(uint64 _commitDuration, uint64 _revealDuration)` (the sole admin power; durations are `uint64` and `setDurations` emits NO event — there is no `DurationsSet` event). There is no boolean toggle — "demo mode" is just short duration values surfaced as a per-case-card label. Both instances deploy with `commit = 60s, reveal = 60s` (the `Deploy.s.sol` `COMMIT_DURATION`/`REVEAL_DURATION` defaults; the deployed cohort and `deployments/worldchain-sepolia.json` record 60/60) so a full `draw → commit → reveal → resolve` completes inside one ~5-minute keeper run.
- **Commit phase**: drawn jurors call `commit(caseId, bytes32 h)` where `h = keccak256(abi.encode(vote, salt, caseId, juror))` — ABI-encoded (NOT packed/raw concatenation), with field types `(bool vote, bytes32 salt, uint256 caseId, address juror)`. The frontend/B5 must use exactly `abi.encode` or reveal reverts with `BadReveal`.
- **Reveal phase**: `reveal(caseId, vote, salt)` checked against the commitment.
- `resolve(caseId)` after the reveal deadline:
  - majority of revealed votes wins (tie → status quo: escrow refunds payer / question resolves NO);
  - **reveal quorum**: fewer than `PANEL_SIZE/2 + 1` reveals → one no-fee redraw of a fresh panel excluding no-shows; if the second panel also misses quorum, resolve by status quo;
  - **the case fee splits 70 / 20 / 10** — coherent jurors / `RewardPool` / protocol (the economic constitution from `the-design.html`). The 70% goes equally to revealers who matched the verdict; on a status-quo resolution with no coherent jurors, that share routes to the **reward pool** instead. Splits use integer MUSD (6dp); any division **remainder (dust) routes to `RewardPool`** so totals always conserve;
  - **slashed bonds never reach the other jurors** — they flow to `RewardPool`, because "a majority earns nothing by convicting its dissenters" (juror-court.html). This is the single most load-bearing economic rule in the reference and the MVP honors it;
  - **no-show = a liveness penalty**: a juror drawn but who never reveals forfeits their bond *to the reward pool* — closes the commit-no-reveal "free option" (breaking-the-court.html), framed as reliability, not treachery;
  - **wrong-side (coherence) slashing is deliberately deferred**: the design's real laziness floor slashes the *losing* vote, but fairly only *after the appeal ladder*. With no on-chain ladder in the MVP, minority voters are not slashed; the margin-scaled, post-appeal, vindication-refunded slash + ladder is shown in the sandbox (MECHANISM_DELTA.md);
  - calls back into `DealEscrow.settle(dealId, verdict)` for type-A cases;
  - decrements `activePanels` for the panel.
- **Permissionless cranking**: every time-gated transition (`draw`, `resolve`, redraw) is callable by any address once its condition is met. There is no operator; the keeper just makes it prompt, and the UI shows an "advance this case" button whenever a deadline has passed.
- Events on every transition (`CaseOpened`, `JurorDrawn`, `Committed`, `Revealed`, `Resolved`) — the UI and the seeded explorer history are built from these.

### 4.4 RewardPool.sol

A **passive sink**. It receives funds by plain ERC-20 transfer only (no `deposit`/`receive` function exists) — `JurorRegistry.slash` and `DisputeCourt._distributeFee` `safeTransfer` MUSD straight to its address — and exposes a single view `balance()`. **It has no payout function whatsoever in the MVP.** The gated cyclic distribution (Wilson-gated, recency-weighted, to active high-quality jurors) is a v2 / funded-milestone feature, shown only in the sandbox. The §4.6 MUSD-conservation invariant treats the pool as a terminal balance — note this dependency in MECHANISM_DELTA.md so a builder never adds a `distribute()` and breaks the invariant.

### 4.5 DealEscrow.sol

Demo case type A and the "arbitration service" story.

- `createDeal(address payee, uint256 amount, bytes32 termsHash, string uri)`: payer funds `amount` MUSD; a 2% fee is added on top and held. `termsHash` = `keccak256` of the canonical terms JSON at `uri`; tamper-evidence only, never verified on-chain.
- `release(dealId)`: payer releases; payee paid; fee returned to payer (no dispute, no court cost).
- `dispute(dealId)`: either party; locks the deal, sends the 2% fee to `DisputeCourt.openFromEscrow`, case question is "Should the payee be paid under the linked terms?"
- `settle(dealId, bool payeeWins)`: court-only callback; pays out accordingly.

### 4.6 Testing (part of step 2's gate)

- Unit: registration sybil rejection (mock + the v4 gate via a mock verifier), bond pull/withdraw rules, draw uniqueness and bounds, commit-before-draw rejection, reveal mismatch rejection, no-reveal slash math, majority payout math (incl. 4–3, 7–0, partial reveals), reveal-quorum redraw, dust-to-pool rounding, tie path, escrow happy path, escrow dispute path end to end.
- Invariant (Foundry invariant testing): MUSD conservation across registry + court + escrow + the terminal `RewardPool` balance; no case stuck (any case can always reach `Resolved` once deadlines pass).
- Fuzz: commit/reveal with random salts/votes; draw with 7..500 registered jurors.
- Target: `forge test` green, >90% line coverage on the five contracts (the four active contracts + `RewardPool`). No external audit claimed anywhere.

---

## 5. World ID integration

**Settled (governing block + Step 3.5):** on-chain verification is **World ID 4.0 `WorldIDVerifier.verify`** on World Chain **mainnet** (Staging verifier `0x703a…` for simulator proofs, Production `0x0000…` for Orb/Device). It is mainnet-only; the Sepolia cohort uses `MockSybilGate` (labeled). The exact v4 arg list + the IDKit `rp_id`/`action`/proof mapping are confirmed in Step 3.5.

Two uses, against the mainnet World ID 4.0 instance:

1. **On-chain (the credible one): juror registration.** A World ID 4.0 proof is submitted to `JurorRegistry.register` through `WorldIDGate`, which runs **`WorldIDVerifier.verify`** in the transaction and stores the nullifier — real on-chain Groth16 verification on **mainnet**. The human-free de-risk (Step 3.5) registers a simulator proof against the mainnet **Staging** verifier; the step-5 capstone registers the 3 humans (Orb preferred) against the **Production** verifier. The Sepolia cohort does not run this path (it is the labeled `MockSybilGate` scale demo).
2. **Session-level: wallet auth.** MiniKit `walletAuth` (SIWE) to bind the World App wallet to the session for transactions.

Dev loop without a phone: the World ID Simulator / IDKit generates staging proofs that verify **on-chain against the mainnet Staging verifier `0x703a…`** (Step 3.5) — no Orb, cents of gas. A small dev-only "paste-a-proof" page lets you exercise the registration UI from a desktop browser (see B5). For the capstone the proof comes from World App (Orb or Device, Production verifier); the phone + Mini App is the demo-day path.

Gas: World App sponsors transactions for verified humans via MiniKit `sendTransaction` — mention this in the application (it is one of the "How we use Worldcoin" claims). The desktop dev path uses the deployer/dev key and faucet ETH instead.

**Resolved (this was the load-bearing grant risk).** The on-chain claim is carried by the deployed **v4 `WorldIDVerifier.verify` on mainnet** — the Staging verifier `0x703a…` proves it with a simulator proof for cents (Step 3.5), the Production verifier `0x0000…` carries the 3 humans (step 5) — evidenced by a mainnet **explorer trace** showing the verifier called in-transaction and a forged proof reverting. §10's "on-chain verification" claim is therefore true and self-evidencing — no markdown assertion required.

---

## 6. Mini App (`web/`, currently the auth-gated `(protected)/home` route — NOT `/app`)

Reality check: the create-mini-app template put the Mini App at `web/src/app/(protected)/home/page.tsx` (guarded by `(protected)/layout.tsx`); `walletAuth` redirects to `/home` after sign-in. There is no `/app` route group yet, root `/` is still the template AuthButton, and `/sandbox` is the only other real route. The screens below must be built under `(protected)/home/**` (or a new `/app` group created, updating the two stale `<a href="/app">` links in `web/src/app/sandbox/layout.tsx` and `sandbox/page.tsx`). `/app/dev` (B5) does not exist.

Scaffold: `npx @worldcoin/create-mini-app@latest` (Next.js + `@worldcoin/minikit-js` + provider wiring), then add viem + generated ABIs.

**Instance routing (read this first).** The Mini App talks to two chains by role. Against the **Sepolia cohort (4801)** it is strictly **read-only**: it renders seeded juror/case history and never sends a transaction (the cohort is driven only by scripted wallets + the keeper). All **write** actions in the screens below (verify → `register`, `commit`, `reveal`, `createDeal`/`dispute`/`release`, `openQuestion`) execute **only against the mainnet live instance (480)** through World App, and only in the step-5 capstone with the 3 real humans. In a normal desktop browser the app degrades to read-only (step 4). `NEXT_PUBLIC_CHAIN_ID` is INTENDED to select the active instance but is NOT wired yet — today only `NEXT_PUBLIC_APP_ID` is read (in `web/src/components/Verify/index.tsx`); the chain-select var and the `NEXT_PUBLIC_SHOW_DEV`-gated `/app/dev` page are Step 4/5 work.

Screens, in build order:

1. **Onboard / Become a juror** — STARTING POINT: the template has a *cloud-verify* World ID flow only (`web/src/components/Verify/index.tsx` → `/api/verify-proof` forwards the IDKit result to `developer.world.org/api/v4/verify/{rp_id}` and returns `{success:true}`; `/api/rp-signature` signs the RP request). It extracts NO proof tuple, does NO `abi.encode`, makes NO contract call, and passes `signal: ''`. Step 3.5/4 must REPLACE this: obtain the on-chain-verifiable v4 proof tuple (nullifier, nonce, expiresAtMin, issuerSchemaId, credentialGenesisIssuedAtMin, proof[5]), set `signal` to the wallet address (the gate binds to it — `signal: ''` would fail WorldIDGate binding), `abi.encode` the gate's tuple → faucet MUSD if needed → `register`. There is no on-chain register path in the frontend yet. Logic: if `balanceOf(user) < 5e6`, show Faucet (catch the daily-cooldown revert with "already claimed today, you have N MUSD"). On the desktop/dev/cohort path use classic `approve` then `register` — the ONLY registration path in the deployed JurorRegistry today (it has `register`, `postBond`, `withdraw`; no `registerWithPermit2`). The single-tx `registerWithPermit2` World-App path is a step-5 deliverable not yet in the contract; until it is added, MiniKit onboarding cannot use it and the frontend must not call it. Success: "You are juror #N of M."
2. **Juror dashboard** — cases you are drawn on, with phase countdowns; registry stats (juror count, bonds held).
3. **Case detail** — question text + evidence links fetched same-origin from `uri`; phase timeline (Assertion window — static UI chrome, grayed out with a fixed "skipped in demo — see the full design" tooltip, no on-chain backing → Open → Commit → Reveal → Resolved); a "content matches on-chain hash" check recomputing `keccak256` of the fetched JSON against `criteriaHash`; commit form (vote + auto-generated salt, salt stored in localStorage with an export warning); reveal button; result panel with payout breakdown and explorer links.
4. **Open a dispute** — two tabs mirroring the two case types: (A) create/inspect an escrow deal, release or dispute it; (B) open a yes/no question with the 2 MUSD fee.
5. **About** — one paragraph + link to the pitch site and the sandbox; a persistent, instance-aware banner: "This app runs on World Chain — the live juror/case flow is on **mainnet (480)** with **valueless MockUSD** (no real money at stake); the seeded scale demo is read-only on the **Sepolia cohort (4801)**."

Non-goals for the Mini App: notifications, localization, app-store submission/review (the mainnet app QR is enough for the grant demo), gas abstraction edge cases, mobile-perfect polish beyond the template's baseline.

After every mainnet deploy: under Developer Portal → Mini App → **Permissions**, add every contract as a **Contract Entrypoint** *and* MockUSD under **Permit2 Tokens** — `sendTransaction` touching any non-whitelisted contract **or token** is blocked with `invalid_contract`. This applies to the mainnet app / live instance; the Sepolia cohort never transacts through World App.

Testing in World App: Developer Portal (the single mainnet app) → QR → phone. Keep a `DEMO.md` script of taps so the demo video is reproducible.

### 6.5 The grant reviewer is the primary user

Most reviewers will never install World App, so the demo must land its full punch in a browser; the World App flow is the "proof it's real" capstone, not the entry point. Design the experience as a funnel, and treat every item here as a grant-scored deliverable.

- **Landing `/` is a guided tour, not a link dump.** Three steps, in order: (1) **Watch it** — the comparative attack demo embedded right there (token court flips, human court holds), the single most persuasive twenty seconds in the project; (2) **See it's real** — live links to the source-verified contracts and the seeded cohort cases on the explorer, plus the read-only Mini App over that history, no World App required; (3) **Try it** — the World App QR and a MiniKit **deep link** that opens the Mini App straight to the live demo case, so a reviewer who does have World App lands on the case with zero hunting.
- **Make the World ID value visceral** — this is the grant's most-scored axis, so do not let it hide in a spec. The onboarding success state reads "Verified human #N: one person, one vote, and no wallet can do this twice." At resolution, the result panel says "N unique humans decided this; none could vote twice, and none could prove how they voted." The one-human-one-vote property should be *felt*. Mirror the same beat in the sandbox so the browser-only reviewer gets it too.
- **Frictionless join.** Auto-faucet on first load when the balance is short, bundle approve + register through Permit2 into one tap in World App, show a two-step progress UI, and land on a delightful confirmed state. Nobody should wonder what to do next.
- **Never look broken.** Every screen has explicit **loading** (skeletons), **empty** ("no cases yet, open one"), and **error** states; if the keeper is asleep the "advance this case" button is always present. A blank or hung screen on a reviewer's first look costs more than any missing feature.
- **Mobile is the real surface.** The Mini App runs in World App on a phone and the video is shot there, so the demo-path screens (onboard, case detail, commit/reveal, open dispute) must be clean at phone width. This is narrow polish on the few screens the reviewer actually sees, not a general mobile pass.

`docs/DEMO.md` is written for the reviewer first (the 60-second path with the three deep links above) and for the rebuild script second.

---

## 7. Sandbox courtroom (`/sandbox`, the reviewer's toy)

Purpose: show the *full* mechanism — including everything deliberately not on-chain — running with simulated participants, in the visual language of the pitch site (reuse its CSS variables and widget idioms; the clone in `reference/` is the style guide). Uses a seedable PRNG (e.g. mulberry32) with a fixed default seed so the attack curve and "run 100 cases" reproduce identically for the video; expose a "re-roll seed" control.

Engine (`web/src/lib/sim/`, pure TypeScript, no chain):

- Population: N simulated jurors (default 200) with hidden per-juror accuracy; registry mirrors the $5 bond rule.
- Case generator: both case types with canned realistic content (5–6 escrow disputes; 5–6 market questions) authored as the same `web/public/cases/*.json` blobs used on-chain.
- Full pipeline per case: draw → commit → reveal → verdict → **70/20/10 payout that mirrors the deployed contracts** (jurors / reward pool / protocol; slashes → reward pool; integer-cent math, dust → reward pool, so the sandbox and the conservation invariant agree to the cent), then the layers the chain doesn't have: the **appeal ladder** (panels 7 → 15 → 31; the rung bond is the **max of three live floors** — juror-cost, anti-re-roll `≈ P(capture)×stake`, delay-rent — not a flat ×2; near-tie discount clamped above the anti-re-roll floor; the two unsynchronized clocks), **parallel panels above the ceiling** (1 / 3 / 5 by case value, drawn without overlap, all must agree; capture odds multiply `pᴺ`), **reputation** (leave-one-out, baseline-credited, margin-weighted; draw rate capped at **3× a newcomer**; the Wilson `0.70` / `z=1.96` / `50–150`-window gate), the **reward-pool payout** (the gated cyclic distribution the on-chain pool does not do), **watchers** (report → petition, ≥5% of the losing side).
- Controls in the established widget style: sliders for pool size N / panel size / attacker budget / bribe price / bond, a "run 100 cases" button, and a single flagship "file a dispute and watch" walkthrough.
- **The flagship comparative attack demo — "buy this verdict" (token court vs human court).** Two oracles resolve the *same* question under the *same* attacker budget, side by side. The single most persuasive artifact in the MVP:
  - **Token-weighted court** (UMA/Kleros-style): voting power ∝ stake; a bar fills past 50% and the verdict **flips** to the lie, then flips a second case for *free*. Readout: cost-to-flip and "reusable forever."
  - **DemoThemis human court**: one-human-one-vote; a random panel drawn after the question; private commit/reveal; bond at stake; the appeal ladder. The cost **balloons past the budget and the value at stake**; the verdict **holds**.
  - The money shot: a **P(flip)-vs-budget curve** for both. Crank pool size N and watch the human curve collapse further (security is pool *width*).
  - **Above the ceiling:** pick case value (1 / 3 / 5 parallel panels) and watch capture odds multiply (`pᴺ`: ~1/5 → 1/125 → 1/3000).
  - **Math source — port directly, do not re-derive.** `web/src/lib/sim/attack.ts` copies the reference JS verbatim so sandbox numbers match the pitch site exactly: `binomTail`/`hyperTail` (the `window.__court` block in `juror-court.html`, ~lines 363–405); the parallel-panel sweep (`POOL=600, SEATS=31, MAJ=16, N∈{1,3,5}`, same file ~lines 671–789); the three-floor appeal bond (`MSTAR=500, LAMBDA=2, FEE=1.5`, `panelFor`, `capFloor = LAMBDA*odds*stake`) from `hybrid-juror-system.html` (~lines 452–538). The bribe-price floor is `fee($1.50) + bondAtRisk($5) + reputationValue` (reputationValue = $0 in the MVP, noted in code). The **token-court model is the one part to author fresh** — there is no reference code for it: `P(flip)=1` once `budget ≥ 0.5 × totalStake` at a chosen token price, plus a "second case free" reuse flag.
- **Make the optimistic funnel loud**: a headline stat readout — most matters never reach a jury (escrow happy path + the optimistic assertion path) — so a reviewer sees the jury is the rare backstop. Attribute the "~95% settle free" figure to the optimistic-layer *roadmap*, never as MVP behavior (honesty rule).
- Labeling: a fixed badge on the route — "Simulation. Illustrative model on the design's published parameters. The on-chain demo lives at /app." — plus per-widget "simulated" tags.

Keep the engine honest to the design in `reference/demothemis-site/` (chapters 2, 3, 8 hold the parameters). The core court sim must match the *deployed* rules (70/20/10 + **reward-pool-routed slashes**) so the sandbox and `/app` tell one story; the ladder/reputation/reward-payout/watchers are the sandbox-only additions. Add every simplification to `docs/MECHANISM_DELTA.md` — including the easy-to-forget ones: juror addresses and revealed votes are fully public on-chain in the MVP (the full design hides both), commit/reveal is not receipt-free, the on-chain reward pool is a passive sink, and there is no first-round coherence slashing.

---

## 8. Demo data, history, and proof artifacts

A reviewer who clicks the explorer must see a machine that has actually turned over.

**B1 — deterministic cohort keys/salts (so the keeper can reveal in one run).** Cohort juror wallets derive from a single `KEEPER_SEED`: `privkey_i = keccak256(KEEPER_SEED, "juror", i)` for i in 0..19, addresses logged to `cohort-jurors.json` at seed time. Each commit salt derives statelessly as `salt = keccak256(KEEPER_SEED, "salt", caseId, juror)`, so any keeper run recomputes it from chain state alone — no salt persistence, and a re-run reveals correctly. Votes: `keccak256(KEEPER_SEED, "vote", caseId, juror) % 2`, biased so a clear majority forms (e.g. 5–2).

**B2 — case `uri` JSON.** A GitHub-raw / same-origin URL into the repo: `web/public/cases/<slug>.json`, served by Vercel at `/cases/<slug>.json` (no IPFS in the MVP — avoids gateway/CORS/pinning). Schema: `{ title, question, standard: "objective"|"rubric", evidence: [{label, url}], terms? }`. `criteriaHash`/`termsHash` = `keccak256` of the canonical JSON string. The ~12 canned cases are authored by hand into that folder during step 3 and reused verbatim by SeedDemo and the sandbox.

1. `SeedDemo.s.sol` + a TS driver (Sepolia cohort): register ~20 scripted jurors through `MockSybilGate` (disclosed as ours in DEMO.md and the video; 20 keeps the registry above the 14-juror open threshold even after withdrawals), run **8–10 full cases** to resolution across both types, leave 1–2 cases live in commit phase so the dashboard isn't a museum. **The driver processes one case fully before opening the next** (open → mine 1 block → draw immediately → commit all → reveal all → resolve), never batching opens, so every draw lands far inside the 256-block window; on a `JurorDrawn`-absent receipt (re-armed draw) it retries `draw` once after a 1-block wait before failing loudly. One case is deliberately left under-quorum (a dedicated `seed-redraw` step, not the cron) to show the redraw path on the explorer.
2. **Keeper**: a GitHub Actions cron running the case-driver — open a case, then drive the whole lifecycle in one run (`draw → the scripted jurors' commit/reveal via their reproducible keccak-derived keys → resolve`). Driving a full case per run keeps the dashboard mid-motion and **sidesteps the §4.3 draw-window timing trap** (the draw is cranked seconds after the open). The keeper always reveals all drawn jurors, so cohort cases never redraw (the redraw story is the sandbox's + the one seeded under-quorum case). Cranking is permissionless, so a dead cron degrades into the UI's "advance this case" button.
3. **Mainnet live instance**: 3 real verified humans as jurors registered through World App (Orb preferred; the Production verifier also accepts Device — §3 row 8c), one escrow deal and one question case run end to end, left visible on the explorer. This is deliberately the only non-simulated slice of the MVP. The 3-seat panel is labeled a demo parameter wherever it appears. The demo deal's payer and payee are plain non-juror wallets (parties are excluded from the draw, and a 3-person bench has no slack for exclusions).
4. `docs/DEMO.md`: written for the grant reviewer first (the §6.5 60-second path: the sandbox attack-demo link, the explorer + read-only-app links, and the World App QR + deep link), the rebuild script second. Includes contract addresses (source-verified) and links to each seeded case's event trail.
5. Demo video (3–4 min), **leading with the hook**: open on the ~20-second attack demo (token court flips to the lie, human court holds), then phone joining as juror in World App (World ID 4.0, mainnet instance) → opening a dispute → commit/reveal → payout on the explorer → 30 s of the Sepolia cohort's case history. Captioned. Loom or YouTube-unlisted.
6. Pitch-site link-up: add one "Live demo" link on the pitch site index once the deployment is stable (separate tiny commit in the other repo).

---

## 9. The steps

The steps run sequentially (a half-step, 3.5, was inserted after the spike); each ends in a hard gate, and nothing in a later step starts until the gate before it passes. After step 5, the MVP is live and fully functional.

### Step 1 — All infrastructure ready to deploy ✅ done

(See docs/SPIKE.md and docs/INFRA_CHECKLIST.md. The spike found World App + World ID 4.0 verification are mainnet-only; on-chain verification is v4 `WorldIDVerifier.verify` on WC mainnet (Staging + Production verifiers) — see the governing block + Step 3.5 — and the Sepolia cohort is the labeled `MockSybilGate` scale demo. The 3 humans are lined up for step 5.)

Outcome recorded: one mainnet Developer Portal app created (the two-app design was collapsed); `juror-registration` + spare action; `APP_ID` in `.env`. Toolchain (WSL + Foundry, Node 20 + pnpm, clone outside OneDrive, CI skeleton); repo scaffold + hello-world on Vercel; deployer key + Sepolia ETH + ~$10 bridged to mainnet; the §5 spike answered in writing and the on-chain gate locked to v4 `WorldIDVerifier.verify` on mainnet (Step 3.5).

**Done when:** the spike memo exists, hello-world is on Vercel, `forge test` runs in CI, and every account, key, and balance in §3 is checked off.

### Step 2 — Contracts built, tested, and deployed (Sepolia cohort) ✅ done

- All five contracts per §4 — MockUSD, JurorRegistry, DisputeCourt, DealEscrow, **RewardPool** — with the `ISybilGate` abstraction, the two-step draw, quorum + auto-redraw, **70/20/10 fee split and reward-pool-routed slashes**, dust-to-pool rounding, permissionless cranking, the `setDurations` admin power, and constructor-parameterized 7/14 (cohort) / 3/3 (mainnet) instances. The Permit2 registration path moves to step 5 with the mainnet/World App slice (the cohort uses the classic allowance path behind `MockSybilGate`).
- Test suite per §4.6 green: 61 tests passing (unit, fuzz, 3 invariants) across 8 suites; full case lifecycle exercised. (The suite has since grown to **77 tests across 9 suites** with the Step-3.5 WorldIDGate and Step-5 `registerWithPermit2` tests; README and CI agree.)
- Deploy + source-verify the **Sepolia cohort** instance. The mainnet live instance, its Permissions whitelisting, and the paste-a-proof page move to **step 5** (they need real World ID 4.0 + mainnet money).

**Done when:** one scripted case resolves end to end on the cohort via `cast`, all addresses are source-verified, and a scripted juror is juror #1 on the public explorer. *(Met; the single-case proof predates the economic fixes and is redeployed with the corrected economics at the top of step 4.)*

The remaining steps are dependency-sorted: the human-free thesis first, the browser-testable Mini App next, and everything that needs the 3 humans or mainnet money consolidated into the final capstone.

### Step 3 — The sandbox + the comparative attack demo (the thesis) ✅ done

Built per §7, **Must and Should both shipped** (plus an adversarial-review pass): the sim engine in `web/src/lib/sim/{attack,court-math,court-sim,ladder,reputation,funnel,cases,prng}.ts`, and the widgets in `web/src/app/sandbox/components/` (`AttackDemo`, `CoreCourt`, `LadderDemo`, `ReputationDemo`, `RewardPayoutDemo`, `WatchersDemo`, `CaseBrowser`, `FunnelReadout`) — the comparative attack demo, the core court sim, the optimistic-funnel-loud readout, the ladder, reputation, reward-pool payout, and watchers, in the pitch-site visual language with the simulation badge and a seeded PRNG. `docs/MECHANISM_DELTA.md` is maintained. **Step 4 reuses these by their real paths.**

**Gate met:** a stranger opens `/sandbox`, runs the attack demo, and watches a bribe fail.

### Step 3.5 — Real on-chain World ID verification on mainnet (de-risk the grant's headline claim) — ✅ COMPLETE (three WC-mainnet traces in `docs/DEMO.md`: valid registration with `verify` in-tx, forged revert, duplicate `NullifierAlreadyUsed`)

This makes "on-chain World ID verification" provable from a mainnet explorer trace, *before* the step-5 human capstone, and cheaply. It uses **World ID 4.0 `WorldIDVerifier.verify`** on World Chain mainnet (the deployed verifier per SPIKE.md), against the **Staging** verifier so it needs no Orb and only a few cents of gas. Mostly contract + script work, no Mini App, no 3 humans.

**Session status (2026-06-18; full hand-off in `docs/STEP_3.5_KICKOFF.md`):** the mainnet deployer `0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c` is now **funded** — 0.0028 ETH on WC mainnet (480), bridged from L1 via `scripts/bridge-l1-to-wc-mainnet.sh` (which uses the explicit `bridgeETHTo` entrypoint; the bare `receive()` reverts on the v2.8.0 bridge). **Both verifiers are confirmed deployed** on WC mainnet (Staging `0x703a…`, Production `0x0000…94d7`, real bytecode). One gotcha found in the existing frontend: `web/src/components/Verify/index.tsx` requests a **legacy** proof for **cloud** verify (`.preset(orbLegacy({ signal: '' }))` + `allow_legacy_proofs: true`), which is NOT the v4 9-tuple the Staging verifier consumes — so the empirical confirm below requires first building a **v4 on-chain IDKit request** (drop `orbLegacy`, use `proofOfHuman` + `environment: 'staging'`, set `signal` to the wallet address). The `/api/rp-signature` handshake is reusable as-is. **The de-risk is now done:** a Simulator proof_of_human staging proof was driven end-to-end and **verifies on-chain** against `0x703a…` (a forged one reverts) — so Step 3.5's headline claim is proven before any gate code; build with confidence. The verified arg recipe (incl. the `action >> 8` gotcha) is in the resolved-open-item bullet below and `docs/STEP_3.5_KICKOFF.md`.

- **Spike open item — RESOLVED, and the path CONFIRMED ✅ (2026-06-18) by a live `cast call` that returned `0x`** (a World ID **Simulator** `proof_of_human` v4 **staging** proof verifies on-chain against the **Staging** verifier `0x703a…`; a forged proof reverts `0x7fcdd1f4`). The field-by-field IDKit→`verify` map, as verified: `nullifier = responses[i].nullifier`; **`action = uint256(keccak256(actionString)) >> 8`** — NOT raw keccak: the docs' un-shifted `keccak256(action)` reverts `PublicInputNotInField()` (`0xa54f8e27`) because it exceeds the BN254 field; apply the same `>>8` hashToField as the signal; `rpId =` the rp_id string with `rp_` stripped as `uint64` (`rp_1ddcf8ba2efe3f36` → `0x1ddcf8ba2efe3f36`); `nonce = top-level nonce`; `signalHash = responses[i].signal_hash` (already field-fitted, leading `0x00`); `expiresAtMin = responses[i].expires_at_min`; `issuerSchemaId = responses[i].issuer_schema_id` (`1` = proof_of_human); `credentialGenesisIssuedAtMin = 0` (absent in the response); `proof = responses[i].proof` (`uint256[5]` — first 4 are Groth16 limbs, the **5th is the Merkle root**; corrupting it reverts `InvalidMerkleRoot()` `0x9dd854d3`). The IDKit request MUST set **`environment: 'staging'`** (defaults to production, which the Simulator rejects). Record this table in MECHANISM_DELTA.md; a working probe is `web/src/app/verify-onchain/page.tsx`.
- **Build the real `WorldIDGate` from scratch** (the `ISybilGate` impl) — it does NOT exist yet; `contracts/src/sybil/` has only `ISybilGate.sol` and `MockSybilGate.sol`, and the only verifier in the repo is the v3 throwaway `contracts/src/spike/SpikeVerifier.sol` (`IWorldID.verifyProof(root, groupId, signalHash, nullifierHash, externalNullifierHash, uint256[8] proof)`, `GROUP_ID=1`), explicitly superseded per SPIKE.md. The new gate `abi.decode`s the §4.2 v4 9-tuple, calls the v4 `WorldIDVerifier.verify(nullifier, action, rpId, nonce, signalHash, expiresAtMin, issuerSchemaId, credentialGenesisIssuedAtMin, proof[5])` and returns the nullifier; the registry rejects reused nullifiers. There is no v4 `WorldIDVerifier` interface in the repo either, so the agent must add it. `MockSybilGate` stays the cohort + test gate.
- **Signal binding:** `signalHash = uint256(keccak256(abi.encodePacked(signal))) >> 8` where `signal` is the registering wallet address; `WorldIDGate` computes this on-chain and the IDKit call must pass the **same** wallet address as its `signal`, else `verify` reverts on a signal mismatch. Document the exact convention (and confirm it against the deployed verifier) in MECHANISM_DELTA.md.
- **Constructor + env injection:** `WorldIDGate`'s constructor takes `(address worldIdVerifier, uint256 action, uint64 rpId)`; Step 3.5 must ADD this wiring: today `Deploy.s.sol` hardcodes `new MockSybilGate()` (line 34) and reads no verifier env var (only `PRIVATE_KEY` + `PANEL_SIZE`/`MIN_POOL`/`COMMIT_DURATION`/`REVEAL_DURATION`). The agent should add a branch that, when targeting mainnet, reads `WORLD_ID_VERIFIER` and constructs `WorldIDGate` in the same gate constructor slot; only then is Staging-vs-Production an env swap. (The existing v3 `DeploySpike.s.sol` reads `WORLD_ID_ROUTER`+`WORLD_APP_ID_STAGING` to build the throwaway `SpikeVerifier` — a different shape, not a template for the gate slot.) (Staging `0x703a…` here in Step 3.5, Production `0x0000…94d7` in Step 5).
- **Deploy the gate + a minimal `JurorRegistry` to WC mainnet, pointed at the Staging verifier `0x703a…`,** and register one juror with a **simulator/IDKit staging proof** — a real on-chain v4 verification, ~cents of mainnet gas, no Orb. A scripted `cast`/viem tx is enough for the trace; whitelist the contract in the Portal only if World App is involved.
- **Prove it is enforced — two distinct reverts:** (a) a **duplicate** of the first valid proof reverts in `JurorRegistry`'s nullifier mapping (the sybil gate); (b) a **forged** proof — take the valid staging proof and corrupt one limb of the `uint256[5]` (e.g. `proof[0] ^= 1`) — reverts inside `WorldIDVerifier.verify` (Groth16 failure). Capture **both** traces; (b) is the verifier-level artifact §10's grant claim leans on. Add Foundry tests for both against a mock verifier (the mock reverts on the corrupted-limb sentinel, the registry reverts on the reused nullifier).
- **Capture the self-evidencing evidence:** in `docs/DEMO.md`, link the mainnet explorer trace of the registration showing `WorldIDVerifier.verify` called in-transaction, and the forged-proof revert. This is what backs §10's World ID claim — a clickable trace, not a doc.

**Gate met when:** a mainnet registration verifies a World ID 4.0 proof on-chain via `WorldIDVerifier.verify` (the call is in the transaction, traceable on worldscan), and a forged/duplicate attempt reverts on-chain. Step 5 then swaps the gate to the **Production** verifier `0x0000…94d7` for the 3 humans (Orb preferred; it also accepts Device) on the same `WorldIDGate`.

### Step 4 — The on-chain demo body: the Mini App + the live Sepolia cohort ← next

The chain-wired half — the Mini App and the seeded cohort it renders. (The cohort is `MockSybilGate`-gated per the spike's Option A; the real on-chain-World-ID claim is the mainnet v4 demo from Step 3.5.)

- **Redeploy the cohort with the corrected economics** (reward pool + 70/20/10 — the step-2 proof predates them), then seed per §8: ~20 jurors, 8–10 resolved cases across both types, 1–2 live, one under-quorum (`scripts/{seed-cohort,resolve-case,verify-cohort}.sh`).
- **Keeper** (§8): the case-driver on a cron, full-case-per-run, keeping the dashboard mid-motion.
- **The Mini App** — the five screens from §6 wired to the cohort for **read-only** display (juror/case views over the seeded history): MiniKit walletAuth; the commit/reveal UI built but exercised against the cohort only as a preview; the grayed-out assertion step + the optimistic-funnel framing; the instance-aware banner. Testable in a normal browser (read-only) and via the QR.
- **The sybil-rejection demo (§6.5)** — the small-but-significant upgrade: surface the **duplicate-human revert** on the cohort (the registry rejects a reused nullifier even behind the mock gate) and **link the Step-3.5 mainnet trace** of a forged World ID 4.0 proof reverting in `WorldIDVerifier.verify`. The negative path proves the one-human-one-vote guarantee far better than any success state. Plus **visible gas sponsorship** ("0 gas, sponsored for verified humans") on the register/vote transactions.

**Done when:** the cohort dashboard is mid-motion untouched for 24 h; the Mini App runs end to end against the cohort in a browser + loads via the QR; and the sybil-rejection demo shows a duplicate registration reverting (cohort) with the mainnet forged-proof revert linked (Step 3.5).

### Step 5 — Mainnet + humans capstone, packaging, go-public

The one real slice and everything that needs mainnet money or the 3 humans — done last, right before submission.

- Deploy the mainnet live instance (3/3, the real `WorldIDGate` over **`WorldIDVerifier.verify`** at the **Production** verifier `0x0000…94d7` — the same gate proven against the Staging verifier in Step 3.5 — Permit2 registration path, sponsored gas); whitelist contracts + MockUSD under the mainnet app's Permissions; ship the `/app/dev` paste-a-proof page (B5). The 3 humans are **Orb-verified** (preferred — the strongest one-human guarantee; the Production verifier also accepts Device); their registrations verify on-chain on mainnet, the capstone of the Step-3.5 evidence.
- The 3 verified humans run one escrow deal + one question case end to end in World App on mainnet, left on the explorer (deal parties from non-juror wallets).
- `docs/DEMO.md`; demo video (mainnet phone flow → Sepolia history → the attack demo); README quickstart + the env contract; repo public + MIT; Vercel production; pitch-site "Live demo" link.
- Final QA: every DEMO.md / README link resolves; the §10 table has an artifact per row; demo-mode labels + simulation badges audited once more; MECHANISM_DELTA.md complete.

**Done when:** anyone can open the sandbox + run the attack demo, scan the QR, join the court, and file a dispute — and every URL the application will cite is live. What remains (ask sizing, application copy) is writing, not building.

**B5 — the paste-a-proof dev page (UNBUILT; Step 5 deliverable).** To live at `/app/dev` (dev-only, behind a `NEXT_PUBLIC_SHOW_DEV` flag that does not exist yet). No `/app` route group exists today (the Mini App is at `(protected)/home`), and `NEXT_PUBLIC_SHOW_DEV`/`NEXT_PUBLIC_CHAIN_ID`/`DEV_PRIVATE_KEY` are all undefined — the builder must create the route group, the flag, the chain-select var, and a dev signing key. The MockSybilGate it targets on the cohort expects `abi.encode(uint256 nullifier, address signal)` (2-tuple), NOT the v4 9-tuple. A textarea for the raw JSON the World ID Simulator returns, a wallet-address field (the `signal`), and a "Register" button that reads the Simulator JSON fields per the Step-3.5 mapping table, `abi.encode`s them into the `bytes proof` the gate expects (the same encoding the MiniKit onboard path uses), then calls `MockUSD.faucet()` + classic `approve` + `JurorRegistry.register(signal, proof)` signed by `DEV_PRIVATE_KEY` via viem against the configured RPC. It targets whichever instance `NEXT_PUBLIC_CHAIN_ID` selects, and submits the proof to the `WorldIDGate` so the registry runs `WorldIDVerifier.verify` on-chain on mainnet. (The Staging verifier accepts a simulator proof; Production needs a real Orb or Device proof. On the cohort, registration goes through `MockSybilGate`.)

---

## 10. Mapping to the grant application

| Spark requirement | MVP artifact |
|---|---|
| Clear problem statement | Pitch site (index + vision chapters), one-paragraph version in README |
| Working demo / prototype | Mini App on World Chain (mainnet live + Sepolia cohort) + sandbox + video + seeded explorer history |
| Deep World ID usage | **On-chain World ID 4.0 verification** via `WorldIDVerifier.verify` on World Chain mainnet, sybil-resistant one-human-one-seat — provable from the mainnet registration **explorer trace** (Step 3.5), including a forged proof reverting on-chain. Sponsored transactions for verified humans. |
| Realistic milestones | The funded roadmap below |
| Open source | MIT repo, verified contract sources |
| Sustainability story | Court funded by case fees; cold-start demand seeded by a first-party prediction market (resolved by the personhood court — a separate product, stakes/licensing out of grant scope; Polymarket is the UMA-resolved foil, not a customer), then open to all consumers — no perpetual grant dependence |

Funded-milestone roadmap to propose (post-MVP): (1) drand/VRF draw randomness; (2) receipt-free ballots (MACI-style, bonded coordinator v1); (3) the optimistic assertion fast path + juror reputation + dispute ladder on-chain + the **reward-pool gated payout**; (4) resolution / oracle SDK + first prediction-market integration (escrow/marketplace a later consumer); (5) security review; (6) juror UX hardening + moderated user-testing (the largest line). Price each in USD per the guidelines; payments arrive in WLD on the 1st/15th with a 40-day lock-up, no upfront tranche.

Application framing reminders: the grant funds the **arbitration platform**; the prediction market is a first-party demand seed and a separate product out of grant scope (not a customer); never present sandbox numbers as usage; US persons/entities are ineligible for WLD — confirm residency; KYC for the applicant of record (one applicant-signatory, the professor listed as team member only).

Two tasks before drafting the application, both currently undone: (a) a **differentiation scan** — the comparative attack demo (§7) is the core of it; pair it with a search of the World App catalog, past wave recipients, and the RFP list for existing dispute-resolution/escrow projects, and write one honest paragraph; (b) **settle the ask** — price each milestone in USD against the installment structure before any application copy is written.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| "On-chain World ID" must be real, not a doc claim | **Resolved in Step 3.5:** on-chain verification uses the deployed **v4 `WorldIDVerifier.verify` on mainnet** (Staging verifier `0x703a…`, provable with a simulator proof for cents; Production for the 3 humans), evidenced by the mainnet explorer trace and a forged proof reverting |
| Foundry on Windows is painful | WSL for the contracts package from day one; CI (GitHub Actions ubuntu) is the arbiter |
| Mainnet gas for the on-chain proof | Step 3.5 needs only a couple of mainnet txs (a staging-verifier registration + a revert), a few cents; the bulk scale demo stays free on the Sepolia cohort, so the ~$10 mainnet budget covers it |
| Draw randomness criticized | Two-step draw (§4.3) kills panel precompute; residual sequencer influence noted in MECHANISM_DELTA.md; drand/VRF is funded milestone #1 |
| Keeper dies during review week | Cranking is permissionless — the UI shows an "advance this case" button whenever a deadline has passed |
| Commit/reveal ≠ receipt-free | Sandbox has an explainer panel contrasting commit/reveal with the MACI roadmap |
| Salt loss = forced no-reveal slash | localStorage + visible "export your salt" step in the ballot UI; cohort salts are stateless-derivable (B1), acceptable at demo scale |
| Demo-mode timings confuse reviewers | Phase durations shown on every case card with a "demo mode: minutes instead of days" tag |
| Gambling smell on case type B | Type A (escrow) is the headline everywhere; type B copy says "resolution question", never "bet" |
| OneDrive + WSL fighting git | Working clone lives outside OneDrive from day one; GitHub is canonical; this folder keeps only the plan and reference docs |
| Scope creep (esp. building the reward-pool payout into the contract) | MECHANISM_DELTA.md is the contract; the on-chain pool is a passive sink (§4.4); anything not in §1 "In the MVP" needs a deliberate plan change |

---

## 12. Reference map (where to look while building)

In `reference/demothemis-site/` (clone of the pitch site, its own repo — gitignored here):

| File | Use during the build |
|---|---|
| `juror-court.html` (ch. 2) | Court mechanics: $5 bond rationale, draw, encrypted ballots, panel sizes. **`binomTail`/`hyperTail` combinatorics (~363–405) and the parallel-panel `pᴺ` widget (~671–789) are the `attack.ts` source** |
| `hybrid-juror-system.html` (ch. 3) | Scoring, ladder, two clocks, the reward pool. **The three-floor appeal bond (`MSTAR=500, LAMBDA=2, FEE=1.5`, ~452–538) and the Wilson gate (`0.70/1.96`, ~382–428) are the sandbox source** |
| `prediction-market.html` (ch. 4) | Case type B wording; resolution flow |
| `the-design.html` (ch. 8) | The assembled machine + shipped numbers — parameter source of truth; the 70/20/10 split and the six-attacker framing for the sandbox copy |
| `index.html` | Product framing + UMA explainer — reuse for application copy |
| `governance.html` (ch. 9) | Out of scope; read only to keep terminology consistent |
| `victim-compensation.html` | The reward-pool rationale (why the pool rewards jurors, never compensates victims) |
| `SKILL.md` | Writing rules for all user-facing copy (README, app text, application) |

External, verified 2026-06: World docs (docs.world.org — mini-apps quick start, world-id on-chain verification; the v4 `WorldIDVerifier` is deployed on WC mainnet per SPIKE.md, llms.txt), Developer Portal (developer.worldcoin.org), simulator (simulator.worldcoin.org), faucet (alchemy.com/faucets/world-chain-sepolia), grant guidelines (worldcoinfoundation.notion.site), grants page (world.org/grants).
