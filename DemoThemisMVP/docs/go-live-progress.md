# Go-live progress

Updated: 2026-07-14

This page records the real state of the three-juror question demo. For the
activation procedure, use the [mainnet question-queue runbook](CAPSTONE_RUNBOOK.md).

## Current audited state

| Area | State |
|---|---|
| Public website | [Netlify `/app`](https://demothemis.netlify.app/app) is deployed and reads World Chain mainnet (chain 480). |
| Repository | [`FreddyMertens/DemoThemis`](https://github.com/FreddyMertens/DemoThemis) is public. |
| Contracts | The Production-verifier instance is deployed; the six project contracts are source-verified on Worldscan. |
| Official queue | All 21 local and deployed question files match the manifest's exact hashes and fixed opener. No official question has been filed yet. |
| Court state | **0 active jurors**; exactly 3 are required. No unresolved nonofficial case exists. |
| Voting windows | **300-second seal / 300-second reveal — ready.** Configured on-chain in [transaction `0x429d…66ca`](https://worldscan.org/tx/0x429dfd1ad1aa5e0f628ea02c47950e440ad658b38540401d8ae045f3316866ca). |
| Scheduled keeper | `MAINNET_QUESTION_KEEPER_PRIVATE_KEY` is configured; the five-minute workflow waits safely and sends nothing until exactly three jurors are active. |
| World Developer Portal | Signed-in verification passed: **DemoThemis**, Mini App URL `https://demothemis.netlify.app/onboard`, public website on Netlify, worldwide availability, active Production World ID action, and complete contract/Permit2 allowlists. The phone QR smoke test remains. |

The updated Portal values and permissions were saved, reloaded, and verified on
2026-07-14. The generated draft QR resolves to the correct app and draft IDs;
scan it in World App before inviting jurors to prove the final phone handoff.

## Remaining work, in order

1. Scan the Developer Portal preview QR in World App and confirm it opens the
   Netlify `/onboard` screen.
2. Register exactly three Production World ID humans through that verified World
   App journey. Keep all three available for both voting stages.
3. Let the enabled keeper open question one and draw its three-person panel. All three
   jurors research, seal, and reveal their answers.
4. Let a later keeper run resolve question one. Confirm the permanent receipt
   shows 3/3 seals, 3/3 reveals, the ruling, and individual valueless MUSD
   payments.
5. Confirm the keeper opens question two only after question one resolves.
6. Add the registration, case, vote, resolution, payment, receipt, and question-two
   links to [DEMO.md](DEMO.md), then record the short demo video.

> **Safety rule:** do not use the former q-capstone or escrow activation path.
> Those operations create cases outside the exact 21-question queue, and any
> unresolved nonofficial case deliberately pauses the current keeper.

## Archived history — non-executable

The following facts explain how the present deployment was reached; they are not
instructions for operating it:

- On 2026-06-19, the Production-verifier contracts were deployed to World Chain
  mainnet and their source was verified. The app used an earlier Vercel host at
  that time; Netlify is now canonical.
- On 2026-06-19, the World Developer Portal retained the contract entrypoints and
  MockUSD Permit2 permission after a reload. The app was identified as
  `app_7bdfda4db4e2f59dd4a2427cd2bd860d`, with World ID 4.0 RP
  `rp_1ddcf8ba2efe3f36`.
- The earlier capstone called for both a manually opened question and an escrow
  dispute. That plan predates the official manifest and is retired. The current
  reviewer journey is one public-research question at a time, with a fixed
  non-juror opener and a scheduled keeper.
