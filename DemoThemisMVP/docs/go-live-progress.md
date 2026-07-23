# Go-live progress

Updated: 2026-07-22

This page records the real state of the three-juror question demo. For the
activation procedure, use the [mainnet question-queue runbook](CAPSTONE_RUNBOOK.md).

## Current audited state

| Area | State |
|---|---|
| Public website | [Netlify `/app`](https://demothemis.netlify.app/app) is deployed and reads World Chain mainnet (chain 480). |
| Repository | [`FreddyMertens/DemoThemis`](https://github.com/FreddyMertens/DemoThemis) is public. |
| Contracts | The Step-5 v4 Production-verifier instance is source-verified historical evidence, but its immutable court bytecode lacks eligible-party preflight, first-draw unwind, quorum-miss recovery, and immutable voting windows. The hardened v4-only replacement source is implemented; fresh deployment is pending. |
| Official queue | All 21 local and deployed question files match the manifest's exact hashes and fixed opener. No official question has been filed yet. |
| Court state | Legacy instance: **0 active jurors**; minimum 3 required to open. No unresolved nonofficial case exists. |
| Voting windows | Legacy court: mutable, currently **300-second seal / 300-second reveal** from [transaction `0x429d…66ca`](https://worldscan.org/tx/0x429dfd1ad1aa5e0f628ea02c47950e440ad658b38540401d8ae045f3316866ca). Replacement: immutable constructor values, each at least 300 seconds. |
| Scheduled keeper | `MAINNET_QUESTION_KEEPER_PRIVATE_KEY` is configured. The keeper now uses case-specific eligible counts and can finalize either expired liveness deadline, but execution stays paused until the replacement cutover. |
| World Developer Portal | Legacy configuration was verified. Replacement contract addresses and `postBondWithPermit2()` permissions must be added after deployment; the phone QR smoke test then remains. |

The updated Portal values and permissions were saved, reloaded, and verified on
2026-07-14. The generated draft QR resolves to the correct app and draft IDs;
scan it in World App before inviting jurors to prove the final phone handoff.

## Remaining work, in order

1. Deploy and source-verify a fresh v4-only `WorldIDGate`, recovery-enabled registry, court, reward pool,
   and escrow with `PANEL_SIZE = 3` and `MIN_POOL >= 4`; record the addresses without
   overwriting the legacy history. Confirm court liveness version 2, registry version 1,
   automated-timing version 1, and all seven deployment capability flags.
2. Switch the app and keeper to those addresses, update World Developer Portal
   contract/Permit2 permissions, then confirm a read-only keeper run.
3. Scan the Developer Portal preview QR in World App and confirm it opens the
   Netlify `/onboard` screen.
4. Register at least four eligible Orb-verified humans through the World ID 4 Production verifier and that verified
   World App journey. Three are drawn; the fourth is the minimum pre-draw availability
   reserve. Additional active humans remain allowed.
5. Let the enabled keeper open question one and draw its three-person panel. All three
   jurors research, seal, and reveal their answers.
6. Let a later keeper run resolve question one. Confirm the permanent receipt
   shows 3/3 seals, 3/3 reveals, the ruling, and individual valueless MUSD
   payments.
7. Exercise and capture both liveness paths: party-exclusion rejection and first-draw
   fee/principal unwind, then no-show recovery through fresh Permit2 re-bond and retry
   or permissionless status-quo finalization after the fixed redraw deadline.
8. Confirm the keeper opens question two only after question one resolves.
9. Add the registration, case, vote, resolution, payment, receipt, and question-two
   links to [DEMO.md](DEMO.md), then record the short demo video.

> **Safety rule:** do not use the former q-capstone or escrow activation path.
> Those operations create cases outside the exact 21-question queue. The current
> keeper reports but ignores nonofficial cases for official queue sequencing, so
> refundable outsider spam cannot censor the authenticated queue; outside cases can
> still compete for juror availability.

## Archived history — non-executable

The following facts explain how the present deployment was reached; they are not
instructions for operating it:

- On 2026-06-19, the v4 verifier contracts were deployed to World Chain
  mainnet and their source was verified. The address is now the official Production proxy.
  The app used an earlier Vercel host at
  that time; Netlify is now canonical.
- On 2026-06-19, the World Developer Portal retained the contract entrypoints and
  MockUSD Permit2 permission after a reload. The app was identified as
  `app_7bdfda4db4e2f59dd4a2427cd2bd860d`, with World ID 4.0 RP
  `rp_1ddcf8ba2efe3f36`.
- The earlier capstone called for both a manually opened question and an escrow
  dispute. That plan predates the official manifest and is retired. The current
  reviewer journey is one public-research question at a time, with a fixed
  non-juror opener and a scheduled keeper.
