# Mainnet question-queue runbook

Updated: 2026-07-14
Canonical product: [https://demothemis.netlify.app/app](https://demothemis.netlify.app/app)

This is the only activation procedure for the current Demo MVP. It runs one
official public-research question at a time through exactly three Production
World ID jurors. The question bank, opener, and hashes are fixed in
`web/public/cases/question-queue.json`; jurors commit and reveal in World App;
the scheduled keeper advances the non-juror steps.

> **Do not use** `scripts/capstone-mainnet.sh open-question` or
> `scripts/capstone-mainnet.sh open-escrow`. Those commands belong to the former
> capstone and create cases outside the official 21-question queue. Any unresolved
> nonofficial case deliberately pauses the new keeper.

## Current audited state

As read from World Chain mainnet and GitHub on 2026-07-14:

- Active jurors: **0 / exactly 3 required**
- Seal window: **300 seconds / ready**
- Reveal window: **300 seconds / ready**
- Official questions filed: **0 / 21**
- Unresolved nonofficial cases: **none**
- `MAINNET_QUESTION_KEEPER_PRIVATE_KEY`: **configured**
- Mainnet question-keeper workflow: **enabled; waits safely for three jurors**
- Developer Portal configuration: **verified in the signed-in Portal**

The Portal now identifies the app as **DemoThemis**, opens the Mini App at the
Netlify `/onboard` route, keeps the public website at the Netlify root, and makes
the draft available in every supported country. A real phone still has to scan
the preview QR before jurors are invited; Portal settings alone cannot prove the
World App handoff.

## Fixed mainnet instance

| Contract | Address |
|---|---|
| MockUSD | `0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a` |
| WorldIDGate (Production verifier) | `0x0540f47842a31C681dce76E856b4b76fcCc53Fbe` |
| JurorRegistry | `0x226974149087b36769a54B998acfe4087eEb7F84` |
| RewardPool | `0xAF96A65A6b9643451E33cAf96717d071eDae04A0` |
| DisputeCourt (3 seats / minimum pool 3) | `0xCDF427D18da8C2e8CCf9a95310bC38857EEf795A` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

The fixed official opener is
`0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c`. It must remain outside the juror
pool because the court excludes a question's opener from its panel.

## 1. Verify the deployment cutover

In the World Developer Portal, open app
`app_7bdfda4db4e2f59dd4a2427cd2bd860d` and verify all of the following:

- App URL is `https://demothemis.netlify.app/onboard`.
- Official website is `https://demothemis.netlify.app`.
- The reviewer-facing name is **DemoThemis**.
- Country availability includes all countries offered by the Portal.
- The preview QR is generated from this draft and must open the Netlify
  `/onboard` screen in World App during the phone smoke test.
- Contract permissions still include MockUSD, JurorRegistry, DisputeCourt,
  DealEscrow, WorldIDGate, RewardPool, and Permit2.
- Permit2 token permissions include MockUSD.

These settings and permissions were reloaded and verified in the signed-in
Portal on 2026-07-14.

Netlify must retain the server and public variables listed in the
[unified deployment plan](../../docs/UNIFIED_DEPLOYMENT_PLAN.md). A quick
non-sensitive check is that
an authorized `POST` to
`https://demothemis.netlify.app/api/rp-signature` returns an RP signature for the
`juror-registration` action; this endpoint was healthy in the 2026-07-14 audit.

Do not invite jurors until the preview QR opens the Netlify build. The former
Vercel deployment is an archived rollback artifact, not the current Mini App.

## 2. Validate the official queue

From `DemoThemisMVP/web`:

```bash
pnpm validate:question-queue
```

It must pass all three checks: the manifest, exact hashes/fixed opener, and 21
sequential public-research questions. Do not edit a question file after its hash
has been recorded in the manifest.

The first official URI is
`/cases/queue/01-dimorphos-orbit-change.json`. The keeper recognizes a case only
when all four identity fields match: question type, URI, exact hash, and fixed
opener.

## 3. Human-safe voting windows — complete

The deployer set both windows to five minutes on 2026-07-14. The successful
[World Chain transaction](https://worldscan.org/tx/0x429dfd1ad1aa5e0f628ea02c47950e440ad658b38540401d8ae045f3316866ca)
is the permanent configuration receipt.

The following remains the only supported update command if the windows ever need
to be deliberately changed again:

```bash
bash scripts/capstone-mainnet.sh durations 300 300
```

Run it from `DemoThemisMVP` with the ignored local `.env` configured for the
deployer. Five minutes is the minimum enforced by the queue keeper. Verify the
current values with:

```bash
node scripts/mainnet-question-keeper.mjs
```

The report must show at least `300s seal / 300s reveal`. The command above is a
read-only dry run and broadcasts nothing.

## 4. Register exactly three jurors

Each human must:

1. Open the Netlify Mini App through the verified World App preview QR.
2. Visit `/onboard` and sign in with the wallet they will use for both voting
   stages.
3. Tap **Verify with World ID & join**.
4. Complete the Production World ID proof and the valueless 5 MUSD bond batch.
5. Save the registration Worldscan link for the final evidence table.

Keep all three people reachable for both voting windows. They must reveal on the
same device/browser storage used to seal because that device holds the ballot
secret.

After each registration, run the dry report again. Stop at exactly three. The
deployed registry has no hard maximum; if the pool exceeds three, the keeper
pauses until an extra active juror uses **Leave jury**.

## 5. Verify the scheduled keeper

The workflow is `.github/workflows/mainnet-question-keeper.yml`. It runs every
five minutes, serially, and broadcasts at most one operator transaction per run.
Repository secret `MAINNET_QUESTION_KEEPER_PRIVATE_KEY` was configured on
2026-07-14 from the authorized ignored local credential. Its derived public
address matches the fixed opener above. The secret value was not printed or
committed, and the opener must never register as a juror.

Confirm only the secret name and workflow history:

```bash
gh secret list --repo FreddyMertens/DemoThemis
gh run list --repo FreddyMertens/DemoThemis --workflow mainnet-question-keeper.yml --limit 10
```

Before three jurors exist, a healthy run reports `WAITING` and exits successfully
without broadcasting. The keeper's first necessary runs after registration may
separately claim valueless MUSD, approve
the court, open question one, and draw its panel. This deliberate one-step limit
makes every transition easy to inspect and prevents a single run from racing the
human actions.

For an attended review, the same operator may run one step manually. Put the
authorized key in the ignored `DemoThemisMVP/.env` file as `PRIVATE_KEY`, then
load that file without putting the key itself in shell history:

```bash
set -a
source .env
set +a
node scripts/mainnet-question-keeper.mjs --execute
unset PRIVATE_KEY
```

Run those commands from `DemoThemisMVP`, only in a private shell with an
authorized operator. Restrict access to the ignored `.env`; the scheduled secret
is preferred. Never run `--execute` before checking the dry report.

## 6. Complete question one

1. Wait for the keeper to open and draw question one.
2. Confirm `/app` shows the exact question, YES rule, judged-as-of time, three
   panel wallets, and a Worldscan filing/draw receipt.
3. All three jurors independently research the public question.
4. All three seal their answers in World App and save each transaction link.
5. All three return on the same device and reveal their answers.
6. After the reveal deadline, let a later keeper run resolve the case.
7. Confirm the permanent receipt shows `3/3` seals, `3/3` reveals, tally, ruling,
   individual valueless MUSD payments, the 70/20/10 distribution, and links for
   every on-chain stage.
8. Confirm a later keeper run opens question two—and only then.

If the dry report names any unresolved nonofficial case or more than one official
case, stop. Do not try to work around the guard. Resolve the unexpected chain
state deliberately before continuing.

## 7. Capture completion evidence

Add these links to `docs/DEMO.md`:

- Three Production World ID registration transactions
- One sponsored World App transaction trace
- Question one `CaseOpened` and `PanelDrawn` transactions
- All three `Committed` and all three `Revealed` transactions
- `Resolved`, `FeePaid`, and `FeeDistributed` transactions
- The permanent Netlify case receipt
- Question two's `CaseOpened` transaction, proving sequential advancement

Only after those links exist should the three-juror MVP be described as a
completed real run.

## Archived former capstone path

The former Vercel/q-capstone/escrow sequence is retired and must not be executed
against the current court. The old interactive guide now points here, and the
legacy helper rejects its case-opening, draw, and resolve actions. Historical
fixtures may remain for provenance only. The current public MVP is a
question-resolution oracle; escrow and the attack simulator are outside its
reviewer journey.
