# Mainnet question-queue runbook

Updated: 2026-07-22
Canonical product: [https://demothemis.netlify.app/app](https://demothemis.netlify.app/app)

This is the only activation procedure for the Demo MVP. It runs one official
public-research question at a time through a 3-seat panel drawn from at least four
eligible jurors verified through the supported World ID Router after the opener is excluded. Four is the recommended
`PANEL_SIZE + 1` availability floor; the question bank, opener, and hashes are fixed in
`web/public/cases/question-queue.json`; jurors commit and reveal in World App;
the scheduled keeper advances the non-juror steps.

> **CAPSTONE PAUSED — REDEPLOYMENT REQUIRED.** The addresses recorded below are
> the immutable Step-5 deployment and do not contain the eligible-party preflight,
> first-draw unwind, or quorum-miss recovery now implemented in source. Do not
> register capstone jurors or broadcast keeper
> transactions until a fresh recovery-enabled `WorldIDRouterGate` deployment has been source-verified,
> recorded here, allowlisted in the World Developer Portal, and selected by the app
> and keeper. Follow [LIVENESS_RECOVERY.md](LIVENESS_RECOVERY.md).

> **Do not use** `scripts/capstone-mainnet.sh open-question` or
> `scripts/capstone-mainnet.sh open-escrow`. Those commands belong to the former
> capstone and create cases outside the official 21-question queue. The keeper warns
> about but ignores nonofficial cases for queue sequencing, so refundable outsider spam
> cannot censor the authenticated official queue.

## Current audited state

As read from World Chain mainnet and the repository on 2026-07-22:

- Active jurors on the legacy instance: **0 / minimum 3 required to open**
- Seal window: **300 seconds / ready**
- Reveal window: **300 seconds / ready**
- Official questions filed: **0 / 21**
- Unresolved nonofficial cases: **none**
- `MAINNET_QUESTION_KEEPER_PRIVATE_KEY`: **configured**
- Mainnet question-keeper workflow: **configured, but must not broadcast before cutover**
- Automated replacement: **eligible-party preflight, fixed first-draw unwind, Permit2 re-bond, bounded retry, and immutable voting windows are implemented and tested in source; not deployed**
- Developer Portal configuration: **legacy addresses verified; replacement permissions pending**

The keeper enforces this pause in code: `--execute` exits before creating a
wallet client unless the selected deployment record attests the current source and all
seven release capabilities: eligible-party preflight, bounded first-draw timeout,
unused-fee refund, bounded redraw window, permissionless timeout finalizer, and Permit2
re-bond, plus immutable voting durations. It also requires court liveness version 2,
registry liveness version 1, and automated timing version 1.

The Portal now identifies the app as **DemoThemis**, opens the Mini App at the
Netlify `/onboard` route, keeps the public website at the Netlify root, and makes
the draft available in every supported country. A real phone still has to scan
the preview QR before jurors are invited; Portal settings alone cannot prove the
World App handoff.

## Legacy mainnet instance — historical evidence only

| Contract | Address |
|---|---|
| MockUSD | `0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a` |
| WorldIDGate (historical v4 preview adapter) | `0x0540f47842a31C681dce76E856b4b76fcCc53Fbe` |
| JurorRegistry | `0x226974149087b36769a54B998acfe4087eEb7F84` |
| RewardPool | `0xAF96A65A6b9643451E33cAf96717d071eDae04A0` |
| DisputeCourt (3 seats / minimum pool 3) | `0xCDF427D18da8C2e8CCf9a95310bC38857EEf795A` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

These addresses remain source-verified historical evidence, but the current
`DisputeCourt.sol` and `JurorRegistry.sol` intentionally no longer match their
bytecode. Replace this table only after recording the old instance in deployment
history and independently verifying the new addresses.

The fixed official opener is
`0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c`. Keep it outside the juror pool as
an operational rule. The replacement court also subtracts any active opener before
checking `MIN_POOL`, so violating that rule cannot create an undrawable accepted case.

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
  DealEscrow, WorldIDRouterGate, the World ID Router, RewardPool, and Permit2.
- Permit2 token permissions include MockUSD.

Before changing Portal permissions or inviting jurors, independently verify the new
deployment record and source matches. The selected court must report
`LIVENESS_RECOVERY_VERSION() == 2`; the selected registry must report version 1; the
court must report `AUTOMATED_TIMING_VERSION() == 1`; and the deployment record must mark
all seven release capabilities true. Preserve the old
addresses as legacy history rather than overwriting them.

The legacy settings and permissions were reloaded and verified in the signed-in
Portal on 2026-07-14. That is historical evidence only: every replacement address and
the replacement `postBondWithPermit2()` call must be added and re-verified after cutover.

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

## 3. Verify immutable human-safe voting windows

The deployer set both windows to five minutes on the legacy court on 2026-07-14. That mutable
[World Chain transaction](https://worldscan.org/tx/0x429dfd1ad1aa5e0f628ea02c47950e440ad658b38540401d8ae045f3316866ca)
is historical configuration evidence only; the replacement removes `setDurations` entirely.

Deploy the replacement with five-minute windows (the deployment script defaults to these values):

```bash
WORLD_ID_ROUTER=0x17B354dD2595411ff79041f930e491A4Df39A278 \
  WORLD_ID_APP_ID=app_7bdfda4db4e2f59dd4a2427cd2bd860d \
  PANEL_SIZE=3 MIN_POOL=4 COMMIT_DURATION=300 REVEAL_DURATION=300 \
  forge script script/Deploy.s.sol --rpc-url worldchain_mainnet --broadcast
```

The contract rejects either constructor value below 300 seconds. After selecting the
replacement addresses, verify the immutable values and the automated-timing marker with:

```bash
node scripts/mainnet-question-keeper.mjs
```

Record the replacement deployment transaction and constructor values in the evidence
table. The report must show `AUTOMATED_TIMING_VERSION() == 1` and at least
`300s seal / 300s reveal`. The keeper command above is a read-only dry run and
broadcasts nothing.

## 4. Register at least four eligible jurors — only after the replacement gate passes

Each human must:

1. Open the Netlify Mini App through the verified World App preview QR.
2. Visit `/onboard` and sign in with the wallet they will use for both voting
   stages.
3. Tap **Verify with World ID & join**.
4. Complete the Router-compatible Orb proof and the valueless 5 MUSD bond batch.
5. Save the registration Worldscan link for the final evidence table.

Keep every selected panelist reachable for both voting windows. They must reveal on the
same device/browser storage used to seal because that device holds the ballot
secret.

After each registration, run the dry report again. Deploy with `PANEL_SIZE = 3` and
`MIN_POOL >= 4`, then wait for at least four **eligible** jurors before opening. The
contract remains fund-safe at an exact eligible count of three because its fixed
first-draw deadline can unwind, but that setting has no one-withdrawal adjudication
reserve. The keeper uses the court's case-specific eligible count rather than raw
`jurorCount()`. Additional active jurors are allowed; the pool has no maximum.

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

Before the deployed minimum pool exists, a healthy run reports `WAITING` and exits successfully
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

If anyone misses reveal, do not improvise or manually alter the pool. Let the
keeper resolve the elapsed round. A first quorum miss starts the fixed one-hour
recovery window. Each fully slashed juror can use **Post a fresh bond & rejoin**
without repeating World ID; the keeper draws the retry once three panel candidates
are active. If the pool cannot recover in time, a later keeper run permissionlessly
finalizes status quo. The recovery deadline never extends, and a second quorum
miss also finalizes status quo.

If the first panel cannot be drawn after an accepted case—for example, because a
juror withdraws—do not repeatedly re-arm it or add funds. Its fixed one-hour
`initialDrawDeadline` never moves. After expiry, a later keeper run permissionlessly
unwinds the case: the entire unused case fee returns to the opener, or for escrow the
unused fee and principal both return to the payer. Confirm the `InitialDrawTimedOut`
beneficiary/amount and the final settlement events before advancing the queue.

If the dry report names more than one unresolved **official** case, stop. A nonofficial
case is reported as a warning and deliberately ignored by the one-active-official-case
policy; it cannot censor the queue merely by being opened. Still review it because a
parallel outside case can compete for juror availability at the contract layer.

## 7. Capture completion evidence

Add these links to `docs/DEMO.md`:

- At least four Production World ID registration transactions for the recommended 3-seat / minimum-4 replacement
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
