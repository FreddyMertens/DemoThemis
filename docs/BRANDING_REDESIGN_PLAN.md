# DemoThemis and OmenMarketMaker branding redesign plan

## Status

- Planning document only; no redesign implementation is included here.
- The source branding library is
  `C:\Users\eddya\Documents\Codex\2026-07-16\se\outputs\title-favicon-gallery\assets-current`.
- `run-through.html`, its generated public copy, and its simulator-specific UI are
  explicitly excluded from this redesign pass.
- Existing article wording, section order, anchors, application behavior, and
  financial/mechanism claims are not to be changed as part of branding work.

## Objective

Create one coherent proposal experience that contains two visibly independent
products:

- **DemoThemis** should feel calm, institutional, human, and difficult to capture.
  Its visual language comes from warm ivory, stone, editorial serif typography,
  restrained depth, and the sculpted DT identity.
- **OmenMarketMaker** should feel immediate, liquid, computational, and alive. Its
  visual language comes from near-black, white, electric green, a market grid,
  sharper geometry, and controlled motion.
- **Shared material** should not pretend the products are one brand. It should use
  the site's neutral editorial shell, then visibly identify which product owns
  each panel, step, fee, decision, or governance surface.

The redesign succeeds when a reader can identify product ownership before
reading the labels, while the proposal still feels like one navigable document.

## Scope

### Included proposal surfaces

| Surface | Ownership |
| --- | --- |
| `index.html` | Shared introduction with separate product zones |
| `demothemis.html` | DemoThemis |
| `break-the-court.html` | DemoThemis tool |
| `omenmarketmaker.html` | OmenMarketMaker |
| `bootstrap-loop.html` | Shared, with ownership applied node by node |
| `governance.html` | Shared, with separate product houses and ledgers |
| `demothemis-mvp.html` | DemoThemis |
| Generated `404.html` | Neutral shell with DemoThemis site mark |
| `DemoThemisMVP/web` application routes | DemoThemis, except explicit external-product handoffs |
| Favicons, app icons, manifests, social previews, and theme metadata | Route-specific |

### Explicitly excluded

- `run-through.html` and `DemoThemisMVP/web/public/run-through.html`.
- The supplied `Start 01` and `Start 07` branded button-state artwork. Those
  assets are designed for the run-through selector and should be held for its
  later, separate redesign.
- Unpublished legacy essays such as `vision.html`, `juror-court.html`, and
  `hybrid-juror-system.html` unless they are deliberately restored to the public
  build in a separate task.
- Copy rewrites, interaction-flow changes, court-model changes, and market-model
  changes.
- A new combined corporate logo. The proposal is a shared container, not a third
  merged product.

### Source and generated-file boundaries

Edit only canonical sources during implementation:

- Root proposal HTML listed in the included-surface table.
- `assets/styles.css`, `assets/mvp-simulator.css`, and any new files under
  `assets/brand`.
- Shared behavior only when required in `assets/common.js`.
- `tools/build-site.js`, `tools/prepare-unified-site.js`,
  `tools/smoke-site.js`, and `netlify.toml` for deployment and validation.
- Active source under `DemoThemisMVP/web/src`.

Never edit `dist/**` or generated proposal pages/assets under
`DemoThemisMVP/web/public/**` as source. They must be regenerated. The active
static navigation is duplicated across the seven included root HTML files; keep
the existing server-readable markup in this pass, update all seven copies, and
add a smoke assertion that their lockups match. A JavaScript-only navigation
renderer would create an unnecessary no-script and content-flash regression.

## Source-of-truth asset decision

Only `assets-current` should feed production. Other gallery folders contain
superseded or inconsistent names including `DemoThamis`, `PredictionExchange`,
and plural `OmenMarketMakers` variants.

Before copying the Rive master, render the actual
`assets-current/OmenMarketMakerLogo.riv` and verify that its visible lettering is
the canonical singular **OmenMarketMaker**. Filename correctness is not enough;
plural wording inside the animation is a release blocker.

| Canonical source asset | Size | Production role | Constraint |
| --- | ---: | --- | --- |
| `DemoThemisLogo.png` | 1766 × 216 | DemoThemis hero lockup and large product card | Pale artwork requires an approved dark backing; do not tint the raster with CSS |
| `DemoThemisFavicon.png` | 512 × 512 | DT mark source | Generate optically checked smaller derivatives rather than scaling the raw file everywhere |
| `OmenMarketMakerLogo.riv` | about 30 KB | Animated Omen hero identity | Self-host runtime and WASM; provide a static first frame and reduced-motion fallback |
| `OmenMarketMakerFavicon.png` | 512 × 512 | OM mark source | Check the fine green grid at 16 and 32 pixels and simplify only if it becomes unreadable |
| Eight button-state PNGs | 811 × about 164 | Reserved for the excluded run-through | Do not reuse as generic calls to action because their labels are baked into the image |

### Production asset structure

Create one canonical, reviewable library inside the repository:

```text
assets/
  brand/
    demothemis/
      wordmark.png
      mark-512.png
      mark-192.png
      mark-180.png
      mark-32.png
      mark-16.png
      favicon.ico
    omenmarketmaker/
      wordmark.riv
      wordmark-poster.png
      mark-512.png
      mark-192.png
      mark-180.png
      mark-32.png
      mark-16.png
      favicon.ico
    social/
      proposal-home-1200x630.png
      demothemis-1200x630.png
      omenmarketmaker-1200x630.png
      shared-system-1200x630.png
      mvp-1200x630.png
```

Use lowercase production filenames and canonical product spellings. Preserve the
original gallery unchanged as design-source evidence.

## Brand architecture

### 1. The proposal shell is neutral

Navigation, long-form reading backgrounds, the chapter sequence, ordinary body
copy, footers, and shared explanatory material retain the warm neutral editorial
system. This provides continuity and prevents a reader from feeling as though
every chapter belongs to a different website.

The shared navigation may use a compact DT mark because DemoThemis is the site
identity and domain, but it must not apply DemoThemis's full page theme to every
chapter. On the Omen page, the navigation remains the neutral proposal shell and
the Omen hero establishes the page identity beneath it.

### 2. Identity follows product ownership

Every visually bounded component should have one of three explicit ownership
states:

- `demothemis`
- `omen`
- `neutral`

Mixed chapters should assign ownership to individual nodes, rows, cards, and
panels instead of coloring an entire section ambiguously.

### 3. Full logos are anchors, not wallpaper

- Use one full product lockup in the primary brand moment of a relevant page.
- Use compact marks for repeated navigation, diagrams, badges, and application
  chrome.
- Do not repeat the full wordmark in every section or footer.
- Do not place both full logos side by side unless the content is explicitly about
  their relationship.

### 4. Neutral material stays neutral

Evidence, external examples, constitutional boundaries, third-party apps, and
generic protocol explanations must not inherit a product color merely because
they sit between product-owned elements.

## Color system

The production palette should be captured as semantic CSS tokens. Sampled logo
colors provide the brand basis, but readable text colors take priority over pale
logo fills.

### Shared editorial shell

The existing shared palette remains the neutral base:

```css
--neutral-canvas: #edeae4;
--neutral-page: #f7f5ef;
--neutral-surface: #fffdf9;
--neutral-ink: #23262e;
--neutral-muted: #5c6470;
--neutral-line: #ddd6ca;
```

### DemoThemis palette

These values are derived from the supplied wordmark, favicon, and navigation
artwork. Pale values are surfaces and emboss details, not body-text colors.

```css
--dt-canvas: #f6f3f2;
--dt-surface: #fffdf9;
--dt-soft: #e9e8e5;
--dt-emboss: #ccc3bc;
--dt-border: #ab9e94;
--dt-accent: #786a5e;
--dt-accent-strong: #6a5b50;
--dt-ink: #292522;
--dt-on-dark: #f6f3f2;
```

Usage:

- Warm ivory and stone for backgrounds and cards.
- Dark brown-charcoal for headings and controls.
- Taupe for selected states, borders, links, progress, and focus treatment.
- Sculpted shadows should be shallow and broad; avoid glossy gradients across
  whole reading sections.
- The pale wordmark should sit on a deliberate dark charcoal/taupe brand plate.
  It should not be recolored or placed directly on a similarly pale page.

### OmenMarketMaker palette

These values are sampled from the supplied mark and button artwork:

```css
--omm-black: #000402;
--omm-dark: #01130a;
--omm-surface: #0b1710;
--omm-green: #04e26d;
--omm-green-dark: #00592a;
--omm-mint: #5dfeaa;
--omm-white: #fefefe;
--omm-light-surface: #f4f5f1;
```

Usage:

- Dark hero and major feature bands may use white text with electric-green
  structure.
- Long reading passages should remain on light surfaces; use dark green for
  readable text accents and electric green for rules, grids, indicators, and
  controlled highlights.
- The grid is a sparse brand motif, not a full-page texture. Use it in hero art,
  section dividers, compact badges, or interaction headers.
- Avoid soft generic teal. The identity depends on the near-black/electric-green
  contrast seen in the supplied art.

### Semantic colors remain independent

Brand colors must not replace state meaning:

- Success, verified, and resistant states retain a tested success token.
- Failure, NO, danger, and vulnerable states retain their red token.
- Warnings retain amber.
- Selected/focused states use the owning brand's accent only when they are not
  also communicating success or failure.
- Omen's electric green cannot be the only cue for success because it is also a
  brand color. Pair all semantic states with labels, icons, or patterns.

### Contrast requirements

- Normal text: at least 4.5:1.
- Large text and meaningful graphic strokes: at least 3:1.
- Focus indicators: at least 3:1 against adjacent colors.
- Test all Omen green/white combinations; electric green is normally an accent,
  not paragraph text on white.
- Test the DemoThemis taupe states independently; the pale emboss color must never
  carry essential text.

## Typography and layout

Keep the existing content fonts so branding does not force a rewrite or a large
font payload:

- **Newsreader** remains the editorial voice and naturally supports DemoThemis.
- **Inter** remains interface and explanatory copy.
- **JetBrains Mono** remains identifiers, chapter numbers, evidence labels, and
  technical readouts.

Product distinction comes from composition rather than replacing all typography:

- DemoThemis uses generous space, editorial headings, centered institutional
  marks, thin rules, and measured card depth.
- Omen uses tighter display composition, uppercase micro-labels, strong black
  frames, grid-aligned details, and short electric-green accents.
- Do not imitate either raster wordmark with ordinary HTML text. Use the actual
  logo asset, with live text retained nearby for accessibility and SEO.

The body-copy measure, paragraph line height, heading order, anchor positions, and
mobile reading rhythm should remain stable.

## Logo and mark rules

### DemoThemis

- Full wordmark: one primary placement per DemoThemis page, normally the hero.
- DT mark: shared proposal navigation, compact tool headers, MVP chrome, favicon,
  and social compositions.
- Minimum intended UI size: 28 CSS pixels for the compact mark.
- The shared top navigation should use DT mark plus live `DemoThemis` text rather
  than attempting to shrink the very wide wordmark.

### OmenMarketMaker

- Animated wordmark: Omen chapter hero only in this pass.
- Static poster: homepage product card, social images, loading fallback, print,
  file-protocol fallback, and reduced-motion fallback.
- OM mark: compact Omen-owned cards, governance/fee rows, bootstrap nodes,
  favicon, and social compositions.
- Do not autoplay the full animation in repeated cards or below-the-fold panels.

### Accessibility

- If a logo replaces visible product-name text, give it a concise product-name
  `alt` value.
- If live product-name text is immediately adjacent, use `alt=""` and treat the
  image as decorative.
- Rive canvas is decorative when the real heading is present: set it
  `aria-hidden="true"` and keep the heading in the document.
- Never put essential navigation text only inside a raster asset or canvas.

## Reusable implementation model

### Static proposal pages

Add brand tokens to `assets/styles.css` and scope them through explicit classes or
data attributes:

```html
<body data-page-brand="demothemis">
<section data-brand="omen">
<article data-brand="neutral">
```

The shared components should consume local semantic variables such as:

```css
--brand-canvas;
--brand-surface;
--brand-ink;
--brand-muted;
--brand-accent;
--brand-accent-strong;
--brand-line;
--brand-on-accent;
```

Map those variables once under `[data-brand]`; do not fill page-level `<style>`
blocks with repeated raw hex values. Existing semantic variables such as
`--good`, `--bad`, and `--warning` remain global.

### Next.js MVP

Create small reusable React brand primitives rather than duplicating markup:

- `BrandMark`
- `BrandLockup`
- `BrandedPanel`
- `ProductBoundaryBadge`

The Next application should reference the same canonical `/assets/brand/...`
files copied by the unified build. Native Next icon metadata may use generated
copies, but their source and checksum should remain traceable to the canonical
DT mark.

### Mixed-product components

Replace positional styling such as `:nth-child()` when color communicates
ownership. Assign semantic ownership classes in the markup instead. Reordering a
governance card or bootstrap node must not accidentally change which brand it
appears to belong to.

## Page-by-page specification

### Proposal homepage — `index.html`

**Role:** Neutral introduction and first clear separation of the two products.

1. Keep the main hero neutral. Add a small paired-mark composition above the
   kicker or near the product introduction; do not turn the whole hero into a
   split-color advertisement.
   The two product marks must have equal visual weight; DT's role as the site
   mark must not make Omen look like a DemoThemis sub-product.
2. Rebuild the DemoThemis product card as a warm ivory institutional panel:
   - full wordmark on a dark brand plate;
   - warm stone border and shallow sculpted shadow;
   - taupe links and small DT ownership mark.
3. Rebuild the Omen product card as a high-contrast market panel:
   - static Omen poster, not a second autoplaying Rive canvas;
   - near-black title zone and controlled green grid accent;
   - light reading area if necessary to preserve the six-feature list's
     readability.
4. Keep the paragraph explaining the relationship neutral.
5. Add compact ownership treatments to the chapter map:
   - DemoThemis: Chapter 02, Chapter 03, and Live Demo MVP.
   - Omen: Chapter 04.
   - Shared: Chapters 05 and 06.
   - Run-through: leave its current card unchanged in this pass.
6. Keep the footer and chapter-navigation system neutral.

### DemoThemis chapter — `demothemis.html`

**Role:** The fullest expression of the DemoThemis identity.

1. Apply `data-page-brand="demothemis"`.
2. Add one full wordmark hero lockup on a dark taupe/charcoal plate while keeping
   the existing `<h1>`, claim, introduction, and metadata as live text.
3. Recolor the Simple overview / Deep dive selector into a warm stone control:
   selected states use dark taupe and ivory; focus remains clearly visible.
4. Bring the three reading categories into one DemoThemis family. Preserve their
   differentiation through tonal stone variants, numbering, icons, and border
   weight rather than unrelated mint/lavender/amber product colors.
5. Recolor cards, reserves, draw diagrams, appeals, juror-quality panels, and
   calls to action through the scoped DemoThemis tokens.
6. Keep green/red/amber wherever a component communicates success, failure, or
   warning.
7. Preserve every section ID, reader-tab behavior, hash-sync behavior, and the
   current simple/deep organization.

### Break the Court — `break-the-court.html`

**Role:** A DemoThemis-owned analytical instrument.

1. Apply the DemoThemis page scope without changing the model or controls.
2. Add the compact DT mark to the lab/board identity, not every result card.
3. Replace generic purple selection, focus, active-preset, and diagram accents
   with the dark taupe DemoThemis accent.
4. Use warm stone surfaces and slightly stronger institutional borders for the
   control panel and calculation board.
5. Preserve success, watch, and vulnerable state colors exactly as semantic
   outcomes.
6. Verify sliders, keyboard focus, charts, expanded attacks, and printed values
   remain clear at mobile widths and 200% zoom.

### OmenMarketMaker chapter — `omenmarketmaker.html`

**Role:** The fullest expression of the Omen identity.

1. Apply `data-page-brand="omen"`.
2. Create a dark hero band containing the Rive wordmark and sparse green grid.
   Keep the existing page heading and description as live text.
3. Show the static poster immediately, then replace or overlay it only after the
   locally hosted Rive runtime reports a successful load.
4. Under `prefers-reduced-motion: reduce`, never initialize autoplay; retain the
   static poster.
5. Use alternating Omen dark feature bands and light reading sections rather than
   turning the entire long article into white text on black.
6. Recolor market-owned cards, labels, section dividers, and interactive chrome
   to black/white/electric green.
7. Keep YES/NO, success/failure, disputed/final, and warning semantics distinct
   from branding. Labels and icons remain mandatory.
8. External incident examples and cited evidence remain neutral cards so brand
   styling does not imply they are Omen product surfaces.
9. DemoThemis arbitration/provider passages inside the Omen chapter use contained,
   labelled DemoThemis insets. They must not recolor the whole surrounding Omen
   feature section.
10. Use the OM mark in compact product-owned diagrams and fee rows, but do not
   repeat the full animated wordmark.

### Bootstrap loop — `bootstrap-loop.html`

**Role:** Explain exchange between two independent products.

1. Keep the page shell and prose neutral.
2. Give the hero a restrained dual-mark treatment joined by a neutral connector.
3. Replace the one-color amplifier diagram with explicit ownership:
   - Omen demand, market, and client-payment nodes use Omen styling.
   - DemoThemis court, juror, resolution, and quality-record nodes use
     DemoThemis styling.
   - shared evidence, outside customers, and handoff arrows remain neutral.
4. Place compact marks inside the first node of each product sequence, not inside
   every repeated node.
5. Brand table rows, test-path items, and fee/quality callouts by ownership using
   semantic classes rather than document position.
6. Keep product boundaries visible even in monochrome or high-contrast viewing by
   pairing color with labels, border patterns, and icons.

### Governance — `governance.html`

**Role:** Show two governments separated by a constitutional firewall.

1. Keep the page hero and introductory explanation neutral.
2. Assign the Omen business house a black/green treatment and OM mark.
3. Assign the DemoThemis civic/court house the warm ivory/taupe treatment and DT
   mark.
4. Style the constitutional firewall or shared core as neutral, visibly distinct
   from both houses.
5. Replace current `:nth-child()` triad ownership styling with explicit classes
   such as `.house--omen`, `.house--neutral`, and `.house--demothemis`.
6. Apply the same ownership system to invoices, treasury rows, token tables, and
   decision controls.
7. Keep governance outcomes, safety warnings, and attack simulation states
   semantic rather than brand-colored.

### MVP explainer and preview — `demothemis-mvp.html`

**Role:** Bridge the proposal into the real DemoThemis application.

1. Apply the DemoThemis page scope to the hero, feature facts, comparison chart,
   simulator frame, and calls to action.
2. Add one full wordmark brand moment in the page hero or opening application
   plate; use the DT mark in the compact preview header.
3. Replace the text-only `mvp-sim-site-brand` lockup with DT mark plus live text.
4. Keep the simulator tutorial, all actions, field values, comparison wording,
   route behavior, and receipt/result flow unchanged.
5. Ensure this preview and the live app share the same core brand tokens so one
   cannot drift into a separate visual identity.

### Live DemoThemis application — `DemoThemisMVP/web`

**Role:** Product UI, not proposal decoration.

1. Update `SiteChrome` to use DT mark plus live text.
2. Add DemoThemis tokens to `globals.css`; translate existing generic accents
   through semantic component variables rather than blind global replacement.
3. Apply the mark selectively to onboarding, About, and empty/entry states. Do
   not stamp it onto every transaction or court card.
4. Keep the application more functional and restrained than the editorial
   proposal. Use warm stone surfaces and taupe focus/selection accents, with
   strong readable charcoal text.
5. Omen styling may appear only when a screen explicitly identifies Omen as the
   originating app or payout destination. That boundary should use a compact OM
   badge, not reskin the neutral court.
6. Preserve World ID, authentication, case, payment, juror, and API behavior.

Prioritize active namespaces: `.site-*`, `.mvp-context-*`, `.oracle-*`,
`.court-*`, and `.sbx-*`. Do not spend this pass recoloring unused legacy
`.app-overview`, `.app-play-home`, `.court-nav-dock`, or abandoned preview
styles. Remove dead styles only in a later cleanup commit with separate usage and
visual verification. `assets/mvp-simulator.css`, `globals.css`, and
`sandbox.css` currently duplicate parts of the application palette; their active
tokens must be updated together to prevent preview/live drift.

### Shared navigation, footer, and generated 404

1. Use a 28–32 pixel DT mark plus live DemoThemis text in the shared proposal and
   Next navigation.
2. Retain the neutral navigation surface across all page brands.
3. Let page identity begin below the sticky navigation so Omen does not appear to
   own the proposal shell.
4. Keep footers neutral and text-led; a small DT mark is optional but full logos
   are not repeated.
5. Give the generated 404 the default DT favicon and compact site lockup.

## Motion specification

Rive motion is a product signature, not a general animation system.

- Load it only on the Omen chapter in this pass.
- Self-host the JavaScript runtime and WASM; do not depend on a CDN.
- Add explicit canvas width and height to prevent layout shift.
- Keep a static poster visible until the animation is ready.
- Stop animation while the tab is hidden or the hero is outside the viewport if
  runtime behavior allows it.
- Respect `prefers-reduced-motion` before initializing the runtime.
- If Rive, WASM, CSP, or file-protocol loading fails, retain the static poster and
  never show a broken canvas.
- Review the production content security policy. WebAssembly may require a
  narrowly scoped CSP adjustment such as `wasm-unsafe-eval`; add it only if the
  chosen self-hosted runtime needs it and verify the deployed header.

## Favicons, application icons, and social images

### Route mapping

| Route group | Favicon / theme | Social card |
| --- | --- | --- |
| Homepage and generic proposal pages | DT default on neutral theme | Dual-product homepage card |
| DemoThemis, Break the Court, MVP explainer | DT | DemoThemis card |
| OmenMarketMaker | OM with dark/electric-green theme color | Omen card |
| Bootstrap and Governance | DT browser default, neutral browser theme | Shared-system dual-brand card |
| Live MVP routes | DT app icons and manifest | MVP card |

### Required outputs

- 16 × 16 and 32 × 32 browser icons.
- Multi-size `.ico` fallback.
- 180 × 180 Apple touch icon.
- 192 × 192 and 512 × 512 manifest icons.
- 1200 × 630 Open Graph/Twitter cards.
- Route-appropriate `theme-color`.
- `twitter:card=summary_large_image` when the large social card is available.

The 512-pixel source favicons should be optically cropped and inspected at every
output size. Fine Rive/grid detail may need a simplified small-size export, but
that decision must be based on actual tab-scale review rather than filename or
source dimensions.

## Build and repository integration

The root `assets/brand` directory is the single canonical source for proposal and
Next public references.

1. Add the approved brand files to the explicit public allowlist in
   `tools/build-site.js`, or add a narrowly scoped recursive copier for
   `assets/brand` with the existing path-safety and missing-link validation.
2. Extend `enhanceHtmlMetadata()` with route-to-brand mappings for favicon,
   theme-color, `og:image`, `twitter:image`, and large-card metadata.
   `run-through.html` must be an explicit unchanged exception in this pass rather
   than inheriting a new default image or icon implicitly.
3. Extend SEO validation so builds fail when a published page is missing its
   expected image metadata or references the wrong product icon.
   Update the existing smoke assertion that currently expects
   `twitter:card=summary` when large social images change it to
   `summary_large_image`.
4. Let `tools/prepare-unified-site.js` continue copying the built proposal and
   canonical brand assets into `DemoThemisMVP/web/public`.
5. Configure Next metadata in `DemoThemisMVP/web/src/app/layout.tsx` from the same
   DT icon/social sources. Avoid unrelated manually maintained duplicates.
6. Self-host and allowlist the Rive runtime/WASM alongside the brand assets.
7. Add cache-friendly immutable headers for versioned image/Rive assets if the
   deployment setup supports them.
8. Do not edit generated copies in `DemoThemisMVP/web/public` directly; rebuild
   them from root proposal sources.
9. Harden generated-output cleanup. `prepare-unified-site.js` must remove stale
   proposal files that are no longer in the canonical build; the currently stale
   `DemoThemisMVP/web/public/predictionmomo.html` must not survive the redesign.
10. Review both CSP paths: standalone `_headers` is generated by
    `tools/build-site.js`, while the unified Netlify deployment uses
    `netlify.toml` because `_headers` is excluded during preparation. Rive must be
    tested under both configurations.

## Performance requirements

- Keep logos out of CSS base64 data URLs so they remain independently cached.
- Declare image dimensions or `aspect-ratio` to prevent layout shift.
- Use the original transparent PNG only where its alpha/shadow treatment matters.
- Produce optimized WebP/AVIF derivatives for large decorative/social uses when
  they are visibly equivalent; retain PNG for favicon and alpha-critical output.
- Lazy-load below-the-fold decorative images.
- Load the Omen Rive runtime only on the page that uses it.
- Do not autoplay motion on the homepage product card.
- Measure the redesign against the existing page rather than accepting a large
  unexamined payload increase.

Recommended budgets for this pass:

- Shared navigation mark: under 20 KB where practical.
- Each static product-card poster: under 100 KB where practical.
- Omen Rive source: retain the current roughly 30 KB file; runtime/WASM is loaded
  only on demand.
- No additional render-blocking third-party font or script request.

## Accessibility and usability requirements

- Product ownership cannot be communicated by color alone.
- Visible product names remain live text even where logo art is present.
- Keyboard focus follows each scoped brand but always remains strongly visible.
- All existing links, buttons, toggles, tabs, sliders, and form labels retain
  their accessible names and interaction behavior.
- Motion has a static equivalent and honors reduced-motion preferences.
- Branded dark bands must not create long low-comfort reading passages.
- Test at 200% browser zoom and with text enlargement.
- Test Windows high-contrast/forced-colors mode; marks may remain, but controls
  and ownership labels must still make sense without background images.
- Print output should fall back to light backgrounds and static logos.
- Social-card and favicon art must not be the only place a product name appears.

## Content and interaction preservation contract

Branding implementation must not:

- change article wording;
- remove or rename section IDs;
- change the Simple overview / Deep dive behavior;
- change pricing, fees, reserve calculations, examples, or case data;
- change MVP tutorial or application flows;
- change route targets;
- alter run-through source or generated output;
- replace semantic YES/NO or safe/unsafe state colors with brand colors;
- introduce a new claim about the relationship between the products.

If a visual treatment requires copy or structural changes, record it as a
separate follow-up rather than smuggling it into the redesign.

## Implementation phases

### Phase 0 — Baseline and guardrails

1. Capture desktop and mobile screenshots of every included public page and key
   MVP route.
2. Record current asset sizes, page weights, console output, and build results.
3. Add a regression assertion that `run-through.html` is unchanged during this
   branding pass, using a checked baseline hash or a scoped Git diff review.
4. Confirm the public-route list and mark legacy/unpublished documents as out of
   scope.
5. Approve the exact page-ownership matrix, canonical singular Rive lettering,
   contrast-adjusted token values, and 16/32-pixel compact icons.
6. Produce a three-screen visual proof before broad implementation:
   - DemoThemis hero at desktop and mobile;
   - Omen hero with poster and animated states;
   - one mixed bootstrap diagram showing Omen, DemoThemis, and neutral ownership.

**Exit condition:** visual and technical baselines exist, and excluded files are
guarded.

### Phase 1 — Asset normalization and tokens

1. Copy approved `assets-current` sources into `assets/brand` with canonical
   filenames.
2. Export the Omen static poster and all favicon/icon derivatives.
3. Create the shared neutral, DemoThemis, Omen, and semantic CSS token layers.
4. Add reusable logo/mark and brand-scope styles without switching pages yet.

**Exit condition:** one canonical asset library exists, small icons have passed
optical review, and token contrast checks pass.

### Phase 2 — Shared shell and homepage

1. Add the compact DT navigation lockup to static and Next shells.
2. Keep navigation/footer backgrounds neutral.
3. Redesign the homepage's two product cards and ownership markers.
4. Leave the run-through chapter card internally unchanged.

**Exit condition:** the homepage communicates two distinct products within one
proposal system at desktop and mobile widths.

### Phase 3 — Primary product chapters

1. Apply the full DemoThemis scope to `demothemis.html`.
2. Apply the DemoThemis tool scope to `break-the-court.html`.
3. Apply the Omen scope, animated hero, and static fallback to
   `omenmarketmaker.html`.
4. Verify article readability before proceeding to mixed pages.

**Exit condition:** each product chapter is immediately identifiable, accessible,
and still structurally identical to its baseline.

### Phase 4 — Mixed-product chapters

1. Brand bootstrap nodes, evidence handoffs, and callouts by ownership.
2. Brand governance houses, ledgers, and rows by ownership.
3. Replace positional color selectors with semantic ownership classes.
4. Verify both mixed pages remain understandable without color.

**Exit condition:** the product boundary can be followed visually from start to
finish on both pages.

### Phase 5 — MVP explainer and application

1. Apply DemoThemis branding to `demothemis-mvp.html`.
2. Introduce shared DT assets and token values into the Next application.
3. Align proposal preview chrome with the live application without changing flow.
4. Add compact Omen origin badges only to explicit Omen handoffs, if present.

**Exit condition:** the explainer and live product feel related, and no application
behavior regresses.

### Phase 6 — Metadata and deployment integration

1. Add icons, theme colors, manifest entries, and social images.
2. Update the static builder allowlist, metadata generation, validation, and CSP.
3. Update Next metadata and public asset preparation.
4. Verify local preview and production-style builds.

**Exit condition:** every included route publishes the correct icon/social card
and all assets survive the unified build.

### Phase 7 — Visual and functional QA

1. Compare new screenshots with the baseline at 320, 375, 768, 1024, and 1440
   pixel widths.
2. Test keyboard, touch, reduced motion, high contrast, 200% zoom, print, and dark
   hero readability.
3. Run proposal build, smoke tests, Next lint, and Next production build.
4. Inspect the deployed headers, Rive fallback, favicons, and social previews.
5. Perform a final scoped diff proving run-through files were not changed.

**Exit condition:** all acceptance criteria below pass and there are no unexplained
content or behavior diffs.

## Verification matrix

| Area | Required verification |
| --- | --- |
| Static build | `node tools/build-site.js` completes and validates all brand asset references |
| Proposal regression | `node tools/smoke-site.js` passes |
| Court-model regression | `node tools/validate-gamelab.js` passes |
| Unified copy | `node tools/prepare-unified-site.js` copies brand assets and metadata correctly |
| Next quality | `pnpm lint` passes in `DemoThemisMVP/web` |
| Next production | `pnpm build` passes in `DemoThemisMVP/web` |
| Visual responsive | Included pages reviewed at 320, 375, 768, 1024, and 1440 px |
| Accessibility | Contrast, keyboard focus, reduced motion, forced colors, and 200% zoom reviewed |
| Motion failure | Omen poster remains correct when Rive or WASM is blocked |
| Metadata | Browser icons, Apple icon, manifest icons, theme colors, OG and Twitter images checked |
| Product boundary | Bootstrap and governance remain understandable without color |
| Exclusion | No diff in root or generated run-through HTML |
| Generated hygiene | No stale `predictionmomo.html` or hand-edited generated proposal artifact remains |

## Acceptance criteria

The redesign is complete only when all of the following are true:

- A reader can distinguish DemoThemis, OmenMarketMaker, and neutral/shared
  material before reading detailed labels.
- The proposal still feels like one document because navigation, reading measure,
  typography, spacing, and footer structure remain coherent.
- DemoThemis pages use the supplied ivory/stone identity without low-contrast pale
  text.
- Omen pages use the actual near-black/electric-green identity rather than generic
  teal styling.
- Mixed pages identify ownership at the component level, not merely by page.
- Mixed pages give DT and OM marks equal visual scale and do not imply that Omen
  is a DemoThemis sub-brand.
- One canonical asset set with correct `DemoThemis` and `OmenMarketMaker` spelling
  feeds both the static proposal and Next application.
- Full wordmarks are used selectively; compact marks handle repeated UI.
- Rive has static, reduced-motion, CSP-failure, and file/loading fallbacks.
- The rendered Rive identity visibly uses canonical singular OmenMarketMaker
  naming.
- Semantic result colors and all existing interactions remain intact.
- All included pages pass contrast and responsive review.
- Static and Next production builds pass.
- Favicons and social previews are correct for their route group.
- No article copy, anchors, mechanism values, application flows, or run-through
  files changed as collateral work.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| DemoThemis wordmark disappears on a pale page | Use the original artwork on a deliberate dark brand plate; keep live dark text nearby |
| Omen green is mistaken for success/YES | Keep semantic labels/icons and reserve electric green for brand structure when state meaning is present |
| Long black Omen sections reduce reading comfort | Limit dark treatment to hero and feature bands; keep long copy on light surfaces |
| Rive adds runtime weight or fails under CSP | Load only on Omen page, self-host, use static poster first, and test blocked-runtime behavior |
| Static and Next assets drift | Keep root `assets/brand` canonical and copy through the existing unified build |
| Generated public HTML is edited directly | Modify root source only and regenerate; add review checks for generated copies |
| Positional CSS misbrands reordered components | Replace ownership-bearing `:nth-child()` rules with semantic classes/data attributes |
| Global token replacement breaks state colors | Separate brand tokens from semantic success/danger/warning tokens and migrate component by component |
| Redesign accidentally touches run-through | Guard it with a baseline hash/scoped diff and keep its assets and selectors out of this pass |
| Visual work changes copy or behavior | Enforce the preservation contract and review text/anchor/interaction diffs separately from CSS/assets |

## Recommended commit boundaries

Keep implementation reviewable and rollback-friendly:

1. `brand: add canonical assets and design tokens`
2. `brand: update shared chrome and homepage product identity`
3. `brand: apply DemoThemis chapter and lab theme`
4. `brand: apply OmenMarketMaker chapter and motion fallback`
5. `brand: clarify bootstrap and governance ownership`
6. `brand: align MVP explainer and live application`
7. `brand: add icons social metadata and build validation`
8. `test: add branding accessibility and exclusion checks`

Do not combine content rewrites, mechanism edits, or run-through changes into
these commits.

## Final deliverables

- Canonical repository-hosted brand asset library.
- DemoThemis and Omen token definitions plus shared semantic tokens.
- Reusable static and React brand primitives.
- Redesigned included proposal pages with scoped ownership colors.
- DemoThemis-branded MVP explainer and live application chrome.
- Self-hosted Omen Rive integration with static/reduced-motion fallback.
- Complete browser, application, manifest, and social-image set.
- Updated build metadata, CSP handling, and asset validation.
- Responsive, accessibility, performance, and regression evidence.
- A final diff proving the run-through page remained untouched.
