# Go-Live progress log

Running record of the Step-5 → submission checklist. Companion to `go-live.html`
(the interactive guide) and `CAPSTONE_RUNBOOK.md` (the reference). Newest entries
on top of each section.

---

## ✅ Done

### 2026-06-19 — Production deployed to mainnet + PR #3 merged (by Claude)
The live app now runs the Step-5 code on World Chain mainnet.
- Added **`NEXT_PUBLIC_CHAIN_ID=480`** in Vercel (non-sensitive, Production +
  Preview).
- Merged **PR #3** into `main` (merge commit `67c7274`); Vercel built and promoted
  it to Production.
- **Verified live:** `https://demo-themis-mvp.vercel.app` now shows the reviewer
  funnel ("A court of verified humans"), and `/home` reads **chain 480** ("Live on
  World Chain mainnet … 0 Verified jurors") — so the QR / onboard now registers real
  humans on the live instance.

### 2026-06-19 — Developer Portal whitelisting (by Claude, via browser)
The blocker is cleared. Whitelist lives at **Mini App → Permissions** (not
"Configuration → Advanced" as the first draft of the guide said). Entered as
comma-separated lists and **verified to persist after a full page reload**.

- **Contract Entrypoints** (7): MockUSD `0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a`,
  JurorRegistry `0x226974149087b36769a54B998acfe4087eEb7F84`,
  DisputeCourt `0xCDF427D18da8C2e8CCf9a95310bC38857EEf795A`,
  DealEscrow `0xefc898F9C4FC805111041676b720CB478BE67c47`,
  WorldIDGate `0x0540f47842a31C681dce76E856b4b76fcCc53Fbe`,
  RewardPool `0xAF96A65A6b9643451E33cAf96717d071eDae04A0`,
  Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3`.
- **Permit2 Tokens** (1): MockUSD `0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a`.
- App confirmed: **DemoThemis Staging**, `app_7bdfda4db4e2f59dd4a2427cd2bd860d`
  (the "legacy" tag is just the app-id format; it's the World ID 4.0 app, RP
  `rp_1ddcf8ba2efe3f36`). One app covers staging + production.

### 2026-06-19 — Guide corrected against the live Portal UI
`go-live.html` Step 2 now uses the real path (**Mini App → Permissions**),
comma-separated format, and the "See your mini app" **preview QR** as the way to
open the app on a phone (the app is in Developer Preview — not submitted for
review, which is fine for the demo).

### Earlier (committed on PR #3)
- Mainnet **Production-verifier instance** deployed + all 6 contracts
  **source-verified** on worldscan (3/3, Production verifier `0x0000…94d7`).
- `registerWithPermit2`, the single-tap onboard, commit/reveal, the B5 dev page,
  and the reviewer funnel landing — all built. **77 tests pass.**
- **PR #3 CI is green** (contracts, web, Vercel) and the PR is **mergeable/clean**.

---

## ✅ Current state — ready for the capstone

Everything technical is in place: the contracts are deployed + whitelisted, and the
live site (`https://demo-themis-mvp.vercel.app`) runs the Step-5 code on **chain
480** (verified). The next real action is the **3-human capstone** — no more setup.

To open the Mini App on a phone, use the Portal's **"See your mini app" preview QR**
(Mini App → Permissions), since the app is in Developer Preview.

---

## ⛳ Remaining (in order)

1. **[test] Register yourself as juror #1.** Open the app via the preview QR →
   Become a juror → Verify & join. The live juror counter should tick to **1** — the
   real end-to-end proof (whitelisting + onboard + sponsored gas all work).
2. **[capstone] The 3-human run.** 3 people register; run the question case and the
   escrow case (open/draw via `scripts/capstone-mainnet.sh`; humans commit + reveal
   in World App; resolve). Leave both resolved on worldscan.
3. **[log] Fill the Step-5 capstone trace table** in `docs/DEMO.md` (3 registrations
   + 2 resolved cases).
4. **[video] Record + upload** the 3–4 min demo (script in `DEMO.md`); add the link
   to `DEMO.md` + `README`.
5. **[public] Make the repo public** (`gh repo edit FreddyMertens/DemoThemisMVP
   --visibility public`) + add the pitch-site "Live demo" link. Do this AFTER 2–4
   so a cold reviewer sees the real traces + video.
6. **[qa] Final link check** — every URL the application cites resolves.

---

## 🚫 Not done yet (and why)

- **Repo still private** — flip it to public AFTER the capstone + video (step 5),
  so a cold reviewer sees the real trace links and the video, not a "pending" table.
- **`NEXT_PUBLIC_SHOW_DEV`** — intentionally left unset on Vercel (absent ⇒ the
  `/app/dev` page is hidden, which is the correct production behaviour; the dev key
  is server-only and not set in prod either, so the page is doubly inert).
- **Capstone / video / self-registration** — need 3 verified humans and a phone;
  can't be done from here.
