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
| Voting windows | **60-second seal / 60-second reveal**; both must be raised to at least 300 seconds before question one opens. |
| Scheduled keeper | `MAINNET_QUESTION_KEEPER_PRIVATE_KEY` is absent and the mainnet question-keeper workflow has no runs. |
| World Developer Portal | The App URL, reviewer-facing name, country availability, preview QR, and permissions still need a signed-in verification. The public deep link currently says **DemoThemis Staging** and showed a UK availability restriction. |

The existing contract whitelist was confirmed in the Portal on 2026-06-19, but
that historical check does not prove the current URL, name, countries, or preview
journey. Recheck all of them before inviting jurors.

## Remaining work, in order

1. In the World Developer Portal, make the App URL point to Netlify, remove the
   misleading **Staging** name, include the intended countries, confirm the
   contract and Permit2 permissions, and open `/onboard` through the preview QR.
2. Raise the seal and reveal windows to at least five minutes, then confirm the
   keeper's dry report shows the new values.
3. Register exactly three Production World ID humans through the verified World
   App journey. Keep all three available for both voting stages.
4. With explicit authorization, store the fixed opener's key as the GitHub
   Actions secret `MAINNET_QUESTION_KEEPER_PRIVATE_KEY` and verify the workflow
   starts running.
5. Let the keeper open question one and draw its three-person panel. All three
   jurors research, seal, and reveal their answers.
6. Let a later keeper run resolve question one. Confirm the permanent receipt
   shows 3/3 seals, 3/3 reveals, the ruling, and individual valueless MUSD
   payments.
7. Confirm the keeper opens question two only after question one resolves.
8. Add the registration, case, vote, resolution, payment, receipt, and question-two
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
