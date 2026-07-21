# Run-through chapter and simulator design update plan

## Status

- Implemented in the canonical run-through source and its dedicated brand layer.
- The existing inline structural CSS remains in place to avoid destabilizing the
  34-state simulator; the redesign is isolated in `assets/run-through-brand.css`
  and loaded after the structural rules.
- This is the dedicated follow-up that supersedes the run-through exclusion in
  `BRANDING_REDESIGN_PLAN.md`.
- Canonical source: `run-through.html`.
- Generated copy: `DemoThemisMVP/web/public/run-through.html`. Never edit this
  generated copy directly.
- The redesign must preserve the chapter's wording, event data, mechanism data,
  navigation targets, and simulator behavior unless a separate content task is
  approved.

## Objective

Bring the entire run-through chapter into the current visual system while making
the two products feel unmistakably independent:

- OmenMarketMaker is near-black, white, electric green, gridded, immediate, and
  computational.
- DemoThemis is warm ivory and stone with editorial typography, restrained
  depth, and cyan `#00e5ff` emission used for interaction and selected
  illustrations.
- Shared chapter material remains a quiet editorial shell. It identifies which
  product owns each state without inventing a third combined brand.

The finished experience should feel like one polished mobile-game-style product
walkthrough whose visual identity changes at the actual product boundary, not
when the reader chooses a starting point.

## Evidence-based baseline

The current source contains:

- 13 guided events;
- 34 user, automatic, and completion states;
- two starting points: Event 01 and Event 07;
- an OmenMarketMaker application renderer;
- an OmenMarketMaker automatic-execution sequence;
- a DemoThemis application renderer;
- a DemoThemis on-chain sequence renderer;
- a role-handoff layer;
- a feature/component unlock panel;
- a complete interactive lifecycle map;
- a text alternative for that map.

The existing layout is a valuable constraint, not something to discard. A
baseline audit rendered every state at 231, 280, 320, 360, 390, 430, 620, 720,
760, 980, and 1280 pixels: all 374 state/viewport combinations passed the basic
overflow and off-screen-control checks.

### Current visual problems

1. The shared chapter still uses the old `System Lab.` navigation and purple
   accent instead of the current site navigation and wordmark treatment.
2. OmenMarketMaker screens use an orange/cream palette. They do not resemble the
   near-black, electric-green, moving-grid product identity.
3. DemoThemis protocol and juror screens use a dark navy/black canvas. This
   directly conflicts with the approved ivory/stone identity and the rule that
   DemoThemis should never use black as its brand background.
4. `data-product-mode` controls the appearance of the whole simulator. A starting
   choice is navigation state, not product ownership. Event 07 and Event 08 are
   still OmenMarketMaker screens even when entered through the court-backed
   starting point.
5. Dark floating coachmarks cover application content, especially on mobile.
   They feel like an overlay around the app instead of a tutorial happening
   inside it.
6. The lifecycle map uses generic purple and teal. It does not show the Omen ->
   DemoThemis -> Omen ownership path clearly.
7. The build and smoke tests deliberately reject run-through branding and pin the
   source to an old hash. Those guards must be replaced with positive redesign
   requirements.
8. `tools/audit-run-through-layout.js` currently expects Playwright but the root
   workspace does not provide that dependency, so the audit is not reliably
   runnable from a clean checkout.

## Preservation contract

The redesign must not change:

- any visible article or simulator wording;
- the 13-event order;
- any of the 34 guided states;
- which actions are user actions, automatic steps, or completion steps;
- the five automatic protocol transitions;
- example questions, fees, bonds, odds, payouts, panel sizes, or timing;
- `STAGES`, `FOCUS_STEPS`, `EVENT_FLOWS`, `APP_PAGES`, `SYSTEM_PHASES`,
  `SYSTEM_STATES`, `SYSTEM_TRANSITIONS`, or `PRODUCT_MODES`, except for additive
  ownership metadata needed for styling;
- section IDs, deep links, button destinations, accessible names, or keyboard
  behavior;
- the neutral mock-browser controls and their back-navigation behavior;
- the text alternative for the lifecycle map.

Logo art may replace a duplicate visible typed product title, but the product
name must remain in accessible live text. Generated files must only change by
running the normal build/preparation pipeline.

## Canonical visual tokens

The run-through should consume the existing shared tokens rather than create a
third palette.

| Role | Tokens | Use |
| --- | --- | --- |
| Shared shell | `--canvas`, `--surface`, `--ink`, `--muted`, `--line` | Article, browser chrome, shared controls, explanatory copy |
| DemoThemis | `--dt-canvas: #f6f3f2`, `--dt-surface: #fffdf9`, `--dt-ink: #292522`, `--dt-emission: #00e5ff`, `--dt-emission-ink: #006f7b` | Court app, protocol sequence, court-owned controls and diagrams |
| OmenMarketMaker | `--omm-black: #000402`, `--omm-surface: #0b1710`, `--omm-green: #04e26d`, `--omm-mint: #5dfeaa`, `--omm-white: #fefefe` | Market app, market execution sequence, market-owned controls and diagrams |
| Semantic | existing good/bad/warning tokens | YES/NO, paid/pending/error, risk, and completion states |

Raw cyan is not body text on ivory; use `--dt-emission-ink` for readable text.
Omen green is not allowed to replace semantic status by itself. Status always
keeps its label, icon, and shape.

## Ownership architecture

### Separate starting mode from visual ownership

`PRODUCT_MODES` should continue to choose only the starting event:

- `omen` starts at Event 01;
- `themis` starts at Event 07.

It must stop setting the visual theme for the whole panel. Each rendered state
already exposes most of the needed information:

- `data-surface="omen"` and `data-app-theme="omen"` for the market app;
- `data-sequence-profile="omen"` for Omen automatic execution;
- `data-surface="themis"` and `data-app-theme="themis"` for the court app;
- `data-surface="protocol"` for the DemoThemis on-chain sequence.

Use these values to set a single explicit owner on the active frame and outer
controller, for example `data-active-brand="omen"` or
`data-active-brand="demothemis"`. Protocol sequences inherit Omen only when
`data-sequence-profile="omen"`; every other protocol sequence is DemoThemis.

### Guided-event ownership

| Events/states | Owner |
| --- | --- |
| Events 01-08 application states | OmenMarketMaker |
| Event 06 automatic route/cashout sequence | OmenMarketMaker |
| Events 09 and 11 protocol sequences | DemoThemis |
| Events 10 and 12 court application states | DemoThemis |
| Event 12 appeal sequence | DemoThemis |
| Event 13 proof-relay sequence | DemoThemis until the handoff completes |
| Event 13 settlement receipt | OmenMarketMaker |

The role-handoff strip is the only deliberately dual-branded surface.

### Lifecycle-map ownership

Add an additive `owner` field to each `SYSTEM_STATE`:

- `omen` for market creation, pricing, trading, and the permanent market record;
- `demothemis` for case intake, draw, presence, ballot, verdict, appeal,
  accountability, and juror-quality learning;
- `shared` for the challenge handoff, final release rule, cross-product invoice,
  and bootstrap loop.

Do not infer ownership only from phase position. Phase 04 intentionally contains
Omen, DemoThemis, and shared states.

## Page-level design specification

### 1. Shared navigation and metadata

- Add `data-page-brand="neutral"` to the page.
- Replace `System Lab.` with the canonical full DemoThemis navigation wordmark,
  with the same full-width tapered cyan underline used elsewhere.
- Use the current navigation link underlines, hover, pressed, focus, and mobile
  menu states.
- Keep the chapter hero neutral and editorial. Do not turn it into a split black
  and ivory advertisement.
- Do not add another full logo to the hero; the starting selector is the proper
  place for the paired product identities.
- Add the shared-system favicon/social metadata and use
  `assets/brand/social/shared-system-1200x630.jpg`.

### 2. Hero and chapter framing

- Preserve the headline, deck, metadata, and chapter order.
- Replace the generic purple kicker and `Start here` pill with the neutral
  typography plus the canonical interaction underline/rim language.
- Use one quiet two-color hairline below the metadata: Omen green leading into
  DemoThemis cyan. It should clarify the journey without becoming a decorative
  border around the article.
- Keep generous editorial whitespace; the simulator should remain the first
  strong branded moment.

### 3. Starting-point selector

Build two equal-height, equal-width live HTML buttons rather than using baked
button screenshots.

#### OmenMarketMaker start card

- Near-black card background.
- Full OmenMarketMaker Rive wordmark, with the static poster as the initial and
  reduced-motion state.
- Run the Rive animation at half speed and only while the selector is visible.
- Put the subtle moving green mesh behind the whole card, never inside each text
  row or action chip.
- Keep `Full market run` and `Start 01` as live text.
- Idle: restrained green edge and visible mesh.
- Hover/focus: equal electric-green rim and centered halo.
- Pressed: slightly stronger surface tint and a small scale response.
- Selected: persistent green rim, check state, and `aria-pressed="true"`.

#### DemoThemis start card

- Warm ivory/stone surface; never black or navy.
- Full DemoThemis wordmark integrated directly into the card, with no nested
  logo rectangle and no duplicate visible `DemoThemis` title.
- Use the canonical tapered cyan wordmark underline at the correct relative
  thickness and three-pixel optical gap.
- Keep `Court-backed run` and `Start 07` as live text.
- Idle: faint equal cyan rim and very restrained halo.
- Hover/focus: bright equal cyan rim and centered glow.
- Pressed: 14% cyan wash, no taupe fill.
- Selected: persistent cyan rim and `aria-pressed="true"`.

The supplied button-state PNGs are useful composition references, but they
should not be production controls: their states are baked into rasters, their
Omen treatment is light instead of near-black, they predate the cyan emission
language, and they cannot reflow cleanly on mobile.

### 4. Outer event controller and navigator

- Keep the controller on the shared ivory surface.
- Set `--active-brand-accent`, `--active-brand-ink`, and
  `--active-brand-surface` from the current rendered owner, not the starting
  mode.
- Previous/Next buttons use equal rims. Omen-owned events glow green;
  DemoThemis-owned events glow cyan; disabled controls have neither glow nor
  brand fill.
- Use an underline for the Events toggle instead of a filled pill.
- Keep the progress count, event title, and phase label in their current order.
- In the event drawer, show ownership with a compact mark plus text, not color
  alone.
- Reassign the current `Resolution` group to Omen ownership. Treat Event 13 as a
  split handoff rather than styling the entire group as DemoThemis.

### 5. Neutral browser frame

- Preserve the neutral gray browser chrome. It helps users understand they are
  moving between two separate applications.
- Reduce its drop shadow and use one clean border so it does not compete with
  the product surface.
- Keep URL, Back, and completion controls in the browser chrome.
- Product branding begins inside the application viewport, not on the browser
  toolbar.

### 6. OmenMarketMaker application and automatic sequence

- Replace every orange/cream application token with the canonical Omen palette.
- Use near-black for the application canvas, dark green-black cards, white text,
  and green hierarchy.
- Put the full static Omen wordmark in the simulated app navigation. Do not add a
  duplicate typed product title beside it.
- Use the same smooth right-to-left SVG grid technique as the homepage and Omen
  chapter. One background layer covers the application canvas; cards remain
  opaque enough for text clarity.
- Use sharper card radii and thin green rules rather than warm drop shadows.
- Primary actions use green on black; hover adds an equal green rim; pressed
  darkens the green slightly and removes lift.
- Inputs, order rows, receipts, and data cards use high-contrast dark surfaces.
- Preserve YES/NO, paid, pending, and warning semantics. Brand green cannot be
  the only indication of a successful state.
- Theme `data-sequence-profile="omen"` as an Omen execution trace, not the
  generic blue protocol canvas.

### 7. DemoThemis application and protocol sequence

- Replace every dark navy/black court surface with warm ivory, stone, and white.
- Use the full DemoThemis wordmark in the simulated court navigation, with no
  duplicate typed product title.
- Use Newsreader for display headings and Inter for controls/body copy so the
  simulator matches the live MVP rather than applying one serif to all UI.
- Primary controls use a 5% cyan-on-ivory wash, readable dark text, and an equal
  cyan rim. Hover rises to 10%; pressed rises to 14%.
- Tabs and text links use cyan underlines rather than filled brown or blue pills.
- Inputs and cards retain stone borders with a faint cyan focus/rim layer.
- Use pale cyan markers for draw seats, numbered steps, proof nodes, and current
  progress. Keep success green, warnings amber, NO/reserve semantics, and errors
  red.
- Theme all default `data-surface="protocol"` sequences as DemoThemis. They must
  use an ivory canvas and cyan diagram lines; black is prohibited.
- Noninteractive protocol cards get a thin quiet line, not a fake hover state.
  Interactive or tooltip-bearing cards may use the restrained equal cyan hover
  rim.

### 8. Product handoffs

- Turn the role-handoff strip into a clear two-owner transfer surface.
- Show the source product mark on the left, the existing role/handoff text in the
  center, and the destination product mark on the right.
- Use a green-to-cyan connector when Omen sends a case to DemoThemis and a
  cyan-to-green connector when final proof returns to Omen.
- Keep the existing accessible text and `data-role-handoff` state.
- Do not create a merged logo or imply shared governance.

### 9. Tutorial and coachmarks

- Keep tutorial progression inside the simulator frame.
- Replace opaque floating black coachmarks with one compact inline tutorial dock
  at the top of the active product surface.
- Keep the current action label, explanation, rewind behavior, automatic-step
  status, and result toast.
- Use a small owner-colored target dot and equal rim on the actual actionable
  control. Do not cover input fields, browser navigation, or card copy.
- Omen target states use green; DemoThemis target states use cyan.
- Automatic steps use the same dock but no fake clickable target.
- Toasts should float briefly above the bottom safe area, then disappear. They
  should use the current product surface rather than a generic black card.
- On mobile, the dock becomes a compact sticky row inside the frame and never
  overlaps the browser toolbar.

### 10. Mechanics-unlocked panel

- Keep the disclosure collapsed by default.
- Replace the purple disclosure title with neutral text and an owner-colored
  underline based on the active event.
- Omen feature cards use compact Omen marks and restrained green edges.
- DemoThemis components use compact DT marks and faint cyan rims.
- Locked items remain low-emphasis neutral; newly unlocked items may emit once,
  then settle into a persistent selected state.
- Honor reduced motion by skipping the one-time emission animation.

### 11. Complete lifecycle map

- Keep the map on a light shared canvas for long-form readability.
- Remove generic purple and teal as ownership colors.
- Omen-owned states: near-black label/edge, faint green grid cue, and green
  hover/focus rim.
- DemoThemis-owned states: warm stone surface, cyan edge, and cyan hover/focus
  rim.
- Shared states: neutral stone surface with a split green/cyan ownership rule.
- Current guided state uses the owning product's rim rather than a universal
  purple outline.
- Every resolved market follows the disputed-market route through the DemoThemis court; there is no court-bypass route.
- `Disputed market` uses a green-to-cyan-to-green route trace.
- `Whole map` stays neutral and shows all ownership labels.
- Route controls use underlines and equal focus rims, not filled purple pills.
- Preserve the text outline and ensure ownership remains understandable in print
  and forced-colors mode.

### 12. Mobile and narrow layouts

- Preserve the current no-horizontal-overflow behavior down to 231 pixels.
- Stack the two starting cards vertically while retaining equal visual weight.
- Keep all touch targets at least 44 by 44 CSS pixels where space permits.
- Use one-column application cards without shrinking labels into unreadable
  fragments.
- Keep the inline tutorial dock before the active screen content.
- Do not let the sticky site navigation or simulator controls cover the active
  target.
- At 320-430 pixels, collapse secondary metadata before reducing type below the
  current readable sizes.
- At 200% zoom, preserve a single clear action and a visible back path.

## Interaction-state language

| State | Shared | OmenMarketMaker | DemoThemis |
| --- | --- | --- | --- |
| Off/disabled | Neutral border, no halo, 48% opacity | Same | Same |
| Idle | Neutral surface, no decorative glow | Faint green edge and mesh | Faint equal cyan rim; wordmark underline visible edge-to-edge |
| Hover | Small lift only where useful | Equal green stroke plus centered halo | Equal cyan stroke plus centered halo |
| Pressed | No lift, 0.99 scale | Darker green surface | 14% cyan-on-ivory wash |
| Selected/on | Persistent label/icon plus accent | Green rim and check | Cyan rim and check |
| Keyboard focus | Two-pixel contrast-safe outline | White core plus green halo | Teal core plus cyan halo |

No glow may be implemented as an unequal drop shadow. Emission is either a
centered halo around an equal stroke or a tapered underline.

## Motion and performance

- Use one Rive instance in the starting selector only.
- Play it at half speed, pause it when off-screen, and use the static poster
  before load, under reduced motion, and on runtime failure.
- Use the existing small SVG grid for Omen background movement. Animate one
  seamless background layer slowly from right to left; do not create a canvas,
  particle system, or JavaScript animation loop.
- DemoThemis glow is state-driven. Do not add continuous decorative pulsing.
- The only repeating DemoThemis pulse permitted is the functional tutorial
  target, and it must stop under `prefers-reduced-motion`.
- Avoid loading brand assets more than once. Browser/app wordmarks below the
  selector should use static images.
- Keep the redesign within the current responsive height behavior; do not create
  a fixed-height simulator that clips long states.

## Source and build changes

### Canonical source files

- `run-through.html`
- `assets/styles.css`
- new `assets/run-through.css`
- `assets/brand-rive.js`
- existing assets under `assets/brand/demothemis` and
  `assets/brand/omenmarketmaker`
- `tools/build-site.js`
- `tools/smoke-site.js`
- `tools/audit-run-through-layout.js`
- `tools/prepare-unified-site.js`
- `docs/BRANDING_REDESIGN_PLAN.md`

### CSS boundary

Before visual edits, mechanically move the large inline run-through stylesheet
to `assets/run-through.css` and prove that the rendered baseline is unchanged.
Keep simulator data and behavior in the canonical HTML during this pass. This
makes the new ownership theme reviewable without mixing thousands of CSS lines
with event data.

Do not implement the redesign as an ever-growing override block on top of the
old orange/navy themes. Replace the obsolete palette blocks and make
`data-surface`, `data-app-theme`, `data-sequence-profile`, and the new state-map
`owner` field the authoritative selectors.

### Build/test guard replacement

- Remove `protectedRunThroughHash` and the assertion that the source must never
  change.
- Add `run-through.html: neutral` to `pageThemeByFile`.
- Add the shared-system image to `brandImageByPage` and
  `pageBrandMetadata` for this route.
- Replace the build error for run-through brand metadata with checks for the
  correct neutral favicon, shared social card, and canonical assets.
- Add smoke checks that reject the obsolete orange Omen and dark DemoThemis
  palette blocks.
- Assert that Omen, DemoThemis, protocol, and handoff surfaces expose explicit
  ownership data.
- Add `assets/run-through.css` to the public build and link validation.
- Regenerate `DemoThemisMVP/web/public/run-through.html` through
  `tools/prepare-unified-site.js`; never patch it by hand.
- Update `BRANDING_REDESIGN_PLAN.md` so its old exclusion is recorded as
  superseded by this dedicated pass.

### Reliable visual-audit tooling

Make `tools/audit-run-through-layout.js` runnable from a clean checkout by
declaring its Playwright dependency and a documented command. Preserve its 11
viewport matrix and extend it to assert:

- all 34 simulator states render;
- no horizontal overflow;
- no interactive control leaves the viewport;
- the tutorial dock does not overlap the browser toolbar or active target;
- the current owner is correct for every state;
- no DemoThemis-owned frame resolves to a dark/black background;
- no Omen-owned application resolves to the old orange/cream palette.

## Implementation phases

### Phase 0 - Baseline and content locks

1. Capture initial, Event 01, Event 08, Event 09, Event 10, Event 12, both Event
   13 states, and the lifecycle map at 390 and 1440 pixels.
2. Record the hashes/normalized values of all canonical data arrays and visible
   text.
3. Make the layout audit runnable from the repository and confirm all 374 checks
   pass before edits.
4. Record the current build, smoke-test, and generated-copy results.

Exit condition: visual, data, text, and responsive baselines are reproducible.

### Phase 1 - CSS boundary and ownership model

1. Move inline CSS to `assets/run-through.css` as a visual no-op.
2. Add `data-page-brand="neutral"` and canonical metadata.
3. Stop using `data-product-mode` as a global theme switch.
4. Add active-owner derivation and state-map owner metadata.
5. Add smoke tests for the ownership matrix.

Exit condition: every state exposes the right owner while the old visuals still
render unchanged.

### Phase 2 - Shared shell and starting selector

1. Apply current navigation, hero, and neutral chapter styles.
2. Build the equal Omen and DemoThemis starting cards.
3. Add the single half-speed Rive placement and poster fallback.
4. Add complete pointer, keyboard, pressed, selected, disabled, reduced-motion,
   and forced-colors states.

Exit condition: the chapter looks current before the simulator starts and the
two products have equal, unmistakable visual weight.

### Phase 3 - OmenMarketMaker states

1. Replace orange/cream app tokens with black/green tokens.
2. Add the single moving grid layer to the app canvas.
3. Replace typed app titles with the static full wordmark plus accessible text.
4. Restyle controls, fields, tickets, order books, receipts, and Omen execution
   sequences.
5. Verify Events 01-08, the Event 06 automatic states, and the final Omen receipt.

Exit condition: every Omen state matches the current Omen chapter identity and
retains semantic state colors.

### Phase 4 - DemoThemis states

1. Replace dark court/app/protocol palettes with ivory/stone/cyan.
2. Add the full wordmark and tapered underline to the court app navigation.
3. Apply the cyan interaction hierarchy to tabs, buttons, fields, cards, and
   diagrams.
4. Verify Events 09-12 and the proof-relay portion of Event 13.
5. Prove that no DemoThemis-owned surface has a black or near-black background.

Exit condition: court and protocol screens visibly belong to the live MVP design
language.

### Phase 5 - Handoffs, tutorial, controls, and unlocks

1. Apply owner-aware outer controls and event navigation.
2. Build the two-way product handoff strip.
3. Replace floating black coachmarks with the in-frame tutorial dock.
4. Apply owner-aware target rims and transient result toasts.
5. Restyle feature and arbitration unlock panels.

Exit condition: the walkthrough feels continuous, no guidance covers the app,
and each action clearly belongs to the current product.

### Phase 6 - Lifecycle map

1. Add explicit owner data to every state.
2. Apply Omen, DemoThemis, and shared node treatments.
3. Rebuild route traces and route-control states.
4. Verify selected-state synchronization with the guided simulator.
5. Verify print and text-alternative output.

Exit condition: readers can follow the product boundary without relying on
color or opening state details.

### Phase 7 - Responsive, accessibility, motion, and performance QA

1. Re-run all 374 layout checks.
2. Review 320, 390, 768, 1024, and 1440 pixel visual snapshots.
3. Test keyboard-only navigation, 200% zoom, touch targets, reduced motion,
   forced colors, and print.
4. Verify contrast for every idle, hover, selected, disabled, and status state.
5. Verify Rive pause/fallback and seamless grid motion.
6. Confirm the tutorial dock never obscures its target.

Exit condition: all states remain usable and ownership remains clear in every
supported mode.

### Phase 8 - Build and generated integration

1. Run the static build, smoke tests, layout audit, and court-model validation.
2. Regenerate the unified public copy.
3. Run Next lint and production build.
4. Compare canonical and generated run-through outputs.
5. Perform final text/data diffs against the Phase 0 baseline.

Exit condition: source, generated output, metadata, and production builds all
prove the same completed redesign.

## Verification matrix

| Requirement | Evidence |
| --- | --- |
| Static publication | `node tools/build-site.js` passes and emits `assets/run-through.css` |
| Site regression | `node tools/smoke-site.js` passes with positive run-through brand checks |
| Simulator layout | `node tools/audit-run-through-layout.js` passes 374 state/viewport checks |
| Court/model invariants | `node tools/validate-gamelab.js` passes |
| Unified public copy | `node tools/prepare-unified-site.js` regenerates the public file from root source |
| Next integration | lint and production build pass in `DemoThemisMVP/web` |
| Content preservation | normalized visible text and canonical data hashes match the baseline |
| State preservation | 13 events, 34 states, and five automatic transitions remain |
| Ownership | every state reports the expected Omen, DemoThemis, or shared owner |
| DemoThemis palette | computed backgrounds prove no DT-owned surface is black/near-black |
| Omen palette | computed styles prove Omen app surfaces are near-black/green, not orange/cream |
| Guidance | screenshots and geometry prove the tutorial dock does not cover targets |
| Accessibility | keyboard, focus, 200% zoom, touch, forced colors, reduced motion, and print pass |
| Motion fallback | Omen poster works with Rive blocked and all motion stops under reduced motion |
| Metadata | route has correct favicon, theme color, shared social image, and large-card metadata |

## Acceptance criteria

The redesign is complete only when all of the following are true:

- The page uses the current navigation and neutral chapter shell.
- The starting cards are equal in size and clearly independent.
- The Omen card uses near-black, green, a whole-card mesh, and the full logo.
- The DemoThemis card uses ivory, the full logo, and the tapered cyan underline.
- Baked button-state PNGs are not used as the functional controls.
- Selecting Event 07 does not recolor Omen Events 07-08 as DemoThemis.
- Every active state is themed from its actual owner.
- Omen app and execution screens contain no old orange/cream brand palette.
- DemoThemis app and protocol screens contain no black or near-black brand
  background.
- DemoThemis interaction glows use equal strokes or tapered underlines, never
  unequal drop shadows.
- Tutorial guidance happens inside the frame and never covers the active target.
- Product handoffs are visually directional and do not imply shared governance.
- The lifecycle map shows Omen, DemoThemis, and shared ownership without relying
  on color alone.
- Semantic YES/NO, success, warning, pending, and error colors remain intact.
- All 13 events, 34 states, five automatic steps, and existing actions remain.
- The 374 responsive layout checks pass.
- Reduced motion, keyboard focus, forced colors, print, and 200% zoom pass.
- Static and Next production builds pass.
- No article wording, mechanism data, fee value, anchor, or route changed.
- Generated public output comes only from the canonical source.

## Recommended implementation commits

1. `refactor: extract run-through styles and add ownership metadata`
2. `brand: update run-through shell and starting selector`
3. `brand: apply OmenMarketMaker simulator identity`
4. `brand: apply DemoThemis simulator identity`
5. `ux: integrate handoffs tutorial controls and unlock states`
6. `brand: map lifecycle ownership and route states`
7. `test: replace run-through exclusion guards with redesign coverage`
8. `build: publish branded run-through metadata and generated output`

Do not mix copy edits, mechanism changes, or new simulator steps into these
commits.
