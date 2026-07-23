# Infrastructure checklist (step 1)

Mirror of IMPLEMENTATION_PLAN.md §3. Step 1 is done when every row is checked and the spike memo (SPIKE.md) has answers.

## Toolchain (machine: Windows 11 + WSL Ubuntu)

- [x] Node 20+ on Windows (v20.19.5) and in WSL (v20.19.4)
- [x] pnpm 9 on Windows
- [x] git on both sides
- [x] Foundry in WSL (forge 1.7.1; invoke as `wsl -e bash -lc '~/.foundry/bin/forge ...'` from Windows)
- [x] Working clone outside OneDrive: `C:\dev\DemoThemisMVP` (contracts built via WSL `forge`; OneDrive folder keeps plan + reference only)

## Repo

- [x] Monorepo scaffold: `contracts/` (Foundry) + `web/` (create-mini-app) + `docs/`
- [x] Public GitHub repository: [FreddyMertens/DemoThemis](https://github.com/FreddyMertens/DemoThemis), with CI and the mainnet question-keeper workflow present; keeper writes fail closed until the verified liveness replacement is selected
- [x] Canonical production deployment: [demothemis.netlify.app](https://demothemis.netlify.app) with the Mini App at `/onboard`; the former Vercel hello-world is only an archived rollback artifact

## World Developer Portal

- [x] Portal account at developer.worldcoin.org (login: freddymertens@proton.me)
- [x] App configured as **DemoThemis**, `app_7bdfda4db4e2f59dd4a2427cd2bd860d`: Mini App enabled, category Business, World ID 4.0 **Managed** (RP `rp_1ddcf8ba2efe3f36`), App URL `https://demothemis.netlify.app/onboard`, official website on Netlify, and worldwide draft availability
- [x] Actions created in it: `juror-registration` + `juror-registration-backup`
- [ ] ~~Second unlisted production app~~ — ON HOLD: World ID 4.0 shows BOTH "Staging Status: Active" and "Production Status: Active" on this single app (see SPIKE.md portal findings). Create a second app only if the spike proves tree pairing still demands it
- [ ] World App installed on a phone (needed for spike (b) + step 3) — NEEDS HUMAN
- [ ] World ID Simulator tried against the app: simulator.worldcoin.org

## Money and keys

- [x] Fresh deployer keypair generated: `0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c` (project-only; plaintext in `.env`, demo scale only — never reuse elsewhere)
- [x] World Chain Sepolia ETH on deployer: **0.2 ETH** (Alchemy faucet is unusable — gates on Ethereum *mainnet activity*; got it free via pk910 PoW faucet → `scripts/bridge-l1-to-wc-sepolia.sh`). ~0.13 ETH also left on Ethereum Sepolia. (User sent 0.003 ETH on Ethereum mainnet to clear the original balance gate before we discovered the activity gate.)
- [ ] ~$5–10 ETH bridged to World Chain mainnet on deployer — NEEDS HUMAN (real money); for **Option A (locked)** this funds the liveness-enabled replacement deploys + the three-seat / at-least-four-human showcase + 2 mainnet cases; most stays as buffer (World App sponsors the humans' gas)
- [x] RPC endpoints confirmed (chain ids 4801 / 480 — see SPIKE.md constants)

## People

- [ ] At least 4 Orb-verified humans lined up for step 3 (three panel seats plus one pre-draw availability reserve; reachable on demo day, available twice per case for commit + reveal). Device-level verification alone is not eligible; the planned on-device presence/continuity check happens after Orb enrollment as an anti-rental backstop.

## Spike (SPIKE.md) — see that file for the full write-up

- [x] (a) on-chain World ID verification — CORRECTED 2026-07-23: the v4 `WorldIDVerifier` Production proxy is `0x0000…94d7`. Replacement source requires protocol 4, issuer schema 1, and `allow_legacy_proofs: false`; the v3 Router is historical compatibility only.
- [ ] (b) sponsored mainnet `sendTransaction` — deferred (needs phone + mainnet instance)
- [x] (c) World App `chainId: 4801` — production personhood remains mainnet-bound because the supported Router target is on World Chain mainnet; the Sepolia cohort remains a disclosed mock.
- [x] Toolchain proven: forge → WC Sepolia deploy (`Ping` `0x117C7ba5bC479Ef62D9Edd64f1737c3dDF55022b`)
- [x] **Architecture LOCKED: Option A (hybrid)** — cohort on WC Sepolia (free), v4 Production-verified Orb humans + a three-seat panel drawn from at least four eligible humans on WC mainnet.
