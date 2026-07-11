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
  assert(/Run through the whole system/i.test(runThrough), "run-through chapter missing new title", failures);
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
