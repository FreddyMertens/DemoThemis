const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://demothemis.netlify.app").replace(/\/+$/, "");

const publicHtml = [
  "index.html",
  "demothemis.html",
  "game-theory.html",
  "prediction-market.html",
  "the-design.html",
  "hybrid-juror-prediction-market-integration.html",
  "governance.html",
  "mvp.html"
];

const forbiddenPublicPaths = [
  "/glossary",
  "/glossary.html",
  "/SKILL.md",
  "/review.md",
  "/toupdate.md",
  "/game-theory-qa.html",
  "/game-theory-qa-filled-kimi.html",
  "/game-theory-audit.html",
  "/breaking-the-court.html",
  "/hardening-the-court.html",
  "/finishing-the-court.html",
  "/rebuilding-the-court.html",
  "/juror-exam-downsides.html",
  "/juror-reputation-system.html",
  "/victim-compensation.html",
  "/rewrite.js",
  "/tools/validate-gamelab.js",
  "/wordcount.py"
];

function toPublicPath(file) {
  return file === "index.html" ? "/" : `/${file.replace(/\.html$/i, "")}`;
}

function readDist(file) {
  return fs.readFileSync(path.join(outDir, file), "utf8");
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (file.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function resolveRequest(rawPath) {
  const urlPath = decodeURIComponent(rawPath.split("?")[0].split("#")[0]);
  let rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  rel = rel.endsWith("/") ? `${rel}index.html` : rel;
  let target = path.normalize(path.join(outDir, rel));
  const prettyTarget = path.normalize(path.join(outDir, `${rel}.html`));
  if (!path.extname(rel) && fs.existsSync(prettyTarget)) target = prettyTarget;
  const inside = path.relative(outDir, target);
  if (inside.startsWith("..") || path.isAbsolute(inside)) return null;
  return target;
}

function createServer() {
  return http.createServer((req, res) => {
    const target = resolveRequest(req.url || "/");
    const exists = target && fs.existsSync(target) && fs.statSync(target).isFile();
    const file = exists ? target : path.join(outDir, "404.html");
    const status = exists ? 200 : 404;
    res.writeHead(status, {
      "content-type": contentType(file),
      "x-smoke-static": "true"
    });
    res.end(fs.readFileSync(file));
  });
}

function request(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, path: pathname, method: "GET" }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function checkDistFiles(failures) {
  assert(fs.existsSync(outDir), "dist directory is missing; run node tools/build-site.js first", failures);
  for (const file of publicHtml) {
    assert(fs.existsSync(path.join(outDir, file)), `missing built public page: ${file}`, failures);
  }
  for (const file of ["_headers", "_redirects", "robots.txt", "sitemap.xml", "404.html", "assets/styles.css", "assets/common.js"]) {
    assert(fs.existsSync(path.join(outDir, file)), `missing built support file: ${file}`, failures);
  }
}

function checkHeaders(failures) {
  const headers = readDist("_headers");
  assert(/Content-Security-Policy:/i.test(headers), "_headers missing Content-Security-Policy", failures);
  assert(/frame-ancestors 'none'/i.test(headers), "CSP missing frame-ancestors 'none'", failures);
  assert(/X-Content-Type-Options: nosniff/i.test(headers), "_headers missing nosniff", failures);
  assert(/Referrer-Policy: strict-origin-when-cross-origin/i.test(headers), "_headers missing Referrer-Policy", failures);
  assert(!/unpkg\.com/i.test(headers), "_headers should not allow unpkg.com", failures);
}

function checkMetadata(file, html, failures) {
  const expectedUrl = file === "index.html" ? `${siteUrl}/` : `${siteUrl}/${file.replace(/\.html$/i, "")}`;
  assert(/<title>[^<]+<\/title>/i.test(html), `${file} missing title`, failures);
  assert(/<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html), `${file} missing description`, failures);
  assert(new RegExp(`<link\\s+[^>]*rel=["']canonical["'][^>]*href=["']${expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(html), `${file} missing expected canonical ${expectedUrl}`, failures);
  assert(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["'][^"']+["']/i.test(html), `${file} missing og:title`, failures);
  assert(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["'][^"']+["']/i.test(html), `${file} missing og:description`, failures);
  assert(/<meta\s+[^>]*name=["']twitter:card["'][^>]*content=["']summary["']/i.test(html), `${file} missing twitter:card`, failures);
}

function openingTags(html, tag) {
  const tagPattern = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  return Array.from(html.matchAll(tagPattern), (match) => match[0]);
}

function tagAttributeValue(tagHtml, attribute) {
  const attributePattern = new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const match = tagHtml.match(attributePattern);
  return match ? match[2] : null;
}

function openingTagAttributeValues(html, tag, attribute) {
  return openingTags(html, tag).map((tagHtml) => tagAttributeValue(tagHtml, attribute)).filter(Boolean);
}

function checkMvpNavigation(file, html, failures) {
  const siteNav = html.match(/<nav\b[^>]*class=["'][^"']*\bsitenav\b[^"']*["'][^>]*>[\s\S]*?<\/nav>/i);
  assert(Boolean(siteNav), `${file} missing primary site navigation`, failures);
  if (!siteNav) return;

  const navTargets = openingTagAttributeValues(siteNav[0], "a", "href");
  assert(navTargets.includes("/"), `${file} primary navigation missing root-relative Home link`, failures);
  assert(navTargets.includes("mvp.html"), `${file} primary navigation missing mvp.html`, failures);
}

function checkProposalHomeLinks(file, html, failures) {
  const baseUrl = new URL(`/${file}`, `${siteUrl}/`);
  const expectedOrigin = new URL(siteUrl).origin;
  const obsoleteTargets = openingTagAttributeValues(html, "a", "href").filter((target) => {
    try {
      const targetUrl = new URL(target, baseUrl);
      return targetUrl.origin === expectedOrigin && /\/index\.html$/i.test(targetUrl.pathname);
    } catch (error) {
      return false;
    }
  });
  assert(
    obsoleteTargets.length === 0,
    `${file} contains obsolete same-site index.html link(s); proposal Home links must target /`,
    failures
  );
}

function checkMvpPage(html, failures) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const descriptionTag = openingTags(html, "meta").find((tagHtml) => (tagAttributeValue(tagHtml, "name") || "").toLowerCase() === "description");
  const title = titleMatch ? titleMatch[1] : "";
  const description = descriptionTag ? tagAttributeValue(descriptionTag, "content") || "" : "";

  assert(/\bMVP\b/i.test(title) && /DemoThemis/i.test(title), "mvp.html title should identify the DemoThemis MVP", failures);
  assert(/\b(?:MVP|prototype)\b/i.test(description) && /\b(?:live|sandbox|on[- ]?chain)\b/i.test(description), "mvp.html description should explain the live MVP experience", failures);

  const linkTargets = openingTagAttributeValues(html, "a", "href");
  for (const route of ["/app", "/sandbox", "/home", "/about"]) {
    const expected = siteUrl + route;
    const hasRoute = linkTargets.some((target) => {
      try {
        const targetUrl = new URL(target, `${siteUrl}/mvp.html`);
        return targetUrl.origin === new URL(siteUrl).origin && targetUrl.pathname.replace(/\/+$/, "") === route;
      } catch (error) {
        return false;
      }
    });
    assert(hasRoute, `mvp.html missing same-site MVP link: ${expected}`, failures);
  }

  assert(/\bsimulat(?:e|ed|es|ion|or)\b/i.test(html), "mvp.html should label the simulated experience", failures);
  assert(/\bon[- ]?chain\b/i.test(html), "mvp.html should distinguish the on-chain experience", failures);
}

function checkStateMachineData(html, failures) {
  const inlineScripts = Array.from(html.matchAll(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1]);
  assert(inlineScripts.length > 0, "run-through has no inline script to parse", failures);
  for (const [index, script] of inlineScripts.entries()) {
    try {
      new vm.Script(script, { filename: "the-design.inline-" + (index + 1) + ".js" });
    } catch (error) {
      failures.push("run-through inline script " + (index + 1) + " has invalid JavaScript: " + error.message);
    }
  }

  const start = html.indexOf("var SYSTEM_PHASES =");
  const end = html.indexOf("var MACHINE_ROUTE_COPY =");
  assert(start >= 0 && end > start, "run-through state-machine data block is missing or malformed", failures);
  if (start < 0 || end <= start) return;

  let data;
  try {
    const context = {};
    const source = html.slice(start, end) + "\nthis.__machineData = { phases: SYSTEM_PHASES, states: SYSTEM_STATES, exceptions: SYSTEM_EXCEPTIONS, transitions: SYSTEM_TRANSITIONS };";
    vm.runInNewContext(source, context, { filename: "the-design.state-machine-data.js" });
    data = context.__machineData;
  } catch (error) {
    failures.push("run-through state-machine data cannot be evaluated: " + error.message);
    return;
  }

  const phaseIds = new Set(data.phases.map((phase) => phase.id));
  const allStates = data.states.concat(data.exceptions);
  const ids = allStates.map((state) => state.id);
  const idSet = new Set(ids);
  assert(data.phases.length === 4 && phaseIds.size === 4, "state machine should have four unique lifecycle phases", failures);
  assert(idSet.size === ids.length, "state machine contains duplicate state IDs", failures);
  assert(data.states.every((state) => phaseIds.has(state.phase)), "state machine contains a lifecycle state with an invalid phase", failures);

  const allowedRoutes = new Set(["quiet", "dispute", "exceptions"]);
  assert(allStates.every((state) => (state.routes || []).every((route) => allowedRoutes.has(route))), "state machine contains an unknown route tag", failures);
  const mappedStages = Array.from(new Set(data.states.flatMap((state) => state.sim || []))).sort((a, b) => a - b);
  assert(JSON.stringify(mappedStages) === JSON.stringify(Array.from({ length: 13 }, (_, index) => index)), "state machine must map every simulator event from 0 through 12", failures);

  const transitionKinds = new Set(["forward", "branch", "skip", "merge", "loop", "parallel", "exception"]);
  assert(data.transitions.length >= 40, "state machine transition model is unexpectedly incomplete", failures);
  assert(data.transitions.every((edge) => idSet.has(edge.from) && idSet.has(edge.to)), "state machine has a transition with an unknown endpoint", failures);
  assert(data.transitions.every((edge) => edge.from !== edge.to && transitionKinds.has(edge.kind) && edge.when), "state machine has an invalid transition shape", failures);

  function hasEdge(from, to, kind) {
    return data.transitions.some((edge) => edge.from === from && edge.to === to && (!kind || edge.kind === kind));
  }
  assert(hasEdge("private-room", "event-close", "skip"), "private rooms must bypass public graduation", failures);
  assert(hasEdge("pooled-claims", "event-close", "skip"), "pooled claims must bypass the optional parlay", failures);
  assert(hasEdge("quiet-result", "release-rule", "merge"), "quiet settlement must bypass court and merge at release", failures);
  assert(hasEdge("larger-panel", "panel-drawn", "loop"), "a funded appeal must loop to a fresh panel draw", failures);
  assert(hasEdge("juror-unavailable", "court-exception", "exception"), "an exhausted standby list must reach court recovery", failures);
  assert(hasEdge("robustness-gate", "settlement-exception", "exception"), "tokenization accounting failure must reach accounting recovery", failures);
  assert(hasEdge("curation-gate", "record-only", "branch") && hasEdge("curation-gate", "quality-update", "branch"), "curation must branch between record-only and juror learning", failures);
  assert(hasEdge("closed-record", "collusion-clock", "parallel") && hasEdge("closed-record", "bootstrap-loop", "parallel"), "post-finality accountability and growth must run in parallel", failures);

  function routeReaches(route, startId, targetId) {
    const allowed = new Set(allStates.filter((state) => (state.routes || []).includes(route)).map((state) => state.id));
    const queue = [startId];
    const seen = new Set(queue);
    while (queue.length) {
      const current = queue.shift();
      if (current === targetId) return true;
      for (const edge of data.transitions) {
        if (edge.from !== current || !allowed.has(edge.to) || seen.has(edge.to)) continue;
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
    return false;
  }
  assert(routeReaches("quiet", "rules-fixed", "closed-record"), "quiet route is not continuous from question to closed record", failures);
  assert(routeReaches("dispute", "rules-fixed", "closed-record"), "disputed route is not continuous from question through court to closed record", failures);
  assert(data.exceptions.every((state) => data.transitions.some((edge) => edge.to === state.id)), "every exception state should have an incoming transition", failures);
  assert(/function\s+initSystemStateMachine\s*\(/.test(html) && /initSystemStateMachine\s*\(\s*\)\s*;/.test(html), "state machine initialization is missing", failures);
}

function checkProductModeData(html, failures) {
  const start = html.indexOf("var PRODUCT_MODES =");
  const end = html.indexOf("var stage =", start);
  assert(start >= 0 && end > start, "run-through product-mode data block is missing or malformed", failures);
  if (start < 0 || end <= start) return;

  try {
    const context = {};
    const source = html.slice(start, end) + "\nthis.__productModes = PRODUCT_MODES;";
    vm.runInNewContext(source, context, { filename: "the-design.product-modes.js" });
    const modes = context.__productModes;
    assert(modes.momo && modes.momo.start === 0, "PredictionMoMo tab must start at Event 01", failures);
    assert(modes.themis && modes.themis.start === 6, "DemoThemis tab must start at Event 07", failures);
    assert(modes.momo.label === "PredictionMoMo" && modes.themis.label === "DemoThemis", "product-mode labels are incorrect", failures);
  } catch (error) {
    failures.push("run-through product-mode data cannot be evaluated: " + error.message);
  }
}

function checkProductStageGroups(html, failures) {
  const start = html.indexOf("var STAGE_GROUPS =");
  const end = html.indexOf("var PRODUCT_MODES =", start);
  assert(start >= 0 && end > start, "run-through stage-group data block is missing or malformed", failures);
  if (start < 0 || end <= start) return;

  try {
    const context = {};
    const source = html.slice(start, end) + "\nthis.__stageGroups = STAGE_GROUPS;";
    vm.runInNewContext(source, context, { filename: "the-design.stage-groups.js" });
    const groups = context.__stageGroups;
    const momo = groups.filter((group) => group.mode === "momo");
    const themis = groups.filter((group) => group.mode === "themis");
    assert(momo.length === 2 && momo[0].start === 0 && momo[momo.length - 1].end === 5, "PredictionMoMo navigator must contain only Events 01-06", failures);
    assert(themis.length === 3 && themis[0].start === 6 && themis[themis.length - 1].end === 12, "DemoThemis navigator must contain only Events 07-13", failures);
    assert(groups.every((group) => group.mode === "momo" || group.mode === "themis"), "every event group must belong to a product mode", failures);
    assert(!/visibleGroups[\s\S]{0,240}\.filter\s*\(/.test(html), "event navigator must show every product's groups together", failures);
    assert(/groupEl\.setAttribute\(["']data-stage-mode["'],\s*group\.mode\)/.test(html), "event groups must retain their individual product themes", failures);
    assert(/steps\.setAttribute\(["']data-stage-mode["'],\s*drawerGroup\.mode\)/.test(html), "expanded event lists must retain their individual product themes", failures);
  } catch (error) {
    failures.push("run-through stage-group data cannot be evaluated: " + error.message);
  }
}

function checkCompactAppViews(html, failures) {
  const start = html.indexOf("var APP_PAGES =");
  const end = html.indexOf("var CONTROL_COACH_COPY =", start);
  assert(start >= 0 && end > start, "run-through app-view data block is missing or malformed", failures);
  if (start < 0 || end <= start) return;

  let pages;
  let flows;
  try {
    const context = {};
    const source = html.slice(start, end) + "\nthis.__appViews = { pages: APP_PAGES, flows: APP_FLOWS };";
    vm.runInNewContext(source, context, { filename: "the-design.app-views.js" });
    pages = context.__appViews.pages;
    flows = context.__appViews.flows;
  } catch (error) {
    failures.push("run-through app-view data cannot be evaluated: " + error.message);
    return;
  }

  assert(pages.length === 13 && flows.length === 13, "app simulator must define all 13 event views and flows", failures);

  function mergePage(base, patch) {
    return Object.assign({}, base || {}, patch || {});
  }

  const snapshots = [];
  pages.forEach((basePage, eventIndex) => {
    const flow = flows[eventIndex] || { steps: [] };
    snapshots.push({ event: eventIndex + 1, state: "base", page: basePage });
    let current = mergePage(basePage, flow.start);
    snapshots.push({ event: eventIndex + 1, state: "start", page: current, targetTitle: flow.steps && flow.steps[0] && flow.steps[0].targetTitle });

    (flow.steps || []).forEach((step, stepIndex) => {
      if (step.target === "block") {
        const targetExists = (current.blocks || []).some((block) => block.title === step.targetTitle);
        assert(targetExists, `Event ${eventIndex + 1} step ${stepIndex + 1} is missing current target block: ${step.targetTitle}`, failures);
      }
      current = mergePage(current, step.after);
      const nextStep = flow.steps && flow.steps[stepIndex + 1];
      snapshots.push({ event: eventIndex + 1, state: `after-${stepIndex + 1}`, page: current, targetTitle: nextStep && nextStep.targetTitle });
    });
  });

  for (const snapshot of snapshots) {
    const label = `Event ${snapshot.event} ${snapshot.state}`;
    const blocks = snapshot.page.blocks || [];
    assert(blocks.length <= 3, `${label} exceeds the compact three-block app-view ceiling`, failures);
    assert(!blocks.some((block) => /preview/i.test(block.title || "")), `${label} contains a future preview block`, failures);
    assert(!(snapshot.page.kpis || []).some((kpi) => /^next(?:\s|$)/i.test(kpi[0] || "")), `${label} contains a forward-looking KPI`, failures);
  }

  const layoutStart = html.indexOf("var LIVE_BLOCK_LAYOUT_WEIGHTS =");
  const layoutEnd = html.indexOf("function renderLiveBlock", layoutStart);
  assert(layoutStart >= 0 && layoutEnd > layoutStart, "content-aware app layout functions are missing", failures);
  if (layoutStart >= 0 && layoutEnd > layoutStart) {
    const layoutContext = { currentTargetTitle: null };
    layoutContext.blockIsCurrentTarget = (block) => block.title === layoutContext.currentTargetTitle;
    layoutContext.blockIsContinuationTarget = () => false;
    try {
      const layoutSource = html.slice(layoutStart, layoutEnd) + "\nthis.__layout = { weights: LIVE_BLOCK_LAYOUT_WEIGHTS, plan: liveBlockSpanPlan };";
      vm.runInNewContext(layoutSource, layoutContext, { filename: "the-design.app-layout.js" });
      const knownTypes = new Set();

      for (const snapshot of snapshots) {
        const blocks = snapshot.page.blocks || [];
        if (!blocks.length) continue;
        blocks.forEach((block) => knownTypes.add(block.type));
        layoutContext.currentTargetTitle = snapshot.targetTitle || null;
        const spans = Array.from(layoutContext.__layout.plan(blocks));
        const minimum = blocks.length === 1 ? 12 : blocks.length === 2 ? 5 : 3;
        const maximum = blocks.length === 1 ? 12 : blocks.length === 2 ? 7 : 6;
        const label = `Event ${snapshot.event} ${snapshot.state}`;
        assert(spans.length === blocks.length, `${label} layout plan does not cover every block`, failures);
        assert(spans.reduce((sum, span) => sum + span, 0) === 12, `${label} layout plan leaves horizontal grid space unused`, failures);
        assert(spans.every((span) => span >= minimum && span <= maximum), `${label} layout plan creates an unreadable card width`, failures);

        if (snapshot.targetTitle) {
          const targetIndex = blocks.findIndex((block) => block.title === snapshot.targetTitle);
          layoutContext.currentTargetTitle = null;
          const neutralSpans = Array.from(layoutContext.__layout.plan(blocks));
          assert(targetIndex < 0 || spans[targetIndex] >= neutralSpans[targetIndex], `${label} makes the current-action card smaller`, failures);
        }
      }

      for (const type of knownTypes) {
        assert(Object.prototype.hasOwnProperty.call(layoutContext.__layout.weights, type), `app layout has no density weight for block type: ${type}`, failures);
      }
    } catch (error) {
      failures.push("content-aware app layout cannot be evaluated: " + error.message);
    }
  }

  const eventOne = pages[0];
  const marketForm = (eventOne.blocks || []).find((block) => block.title === "Market form");
  const startingPosition = (eventOne.blocks || []).find((block) => block.title === "Starting position");
  assert(marketForm && !(marketForm.rows || []).some((row) => /^category$/i.test(row[0])), "Event 01 market form must omit demo-only category metadata", failures);
  const resolveCondition = marketForm && (marketForm.rows || []).find((row) => /^resolve condition$/i.test(row[0]));
  assert(marketForm && marketForm.editable && resolveCondition && resolveCondition[2] === "textarea", "Event 01 must provide an editable resolve-condition textarea", failures);
  const openingOffers = startingPosition && startingPosition.offers || [];
  assert(startingPosition && startingPosition.type === "liquidity" && openingOffers.some((offer) => offer[0] === "YES" && offer[1] === "yes") && openingOffers.some((offer) => offer[0] === "NO" && offer[1] === "no"), "Event 01 must provide independent YES and NO opening-liquidity controls", failures);
  assert(!(startingPosition && startingPosition.options), "Event 01 must not embed the opening amount inside a side label", failures);
  assert(!eventOne.intent && (eventOne.kpis || []).length === 0, "Event 01 must open without explanatory or summary strips", failures);

  const privateDraftFields = snapshots
    .filter((snapshot) => snapshot.event === 5)
    .flatMap((snapshot) => (snapshot.page.blocks || []).filter((block) => block.type === "fields"));
  assert(privateDraftFields.length > 0 && privateDraftFields.every((block) => block.editable && (block.rows || []).some((row) => /^resolve condition$/i.test(row[0]) && row[2] === "textarea")), "private-room authoring states must expose the same editable resolve condition", failures);

  assert(!/function\s+renderIntentStrip\s*\(/.test(html), "app views must not render the removed Why/Money/Next strip", failures);
  assert(!/title\.appendChild\(makeEl\("span",\s*"",\s*blockTypeLabel\(type\)\)\)/.test(html), "app cards must not repeat internal block-type labels", failures);
  assert(!/headActions\.appendChild\(makeEl\("div",\s*"app-nav-chip",\s*chrome\.context\)\)/.test(html), "app header must not duplicate navigation context", failures);
  assert(/function\s+compactPageKpis\s*\(/.test(html), "app KPI rendering must remove values already visible in the current blocks", failures);
  assert(/var\s+marketLiquidityDraft\s*=\s*\{\s*yes:\s*\.1,\s*no:\s*0\s*\}/.test(html), "Event 01 opening-liquidity draft state is missing", failures);
  assert(/function\s+applyOpeningLiquidityDraft\s*\(/.test(html) && /block\.title\s*===\s*"Opening odds"/.test(html), "published opening odds must derive from the entered liquidity", failures);
  assert(/function\s+applyResolveConditionDraft\s*\(/.test(html) && /block\.title\s*===\s*"Market page"[^\n]*marketResolveConditionDraft/.test(html), "the written market resolve condition must persist onto the published page", failures);
  assert(/block\.title\s*===\s*"Locked terms"[^\n]*privateResolveConditionDraft/.test(html), "the private-room resolve condition must persist when terms lock", failures);
  assert(/document\.createElement\(controlType\s*===\s*"textarea"\s*\?\s*"textarea"\s*:\s*"input"\)/.test(html), "editable market forms must use native inputs and textareas", failures);
  assert(/amountInput\.type\s*=\s*"number"/.test(html) && /amountInput\.addEventListener\("input",\s*syncLiquidityOffer\)/.test(html), "opening-liquidity amounts must be editable native numeric controls", failures);
  assert(/liquidityPreview\.setAttribute\("aria-live",\s*"polite"\)/.test(html) && /Opening odds/.test(html) && /Opening escrow/.test(html), "opening-liquidity controls must expose live odds and escrow feedback", failures);
  assert(/grid-column:\s*span\s+var\(--live-span,\s*4\)/.test(html), "app cards must consume their content-aware grid spans", failures);
  assert(/main\.setAttribute\("data-block-count",\s*String\(blocks\.length\)\)/.test(html), "app view must expose its rendered block count", failures);
  assert(/live-main\.live-layout-1[\s\S]*?block-proof/.test(html), "single-state proof views must use a horizontal reading layout", failures);
  assert(/block-fields:is\(\.live-span-6,\s*\.live-span-7,\s*\.live-span-12\)/.test(html), "wide form views must distribute fields across available space", failures);
  assert(/\.product-demo\.sim-tight\s+\.live-main\.live-layout-1[\s\S]*?\.live-main\.live-layout-3[\s\S]*?grid-column:\s*1\s*\/\s*-1/.test(html), "compact odd-card layouts must fill their final row", failures);
  assert(/\.product-demo\.sim-tight\s+\.live-page:is\(\.page-create-market,\s*\.page-private-room\)[^}]*grid-column:\s*1\s*\/\s*-1/.test(html), "compact authoring forms must stack at a readable width", failures);
  assert(/\.check-item b\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*overflow-wrap:\s*normal[^}]*white-space:\s*nowrap/.test(html), "short checklist statuses must remain atomic", failures);
  assert(/\.face-check b\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*overflow-wrap:\s*normal[^}]*white-space:\s*nowrap/.test(html), "short presence statuses must remain atomic", failures);
  assert((html.match(/\.sim-app-viewport\s*\{[^}]*min-height:\s*0/g) || []).length >= 1, "app viewport must crop the old empty minimum height", failures);
  assert(/filter\(function\s*\(label\)\s*\{\s*return\s*!\/\^next\$\/i\.test\(label\);\s*\}\)/.test(html), "app navigation must suppress the redundant Next tab", failures);
  assert(!/makeEl\(["']button["'],\s*["']app-nav-action["']/.test(html), "app navigation must not duplicate each event's primary action", failures);
  assert(/makeEl\("span",\s*"",\s*"Total"\)/.test(html), "app ticket totals must use a concrete label instead of Preview", failures);
}

function checkProductFontAssets(html, failures) {
  const cssPath = "assets/fonts/product-app-fonts.css";
  const fontFiles = [
    "alegreya-sans-regular.ttf",
    "alegreya-sans-medium.ttf",
    "alegreya-sans-bold.ttf",
    "alegreya-sans-extrabold.ttf",
    "alegreya-sans-black.ttf",
    "literata-ui-variable.ttf",
    "noto-serif-tibetan-ui-variable.ttf",
    "noto-sans-symbols-2-ui.ttf"
  ];
  const licenseFiles = [
    "OFL-Alegreya-Sans.txt",
    "OFL-Literata.txt",
    "OFL-Noto-Serif-Tibetan.txt",
    "OFL-Noto-Sans-Symbols-2.txt"
  ];

  assert(/assets\/fonts\/product-app-fonts\.css/i.test(html), "run-through is missing its self-hosted product font stylesheet", failures);
  const builtCssPath = path.join(outDir, cssPath);
  assert(fs.existsSync(builtCssPath), "product font stylesheet was not copied to dist", failures);
  if (!fs.existsSync(builtCssPath)) return;

  const css = fs.readFileSync(builtCssPath, "utf8");
  for (const file of fontFiles) {
    const builtPath = path.join(outDir, "assets", "fonts", file);
    assert(fs.existsSync(builtPath) && fs.statSync(builtPath).size > 1000, `product font asset missing or empty: ${file}`, failures);
    assert(css.includes(file), `product font stylesheet does not reference ${file}`, failures);
  }
  for (const file of licenseFiles) {
    assert(fs.existsSync(path.join(outDir, "assets", "fonts", file)), `product font license missing: ${file}`, failures);
  }
  assert(/font-family:\s*["']Alegreya Sans App["']/i.test(css), "PredictionMoMo font face is missing", failures);
  assert(/font-family:\s*["']Literata App["']/i.test(css) && /font-weight:\s*200\s+900/i.test(css), "DemoThemis variable font range is missing", failures);
  assert(/font-family:\s*["']Noto Serif Tibetan App["']/i.test(css) && /unicode-range:\s*U\+0F00-0FFF/i.test(css), "Tibetan fallback range is missing", failures);
  assert(/font-family:\s*["']Noto Sans Symbols 2 App["']/i.test(css), "UI symbol fallback is missing", failures);
  assert((css.match(/size-adjust:\s*107%/gi) || []).length === 5 && /font-family:\s*["']Literata App["'][\s\S]*?size-adjust:\s*97%/i.test(css), "product fonts must share normalized optical sizing", failures);
  assert(/font-family:\s*["']Noto Sans Symbols 2 App["'][\s\S]*?size-adjust:\s*72%/i.test(css), "UI symbol fallback must match the product cap height", failures);
  assert(/font-family:\s*["']Noto Serif Tibetan App["'][\s\S]*?size-adjust:\s*95%/i.test(css), "Tibetan fallback must match the product cap height", failures);
  assert(/font-synthesis:\s*none/i.test(html) && /font-variant-numeric:\s*lining-nums\s+tabular-nums/i.test(html), "product typography must disable synthetic styles and use stable numeric widths", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.run-control-panel/i.test(html), "event transport controls must inherit product typography", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.sim-step-guide/i.test(html), "current event guide must inherit product typography", failures);
  assert(/\.product-mode-panel\[data-product-mode=["']momo["']\]\s+\.run-control-panel/i.test(html) && /\.product-mode-panel\[data-product-mode=["']themis["']\]\s+\.run-control-panel/i.test(html), "event transport controls must inherit each product palette", failures);
  assert(/\.product-mode-panel\[data-product-mode=["']momo["']\]\s+\.sim-step-guide/i.test(html) && /\.product-mode-panel\[data-product-mode=["']themis["']\]\s+\.sim-step-guide/i.test(html), "current event guide must inherit each product palette", failures);
  assert(/--product-text-caption:\s*\.7rem/i.test(html) && /--product-text-display:\s*1\.16rem/i.test(html) && /--product-text-figure:\s*1\.42rem/i.test(html), "product typography must use a shared semantic type scale", failures);
  assert(/--product-weight-control:\s*800/i.test(html) && /--product-weight-control:\s*650/i.test(html), "product typography must compensate weights per font family", failures);
  assert(/--product-leading-copy:\s*1\.4/i.test(html) && /--product-leading-copy:\s*1\.46/i.test(html), "product typography must compensate line spacing per font family", failures);
  assert(/\.sim-live-preview\s+:where\(\*\)\s*\{\s*letter-spacing:\s*0/i.test(html), "product typography must remove font-dependent tracking", failures);
  const normalizationMarker = html.indexOf("/* Optical type normalization");
  assert(normalizationMarker >= 0, "product typography normalization block is missing", failures);
  if (normalizationMarker >= 0) {
    const sourceCss = html.slice(0, normalizationMarker);
    const normalizationCss = html.slice(normalizationMarker);
    const uncoveredMicrocopy = [];
    for (const match of sourceCss.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      const selector = match[1].trim().replace(/\s+/g, " ");
      if (/\.machine-/.test(selector)) continue;
      if (!/(?:product-demo|app-|live-|sim-|tutorial|stage-|run-progress|event-|fake-|intent-|odds-|wallet-|participant|message|leg-|team-|countdown|beacon-|face-|evidence-|proof-|checkout)/.test(selector)) continue;
      const sizeMatch = match[2].match(/font-size:\s*([0-9.]+)rem/);
      if (!sizeMatch || Number(sizeMatch[1]) >= 0.7 || /::(?:before|after)/.test(selector)) continue;
      const classes = Array.from(selector.matchAll(/\.([a-zA-Z0-9_-]+)/g), (item) => item[1]).filter((name) => !/^sim-(?:tight|ultra|compact)$/.test(name));
      if (!classes.some((name) => normalizationCss.includes("." + name))) uncoveredMicrocopy.push(selector);
    }
    assert(uncoveredMicrocopy.length === 0, "product typography leaves sub-caption text unnormalized: " + uncoveredMicrocopy.join(", "), failures);
  }
  assert(/--bg:\s*#f3e2c8/i.test(html) && /--surface:\s*#fcefd9/i.test(html) && /--accent:\s*#ae510f/i.test(html) && /--accent-ink:\s*#725000/i.test(html), "PredictionMoMo must use the amber parchment reading palette", failures);
  assert(!/#b83c32|#f7f2e8|#fffdf8/i.test(html), "PredictionMoMo must not retain the red or near-white palette", failures);
}

function checkBuiltHtml(failures) {
  for (const file of publicHtml) {
    const html = readDist(file);
    checkMetadata(file, html, failures);
    checkMvpNavigation(file, html, failures);
    checkProposalHomeLinks(file, html, failures);
    assert(!/unpkg\.com/i.test(html), `${file} should not load unpkg.com`, failures);
    assert(/assets\/styles\.css/i.test(html), `${file} missing shared stylesheet`, failures);
  }

  checkProposalHomeLinks("404.html", readDist("404.html"), failures);

  checkMvpPage(readDist("mvp.html"), failures);

  const gameLab = readDist("game-theory.html");
  assert(/Break the court/i.test(gameLab), "game-theory chapter missing Break the court title", failures);
  assert(/assets\/vendor\/popper-2\.11\.8\.min\.js/i.test(gameLab), "gamelab missing vendored Popper", failures);
  assert(/assets\/vendor\/tippy-6\.3\.7\.umd\.min\.js/i.test(gameLab), "gamelab missing vendored Tippy", failures);
  assert(/role=["']tablist["']/i.test(gameLab), "gamelab missing tablist role", failures);
  assert(/data-attack=["']bloc["']/i.test(gameLab), "gamelab missing coordinated attack card", failures);

  const demoThemis = readDist("demothemis.html");
  assert(/DemoThemis: the simple version and the full mechanics/i.test(demoThemis), "DemoThemis chapter missing combined title", failures);
  assert(/id=["']simple-version["']/i.test(demoThemis), "DemoThemis chapter missing simple version", failures);
  assert(/id=["']deep-dive["']/i.test(demoThemis), "DemoThemis chapter missing deep dive section", failures);
  assert(/id=["']F1f["']/i.test(demoThemis), "DemoThemis chapter missing live reserve widget", failures);
  assert(/id=["']g3grid["']/i.test(demoThemis), "DemoThemis chapter missing sealed-die widget", failures);
  assert(/id=["']R4seg["']/i.test(demoThemis), "DemoThemis chapter missing private-ballot widget", failures);
  assert(/id=["']mppanels["']/i.test(demoThemis), "DemoThemis chapter missing parallel-panel widget", failures);
  assert(/id=["']cgAcc["']/i.test(demoThemis), "DemoThemis chapter missing confidence-gate widget", failures);
  assert(/id=["']RT1seg["']/i.test(demoThemis), "DemoThemis chapter missing case-router widget", failures);
  assert(/id=["']abStake["']/i.test(demoThemis), "DemoThemis chapter missing appeal-bond widget", failures);
  assert(/class=["'][^"']*vhub/i.test(demoThemis), "DemoThemis chapter missing shared-arbiter diagram", failures);

  const runThrough = readDist("the-design.html");
  checkStateMachineData(runThrough, failures);
  checkProductModeData(runThrough, failures);
  checkProductStageGroups(runThrough, failures);
  checkCompactAppViews(runThrough, failures);
  checkProductFontAssets(runThrough, failures);
  assert(/End-to-end resolution run-through/i.test(runThrough), "run-through chapter missing neutral title", failures);
  assert(/id=["']productTabMomo["']/i.test(runThrough), "run-through missing PredictionMoMo parent tab", failures);
  assert(/id=["']productTabThemis["']/i.test(runThrough), "run-through missing DemoThemis parent tab", failures);
  assert(/id=["']productModePanel["'][^>]*role=["']tabpanel["']/i.test(runThrough), "run-through product switch is missing its tabpanel", failures);
  assert(/id=["']productTabMomo["'][^>]*aria-selected=["']false["']/i.test(runThrough) && /id=["']productTabThemis["'][^>]*aria-selected=["']false["']/i.test(runThrough), "run-through must start without a preselected product", failures);
  assert(/id=["']productModePanel["'][^>]*\shidden(?:\s|>)/i.test(runThrough), "event workflow must stay hidden until a product is selected", failures);
  assert(/var\s+productModeSelected\s*=\s*false/i.test(runThrough) && /productModePanel\.hidden\s*=\s*false/i.test(runThrough), "product selection must reveal the event workflow", failures);
  assert(/class=["'][^"']*product-mode-nav[^"']*is-awaiting-selection/i.test(runThrough), "initial product chooser must receive center-stage styling", failures);
  assert(/productModeNav\.classList\.remove\(["']is-awaiting-selection["']\)/i.test(runThrough), "product chooser must compact after selection", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab/i.test(runThrough) && /\.product-tab:hover/i.test(runThrough), "product choices must expose strong interactive affordances", failures);
  assert(/background:\s*color-mix\(in srgb,\s*var\(--choice-soft\)/i.test(runThrough) && /border:\s*1px solid color-mix\(in srgb,\s*var\(--choice-accent\)/i.test(runThrough), "product choices must carry restrained brand color", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab\s*\{[^}]*background:\s*var\(--choice-accent\)/i.test(runThrough), "initial product choices must use solid button backgrounds", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab:active/i.test(runThrough) && /\.product-mode-nav\.is-awaiting-selection\s+\.product-tab-event\s*\{\s*display:\s*inline-flex/i.test(runThrough), "initial product choices must keep pressed and start affordances at small widths", failures);
  assert(/function\s+selectProductMode\s*\(/.test(runThrough), "run-through product tabs are not wired to simulation state", failures);
  assert(/\.product-mode-panel\[data-product-mode=["']momo["']\]\s+\.sim-live-preview/i.test(runThrough), "PredictionMoMo theme must be scoped to the app preview", failures);
  assert(/\.product-mode-panel\[data-product-mode=["']themis["']\]\s+\.sim-live-preview/i.test(runThrough), "DemoThemis theme must be scoped to the app preview", failures);
  assert(/data-product-mode=["']themis["'][^}]*color-scheme:\s*dark/i.test(runThrough), "DemoThemis event workflow must use dark native controls", failures);
  assert(/--bg:\s*#171c1f/i.test(runThrough) && /--surface:\s*#20272b/i.test(runThrough) && /--ink:\s*#f2efe5/i.test(runThrough), "DemoThemis dark surface palette is missing", failures);
  assert(/--accent:\s*#326c91/i.test(runThrough) && /--accent-ink:\s*#a9d5f2/i.test(runThrough), "DemoThemis must separate filled and text accent contrast", failures);
  assert(/data-product-mode=["']themis["']\]\s+\.simulator-island/i.test(runThrough), "DemoThemis dark theme must cover the full simulator workspace", failures);
  assert(!/--(?:bg|surface):\s*(?:#fffefa|#f3f5f2)/i.test(runThrough), "DemoThemis must not retain its light surfaces", failures);
  assert(!/entry\.group\.mode\s*===\s*mode/.test(runThrough), "event navigator must keep every product's event groups visible", failures);
  assert(/data-stage-mode=["']momo["']/i.test(runThrough) && /data-stage-mode=["']themis["']/i.test(runThrough), "event navigator must preserve distinct product group themes", failures);
  assert(/\.product-tab\[data-product-mode=["']momo["']\]\[aria-selected=["']true["']\]/i.test(runThrough), "PredictionMoMo selection must carry its functional accent", failures);
  assert(/\.product-tab\[data-product-mode=["']themis["']\]\[aria-selected=["']true["']\]/i.test(runThrough), "DemoThemis selection must carry its functional accent", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.event-navigator-toggle/i.test(runThrough), "event navigator interactions must inherit product typography", failures);
  assert(/\.sim-live-preview\s+\.app-tabs\s+span\.on/i.test(runThrough), "active app tabs must carry the selected product accent", failures);
  assert(!/--navigator-band|--app-band|\.event-nav-label::before|\.app-nav::before|conic-gradient|\.app-brand\s+\.dot/i.test(runThrough), "purely decorative product motifs should stay removed", failures);
  assert(!/sim-frame-label|sim-window-dots|sim-live-dot/i.test(runThrough), "duplicated simulator chrome should stay removed", failures);
  assert(!/<body[^>]*class=["'][^"']*product-(?:momo|themis)/i.test(runThrough), "product theme must not be applied to the page body", failures);
  assert(/<p\s+class=["']kicker["']>End-to-end run-through<\/p>/i.test(runThrough), "run-through masthead must stay product-neutral", failures);
  assert(/DemoThemis Intake/i.test(runThrough), "DemoThemis entry event is not branded as court intake", failures);
  assert(/id=["']stageRail["']/i.test(runThrough), "run-through chapter missing stage rail", failures);
  assert(/id=["']focusScene["']/i.test(runThrough), "run-through missing focused one-step scene", failures);
  assert(/id=["']productDemo["']/i.test(runThrough), "run-through missing product mock screen", failures);
  assert(/missionActions/i.test(runThrough), "run-through missing mock-app action buttons", failures);
  assert(/PRODUCT_SCREENS/i.test(runThrough), "run-through missing staged product screens", failures);
  assert(/action-effect/i.test(runThrough), "run-through missing inline interactive step feedback", failures);
  assert(/LUCIDE_ICONS/i.test(runThrough), "run-through missing vendored Lucide icon subset", failures);
  assert(!/id=["']runLanes["']/i.test(runThrough), "run-through should not expose the old multi-lane board", failures);
  assert(/data-feature=["']instant["']/i.test(runThrough), "run-through missing instant-market feature unlock", failures);
  assert(/data-feature=["']fixed["']/i.test(runThrough), "run-through missing fixed-odds feature unlock", failures);
  assert(/data-feature=["']tokens["']/i.test(runThrough), "run-through missing self-custody token feature unlock", failures);
  assert(/data-feature=["']private["']/i.test(runThrough), "run-through missing private-market feature unlock", failures);
  assert(/data-feature=["']trade["']/i.test(runThrough), "run-through missing dispute-trading feature unlock", failures);
  assert(/data-feature=["']parlay["']/i.test(runThrough), "run-through missing parlay feature unlock", failures);
  assert(/data-component=["']draw["']/i.test(runThrough), "run-through missing jury-draw component unlock", failures);
  assert(/data-component=["']ballot["']/i.test(runThrough), "run-through missing private-ballot component unlock", failures);
  assert(/data-component=["']appeal["']/i.test(runThrough), "run-through missing appeal-ladder component unlock", failures);
  assert(/id=["']system-state-machine["']/i.test(runThrough), "run-through missing complete state-machine section", failures);
  assert(/id=["']machinePhaseGrid["']/i.test(runThrough), "run-through state machine missing lifecycle phase map", failures);
  assert(/id=["']machineExceptionGrid["']/i.test(runThrough), "run-through state machine missing exception rail", failures);
  assert(/id=["']machineTextFlow["']/i.test(runThrough), "run-through state machine missing text alternative", failures);
  assert(/data-machine-route=["']quiet["']/i.test(runThrough), "run-through state machine missing quiet-settlement route", failures);
  assert(/data-machine-route=["']dispute["']/i.test(runThrough), "run-through state machine missing disputed-case route", failures);
  assert(/data-machine-route=["']exceptions["']/i.test(runThrough), "run-through state machine missing exception route", failures);
  assert(/SYSTEM_STATES/i.test(runThrough), "run-through state machine missing canonical lifecycle data", failures);
  assert(/SYSTEM_EXCEPTIONS/i.test(runThrough), "run-through state machine missing canonical exception data", failures);
  assert(/Pre-written rule still needed/i.test(runThrough), "run-through state machine must distinguish open protocol rules", failures);
  assert(runThrough.indexOf('id="system-state-machine"') > runThrough.indexOf('id="productDemo"'), "state machine should appear below the simulator", failures);
}

function checkRedirects(failures) {
  const redirects = readDist("_redirects");
  assert(/\/vision\s+\/demothemis\s+301/i.test(redirects), "_redirects missing vision redirect", failures);
  assert(/\/juror-court\s+\/demothemis\s+301/i.test(redirects), "_redirects missing court redirect", failures);
  assert(/\/hybrid-juror-system\s+\/demothemis\s+301/i.test(redirects), "_redirects missing hybrid-system redirect", failures);
}

async function checkHttpRoutes(port, failures) {
  for (const file of publicHtml) {
    const pretty = toPublicPath(file);
    const response = await request(port, pretty);
    assert(response.status === 200, `${pretty} returned ${response.status}`, failures);
    assert(/<html/i.test(response.body), `${pretty} did not return HTML`, failures);
  }
  for (const pathname of forbiddenPublicPaths) {
    const response = await request(port, pathname);
    assert(response.status === 404, `${pathname} should be 404, returned ${response.status}`, failures);
  }
  const missing = await request(port, "/definitely-not-a-page");
  assert(missing.status === 404, "missing page should return 404", failures);
  assert(/Page not found/i.test(missing.body), "404 response should serve the custom 404 page", failures);
}

async function main() {
  const failures = [];
  checkDistFiles(failures);
  if (failures.length) throw new Error(failures.join("\n"));

  checkHeaders(failures);
  checkRedirects(failures);
  checkBuiltHtml(failures);

  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    await checkHttpRoutes(port, failures);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  if (failures.length) {
    throw new Error(`Smoke test failed:\n${failures.join("\n")}`);
  }
  console.log(`Smoke test passed for ${publicHtml.length} public pages`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
