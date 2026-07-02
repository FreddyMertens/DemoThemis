# Project and Gamelab Comprehensive Review

Review date: 2026-07-02  
Reviewer: Codex  
Scope: local repository, deployed Netlify site at https://demothemis.netlify.app/game-theory, static pages, shared assets, gamelab behavior, deployment configuration, and project claims.

This is a product/security/credibility review, not a formal legal opinion or cryptographic audit. I separated confirmed production breakage from protocol-level risks that become real vulnerabilities only if the system is implemented with money, identity, voting, reputation, or biometric/personhood integrations.

## Executive Summary

I did not find exposed API keys, secrets, broken local links, duplicate DOM IDs, parse errors in inline scripts, browser console crashes, or an obvious dead gamelab. The deployed gamelab loads and the local validator passes.

The largest issues are not "the page is broken." They are:

1. ~~The Netlify deployment previously published the repository root, so internal markdown, QA pages, audit pages, helper scripts, and tooling were publicly accessible.~~ Fixed in the repo by switching Netlify to an allowlisted `dist` build output.
2. ~~The deployed site lacks common browser security headers~~ and relies on external CDN scripts without SRI. Baseline headers are now generated in the repo; dependency pinning/SRI remains open.
3. Several pages still make absolute or near-absolute claims such as "money cannot buy" / "cannot be bribed" while other parts of the project correctly admit willing-accomplice limits, answer-key poisoning, subjective disputes, quorum issues, setup/key-management risks, and centralized-shortcut risks. The centralized-fallback wording has been corrected.
4. The real protocol depends on sensitive primitives: biometric/personhood proof, private voting, reputation, answer keys, appeals, market settlement, and possibly regulated prediction markets. These are not static-site vulnerabilities today, but they are where a real implementation could fail badly.
5. The gamelab is useful as an intuition tool, but it should not be framed as proof of security. It models selected attack paths, not a full adversarial protocol.

Severity ranking:

| Rank | Severity | Area | Finding | Current vulnerability? |
|---:|---|---|---|---|
| 1 | High | Deployment | ~~Public deployment exposed internal drafts, QA/audit pages, helper scripts, and markdown because `netlify.toml` published `.`~~ | Fixed in repo by publishing an allowlisted `dist` build output; verify after Netlify redeploy |
| 2 | High | Claims/protocol | Absolute bribery/security claims conflict with acknowledged trust and attack assumptions | Not a code exploit; high credibility/product risk |
| 3 | High | Protocol/privacy | Biometric/personhood/liveness dependency needs a formal privacy and abuse threat model | Not in static site; would be high-risk in implementation |
| 4 | High | Protocol | A centralized shortcut for reputation/scoring/draw/answer-key infrastructure could deanonymize or re-centralize the system | Docs now explicitly reject centralized fallback/admin-key designs; implementation threat model still needed |
| 5 | High | Protocol | Answer-key poisoning, market settlement quality, and subjective dispute handling remain under-specified | Not in static site; protocol integrity risk |
| 6 | Medium-High | Browser security | ~~Missing CSP, `frame-ancestors`/XFO, Referrer-Policy, Permissions-Policy, and X-Content-Type-Options~~ | Baseline headers fixed in repo; stricter CSP without `unsafe-inline` remains future hardening |
| 7 | Medium | Supply chain | External unpkg scripts/styles use major-version aliases and no SRI | Yes, browser supply-chain risk |
| 8 | Medium | Frontend XSS posture | `allowHTML: true` tooltips and `innerHTML` sinks are safe only because current content is static | Latent XSS risk if content becomes dynamic |
| 9 | Medium | Gamelab representation | Gamelab can imply completeness beyond what it models | Misrepresentation risk, not exploit |
| 10 | Medium | Repo hygiene | Many untracked scratch scripts/images in root and weak ignore rules | Accidental commit/deploy risk |
| 11 | Medium | Testing/CI | No full-site CI gate for ~~deployment allowlist, headers, links,~~ browser smoke, or content regressions | Build-time allowlist/header/link checks added; CI/browser smoke still open |
| 12 | Low-Medium | Accessibility | ARIA and keyboard-state coverage should be audited, especially interactive controls/tooltips | User experience/compliance risk |
| 13 | Low | SEO/share | No ~~`robots.txt`, sitemap,~~ canonical, OpenGraph, or Twitter metadata | `robots.txt`, `sitemap.xml`, and `404.html` generated; canonical/social metadata still open |
| 14 | Low | Performance/resilience | Large standalone pages and CDN enhancements are acceptable but not hardened | Performance/reliability weakness |

## Methodology

Local checks performed:

- Mapped tracked files with `git ls-files`.
- Reviewed deployment config in `netlify.toml`.
- Checked working tree state and untracked files.
- Scanned HTML pages for local broken links, duplicate IDs, missing image alt text, inline script parse failures, and console/runtime failures.
- Ran the existing gamelab validator: `node tools/validate-gamelab.js`.
- Reviewed key source files manually, especially `game-theory.html`, `assets/common.js`, `netlify.toml`, `juror-court.html`, `governance.html`, `hybrid-juror-system.html`, `hybrid-juror-prediction-market-integration.html`, `rebuilding-the-court.html`, `breaking-the-court.html`, and public QA/audit pages.
- Scanned for obvious secret patterns. No real credentials were found.

Deployment/browser checks performed:

- Loaded the live deployed site at `https://demothemis.netlify.app/game-theory`.
- Crawled live HTML pages in-browser for console errors, obvious layout overflow, duplicate IDs, and missing alt text.
- Checked HTTP headers and common public paths with `curl`.
- Confirmed that Netlify blocks dotfiles like `/.git/config` and `/.git/HEAD`.
- Confirmed that non-dot repository artifacts such as markdown, QA pages, helper JS, Python tooling, and audit pages are publicly served.

External references consulted:

- CFTC prediction market / event contract rulemaking and reporting materials:
  - https://www.cftc.gov/PressRoom/PressReleases/9249-26
  - https://www.cftc.gov/PressRoom/PressReleases/9194-26
  - https://www.cftc.gov/PressRoom/PressReleases/9261-26
- FTC biometric policy statement:
  - https://www.ftc.gov/legal-library/browse/policy-statement-federal-trade-commission-biometric-information-section-5-federal-trade-commission
  - https://www.ftc.gov/news-events/news/press-releases/2023/05/ftc-warns-about-misuses-biometric-information-harm-consumers
- EDPB biometrics materials:
  - https://www.edpb.europa.eu/our-work-tools/our-documents/topic/biometrics_en

## What Looks Healthy

These are meaningful positives:

- No exposed secrets or credentials were found in tracked files by obvious pattern scan.
- Live pages did not throw browser console errors in the crawl.
- Internal local links and asset references did not show broken references in the static scan.
- Inline scripts parsed successfully.
- No duplicate DOM IDs were found in the scanned HTML.
- Image alt text did not show obvious gaps in the scanned pages.
- The gamelab validator passes.
- HSTS is present on the deployed Netlify response.
- Dotfiles and `.git` internals were not publicly served by Netlify in spot checks.
- The recent gamelab improvements made the page feel much more like a model than a decorative explanation.

Those positives matter. The project is not currently a broken static website. The bigger concerns are deployment boundaries, browser hardening, and the gap between the modeled system and the claims around it.

## Findings

### 1. High: ~~Deployment Previously Published the Repository Root~~

Status: fixed in repo; verify after Netlify redeploy.

Evidence:

- The prior `netlify.toml` configuration set:

```toml
[build]
  publish = "."
```

- In this pass, the repository was changed to build an allowlisted `dist` output instead:

```toml
[build]
  command = "node tools/build-site.js"
  publish = "dist"
```

- `tools/build-site.js` copies only intentional public pages/assets, writes Netlify headers, writes `robots.txt`, writes `sitemap.xml`, writes `404.html`, validates local links, and fails the build if internal artifacts appear in `dist`.
- Before the next Netlify redeploy, the currently deployed site may still serve repo artifacts that are not public-product pages, including:
  - `https://demothemis.netlify.app/SKILL.md`
  - `https://demothemis.netlify.app/toupdate.md`
  - `https://demothemis.netlify.app/game-theory-qa.html`
  - `https://demothemis.netlify.app/game-theory-qa-filled-kimi.html`
  - `https://demothemis.netlify.app/game-theory-audit.html`
  - `https://demothemis.netlify.app/rewrite.js`
  - `https://demothemis.netlify.app/rewrite_v3.js`
  - `https://demothemis.netlify.app/wordcount.py`
  - `https://demothemis.netlify.app/tools/validate-gamelab.js`

Why this matters:

Publishing the repository root made every tracked non-dot file a production artifact unless Netlify blocked it. That exposed internal review material, QA forms, helper scripts, markdown drafts, and tooling. The new build-output allowlist closes that path once deployed.

Does this expose a vulnerability?

It did before this fix, as an information exposure and deployment-boundary vulnerability. It did not appear to expose secrets, but it exposed internal material and created a high-probability future leakage path. After Netlify redeploys from the new configuration, this should be mitigated; verify by checking that markdown, QA pages, helper scripts, and tooling return 404.

Implemented fix:

- Netlify now publishes `dist`, not `.`.
- `tools/build-site.js` creates `dist` from an explicit public-file allowlist.
- The build fails if markdown, QA/audit pages, helper scripts, Python files, screenshots, `tools/*`, or other internal artifacts appear in the deploy output.
- `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, and `404.html` are generated into the deploy output.

Remaining verification:

- After pushing and redeploying, check the live URLs above and confirm they return 404.
- Confirm Netlify build logs show `node tools/build-site.js`.

### 2. High: ~~Public QA/Audit Pages Contradict the Current Product~~

Status: fixed in repo by the `dist` allowlist; verify after Netlify redeploy.

Evidence:

- `game-theory-qa-filled-kimi.html` and `game-theory-audit.html` are publicly served.
- These pages contain older critique and analysis of gamelab weaknesses that have since been partially addressed.
- They are reachable directly by URL and have no production context, no noindex guard, and no clear "archived internal review" framing.

Why this matters:

A grant reviewer, investor, partner, or curious user can find internal QA material that appears to be current product documentation. That creates unnecessary confusion and can make the site look inconsistent with itself.

Does this expose a vulnerability?

Not a technical security vulnerability in the usual sense. It is an information exposure and credibility weakness caused by the deployment configuration. It can become security-relevant if future QA pages contain exploit notes, internal assumptions, personal data, or unpublished mitigation details.

Implemented fix:

- ~~Remove QA/audit pages from production deploy output.~~ They are not copied into `dist`.
- If public transparency is desired, publish a curated "known limitations" page instead of raw QA artifacts.
- ~~Add `X-Robots-Tag: noindex` for any temporarily exposed review material.~~ The internal review material is no longer in deploy output; noindex is only needed if it is intentionally republished.

### 3. High: Absolute Security Claims Outrun the Actual Assumptions

Evidence:

- `juror-court.html` includes language such as "court ... cannot be bribed" and "verdict not buyable."
- `governance.html` includes language such as "court vote money cannot buy."
- Other pages correctly admit important limits:
  - Willing accomplices can pass face checks.
  - ~~A single tally operator would break ballot privacy, so the docs now reject a centralized fallback.~~ The public docs now explicitly reject single-operator/admin-key tally designs.
  - A centralized implementation shortcut can become a deanonymization database.
  - False settlements can poison answer keys.
  - Appeals and quorum rules have unresolved edge cases.
  - Subjective disputes need a separate rubric court and separate track record.

Why this matters:

The project's strongest technical posture is conditional: it can raise attack costs under specific assumptions. It cannot honestly promise that money cannot buy influence in all worlds. Bribery, identity rental, coercion, collusion, bad answer keys, operator compromise, and governance capture remain meaningful threats.

Does this expose a vulnerability?

Not a code vulnerability in the static site. It is a claim-integrity and product-risk vulnerability. If the protocol launches with these claims, the claims themselves can mislead users and reviewers about risk. That matters especially for a system proposing court-like judgments, prediction-market-based calibration, and identity/personhood primitives.

Recommended fix:

- Replace absolute phrases with conditional language:
  - "raises the cost of bribery"
  - "makes vote buying harder to verify"
  - "reduces profitable bribery under these assumptions"
  - "requires these trust and privacy assumptions"
- Add a short "What this does not solve" section to relevant pages.
- Tie every strong claim to the relevant assumption set in the gamelab.
- Keep the red-team honesty from `breaking-the-court.html`, but reflect it in the polished pages.

### 4. High: Biometric / Personhood / Liveness Dependency Is a Serious Privacy and Abuse Surface

Evidence:

- The project relies on World ID / one-human-one-vote style identity.
- `juror-court.html` discusses face checks, liveness checks, and no central face database.
- The same page admits willing accomplices can pass face checks.
- External regulators treat biometric information and facial recognition as sensitive/high-risk areas. FTC materials warn about false or unsubstantiated biometric claims; EDPB materials classify biometrics/facial recognition as a high-risk data-protection topic.

Why this matters:

Even if the static site collects no biometric data, the real protocol depends on a high-sensitivity identity layer. A production system must address:

- What biometric/personhood data is processed.
- Which party processes it.
- Whether any biometric templates, face embeddings, liveness signals, device fingerprints, or challenge videos are retained.
- Whether participation creates linkable metadata across disputes.
- How coercion, identity rental, and willing accomplices are handled.
- How false positives and false negatives are appealed.
- How regional privacy laws affect launch.

Does this expose a vulnerability?

Not on the current static site. In a real implementation, yes: this is a high-risk privacy, safety, legal, and abuse surface. The main vulnerability is not "a hacker steals the static page." The vulnerability is a system architecture that could link identity, voting, reputation, and disputes in a way that harms users or undermines anonymity.

Recommended fix:

- Create a formal privacy threat model before implementation.
- Define data flows for World ID, face checks, liveness checks, draw eligibility, voting, reputation, appeals, and payouts.
- ~~Explicitly state what data the project never receives.~~ Added in Chapter 2 and the blueprint; a formal threat model should still restate it.
- Prefer zero-knowledge/personhood proofs where possible.
- Avoid central storage of biometric data or persistent face-derived identifiers.
- Get legal/privacy review before any real user biometric or personhood integration.
- Keep public claims modest and verifiable.

### 5. High: Centralized Reputation, Scoring, Draw, and Answer-Key Shortcuts Can Re-Centralize the System

Evidence:

- The project discusses juror track records, calibration, answer keys, private votes, draws, and scoring.
- ~~`breaking-the-court.html` now frames centralized handling of scoring, key curation, and draws as a forbidden shortcut rather than the intended architecture.~~ Done.
- ~~`rebuilding-the-court.html` now makes the stricter requirement explicit: no centralized tally fallback, no operator-held ballot-opening key, and no admin discretion over panels, scores, or answer-key admission.~~ Done.

Why this matters:

The hard part is not just preventing a fake vote. It is preventing the infrastructure from learning too much:

- Which personhood credential was drawn.
- Which pseudonym voted.
- How that juror voted.
- Which answer keys affected their score.
- Which market or dispute they participated in.
- Whether reputation links multiple appearances by the same human.

If one backend, analytics stack, database, admin key, or operator can link those facts, bribery resistance and privacy collapse together. The stated architecture should continue to make clear that arbitration, reputation, scoring, draws, and answer-key curation belong on permissionless, verifiable rails rather than in a trusted private service.

Does this expose a vulnerability?

Not in the static site. It is a high-severity architecture vulnerability if implemented without threshold cryptography, zero-knowledge proofs, strict separation of duties, audited logs, and data minimization.

Recommended fix:

- Write a protocol-level data-flow diagram for every actor and secret.
- Decide what must be on-chain, permissionlessly verifiable, encrypted, anonymized, or never stored.
- Use keyless, distributed, or threshold/MPC setup for privacy-critical roles so no single actor ever holds a usable full secret.
- Separate draw, vote collection, tallying, scoring, and payout responsibilities.
- Make deanonymization a first-class failure mode in the gamelab and documentation.
- ~~Publish the no-centralized-fallback requirement as a launch blocker, not an upgrade path.~~ Done in the court, blueprint, finishing, and rebuilding pages.

### 6. High: Answer-Key Poisoning and Settlement Quality Are Not Fully Solved

Evidence:

- `hybrid-juror-system.html` says keys come from settled markets passing curation, but also notes synthetic tests and decentralized governance are TBA.
- `hybrid-juror-prediction-market-integration.html` says answer keys are curated from settlements and that keys arrive as people bet, which can read more automatic than the actual caveats support.
- `zero-to-one.html` says every market that settles leaves a known outcome / graded case.
- `breaking-the-court.html` flags false settlement poisoning.

Why this matters:

If juror quality is scored against bad answer keys, the system trains toward wrongness. Attackers do not need to buy every juror if they can poison calibration data or selectively influence settlement/curation.

Hard cases include:

- Thin markets with low information quality.
- Ambiguous real-world outcomes.
- False but unchallenged assertions.
- Markets resolved by a captured or mistaken oracle.
- Subjective disputes being treated as objective labels.
- Public answer banks enabling memorization instead of judgment.
- Adversaries submitting disputes designed to manipulate future scoring.

Does this expose a vulnerability?

Not today as a static site. In production, yes: answer-key poisoning is a direct protocol integrity vulnerability. It can silently degrade the juror selection/scoring mechanism.

Recommended fix:

- Treat answer keys as adversarial inputs, not automatic truth.
- Require provenance, curation status, liquidity/participation thresholds, and challenge windows for each key.
- Separate objective-market keys from subjective-rubric keys.
- Add holdout tests and private evaluation sets so jurors cannot simply memorize public keys.
- Model answer-key poisoning in the gamelab as a first-class attack.
- Avoid saying every settled market becomes truth. Use "eligible candidate key after curation and challenge."

### 7. High: Appeals, Finality, Quorum, and Dissenter Treatment Are Under-Specified

Evidence:

- `breaking-the-court.html` identifies appeal/quorum issues and the risk of punishing correct dissenters.
- Gamelab attack cards include appeal and quorum-related concerns, but a production-grade rule set is not fully specified.

Why this matters:

Appeals are where many court-like systems fail. Too little appeal and a bad panel can finalize wrong decisions. Too much appeal and wealthy attackers can grief, delay, or exhaust honest users.

Key unresolved questions:

- What evidence triggers appeal eligibility?
- Who pays appeal costs?
- How are appeal jurors selected?
- Does an appeal reset or update juror reputation?
- What protects a correct minority from reputation loss?
- What prevents griefing through repeated appeals?
- How are quorum failures handled without selecting for easy-to-bribe jurors?

Does this expose a vulnerability?

Not in the static site. It becomes a real economic/protocol vulnerability if the court handles valuable disputes before these rules are formalized and tested.

Recommended fix:

- Write a complete appeal state machine.
- Add explicit griefing and dissenter-protection cases.
- Simulate quorum failure and appeal spam in the gamelab.
- Separate "finality for UX" from "finality after cryptographic/economic challenge window."

### 8. Medium-High: ~~Missing Browser Security Headers~~

Status: baseline headers fixed in repo; stricter CSP/SRI remains future hardening.

Evidence:

The deployed `https://demothemis.netlify.app/game-theory` response includes HSTS but did not show the following common hardening headers in the checked response:

- `Content-Security-Policy`
- `X-Frame-Options` or CSP `frame-ancestors`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Content-Type-Options`

Why this matters:

This is a static site, so the immediate risk is lower than a logged-in web app. But because the site loads external scripts and uses inline script, the absence of CSP means there is no browser-level containment if a dependency, page artifact, or future content path becomes compromised.

Does this expose a vulnerability?

Partly. It is not an active exploit by itself, but it removes defense-in-depth. The most meaningful missing control is CSP, especially combined with external CDN scripts and `allowHTML` tooltip rendering.

Implemented fix:

Generated Netlify `_headers` now add:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://unpkg.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

Remaining hardening: the CSP still allows inline scripts/styles because the current pages use inline code. A stronger long-term fix is to move inline scripts to local files and use hashed or nonce-based CSP.

### 9. Medium: External CDN Scripts Use unpkg Without SRI or Pinning in Markup

Evidence:

`game-theory.html` loads:

- `https://unpkg.com/@popperjs/core@2`
- `https://unpkg.com/tippy.js@6`

The page also loads Tippy CSS from unpkg.

Why this matters:

Major-version aliases redirect to exact versions today, but the HTML does not pin exact subresource URLs or include integrity attributes. If the CDN, package, or network path is compromised, arbitrary JavaScript can run in visitors' browsers and alter the page content.

Does this expose a vulnerability?

Yes, as a browser supply-chain risk. Current impact is limited because the site has no login/session/private data, but it can still misrepresent content, redirect users, or fingerprint visitors.

Recommended fix:

- Vendor the small JS/CSS dependencies into `assets/vendor/`.
- Or pin exact URLs and add `integrity` plus `crossorigin="anonymous"`.
- Add CSP after removing inline script or adding hashes.
- Consider replacing tooltips with a local lightweight implementation if the dependency is only used for hover content.

### 10. Medium: Tooltip HTML Rendering and `innerHTML` Create a Latent XSS Path

Evidence:

- `assets/common.js` generates navigation/TOC UI with `innerHTML`.
- `assets/common.js` initializes Tippy with `allowHTML: true`.
- Tooltip content comes from `data-tooltip`.
- `game-theory.html` also sets tooltip content with constructed HTML in gamelab logic.

Why this matters:

Today most inputs are static, local, and author-controlled, so this is not an active XSS vulnerability. But the pattern is fragile. If assumptions, labels, explanations, markdown content, or page copy ever come from a CMS, query parameter, community submission, AI output, or external JSON, this becomes a likely XSS route.

Does this expose a vulnerability?

Latent only. With current static author-controlled content, I did not find an exploit path from visitor input. With dynamic content, yes, it could become a direct XSS vulnerability.

Recommended fix:

- Set `allowHTML: false` unless rich tooltip markup is truly needed.
- Build generated UI with DOM APIs instead of string `innerHTML` where practical.
- If HTML is required, sanitize with a trusted sanitizer and define allowed tags/attributes.
- Add a CSP that would limit script execution even if HTML injection occurs.
- Treat assumption text as untrusted by default.

### 11. Medium: Gamelab Can Be Read as a Proof Rather Than a Model

Evidence:

- The gamelab now presents simulations, assumptions, attack cards, watchlist metrics, and per-attack results.
- It still necessarily abstracts away key real-world risks: answer-key poisoning, setup/key-management mistakes, legal/regulatory constraints, identity rental, biometric privacy, oracle mistakes, market manipulation, appeal griefing, and social coercion.

Why this matters:

The gamelab is valuable because it teaches tradeoffs. It becomes dangerous if readers interpret green scores as proof that the system is safe. A simplified model can create false confidence unless the limits are visually and textually clear.

Does this expose a vulnerability?

Not a direct technical vulnerability. It is a model-risk and misrepresentation issue. It could expose a project-level vulnerability if product decisions rely on the gamelab as validation rather than as an exploration tool.

Recommended fix:

- Add a visible "Model boundary" strip in the gamelab.
- Label simulation outputs as "under selected assumptions."
- Add first-class attack dimensions for:
  - tally setup or key-management failure
  - answer-key poisoning
  - identity rental/willing accomplices
  - regulatory shutdown
  - appeal spam
  - oracle/settlement failure
- Add a "show assumptions that make this result fragile" panel.
- Avoid binary safe/unsafe language; show fragility and sensitivity.

### 12. Medium: Existing Validator Uses `Function` on Repository Content

Evidence:

`tools/validate-gamelab.js` parses local constants using `Function(...)`.

Why this matters:

This is not exposed to website visitors. It only matters when a developer runs the validator. But if a malicious or careless change alters the scanned block, running validation can execute code.

Does this expose a vulnerability?

Low-to-medium internal tooling risk. It is not production-facing, but it is a dangerous pattern in a validation script.

Recommended fix:

- Export gamelab data as JSON or a JS module and import it directly in a controlled way.
- Or parse object literals with an AST parser rather than `Function`.
- If the script remains internal, at least document that it executes repository code.

### 13. Medium: Full-Site CI / Deployment Gate Is Partial

Evidence:

- There is a gamelab validator and now a build-time deploy allowlist/link/header generation check.
- There is still no package-managed CI setup or browser smoke/content-regression gate.

Why this matters:

The site is now large enough that manual review will miss regressions. A static site can still break through broken links, bad headers, accidental deploy artifacts, syntax errors, public drafts, or copy contradictions.

Does this expose a vulnerability?

Process vulnerability. It does not create an exploit by itself, but it allowed the public deploy artifact problem to exist.

Recommended fix:

Added:

- ~~Link check for local pages/assets.~~ `tools/build-site.js` validates local deploy-output links.
- HTML parse check.
- Inline/external script parse check.
- Browser smoke test for core pages.
- `node tools/validate-gamelab.js`.
- ~~Deploy artifact allowlist check.~~ `tools/build-site.js` fails if internal artifacts appear in `dist`.
- ~~Header check against Netlify preview deploy.~~ Baseline headers are generated into `dist/_headers`; live preview verification still belongs in CI.
- Secret scan.

### 14. Medium: Root Directory Contains Many Untracked Scratch Files

Evidence:

The working tree currently contains many untracked root-level helper/scratch files, including:

- `add_main_tooltips.js`
- `apply_all_tooltips.js`
- `beautify_icons.js`
- `build_sim.js`
- `eval_test.js`
- `extract.js`
- `final_fix.js`
- `fix*.js`
- `inject_tippy_scripts.js`
- `remove_duplicate_tooltips*.js`
- `screenshot.png`
- `temp*.js`
- `update_slider.js`
- `update_slider.py`

Why this matters:

They are not deployed right now because they are untracked. Before the deployment fix, committing them would also have made them production artifacts. The new `dist` allowlist prevents that, but root scratch files still increase accidental commit noise.

Does this expose a vulnerability?

Not currently. It is an accidental commit/deploy risk and a maintenance smell.

Recommended fix:

- Move useful scripts into `tools/` with clear names.
- Delete or archive throwaway scripts.
- Expand `.gitignore` for local scratch artifacts:

```gitignore
temp*.js
temp*.py
fix*.js
*_scratch.*
screenshot.png
*.bak
```

- Prefer a dedicated ignored `scratch/` directory for one-off scripts.

### 15. Medium: Prediction-Market Regulatory Surface Is Underrepresented

Evidence:

- The project discusses prediction markets and event-like markets as infrastructure for truth/answer keys.
- CFTC materials in 2026 continue to discuss prediction markets, event contracts, reporting, public-interest review, and enforcement concerns.

Why this matters:

If this remains a conceptual site, the legal surface is mostly narrative. If the project touches real-money prediction markets, event contracts, U.S. users, market settlement, reporting, or oracle-like use of market outcomes, it moves into a regulated and fast-changing area.

Does this expose a vulnerability?

Not a code vulnerability. It is a launch/regulatory risk. In production, a legal shutdown or enforcement action is as existential as a technical exploit.

Recommended fix:

- Add a "regulatory boundary" note to market-related pages.
- Separate educational prediction-market concepts from planned implementation.
- Get counsel before operating, facilitating, or integrating real-money markets.
- Avoid implying that market settlements are automatically usable as neutral truth infrastructure.

### 16. Medium-Low: Accessibility Needs a Dedicated Pass

Evidence:

- The browser crawl did not reveal obvious fatal rendering issues.
- The project contains interactive controls, nav dropdowns, tooltips, segmented controls, and gamelab panels.
- Full keyboard/screen-reader behavior was not exhaustively tested.

Why this matters:

Interactive explainers can easily become mouse-first and visually dense. If a reviewer or user cannot navigate the gamelab by keyboard or screen reader, the project loses credibility and accessibility.

Does this expose a vulnerability?

No security vulnerability. It is a usability and compliance weakness.

Recommended fix:

- Add keyboard-only test cases for the gamelab.
- Ensure segmented controls use `aria-pressed` or equivalent state.
- Ensure dropdowns update `aria-expanded`.
- Ensure tooltip-trigger icons have accessible labels and tooltip content is not the only source of essential information.
- Run Lighthouse/accessibility checks and manual screen-reader spot checks.

### 17. Low-Medium: ~~No `robots.txt`, Sitemap, or 404~~; Canonical/Social Metadata Still Open

Evidence:

- ~~`robots.txt`, `sitemap.xml`, and `404.html` were not found on the deployed site.~~ They are now generated into `dist`.
- Static scan did not find canonical, OpenGraph, or Twitter card metadata across pages.

Why this matters:

This is not a core product-security issue, but public perception matters. When a project is grant-facing or public-facing, link previews and search indexing shape how people encounter it.

Does this expose a vulnerability?

No. It is discoverability and presentation hygiene.

Recommended fix:

- ~~Add `robots.txt`.~~ Done in build output.
- ~~Add `sitemap.xml`.~~ Done in build output.
- Add canonical URLs.
- Add OpenGraph/Twitter metadata for core pages.
- ~~Add a custom `404.html`.~~ Done in build output.
- Mark internal/archived pages `noindex` if any remain public.

### 18. Low-Medium: Performance and Resilience Are Adequate but Not Hardened

Evidence:

- Pages are mostly standalone HTML and CSS, with some large page files.
- Tippy/Popper are loaded from a CDN.
- No obvious browser crash or blank page was observed.

Why this matters:

This is fine for a static grant/demo site. It becomes weaker as the project grows. Large standalone HTML files make shared behavior harder to test and optimize.

Does this expose a vulnerability?

No direct vulnerability. CDN dependence is already covered as a supply-chain issue.

Recommended fix:

- Vendor dependencies locally.
- Consider a minimal build step only if it helps enforce deploy boundaries and asset hashing.
- Add immutable caching for fingerprinted assets.
- Keep the current simplicity where it helps, but stop publishing the whole repo.

### 19. Low-Medium: Public Documentation Does Not Yet Have One Canonical Threat Model

Evidence:

- Threats are spread across several pages: gamelab, `breaking-the-court.html`, `rebuilding-the-court.html`, governance pages, and hybrid juror pages.
- `breaking-the-court.html` itself notes that scattered catches need one threat model.

Why this matters:

The project is conceptually ambitious. A reader should not have to infer the actual trust model by reconciling multiple pages. The absence of one canonical threat model also makes it easier for absolute claims to drift back into the product copy.

Does this expose a vulnerability?

Not in code. It is a design and communication weakness. In real protocol development, unclear threat models directly cause vulnerabilities because teams optimize against different attacker assumptions.

Recommended fix:

- Create a `threat-model.html` page or section.
- Include assets, adversaries, trust assumptions, non-goals, mitigations, residual risks, and "not solved yet."
- Link every strong claim to that threat model.
- Keep gamelab assumption names aligned with the threat-model vocabulary.

## Gamelab-Specific Review

The gamelab is the most useful part of the project because it forces the mechanism to become explicit. The current version is much stronger than a pure essay: it lets the reader vary assumptions, inspect attack cards, and see which assumptions carry the result.

Remaining gamelab weaknesses:

1. It still compresses too many attack surfaces into a small number of knobs.
2. It can make "green" results feel more conclusive than they are.
3. It models the economics better than it models privacy failure.
4. It does not yet make answer-key poisoning central enough.
5. It does not fully model identity rental, willing accomplices, coercion, and social collusion.
6. It does not fully model legal/regulatory shutdown as a system failure.
7. It does not show enough sensitivity analysis: which one assumption flips the result?

Recommended gamelab improvements:

- Add "tally setup/key-management failure" as a first-class attack.
- Add "Poisoned answer keys" as a first-class attack.
- Add "Identity rental / willing accomplice" as a first-class attack.
- Add "Appeal griefing" as a first-class attack.
- Add "Regulatory halt" as a first-class non-technical failure.
- Add per-result "fragile because..." explanations.
- Add a mode that compares optimistic, base, and adversarial assumptions side by side.
- Add an export/share state feature only after the model boundary is clearer.
- Add a small "not simulated" list beside each scenario.

The gamelab should frame itself as an adversarial design worksheet. That is a stronger and more honest position than trying to make it look like proof.

## Recommended Remediation Order

### Immediate

1. ~~Stop publishing the repo root. Move production pages/assets into a dedicated deploy directory.~~ Fixed with `dist`.
2. ~~Remove QA/audit/helper/markdown files from public production.~~ Fixed by deploy allowlist.
3. ~~Add deployment artifact allowlist checks.~~ Fixed in `tools/build-site.js`.
4. ~~Add baseline security headers in Netlify.~~ Fixed via generated `_headers`.
5. Vendor or pin external dependencies and add SRI if CDN use remains.

### Next

6. Replace absolute bribery/security claims with conditional language.
7. Create one canonical threat model page.
8. Add a public limitations section to the gamelab.
9. Add first-class gamelab models for tally setup/key-management failure, answer-key poisoning, identity rental, and appeal griefing.
10. Set Tippy `allowHTML` to false where possible and reduce `innerHTML` use.

### Before Any Real Product Launch

11. Produce a privacy/data-flow threat model for World ID, face/liveness checks, juror draw, private voting, reputation, appeals, and payouts.
12. Get legal/privacy review for biometric/personhood claims and prediction-market/event-contract integration.
13. Specify appeal/finality/quorum rules as a state machine.
14. Specify answer-key provenance, curation, challenge, and holdout-test rules.
15. ~~Document the launch requirement that no tally/admin role can link identity, votes, reputation, or payouts.~~ Done in the court, blueprint, finishing, and rebuilding pages. Formal implementation design still remains.

## Appendix: Confirmed Non-Issues in This Pass

The following were checked and did not show obvious failures:

- No real API keys or secrets found by basic pattern scan.
- No broken local links/assets found in the static scan.
- No duplicate IDs found.
- Inline scripts parsed.
- Gamelab validator passed.
- Live in-browser crawl showed no console crashes.
- Live pages did not show obvious horizontal overflow in the crawl.
- Dotfile paths checked on Netlify returned 404.

These are not guarantees. They are scoped observations from this pass.

## Bottom Line

The project is not fundamentally broken as a static demonstration site. The core weakness is that it currently ships too much internal material and sometimes claims more certainty than the modeled system earns.

The strongest next move is to make the public artifact smaller, harder to misread, and more explicit about assumptions. After that, the project needs a real threat model around identity, privacy, reputation, answer keys, appeals, and regulated market dependencies. Those are the places where a working implementation would either become genuinely interesting or genuinely dangerous.
