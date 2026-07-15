const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://demothemis.netlify.app").replace(/\/+$/, "");

const publicHtml = [
  "index.html",
  "the-design.html",
  "demothemis.html",
  "game-theory.html",
  "prediction-market.html",
  "hybrid-juror-prediction-market-integration.html",
  "governance.html",
  "mvp.html"
];

const chapterSequence = [
  { file: "the-design.html", title: "Run-through", navTitle: "Run-through", chapter: 1 },
  { file: "demothemis.html", title: "DemoThemis", navTitle: "DemoThemis", chapter: 2 },
  { file: "game-theory.html", title: "Break the court", navTitle: "Break the court", chapter: 3 },
  { file: "prediction-market.html", title: "PredictionMoMo", navTitle: "PredictionMoMo", chapter: 4 },
  { file: "hybrid-juror-prediction-market-integration.html", title: "The bootstrap loop", navTitle: "Bootstrap loop", chapter: 5 },
  { file: "governance.html", title: "Governance", navTitle: "Governance", chapter: 6 }
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

function normalizedHtmlText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&middot;/gi, "·")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function anchorSequence(block) {
  return Array.from(String(block || "").matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi), (match) => ({
    href: tagAttributeValue(`<a ${match[1]}>`, "href") || "",
    text: normalizedHtmlText(match[2]),
    body: match[2]
  }));
}

function classBlock(html, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<div\\b[^>]*class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, "i"));
  return match ? match[1] : "";
}

function checkChapterSequence(failures) {
  const expectedNav = chapterSequence.map((chapter) => ({
    href: chapter.file,
    text: `${String(chapter.chapter).padStart(2, "0")} ${chapter.navTitle}`
  }));
  const expectedFooter = chapterSequence.map((chapter) => ({
    href: chapter.file,
    text: `${chapter.chapter}. ${chapter.navTitle}`
  }));

  for (const file of publicHtml) {
    const html = readDist(file);
    const nav = anchorSequence(classBlock(html, "nav-links"))
      .filter((entry) => chapterSequence.some((chapter) => chapter.file === entry.href))
      .map(({ href, text }) => ({ href, text }));
    const footer = anchorSequence(classBlock(html, "sitemap-flat"))
      .filter((entry) => chapterSequence.some((chapter) => chapter.file === entry.href))
      .map(({ href, text }) => ({ href, text }));
    assert(JSON.stringify(nav) === JSON.stringify(expectedNav), `${file} primary chapter navigation is out of order`, failures);
    assert(JSON.stringify(footer) === JSON.stringify(expectedFooter), `${file} footer chapter navigation is out of order`, failures);
  }

  for (const chapter of chapterSequence) {
    const html = readDist(chapter.file);
    const counters = Array.from(html.matchAll(/Chapter\s+(\d+)\s+of\s+6/gi), (match) => Number(match[1]));
    assert(counters.length === 1 && counters[0] === chapter.chapter, `${chapter.file} must identify itself as Chapter ${chapter.chapter} of 6`, failures);
  }

  const home = readDist("index.html");
  const mapCards = anchorSequence(classBlock(home, "map-grid")).map((entry) => {
    const stage = entry.body.match(/class=["']stage["'][^>]*>\s*Chapter\s+(\d+)/i);
    const title = entry.body.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    return {
      href: entry.href,
      chapter: stage ? Number(stage[1]) : null,
      title: title ? normalizedHtmlText(title[1]) : ""
    };
  });
  const expectedCards = chapterSequence.map(({ file, chapter, title }) => ({ href: file, chapter, title }));
  assert(JSON.stringify(mapCards) === JSON.stringify(expectedCards), "Home chapter map is out of order", failures);
  assert(/Start the tour with Run-through\./i.test(home), "Home signoff must start the tour with Run-through", failures);

  const commonSource = readDist("assets/common.js");
  const commonLiteral = commonSource.match(/var\s+CHAPTERS\s*=\s*(\[[\s\S]*?\]);/);
  assert(Boolean(commonLiteral), "assets/common.js is missing its canonical CHAPTERS list", failures);
  if (commonLiteral) {
    try {
      const chapters = vm.runInNewContext(commonLiteral[1], Object.create(null));
      const actual = chapters.map(({ f, t, ch }) => ({ file: f, title: t, chapter: ch }));
      const expected = chapterSequence.map(({ file, title, chapter }) => ({ file, title, chapter }));
      assert(JSON.stringify(actual) === JSON.stringify(expected), "assets/common.js canonical CHAPTERS list is out of order", failures);
    } catch (error) {
      assert(false, `assets/common.js CHAPTERS list could not be parsed: ${error.message}`, failures);
    }
  }

  const siteChromePath = path.join(root, "DemoThemisMVP", "web", "src", "components", "SiteChrome", "index.tsx");
  const siteChrome = fs.readFileSync(siteChromePath, "utf8");
  const siteChromeBlock = siteChrome.match(/const\s+CHAPTERS\s*=\s*\[([\s\S]*?)\]\s+as const;/);
  assert(Boolean(siteChromeBlock), "MVP SiteChrome is missing its CHAPTERS list", failures);
  if (siteChromeBlock) {
    const actual = Array.from(siteChromeBlock[1].matchAll(/\{\s*number:\s*'(\d+)'[\s\S]*?label:\s*'([^']+)'[\s\S]*?href:\s*'([^']+)'[\s\S]*?\}/g), (match) => ({
      chapter: Number(match[1]),
      title: match[2],
      href: match[3].replace(/^\//, "")
    }));
    const expected = chapterSequence.map(({ file, navTitle, chapter }) => ({ file, navTitle, chapter })).map(({ file, navTitle, chapter }) => ({
      chapter,
      title: navTitle,
      href: file
    }));
    assert(JSON.stringify(actual) === JSON.stringify(expected), "MVP SiteChrome chapter navigation is out of order", failures);
  }

  const sitemap = readDist("sitemap.xml");
  let lastPosition = -1;
  for (const chapter of chapterSequence) {
    const publicPath = `/${chapter.file.replace(/\.html$/i, "")}`;
    const position = sitemap.indexOf(`<loc>${siteUrl}${publicPath}</loc>`);
    assert(position > lastPosition, `sitemap.xml must list Chapter ${chapter.chapter} after the preceding chapter`, failures);
    lastPosition = position;
  }

  const runThrough = readDist("the-design.html");
  const demoThemis = readDist("demothemis.html");
  assert(/<span\s+class=["']pill["']>Start here<\/span>/i.test(runThrough), "Run-through must carry the Start here marker", failures);
  assert(!/<span\s+class=["']pill["']>Start here<\/span>/i.test(demoThemis), "DemoThemis must no longer carry the Start here marker", failures);
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
  assert(/\bMVP\b/i.test(description) && /\bon[- ]?chain\b/i.test(description), "mvp.html description should explain the on-chain MVP", failures);

  const linkTargets = openingTagAttributeValues(html, "a", "href");
  const sameSiteProductLinks = linkTargets.flatMap((target) => {
    try {
      const targetUrl = new URL(target, `${siteUrl}/mvp.html`);
      return targetUrl.origin === new URL(siteUrl).origin ? [targetUrl] : [];
    } catch (error) {
      return [];
    }
  });
  assert(
    sameSiteProductLinks.some((target) => target.pathname.replace(/\/+$/, "") === "/app"),
    `mvp.html missing same-site live product link: ${siteUrl}/app`,
    failures
  );
  for (const route of ["/sandbox", "/home", "/about"]) {
    assert(
      !sameSiteProductLinks.some((target) => target.pathname.replace(/\/+$/, "") === route),
      `mvp.html should not expose the retired ${route} route`,
      failures
    );
  }

  assert(/role=["']tablist["']/i.test(html), "mvp.html product preview is missing its tab list", failures);
  assert(/id=["']mvp-tab-live["'][^>]*>Live case</i.test(html), "mvp.html is missing the Live case tab", failures);
  assert(/id=["']mvp-tab-submit["'][^>]*>Submit a case</i.test(html), "mvp.html is missing the Submit a case tab", failures);
  assert(/\bone (?:official )?question (?:is active|at a time)\b/i.test(html), "mvp.html should explain the one-at-a-time rule", failures);
  assert(/\bthree (?:World ID-)?verified humans\b/i.test(html), "mvp.html should identify the three verified jurors", failures);
  assert(/\bon[- ]?chain\b/i.test(html), "mvp.html should explain the on-chain result", failures);
  assert(/\bNo evidence or source field\b/i.test(html), "mvp.html should explain that jurors research independently", failures);
  assert(!/\bsandbox\b|\bsimulat(?:e|ed|es|ion|or)\b/i.test(html), "mvp.html should stay focused on the real product process", failures);
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
    const source = html.slice(start, end) + "\nthis.__productModes = PRODUCT_MODES; this.__appBoundaries = APP_BOUNDARIES; this.__appBoundaryForStage = appBoundaryForStage;";
    vm.runInNewContext(source, context, { filename: "the-design.product-modes.js" });
    const modes = context.__productModes;
    const boundaries = context.__appBoundaries;
    const eventBoundaries = Array.from({ length: 13 }, (_, stageIndex) => context.__appBoundaryForStage(stageIndex));
    assert(modes.momo && modes.momo.start === 0, "PredictionMoMo tab must start at Event 01", failures);
    assert(modes.themis && modes.themis.start === 6, "DemoThemis tab must start at Event 07", failures);
    assert(modes.momo.label === "Full market run" && modes.themis.label === "Court-backed run", "run-through starting-point labels are incorrect", failures);
    assert(boundaries.momo.appTheme === "momo" && boundaries.momo.appBrand === "PredictionMoMo" && boundaries.momo.appOrigin === "app.predictionmomo.com" && !boundaries.momo.frameTitle, "PredictionMoMo app-boundary config is incorrect", failures);
    assert(boundaries.handoff.appTheme === "momo" && boundaries.handoff.appBrand === "PredictionMoMo" && boundaries.handoff.appOrigin === "app.predictionmomo.com", "Events 07-08 must remain inside the PredictionMoMo app", failures);
    assert(boundaries.handoff.frameTitle === "Seeding DemoThemis with demand from the Application Layer", "Events 07-08 must label the application-layer demand frame", failures);
    assert(boundaries.themis.appTheme === "themis" && boundaries.themis.appBrand === "DemoThemis" && boundaries.themis.appOrigin === "court.demothemis.com" && !boundaries.themis.frameTitle, "DemoThemis app-boundary config is incorrect", failures);
    assert(!boundaries.protocol, "protocol explainers must not be registered as application boundaries", failures);
    assert(eventBoundaries.slice(0, 8).every((boundary) => boundary === boundaries.momo), "Events 01-08 must use the PredictionMoMo app", failures);
    assert(eventBoundaries[8] === null && eventBoundaries[10] === null && eventBoundaries[12] === null, "draw, tally, and proof relay must have no application boundary", failures);
    assert(eventBoundaries[9] === boundaries.themis && eventBoundaries[11] === boundaries.themis, "juror and appellant actions must use the DemoThemis app", failures);
  } catch (error) {
    failures.push("run-through product-mode data cannot be evaluated: " + error.message);
  }
}

function checkAppOwnershipData(html, failures) {
  const pages = readRunThroughLiteral(html, "APP_PAGES", failures);
  if (!Array.isArray(pages)) return;
  assert(pages.length === 13, "APP_PAGES must define all 13 events", failures);
  assert(pages.slice(0, 8).every((page) => /^PredictionMoMo\b/.test(page.product || "")), "APP_PAGES Events 01-08 must belong to PredictionMoMo", failures);
  assert([8, 10, 12].every((index) => /on-chain sequence$/i.test(pages[index].product || "")), "automated event data must belong to the DemoThemis on-chain sequence", failures);
  assert([9, 11].every((index) => pages[index].product === "DemoThemis"), "APP_PAGES participant events must belong to DemoThemis", failures);
  assert(!/var\s+(?:PRODUCT_SCREENS|APP_SCREENS)\s*=/.test(html), "run-through must keep one canonical app-page data source", failures);
}

function balancedSourceFrom(html, openIndex) {
  const pairs = { "[": "]", "{": "}", "(": ")" };
  const first = html[openIndex];
  if (!pairs[first]) return "";
  const stack = [pairs[first]];
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex + 1; index < html.length; index += 1) {
    const char = html[index];
    const next = html[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (pairs[char]) {
      stack.push(pairs[char]);
      continue;
    }
    if (char === stack[stack.length - 1]) {
      stack.pop();
      if (!stack.length) return html.slice(openIndex, index + 1);
    }
  }
  return "";
}

function readRunThroughLiteral(html, name, failures) {
  const assignment = new RegExp(`\\bvar\\s+${name}\\s*=\\s*`).exec(html);
  assert(Boolean(assignment), `run-through ${name} data is missing`, failures);
  if (!assignment) return null;
  const openIndex = assignment.index + assignment[0].length;
  const literal = balancedSourceFrom(html, openIndex);
  assert(Boolean(literal), `run-through ${name} data is malformed`, failures);
  if (!literal) return null;
  try {
    return vm.runInNewContext(`(${literal})`, {}, { filename: `the-design.${name.toLowerCase()}.js` });
  } catch (error) {
    failures.push(`run-through ${name} data cannot be evaluated: ${error.message}`);
    return null;
  }
}

function runThroughFunctionSource(html, name) {
  const signature = new RegExp(`function\\s+${name}\\s*\\(`).exec(html);
  if (!signature) return "";
  const bodyStart = html.indexOf("{", signature.index + signature[0].length);
  if (bodyStart < 0) return "";
  const body = balancedSourceFrom(html, bodyStart);
  return body ? html.slice(signature.index, bodyStart) + body : "";
}

function nestedStrings(value, pathPrefix = "") {
  const strings = [];
  if (typeof value === "string") {
    strings.push({ path: pathPrefix, value });
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => strings.push(...nestedStrings(entry, `${pathPrefix}[${index}]`)));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => {
      strings.push(...nestedStrings(entry, pathPrefix ? `${pathPrefix}.${key}` : key));
    });
  }
  return strings;
}

function checkRunThroughSurfaceSeparation(html, failures) {
  const surfaces = readRunThroughLiteral(html, "EVENT_SURFACES", failures);
  const pages = readRunThroughLiteral(html, "APP_PAGES", failures);
  const flows = readRunThroughLiteral(html, "APP_FLOWS", failures);

  if (Array.isArray(surfaces)) {
    const allowedSurfaces = new Set(["momo", "themis", "protocol"]);
    const allowedOwners = new Set(["user", "protocol", "simulator"]);
    assert(surfaces.length === 13, "EVENT_SURFACES must define ownership for all 13 events", failures);
    assert(
      surfaces.every((entry) => entry && allowedSurfaces.has(entry.surface) && typeof entry.actor === "string" && entry.actor.trim() && allowedOwners.has(entry.actionOwner)),
      "every event must declare a valid surface, actor, and actionOwner",
      failures
    );
    assert(surfaces.some((entry) => entry && entry.surface === "momo"), "surface metadata is missing PredictionMoMo events", failures);
    assert(surfaces.some((entry) => entry && entry.surface === "themis"), "surface metadata is missing DemoThemis participant events", failures);
    assert(surfaces.some((entry) => entry && entry.surface === "protocol"), "surface metadata is missing automated protocol activity", failures);
    assert(
      surfaces.filter((entry) => entry && entry.surface === "protocol").every((entry) => entry.actionOwner === "protocol"),
      "protocol activity events must be owned by the protocol",
      failures
    );
  }

  if (Array.isArray(pages) && Array.isArray(flows)) {
    assert(pages.length === 13 && flows.length === 13, "production app pages and flows must cover all 13 events", failures);
    const productionStrings = nestedStrings({ pages, flows }).filter((entry) => !/\.(?:surface|actor|actionOwner)$/.test(entry.path));
    const simulatorNarration = productionStrings.filter((entry) => /\b(?:demo|simulation|simulator|adversarial|testing)\b|\btest\b|deliberate\s+false/i.test(entry.value));
    assert(
      simulatorNarration.length === 0,
      `production app data contains simulator/test narration: ${simulatorNarration.slice(0, 3).map((entry) => `${entry.path}=${JSON.stringify(entry.value)}`).join(", ")}`,
      failures
    );

    const protocolUsers = nestedStrings({ pages, flows }).filter((entry) => /\.user$/.test(entry.path) && /^Protocol$/i.test(entry.value.trim()));
    assert(
      protocolUsers.length === 0,
      `production pages must not present Protocol as a logged-in user: ${protocolUsers.map((entry) => entry.path).join(", ")}`,
      failures
    );

    const forbiddenInAppActions = /^(?:Run draw|Post tally|Resolve appeal|Send final proof|Start a new walkthrough)$/i;
    const inAppActions = [];
    flows.forEach((flow, eventIndex) => {
      (flow && flow.steps || []).forEach((step, stepIndex) => {
        const label = String(step.actionLabel || step.cue || "").replace(/^Tap\s+/i, "").trim();
        if (forbiddenInAppActions.test(label)) inAppActions.push(`Event ${eventIndex + 1}, step ${stepIndex + 1}: ${label}`);
      });
    });
    assert(inAppActions.length === 0, `protocol/simulator actions leaked into the production app: ${inAppActions.join(", ")}`, failures);

    flows.forEach((flow, eventIndex) => {
      if (!flow) return;
      let actor = flow.start && flow.start.user;
      (flow.steps || []).forEach((step, stepIndex) => {
        const nextActor = step.after && step.after.user;
        if (actor && nextActor && actor !== nextActor) {
          assert(
            Boolean(step.roleHandoff || step.handoff),
            `Event ${eventIndex + 1}, step ${stepIndex + 1} changes ${actor} to ${nextActor} without outer role-handoff metadata`,
            failures
          );
        }
        if (nextActor) actor = nextActor;
      });
    });

    const finalFlow = flows[12];
    const finalStep = finalFlow && finalFlow.steps && finalFlow.steps[finalFlow.steps.length - 1];
    const finalState = finalStep && finalStep.after;
    const finalCopy = nestedStrings(finalState || {}).map((entry) => entry.value).join(" ");
    const finalBlocks = finalState && Array.isArray(finalState.blocks) ? finalState.blocks : [];
    assert(Boolean(finalState), "the final event must define a completed settlement state", failures);
    assert(
      Boolean(finalState && (finalState.surface === "momo" || finalState.product === "PredictionMoMo")),
      "the run-through must return to PredictionMoMo for its final state",
      failures
    );
    assert(
      finalBlocks.some((block) => block && block.type === "receipt") && /(?:market resolved|settlement|payout|redeemable)/i.test(finalCopy),
      "the run-through must finish on a PredictionMoMo settlement receipt",
      failures
    );
  }

  const protocolRenderer = runThroughFunctionSource(html, "renderProtocolSequence");
  const protocolRecordRenderer = runThroughFunctionSource(html, "renderProtocolRecord");
  const sequencePredicate = runThroughFunctionSource(html, "isSequencePage");
  const sequenceProfile = runThroughFunctionSource(html, "sequenceProfileForPage");
  assert(Boolean(protocolRenderer), "run-through is missing the read-only protocol sequence renderer", failures);
  assert(/page\.view\s*===\s*["']sequence["']/.test(sequencePredicate), "sequence rendering must be independent from product ownership", failures);
  assert(/PredictionMoMo automatic execution/.test(sequenceProfile) && /DemoThemis on-chain sequence/.test(sequenceProfile), "one sequence renderer must carry distinct PredictionMoMo and DemoThemis profiles", failures);
  if (protocolRenderer) {
    assert(!/makeEl\(\s*["']button["']|\.addEventListener\s*\(|makeLiveActionControl|renderLivePage/.test(protocolRenderer), "the protocol sequence canvas must remain read-only and independent of app-page rendering", failures);
    assert(!/sim-live-preview|sim-browser-bar|sim-url|sim-app-viewport|app-window|app-nav/.test(protocolRenderer), "the protocol sequence renderer must not contain browser or app structure", failures);
    assert(/data-sequence-profile/.test(protocolRenderer) && /page\.sequenceSteps\s*\|\|/.test(protocolRenderer), "the sequence canvas must expose its product profile and support focused execution steps", failures);
  }
  assert(Boolean(protocolRecordRenderer) && !/makeEl\(\s*["']button["']|\.addEventListener\s*\(|makeLiveActionControl/.test(protocolRecordRenderer), "protocol record nodes must not contain app controls", failures);
  assert(/setAttribute\(\s*["']data-surface["']|\.dataset\.surface\s*=/.test(html), "run-through renderer must expose the active surface with data-surface", failures);

  const roleHandoffRenderer = runThroughFunctionSource(html, "renderRoleHandoff");
  const productRenderer = runThroughFunctionSource(html, "renderProductDemo");
  const liveBlockRenderer = runThroughFunctionSource(html, "renderLiveBlock");
  assert(Boolean(roleHandoffRenderer), "run-through is missing the outer role-handoff renderer", failures);
  assert(/root\.appendChild\(\s*renderRoleHandoff/.test(productRenderer), "role handoffs must render outside the browser frame", failures);
  assert(!/appViewport\.appendChild\(\s*renderRoleHandoff/.test(productRenderer), "role handoffs must never render inside the production app viewport", failures);
  assert(!/makeLiveContinuationControl\s*\(/.test(liveBlockRenderer), "app cards must reuse the single next-event control instead of creating duplicate continuation buttons", failures);
  assert(/if\s*\(isSequencePage\(page\)\)[\s\S]*renderProtocolSequence\(page,\s*item\)[\s\S]*root\.appendChild\(sequence\)/.test(productRenderer), "automatic system states must append the sequence canvas directly to the simulator root", failures);
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

  function normalizedActionCopy(value) {
    return String(value || "")
      .replace(/^\s*(?:tap|click|press|choose)\s+/i, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .toLowerCase();
  }

  const snapshots = [];
  pages.forEach((basePage, eventIndex) => {
    const flow = flows[eventIndex] || { steps: [] };
    snapshots.push({ event: eventIndex + 1, state: "base", page: basePage });
    let current = mergePage(basePage, flow.start);
    snapshots.push({ event: eventIndex + 1, state: "start", page: current, targetTitle: flow.steps && flow.steps[0] && flow.steps[0].targetTitle });

    (flow.steps || []).forEach((step, stepIndex) => {
      const stepLabel = step.actionLabel || step.cue;
      const canonicalAction = normalizedActionCopy(stepLabel);
      const cueAction = normalizedActionCopy(step.cue);
      assert(Boolean(canonicalAction), `Event ${eventIndex + 1} step ${stepIndex + 1} is missing its canonical action copy`, failures);
      assert(
        !step.actionLabel || cueAction === canonicalAction || cueAction.endsWith(canonicalAction),
        `Event ${eventIndex + 1} step ${stepIndex + 1} actionLabel drifts from its cue`,
        failures
      );
      assert(!current.primary || normalizedActionCopy(current.primary) === canonicalAction, `Event ${eventIndex + 1} step ${stepIndex + 1} primary action drifts from its canonical action`, failures);
      assert(step.target === "block", `Event ${eventIndex + 1} step ${stepIndex + 1} has an unsupported action target: ${step.target || "missing"}`, failures);
      assert(typeof step.targetTitle === "string" && step.targetTitle.trim().length > 0, `Event ${eventIndex + 1} step ${stepIndex + 1} is missing targetTitle`, failures);
      if (step.target === "block") {
        const targetExists = (current.blocks || []).some((block) => block.title === step.targetTitle);
        assert(targetExists, `Event ${eventIndex + 1} step ${stepIndex + 1} is missing current target block: ${step.targetTitle}`, failures);
      }
      current = mergePage(current, step.after);
      const nextStep = flow.steps && flow.steps[stepIndex + 1];
      snapshots.push({ event: eventIndex + 1, state: `after-${stepIndex + 1}`, page: current, targetTitle: nextStep && nextStep.targetTitle });
    });
  });

  const resolvedSnapshots = snapshots.filter((snapshot) => snapshot.state !== "base");
  assert(resolvedSnapshots.length === 37, `app simulator must expose exactly 37 resolved states (found ${resolvedSnapshots.length})`, failures);
  const deadPageKeys = ["intent", "summary", "sideTitle", "sideRows"];
  assert(
    pages.every((page) => deadPageKeys.every((key) => !Object.prototype.hasOwnProperty.call(page, key))) &&
      flows.every((flow) => !(flow.steps || []).some((step) => step.after && deadPageKeys.some((key) => Object.prototype.hasOwnProperty.call(step.after, key)))),
    "simulator pages must not retain dead intent, summary, or sidebar copy",
    failures
  );

  function demoSnapshot(event, state) {
    return snapshots.find((snapshot) => snapshot.event === event && snapshot.state === state);
  }

  function demoBlock(snapshot, predicate) {
    return snapshot && (snapshot.page.blocks || []).find(predicate);
  }

  function rowValue(block, label) {
    const row = block && (block.rows || block.details || []).find((item) => String(item[0]).toLowerCase() === label.toLowerCase());
    return row && row[1];
  }

  const parlayStart = demoSnapshot(6, "start");
  const parlayExecution = demoSnapshot(6, "after-1");
  const parlayPosition = demoSnapshot(6, "after-2");
  const cashoutExecution = demoSnapshot(6, "after-3");
  const cashoutReceipt = demoSnapshot(6, "after-4");
  assert(
    parlayStart && parlayStart.page.view === "application" && parlayStart.page.route === "/parlays/new" && !(parlayStart.page.blocks || []).some((block) => block.type === "route"),
    "Event 06 must begin as a production parlay builder without backend route controls",
    failures
  );
  assert(
    parlayExecution && parlayExecution.page.surface === "momo" && parlayExecution.page.view === "sequence" && parlayExecution.page.sequenceProfile === "momo" && parlayExecution.page.actionOwner === "protocol",
    "Event 06 placement must leave the app for a read-only PredictionMoMo execution sequence",
    failures
  );
  assert(
    parlayPosition && parlayPosition.page.view === "application" && parlayPosition.page.route === "/parlays/PM-4821" &&
      (parlayPosition.page.blocks || []).some((block) => block.type === "receipt" && block.title === "Parlay confirmed" && Array.isArray(block.details) && block.details.length >= 4) &&
      !(parlayPosition.page.blocks || []).some((block) => block.type === "route"),
    "Event 06 must return to a real parlay position and structured confirmation receipt",
    failures
  );
  assert(
    cashoutExecution && cashoutExecution.page.surface === "momo" && cashoutExecution.page.view === "sequence" && cashoutExecution.page.sequenceProfile === "momo" && cashoutExecution.page.actionOwner === "protocol",
    "Event 06 cashout must leave the app for a read-only PredictionMoMo execution sequence",
    failures
  );
  assert(
    cashoutReceipt && cashoutReceipt.page.view === "application" && cashoutReceipt.page.route === "/parlays/PM-4821/cashout" &&
      (cashoutReceipt.page.blocks || []).some((block) => block.type === "receipt" && block.title === "Payment confirmed" && Array.isArray(block.details) && block.details.length >= 4) &&
      !(cashoutReceipt.page.blocks || []).some((block) => block.type === "route" || /fill check|revert/i.test(JSON.stringify(block))),
    "Event 06 must finish in the app with a structured cashout receipt and no backend diagnostics",
    failures
  );

  const resultStart = demoSnapshot(7, "start");
  const postTicket = demoBlock(resultStart, (block) => block.type === "ticket" && rowValue(block, "Result"));
  assert(
    rowValue(postTicket, "Result") === "YES" && rowValue(postTicket, "Challenge period") === "24 hours" && postTicket.summaryValue === "$250" && !demoBlock(resultStart, (block) => block.type === "scoreboard"),
    "Event 07 must present a production confirmation with the result, challenge period, and exact bond",
    failures
  );
  const proposalReceipt = demoBlock(demoSnapshot(7, "after-1"), (block) => block.type === "receipt" && block.title === "Proposal confirmed");
  assert(
    proposalReceipt && Array.isArray(proposalReceipt.details) && /\$250 locked/i.test(rowValue(proposalReceipt, "Bond") || "") && /UTC/i.test(rowValue(proposalReceipt, "Challenge ends") || "") && /^0x/i.test(rowValue(proposalReceipt, "Transaction") || ""),
    "Event 07 must finish with a structured bond, deadline, and transaction receipt",
    failures
  );

  const challengeStart = demoSnapshot(8, "start");
  const challengeTicket = demoBlock(challengeStart, (block) => block.type === "ticket" && rowValue(block, "Proposed result"));
  const challengeStartOdds = demoBlock(challengeStart, (block) => block.type === "odds" && block.title === "Current market odds");
  assert(
    rowValue(challengeTicket, "Proposed result") === "YES" && rowValue(challengeTicket, "Your challenge") === "NO" &&
      rowValue(challengeTicket, "If final result is YES") === "Bond forfeited" && rowValue(challengeTicket, "If final result is NO") === "Bond returned + reward",
    "Event 08 must state the proposed result, opposing challenge, and unambiguous bond outcomes",
    failures
  );
  assert(!rowValue(challengeTicket, "Evidence"), "Event 08 must not submit evidence for jurors to inherit", failures);
  assert(challengeStartOdds && challengeStartOdds.yes === 91 && challengeStartOdds.no === 9, "Event 08 must show the unchanged 91/9 market before the challenge is submitted", failures);
  const challengeEnd = demoSnapshot(8, "after-1");
  const challengeReceipt = demoBlock(challengeEnd, (block) => block.type === "receipt" && block.title === "Challenge receipt");
  const challengeEndOdds = demoBlock(challengeEnd, (block) => block.type === "odds" && block.title === "Live market odds");
  assert(
    challengeReceipt && challengeReceipt.value === "Case #1182" && rowValue(challengeReceipt, "Challenge") === "NO" && rowValue(challengeReceipt, "Status") === "Awaiting panel selection" &&
      !(challengeEnd.page.blocks || []).some((block) => block.type === "handoff"),
    "Event 08 must show a production case receipt instead of backend handoff plumbing",
    failures
  );
  assert(challengeEndOdds && challengeEndOdds.yes === 44 && challengeEndOdds.no === 56, "Event 08 must reprice to 44/56 only after the challenge is submitted", failures);

  const ballotStart = demoSnapshot(10, "start");
  const ballotBlock = demoBlock(ballotStart, (block) => block.type === "ballot");
  const caseFile = demoBlock(ballotStart, (block) => block.type === "evidence" && block.title === "Case file");
  assert(
    /uefa euro 2024 final.*14 july 2024/i.test(rowValue(caseFile, "Question") || "") &&
      /uefa/i.test(rowValue(caseFile, "Answer rule") || "") &&
      /otherwise no/i.test(rowValue(caseFile, "Answer rule") || "") &&
      /public sources/i.test(rowValue(caseFile, "Research") || ""),
    "Event 10 must give jurors one precise, independently researchable public-data question",
    failures
  );
  assert(
    ballotBlock && JSON.stringify((ballotBlock.options || []).map((option) => option[0])) === JSON.stringify(["YES", "NO"]),
    "Event 10 must expose exactly the YES and NO ballot choices",
    failures
  );
  const ballotReceipt = demoBlock(demoSnapshot(10, "after-1"), (block) => block.type === "receipt" && block.title === "Submission receipt");
  const ballotReceiptCopy = JSON.stringify(ballotReceipt || {});
  assert(
    ballotReceipt && rowValue(ballotReceipt, "Ballot contents") === "Hidden" && /^0x/i.test(rowValue(ballotReceipt, "Submission ID") || "") && /pending finality/i.test(rowValue(ballotReceipt, "Juror fee") || "") && !/\b(?:YES|NO)\b/.test(ballotReceiptCopy),
    "Event 10 receipt must confirm submission without revealing the juror's selected outcome",
    failures
  );

  const appealStart = demoSnapshot(12, "start");
  const appealCheckout = demoBlock(appealStart, (block) => block.type === "checkout" && block.title === "Required bond");
  const appealCaseStatus = demoBlock(appealStart, (block) => block.type === "receipt" && block.title === "Case status");
  assert(
    rowValue(appealCheckout, "31-juror minimum") === "$12,400" && rowValue(appealCheckout, "Security minimum") === "$31,000" && rowValue(appealCheckout, "Delay minimum") === "$8,200" && rowValue(appealCheckout, "Required bond") === "$31,000" && appealCheckout.winner === "Highest minimum applied",
    "Event 12 must show each minimum and the highest applied appeal bond",
    failures
  );
  assert(appealCaseStatus && /Provisional/i.test(appealCaseStatus.value || "") && /UTC/i.test(rowValue(appealCaseStatus, "Deadline") || ""), "Event 12 must show the provisional verdict and an exact appeal deadline", failures);

  const proofStart = demoBlock(demoSnapshot(11, "start"), (block) => block.type === "proof");
  const proofPosted = demoBlock(demoSnapshot(11, "after-1"), (block) => block.type === "proof" && block.title === "Aggregate tally");
  const proofVerified = demoBlock(demoSnapshot(11, "after-2"), (block) => block.type === "receipt" && block.title === "Tally proof");
  assert(proofStart && proofStart.verified === false, "Event 11 must mark the unposted aggregate proof as unverified", failures);
  assert(proofPosted && proofPosted.verified === false, "Event 11 must keep the posted tally unverified until its explicit proof check", failures);
  assert(proofVerified && /verified/i.test((proofVerified.value || "") + " " + (proofVerified.note || "")), "Event 11 must show a verified tally-proof receipt after the check", failures);

  function seatBlocksFor(event) {
    return snapshots
      .filter((snapshot) => snapshot.event === event)
      .flatMap((snapshot) => snapshot.page.blocks || [])
      .filter((block) => block.type === "seats");
  }

  const jurySeats = seatBlocksFor(9);
  const appealSeats = seatBlocksFor(12);
  assert(jurySeats.length > 0 && jurySeats.every((block) => block.count === 3), "Event 09 must render exactly the demo's three jury seats", failures);
  assert(jurySeats.every((block) => block.on === 0 || block.on === 3), "Event 09 active-seat count must be either 0 or 3", failures);
  assert(appealSeats.length > 0 && appealSeats.every((block) => block.count === 31), "Event 12 must render exactly 31 appeal seats", failures);
  assert(appealSeats.every((block) => block.on === 0 || block.on === 31), "Event 12 active-seat count must be either 0 or 31", failures);

  const compactDemoStepCounts = [1, 1, 2, 1, 2, 2, 1];
  assert(
    JSON.stringify(flows.slice(6).map((flow) => (flow.steps || []).length)) === JSON.stringify(compactDemoStepCounts),
    "DemoThemis Events 07-13 must retain the shorter 1/1/2/1/2/2/1 action path",
    failures
  );
  const exactSimulatorStepCounts = [2, 3, 1, 2, 2, 4, 1, 1, 2, 1, 2, 2, 1];
  assert(
    JSON.stringify(flows.map((flow) => (flow.steps || []).length)) === JSON.stringify(exactSimulatorStepCounts),
    "the PredictionMoMo-to-DemoThemis simulator must retain its exact 13-event action path",
    failures
  );
  const appealEnd = demoSnapshot(12, "after-" + flows[11].steps.length);
  const appealEndCopy = JSON.stringify(appealEnd && appealEnd.page || {});
  assert(/\bNO\b/i.test(appealEndCopy) && /final|resolved/i.test(appealEndCopy), "Event 12 must show a final NO appeal verdict before finality", failures);
  const finalityStartCopy = JSON.stringify(demoSnapshot(13, "start").page);
  const finalityEndCopy = JSON.stringify(demoSnapshot(13, "after-1").page);
  assert(/\bNO\b/i.test(finalityStartCopy) && /final/i.test(finalityStartCopy), "Event 13 must carry the final NO verdict into court finality", failures);
  assert(/relay/i.test(finalityStartCopy) && /PredictionMoMo/i.test(finalityEndCopy), "Event 13 must relay one final proof back to PredictionMoMo", failures);
  assert(/Payout received|\$210\.50 received|"Status","Paid"/i.test(finalityEndCopy) && !/Redeemable|redeem/i.test(finalityEndCopy), "Event 13 must finish on a paid PredictionMoMo receipt with no contradictory redemption state", failures);
  assert(demoSnapshot(9, "start").page.surface === "protocol" && demoSnapshot(9, "after-2").page.surface === "protocol", "Event 09 must remain on the protocol sequence canvas from start through completion", failures);
  assert(demoSnapshot(11, "start").page.surface === "protocol" && demoSnapshot(11, "after-2").page.surface === "protocol", "Event 11 must remain on the protocol sequence canvas from start through completion", failures);
  assert(demoSnapshot(12, "start").page.surface === "themis" && demoSnapshot(12, "after-1").page.surface === "protocol" && demoSnapshot(12, "after-2").page.surface === "protocol", "Event 12 must replace the appeal app with the sequence canvas after payment", failures);
  assert(demoSnapshot(13, "start").page.surface === "protocol" && demoSnapshot(13, "after-1").page.surface === "momo", "Event 13 must replace the sequence canvas with the PredictionMoMo payout app after relay", failures);
  assert(pages.slice(0, 8).every((page) => /^PredictionMoMo\b/.test(page.product || "")), "Events 01-08 must remain owned by PredictionMoMo", failures);
  assert([8, 10, 12].every((index) => /on-chain sequence$/i.test(pages[index].product || "")), "automated court events must be presented as the DemoThemis on-chain sequence", failures);
  assert([9, 11].every((index) => pages[index].product === "DemoThemis"), "juror and appellant events must be owned by DemoThemis", failures);
  assert(pages.slice(6).every((page) => !/full design/i.test(page.context || "")), "Court-path screens must use product context instead of an internal full-design label", failures);

  function evaluateDataArray(startMarker, endMarker, expression, filename) {
    const dataStart = html.indexOf(startMarker);
    const dataEnd = html.indexOf(endMarker, dataStart);
    assert(dataStart >= 0 && dataEnd > dataStart, filename + " block is missing", failures);
    if (dataStart < 0 || dataEnd <= dataStart) return [];
    try {
      const context = {};
      vm.runInNewContext(
        html.slice(dataStart, dataEnd) + "\nthis.__value = " + expression + ";",
        context,
        { filename }
      );
      return context.__value || [];
    } catch (error) {
      failures.push(filename + " cannot be evaluated: " + error.message);
      return [];
    }
  }

  const stepGuides = evaluateDataArray("var STEP_GUIDES =", "var EVENT_CONTINUATIONS =", "STEP_GUIDES", "the-design.step-guides.js");
  const continuations = evaluateDataArray("var EVENT_CONTINUATIONS =", "var STAGE_GROUPS =", "EVENT_CONTINUATIONS", "the-design.event-continuations.js");
  const boundaryData = evaluateDataArray("var PRODUCT_MODES =", "var stage =", "({ productModes: PRODUCT_MODES, appBoundaries: APP_BOUNDARIES })", "the-design.app-boundaries-copy.js");
  const appBoundaries = boundaryData.appBoundaries || {};

  function hasOwn(value, key) {
    return Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);
  }

  function isVisibleScalar(value) {
    return (typeof value === "string" && value.trim().length > 0) || (typeof value === "number" && Number.isFinite(value));
  }

  function assertText(value, label) {
    assert(typeof value === "string" && value.trim().length > 0, `${label} must be non-empty text`, failures);
  }

  function assertTupleList(value, minimumItems, label) {
    assert(Array.isArray(value) && value.length > 0, `${label} must be a non-empty list`, failures);
    if (!Array.isArray(value)) return;
    value.forEach((tuple, index) => {
      const tupleLabel = `${label} item ${index + 1}`;
      assert(Array.isArray(tuple) && tuple.length >= minimumItems, `${tupleLabel} must contain at least ${minimumItems} values`, failures);
      if (!Array.isArray(tuple)) return;
      for (let itemIndex = 0; itemIndex < Math.min(minimumItems, tuple.length); itemIndex += 1) {
        assert(isVisibleScalar(tuple[itemIndex]), `${tupleLabel} value ${itemIndex + 1} must not be blank`, failures);
      }
    });
  }

  const knownBlockTypes = new Set([
    "ballot", "bars", "beacon", "checklist", "checkout", "closed", "countdown", "evidence",
    "faceChecks", "fields", "handoff", "legs", "liquidity", "odds", "participants", "proof",
    "receipt", "route", "scoreboard", "seats", "table", "ticket", "tokens"
  ]);
  const moneyValuePattern = /^(?:[$£€]\s*\d[\d,]*(?:\.\d+)?[kmb]?|\d[\d,]*(?:\.\d+)?[kmb]?\s*(?:USD|USDC|WLD|ETH))$/i;
  const actionVerbPattern = /^(?:submit|stake|buy|sell|take|fill|post|publish|pay|resolve|claim|invite|lock|build|cash\s*out|run|check|seal|open|show|challenge|return|restart)\b/i;
  let hasOddTicketRows = false;

  for (const snapshot of resolvedSnapshots) {
    const stateLabel = `Event ${snapshot.event} ${snapshot.state}`;
    const page = snapshot.page || {};
    const isSystemView = page.view === "sequence" || page.surface === "protocol";
    assertText(page.title, `${stateLabel} page title`);
    assertText(page.status, `${stateLabel} page status`);
    assert(!hasOwn(page, "primary"), `${stateLabel} must not duplicate canonical action copy in page.primary`, failures);
    assert(Array.isArray(page.tabs) && page.tabs.length > 0, `${stateLabel} must define app tabs`, failures);
    if (Array.isArray(page.tabs)) {
      assert(page.tabs.every((tab) => typeof tab === "string" && tab.trim().length > 0), `${stateLabel} contains a blank app tab`, failures);
      assert(new Set(page.tabs).size === page.tabs.length, `${stateLabel} contains duplicate app tabs`, failures);
      assert(typeof page.activeTab === "string" && page.tabs.includes(page.activeTab), `${stateLabel} activeTab must name one of its visible tabs`, failures);
    }

    const blocks = page.blocks;
    assert(Array.isArray(blocks) && blocks.length > 0, `${stateLabel} must render at least one block`, failures);
    if (!Array.isArray(blocks)) continue;
    if (!isSystemView) {
      assert(!blocks.some((block) => block && (block.type === "route" || block.type === "handoff")), `${stateLabel} leaks backend routing into a production app view`, failures);
      blocks.filter((block) => block && block.type === "receipt").forEach((block) => {
        assert(Array.isArray(block.details) && block.details.length >= 2, `${stateLabel} production receipt ${block.title || "untitled"} must show structured account details`, failures);
        assert(!/previous action|protocol steps|backend|the website is no longer|what remains true/i.test(JSON.stringify(block)), `${stateLabel} production receipt ${block.title || "untitled"} contains simulator or architecture narration`, failures);
      });
    }
    const titles = blocks.map((block) => block && block.title);
    assert(new Set(titles).size === titles.length, `${stateLabel} contains duplicate block titles, which makes action targeting ambiguous`, failures);

    blocks.forEach((block, blockIndex) => {
      const blockLabel = `${stateLabel} block ${blockIndex + 1}`;
      assert(block && typeof block === "object", `${blockLabel} must be an object`, failures);
      if (!block || typeof block !== "object") return;
      assert(knownBlockTypes.has(block.type), `${blockLabel} has unsupported type: ${block.type || "missing"}`, failures);
      assertText(block.title, `${blockLabel} title`);
      if (hasOwn(block, "hot")) {
        const validHot = block.hot === true || block.hot === false ||
          (Number.isInteger(block.hot) && block.hot >= 0) ||
          (Array.isArray(block.hot) && block.hot.every((index) => Number.isInteger(index) && index >= 0));
        assert(validHot, `${blockLabel} hot must identify a valid highlighted item or list of items`, failures);
      }

      switch (block.type) {
        case "fields":
          assertTupleList(block.rows, 3, `${blockLabel} rows`);
          assert(typeof block.editable === "boolean", `${blockLabel} editable must be boolean`, failures);
          if (Array.isArray(block.rows)) {
            assert(block.rows.every((row) => row[2] === "input" || row[2] === "textarea"), `${blockLabel} field controls must be input or textarea`, failures);
          }
          break;
        case "liquidity":
          assertTupleList(block.offers, 2, `${blockLabel} offers`);
          if (hasOwn(block, "note")) assertText(block.note, `${blockLabel} note`);
          break;
        case "receipt":
          assertText(block.value, `${blockLabel} value`);
          assert(
            isVisibleScalar(block.note) || (Array.isArray(block.details) && block.details.length > 0),
            `${blockLabel} must provide either concise note text or structured receipt details`,
            failures
          );
          if (Array.isArray(block.details)) {
            assertTupleList(block.details, 2, `${blockLabel} details`);
            const detailLabels = block.details.map((detail) => String(detail && detail[0] || "").trim().toLowerCase());
            assert(new Set(detailLabels).size === detailLabels.length, `${blockLabel} contains duplicate receipt-detail labels`, failures);
          }
          break;
        case "odds":
          assert(Number.isFinite(block.yes) && block.yes >= 0 && block.yes <= 100, `${blockLabel} YES odds must be between 0 and 100`, failures);
          assert(Number.isFinite(block.no) && block.no >= 0 && block.no <= 100, `${blockLabel} NO odds must be between 0 and 100`, failures);
          assert(Number.isFinite(block.yes) && Number.isFinite(block.no) && Math.abs(block.yes + block.no - 100) < 0.001, `${blockLabel} YES and NO odds must total 100`, failures);
          break;
        case "ticket": {
          assertTupleList(block.rows, 2, `${blockLabel} rows`);
          hasOddTicketRows = hasOddTicketRows || (Array.isArray(block.rows) && block.rows.length % 2 === 1);
          if (hasOwn(block, "total")) {
            assert(!actionVerbPattern.test(String(block.total || "").trim()), `${blockLabel} stores an action phrase in its legacy total field`, failures);
            assert(false, `${blockLabel} must use optional summaryLabel/summaryValue instead of the ambiguous legacy total field`, failures);
          }
          const hasSummaryLabel = hasOwn(block, "summaryLabel");
          const hasSummaryValue = hasOwn(block, "summaryValue");
          assert(hasSummaryLabel === hasSummaryValue, `${blockLabel} must provide both summaryLabel and summaryValue or neither`, failures);
          if (hasSummaryLabel && hasSummaryValue) {
            assertText(block.summaryLabel, `${blockLabel} summaryLabel`);
            assertText(block.summaryValue, `${blockLabel} summaryValue`);
            assert(!/^(?:total|preview|action)$/i.test(String(block.summaryLabel).trim()), `${blockLabel} summaryLabel must name the monetary meaning`, failures);
            assert(/cost|bond|stake|amount|price|payment|escrow|spend/i.test(String(block.summaryLabel)), `${blockLabel} summaryLabel must identify what the money represents`, failures);
            assert(!actionVerbPattern.test(String(block.summaryValue).trim()), `${blockLabel} summaryValue must not contain action copy`, failures);
            assert(moneyValuePattern.test(String(block.summaryValue).trim()), `${blockLabel} summaryValue must be a concrete monetary amount`, failures);
          }
          break;
        }
        case "table":
          assertTupleList(block.rows, 3, `${blockLabel} rows`);
          break;
        case "route":
          assertTupleList(block.steps, 3, `${blockLabel} steps`);
          break;
        case "tokens":
          assertTupleList(block.tokens, 2, `${blockLabel} tokens`);
          break;
        case "checklist":
        case "faceChecks":
          assertTupleList(block.rows, 2, `${blockLabel} rows`);
          break;
        case "participants":
          assertTupleList(block.people, 2, `${blockLabel} people`);
          break;
        case "legs":
          assertTupleList(block.legs, 2, `${blockLabel} legs`);
          assertText(block.payout, `${blockLabel} payout`);
          break;
        case "scoreboard":
          assertTupleList([block.left, block.right], 2, `${blockLabel} sides`);
          assert(Number.isFinite(Number(block.left && block.left[1])) && Number.isFinite(Number(block.right && block.right[1])), `${blockLabel} scores must be numeric`, failures);
          assertText(block.note, `${blockLabel} note`);
          break;
        case "countdown":
          assertText(block.value, `${blockLabel} value`);
          assertText(block.note, `${blockLabel} note`);
          break;
        case "handoff":
          assertTupleList([block.left, block.right], 2, `${blockLabel} sides`);
          break;
        case "beacon":
          assertText(block.code, `${blockLabel} code`);
          assertText(block.note, `${blockLabel} note`);
          break;
        case "seats":
          assert(Number.isInteger(block.count) && block.count > 0, `${blockLabel} seat count must be a positive integer`, failures);
          assert(Number.isInteger(block.on) && block.on >= 0 && block.on <= block.count, `${blockLabel} active seats must be an integer between 0 and count`, failures);
          break;
        case "evidence":
          assertTupleList(block.rows, 2, `${blockLabel} evidence rows`);
          assert(!hasOwn(block, "tabs") && !hasOwn(block, "active"), `${blockLabel} must not present inert evidence tabs`, failures);
          break;
        case "ballot":
          assertTupleList(block.options, 2, `${blockLabel} options`);
          if (hasOwn(block, "note")) assertText(block.note, `${blockLabel} note`);
          break;
        case "bars":
          assertTupleList(block.bars, 2, `${blockLabel} bars`);
          if (Array.isArray(block.bars)) {
            assert(block.bars.every((bar) => Number.isFinite(bar[1]) && bar[1] >= 0 && bar[1] <= 100), `${blockLabel} bar values must be between 0 and 100`, failures);
            assert(Math.abs(block.bars.reduce((sum, bar) => sum + (Number(bar[1]) || 0), 0) - 100) < 0.001, `${blockLabel} bars must total 100`, failures);
          }
          break;
        case "proof":
          assertText(block.result, `${blockLabel} result`);
          assertText(block.note, `${blockLabel} note`);
          if (hasOwn(block, "stamp")) assertText(block.stamp, `${blockLabel} stamp`);
          if (hasOwn(block, "verified")) assert(typeof block.verified === "boolean", `${blockLabel} verified must be boolean`, failures);
          break;
        case "checkout":
          assertTupleList(block.rows, 2, `${blockLabel} rows`);
          assertText(block.winner, `${blockLabel} winner`);
          break;
        case "closed":
          assertText(block.value, `${blockLabel} value`);
          break;
        default:
          break;
      }
    });
  }

  assert(continuations.length === 13, `simulator must define one continuation for each event (found ${continuations.length})`, failures);
  continuations.forEach((continuation, eventIndex) => {
    const event = eventIndex + 1;
    const flow = flows[eventIndex] || { steps: [] };
    const finalSnapshot = snapshots.find((snapshot) => snapshot.event === event && snapshot.state === `after-${(flow.steps || []).length}`);
    const finalBlocks = finalSnapshot && finalSnapshot.page && finalSnapshot.page.blocks || [];
    assertText(continuation && continuation.action, `Event ${event} continuation action`);
    assertText(continuation && continuation.targetTitle, `Event ${event} continuation targetTitle`);
    assert(finalBlocks.some((block) => block.title === continuation.targetTitle), `Event ${event} final continuation target is missing: ${continuation.targetTitle || "unnamed"}`, failures);
  });
  const expectedInAppContinuationLabels = [
    "Open live market",
    "View fixed-price offers",
    "View claim eligibility",
    "Create private room",
    "Build a parlay",
    "Go to result posting",
    "Open challenge ticket"
  ];
  assert(
    expectedInAppContinuationLabels.every((label, index) => continuations[index] && continuations[index].action === label),
    "Events 01-07 must use concise production-style in-app continuation labels",
    failures
  );
  assert([3, 4, 5].every((index) => continuations[index] && continuations[index].dock === "page"), "unrelated feature changes in Events 04-06 must use the app page action area instead of a receipt", failures);
  assert([0, 1, 2, 6].every((index) => continuations[index] && continuations[index].dock !== "page"), "contextual continuations in Events 01-03 and 07 must remain attached to their relevant card", failures);
  assert(continuations[6] && continuations[6].targetTitle === "Challenge period", "Event 07 challenge navigation must attach to the open challenge period", failures);
  assert(continuations[9] && continuations[9].action === "View aggregate tally" && continuations[10] && continuations[10].action === "Review appeal bond" && continuations[11] && continuations[11].action === "View final proof relay", "court-path continuation labels must describe the next visible state", failures);
  assert(flows[6] && flows[7] && flows[6].start.account !== flows[7].start.account, "the result submitter and challenger must use different production accounts", failures);

  const oddTicketCssRule = Array.from(html.matchAll(/([^{}]+)\{([^{}]*)\}/g)).some((match) =>
    /trade-ticket[\s>+~]+[^,{]*:nth-child/i.test(match[1]) &&
    /nth-child\(\s*(?:odd|2n\s*\+\s*1)\s*\)/i.test(match[1]) &&
    /grid-column\s*:\s*1\s*\/\s*-1/i.test(match[2])
  );
  const oddTicketClassRule = Array.from(html.matchAll(/([^{}]+)\{([^{}]*)\}/g)).some((match) =>
    /trade-ticket[\s>+~]+[^,{]*\.span-full/i.test(match[1]) &&
    /grid-column\s*:\s*1\s*\/\s*-1/i.test(match[2])
  ) && /\(block\.rows\s*\|\|\s*\[\]\)\.length\s*%\s*2[\s\S]{0,160}classList\.add\("span-full"\)/.test(html);
  assert(!hasOddTicketRows || oddTicketCssRule || oddTicketClassRule, "odd ticket grids must span their final field across both columns", failures);

  function visibleScalar(value) {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
  }

  function visibleArray(value) {
    if (!Array.isArray(value)) return "";
    return value.flat(Infinity).map(visibleScalar).join("");
  }

  function visibleBlockCopy(block) {
    let copy = ["title", "value", "result", "note", "summaryLabel", "summaryValue", "winner", "payout", "question", "code", "yes", "no"]
      .map((key) => visibleScalar(block && block[key]))
      .join("");
    for (const key of ["rows", "details", "left", "right", "tabs", "steps", "people", "legs", "tokens"]) copy += visibleArray(block && block[key]);
    if (block && Array.isArray(block.options)) copy += block.options.map((option) => visibleScalar(Array.isArray(option) ? option[0] : option)).join("");
    if (block && Array.isArray(block.bars)) copy += block.bars.map((bar) => visibleScalar(bar[0]) + visibleScalar(bar[1])).join("");
    return copy;
  }

  const originalDemoChrome = {
    7: ["Settlement", "0x7c...42"],
    8: ["Challenge", "0x7c...42"],
    9: ["Case #1182", "0x7c...42"],
    10: ["Private ballot", "Juror 04"],
    11: ["Case #1182", "0x7c...42"],
    12: ["Appeal checkout", "0x7c...42"],
    13: ["EURO-FINAL", "0x7c...42"]
  };

  function visiblePageCopy(page, event) {
    const chrome = originalDemoChrome[event] || ["", ""];
    if (page && (page.view === "sequence" || page.surface === "protocol")) {
      return "System explainer DemoThemis on-chain sequence Automatic Public receipts" +
        ["section", "title", "subtitle", "status"]
          .map((key) => visibleScalar(page[key]))
          .join("") +
        visibleArray(page.kpis) +
        (page.blocks || []).map(visibleBlockCopy).join("");
    }
    const appBoundary = page && page.surface === "themis" ? appBoundaries.themis : appBoundaries.momo;
    const appBrand = visibleScalar(appBoundary && appBoundary.appBrand || page && page.product);
    const sourceContext = visibleScalar(page && page.context || chrome[0]);
    const frameTitle = event === 8 && page && page.route === "/cases/1182" ? visibleScalar(appBoundaries.handoff && appBoundaries.handoff.frameTitle) : "";
    return frameTitle + appBrand +
      ["section", "title", "subtitle", "status", "primary"]
      .map((key) => visibleScalar(page && page[key]))
      .join("") +
      sourceContext +
      visibleScalar(page && page.account || chrome[1]) +
      visibleArray(page && page.tabs) +
      visibleArray(page && page.kpis) +
      ((page && page.blocks) || []).map(visibleBlockCopy).join("");
  }

  const maxStateCopyBudgets = { 7: 370, 8: 425, 9: 339, 10: 354, 11: 386, 12: 401, 13: 428 };
  const traversalCopyBudgets = { 7: 1416, 8: 1534, 9: 1337, 10: 1433, 11: 1374, 12: 1415, 13: 1991 };
  let demoTraversalCopy = 0;

  for (let event = 7; event <= 13; event += 1) {
    const eventStates = snapshots.filter((snapshot) => snapshot.event === event && snapshot.state !== "base");
    const stateCopyLengths = eventStates.map((snapshot) => visiblePageCopy(snapshot.page, event).length);
    const pageTraversalCopy = stateCopyLengths.reduce((sum, length) => sum + length, 0);
    const guide = stepGuides[event - 1] || {};
    const guideCopy = ["label", "headline", "look", "use"].map((key) => visibleScalar(guide[key])).join("").length;
    const flowCopy = (((flows[event - 1] || {}).steps) || []).map((step) => visibleScalar(step.cue) + visibleScalar(step.result)).join("").length;
    const continuation = continuations[event - 1] || {};
    const continuationCopy = ["action", "from", "to", "note"].map((key) => visibleScalar(continuation[key])).join("").length;
    const eventTraversalCopy = pageTraversalCopy + guideCopy + flowCopy + continuationCopy;

    const largestStateCopy = Math.max.apply(null, stateCopyLengths);
    assert(largestStateCopy <= maxStateCopyBudgets[event], `Event ${event} exceeds its existing maximum visible app-copy budget (${largestStateCopy} > ${maxStateCopyBudgets[event]})`, failures);
    assert(eventTraversalCopy <= traversalCopyBudgets[event], `Event ${event} increases DemoThemis traversal copy (${eventTraversalCopy} > ${traversalCopyBudgets[event]})`, failures);
    demoTraversalCopy += eventTraversalCopy;
  }

  assert(demoTraversalCopy <= 10500, `DemoThemis traversal copy must not exceed the existing 10,500-character budget (found ${demoTraversalCopy})`, failures);

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
  assert(
    privateDraftFields.length > 0 &&
      privateDraftFields.every((block) => (block.rows || []).some((row) => /^resolve condition$/i.test(row[0]) && row[2] === "textarea")) &&
      privateDraftFields.some((block) => block.editable === true) &&
      privateDraftFields.some((block) => block.editable === false),
    "private-room terms must stay editable while drafting and become read-only once shared",
    failures
  );

  const event1Published = snapshots.find((snapshot) => snapshot.event === 1 && snapshot.state === "after-1");
  const event1Opened = snapshots.find((snapshot) => snapshot.event === 1 && snapshot.state === "after-2");
  const event2AfterYes = snapshots.find((snapshot) => snapshot.event === 2 && snapshot.state === "after-1");
  const event2AfterNo = snapshots.find((snapshot) => snapshot.event === 2 && snapshot.state === "after-2");
  const event2Position = snapshots.find((snapshot) => snapshot.event === 2 && snapshot.state === "after-3");
  const event3Estimate = snapshots.find((snapshot) => snapshot.event === 3 && snapshot.state === "start");
  const event3Fill = snapshots.find((snapshot) => snapshot.event === 3 && snapshot.state === "after-1");
  const event4ClaimReady = snapshots.find((snapshot) => snapshot.event === 4 && snapshot.state === "start");
  const event4Claimed = snapshots.find((snapshot) => snapshot.event === 4 && snapshot.state === "after-1");
  const event4Book = snapshots.find((snapshot) => snapshot.event === 4 && snapshot.state === "after-2");
  const event5Funded = snapshots.find((snapshot) => snapshot.event === 5 && snapshot.state === "after-2");
  const snapshotCopy = (snapshot) => JSON.stringify(snapshot && snapshot.page || {});
  assert(event1Published && event1Published.page.route === "/markets/PM-EURO-24/receipt" && event1Opened && event1Opened.page.route === "/m/england-euro-final", "Event 01 must move from its publish confirmation to the actual public market route", failures);
  assert(/\$690/.test(snapshotCopy(event2AfterYes)) && /80\.6 YES/.test(snapshotCopy(event2AfterYes)), "Event 02 YES fill must spend $50 from $740 and hold 80.6 YES", failures);
  assert(/\$610/.test(snapshotCopy(event2AfterNo)) && /210\.5 NO/.test(snapshotCopy(event2AfterNo)), "Event 02 NO fill must leave $610 and hold 210.5 NO", failures);
  assert(/80\.6 YES/.test(snapshotCopy(event2Position)) && /210\.5 NO/.test(snapshotCopy(event2Position)), "Event 02 position summary must reconcile both filled holdings", failures);
  assert(/Estimated fill/.test(snapshotCopy(event3Estimate)) && /Estimated average/.test(snapshotCopy(event3Estimate)) && /Estimated cost/.test(snapshotCopy(event3Estimate)) && !/Fill status/.test(snapshotCopy(event3Estimate)), "Event 03 must present a customer-facing estimated fill instead of matching-engine steps", failures);
  assert(/740 YES/.test(snapshotCopy(event3Fill)) && /\$525\.20/.test(snapshotCopy(event3Fill)) && /\$84\.80/.test(snapshotCopy(event3Fill)) && /Order receipt/.test(snapshotCopy(event3Fill)) && /\$0\.00/.test(snapshotCopy(event3Fill)), "Event 03 fill must reconcile the order in a production receipt with an exact fee", failures);
  assert(/Eligible to claim/.test(snapshotCopy(event4ClaimReady)) && /Your position/.test(snapshotCopy(event4ClaimReady)) && /Why eligible/.test(snapshotCopy(event4ClaimReady)) && /820\.6 YES/.test(snapshotCopy(event4ClaimReady)) && /210\.5 NO/.test(snapshotCopy(event4ClaimReady)), "Event 04 must attach claiming to the position and demote graduation checks to read-only eligibility details", failures);
  assert(/Claim confirmed/.test(snapshotCopy(event4Claimed)) && /World Chain/.test(snapshotCopy(event4Claimed)) && /Transaction/.test(snapshotCopy(event4Claimed)), "Event 04 claim confirmation must look like a production wallet receipt", failures);
  assert(!/\"title\":\"Order book\"/.test(snapshotCopy(event4Claimed)) && /Wallet assets/.test(snapshotCopy(event4Claimed)) && /\"title\":\"Order book\"/.test(snapshotCopy(event4Book)), "Event 04 must not reveal the order book before the user opens it", failures);
  assert(/\$20,000 locked/.test(snapshotCopy(event5Funded)) && /PM-ROOM-204/.test(snapshotCopy(event5Funded)) && !/60c|40c/.test(snapshotCopy(event5Funded)), "Event 05 funded room must show coherent equal-stake terms and a room reference", failures);
  assert(!/Final payout unlocked|redeem YES\/NO/.test(html), "Event 13 supporting copy must remain consistent with its automatic payout receipt", failures);

  assert(!/function\s+renderIntentStrip\s*\(/.test(html), "app views must not render the removed Why/Money/Next strip", failures);
  assert(!/title\.appendChild\(makeEl\("span",\s*"",\s*blockTypeLabel\(type\)\)\)/.test(html), "app cards must not repeat internal block-type labels", failures);
  const toastAnimationStart = html.indexOf("@keyframes toast-rise");
  const toastAnimationEnd = html.indexOf("@keyframes browser-back-icon-nudge", toastAnimationStart);
  const toastAnimation = toastAnimationStart >= 0 && toastAnimationEnd > toastAnimationStart ? html.slice(toastAnimationStart, toastAnimationEnd) : "";
  assert(/to\s*\{\s*opacity:\s*1/.test(toastAnimation) && !/-50%/.test(toastAnimation), "inline state feedback must enter in place and remain visible", failures);
  assert(/\.sim-result-toast::before\s*\{\s*content:\s*"→"/.test(html), "state feedback must use a neutral transition symbol instead of a success mark", failures);
  assert(!/headActions\.appendChild\(makeEl\("div",\s*"app-nav-chip",\s*chrome\.context\)\)/.test(html), "app header must not duplicate navigation context", failures);
  assert(/function\s+compactPageKpis\s*\(/.test(html), "app KPI rendering must remove values already visible in the current blocks", failures);
  assert(/var\s+marketLiquidityDraft\s*=\s*\{\s*yes:\s*\.1,\s*no:\s*0\s*\}/.test(html), "Event 01 opening-liquidity draft state is missing", failures);
  assert(/function\s+applyOpeningLiquidityDraft\s*\(/.test(html) && /block\.title\s*===\s*"Opening odds"/.test(html), "published opening odds must derive from the entered liquidity", failures);
  const liveFieldDraftStart = html.indexOf("function applyLiveFieldDrafts");
  const liveFieldDraftEnd = html.indexOf("function applyBallotChoice", liveFieldDraftStart);
  const liveFieldDraftSource = liveFieldDraftStart >= 0 && liveFieldDraftEnd > liveFieldDraftStart ? html.slice(liveFieldDraftStart, liveFieldDraftEnd) : "";
  assert(
    /liveFieldValue\(0,\s*"Question"/.test(liveFieldDraftSource) &&
      /liveFieldValue\(0,\s*"Close time"/.test(liveFieldDraftSource) &&
      /liveFieldValue\(0,\s*"Resolve condition"/.test(liveFieldDraftSource) &&
      /block\.title\s*===\s*"Market page"/.test(liveFieldDraftSource),
    "all edited public-market fields must persist onto the published page",
    failures
  );
  assert(
    /liveFieldValue\(4,\s*"Outcome"/.test(liveFieldDraftSource) &&
      /liveFieldValue\(4,\s*"Your side"/.test(liveFieldDraftSource) &&
      /liveFieldValue\(4,\s*"Stake per side"/.test(liveFieldDraftSource) &&
      /liveFieldValue\(4,\s*"Winner receives"/.test(liveFieldDraftSource) &&
      /block\.type\s*===\s*"fields"[\s\S]{0,260}liveFieldValue\(4,\s*row\[0\],\s*row\[1\]\)/.test(liveFieldDraftSource) &&
      /activeEventStep\s*===\s*1/.test(liveFieldDraftSource) &&
      /block\.title\s*===\s*"Room funded"/.test(liveFieldDraftSource) &&
      !/block\.title\s*===\s*"Room funded"[\s\S]{0,360}setReceiptDetail\(block,\s*"Resolve rule"/.test(liveFieldDraftSource),
    "edited private-room terms must persist in the terms view without bloating the funding receipt",
    failures
  );
  assert(/document\.createElement\(controlType\s*===\s*"textarea"\s*\?\s*"textarea"\s*:\s*"input"\)/.test(html), "editable market forms must use native inputs and textareas", failures);
  assert(/amountInput\.type\s*=\s*"number"/.test(html) && /amountInput\.addEventListener\("input",\s*syncLiquidityOffer\)/.test(html), "opening-liquidity amounts must be editable native numeric controls", failures);
  assert(/liquidityPreview\.setAttribute\("aria-live",\s*"polite"\)/.test(html) && /Opening odds/.test(html) && /Opening escrow/.test(html), "opening-liquidity controls must expose live odds and escrow feedback", failures);
  assert(/function\s+currentStepValidation\s*\(/.test(html) && /marketFieldsReady/.test(html) && /roomFieldsReady/.test(html), "editable market and room actions must validate required fields", failures);
  assert(html.includes('if (!/^(?:YES|NO)$/i.test(cleanTip(roomSide)))') && html.includes('Choose YES or NO for your side.'), "private-room side entry must accept only a coherent YES or NO position", failures);
  assert(liveFieldDraftSource.includes('if (block.type === "participants")') && liveFieldDraftSource.includes('["Bob", "Signed " + opposingSide]'), "private-room participants must reflect the edited opposing sides after funding", failures);
  assert(/safeLiquidityAmount\(marketLiquidityDraft\.yes\)[\s\S]{0,120}safeLiquidityAmount\(marketLiquidityDraft\.no\)\s*<=\s*0/.test(html), "market publishing must require funded opening liquidity", failures);
  assert(/function\s+advanceEventStep\s*\(\)\s*\{[\s\S]{0,180}currentStepValidation\(\)/.test(html), "invalid form state must be unable to advance the simulator", failures);
  assert(/function\s+makeHelpTip\s*\(/.test(html) && /className\s*=\s*"sim-help"|makeEl\("button",\s*"sim-help",\s*"\?"\)/.test(html), "event explainers must use a visible question-mark control", failures);
  assert(/if\s*\(block\.help\)\s*titleMain\.appendChild\(makeHelpTip\(block\.title\s*\|\|\s*blockTypeLabel\(type\),\s*blockHelpText\(block\)\)\)/.test(html), "app cards must show help only when production-specific help is explicitly supplied", failures);
  assert(!/BLOCK_HELP_BY_TYPE/.test(html), "generic simulator narration must not be injected into production app cards", failures);
  assert(/labelRow\.appendChild\(makeHelpTip\(row\[0\],\s*fieldHelpText\(row\[0\],\s*context\)\)\)/.test(html), "event form and ticket fields must expose field-level explainers", failures);
  assert(/makeHelpTip\(side\s*\+\s*" opening liquidity",\s*liquidityTip\)/.test(html) && /makeHelpTip\("opening odds"/.test(html) && /makeHelpTip\("opening escrow"/.test(html), "opening-liquidity inputs and previews must each expose an explainer", failures);
  assert(/function\s+appendReceiptDetails\s*\(/.test(html) && /makeEl\("dl",\s*"receipt-details"\)/.test(html) && /appendReceiptDetails\(card,\s*block\.details\)/.test(html), "production receipts must render structured account details semantically", failures);
  assert(/aria-controls",\s*"simTooltip"/.test(html) && /aria-expanded",\s*"false"/.test(html) && /event\.key\s*!==\s*"Escape"/.test(html), "event explainers must support focus, touch pinning, and Escape dismissal", failures);
  assert(!/\.live-card-title\s*>\s*span:last-child\s*\{\s*display:\s*none/.test(html) && /\.live-card-title\s*>\s*\.step-link-badge\s*\{\s*display:\s*none/.test(html), "compact views must keep card titles and their explainer controls visible", failures);
  assert(/grid-column:\s*span\s+var\(--live-span,\s*4\)/.test(html), "app cards must consume their content-aware grid spans", failures);
  assert(/main\.setAttribute\("data-block-count",\s*String\(blocks\.length\)\)/.test(html), "app view must expose its rendered block count", failures);
  assert(/live-main\.live-layout-1[\s\S]*?block-proof/.test(html), "single-state proof views must use a horizontal reading layout", failures);
  assert(/block-fields:is\(\.live-span-6,\s*\.live-span-7,\s*\.live-span-12\)/.test(html), "wide form views must distribute fields across available space", failures);
  assert(/\.product-demo\.sim-tight\s+\.live-main\.live-layout-1[\s\S]*?\.live-main\.live-layout-3[\s\S]*?grid-column:\s*1\s*\/\s*-1/.test(html), "compact odd-card layouts must fill their final row", failures);
  assert(/\.product-demo\.sim-tight\s+\.live-page:is\(\.page-create-market,\s*\.page-private-room\)[^}]*grid-column:\s*1\s*\/\s*-1/.test(html), "compact authoring forms must stack at a readable width", failures);
  assert(/\.check-item b\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*overflow-wrap:\s*normal[^}]*white-space:\s*nowrap/.test(html), "short checklist statuses must remain atomic", failures);
  assert(/\.face-check b\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*overflow-wrap:\s*normal[^}]*white-space:\s*nowrap/.test(html), "short presence statuses must remain atomic", failures);
  assert((html.match(/\.sim-app-viewport\s*\{[^}]*min-height:\s*0/g) || []).length >= 1, "app viewport must crop the old empty minimum height", failures);
  assert(/tabs\.setAttribute\("aria-label",\s*"Current app section"\)/.test(html) && /activeSection\.setAttribute\("aria-current",\s*"page"\)/.test(html), "app navigation must show one clear current section instead of inert tab choices", failures);
  assert(!/makeEl\(["']button["'],\s*["']app-nav-action["']/.test(html), "app navigation must not duplicate each event's primary action", failures);

  const liveRendererStart = html.indexOf("function renderLiveBlock");
  const liveTicketBranchStart = html.indexOf('} else if (type === "ticket") {', liveRendererStart);
  const liveTicketBranchEnd = html.indexOf('} else if (type === "table") {', liveTicketBranchStart);
  const liveTicketBranch = liveTicketBranchStart >= 0 && liveTicketBranchEnd > liveTicketBranchStart
    ? html.slice(liveTicketBranchStart, liveTicketBranchEnd)
    : "";
  assert(liveTicketBranch, "live ticket renderer branch is missing", failures);
  assert(!/block\.total|makeEl\("span",\s*"",\s*"Total"\)/.test(liveTicketBranch), "ticket renderer must not manufacture an unconditional Total row", failures);
  assert(/block\.summaryLabel/.test(liveTicketBranch) && /block\.summaryValue/.test(liveTicketBranch), "ticket renderer must use semantic summaryLabel and summaryValue data", failures);
  assert(/if\s*\([^)]*block\.summaryLabel[^)]*block\.summaryValue[^)]*\)/.test(liveTicketBranch), "ticket summaries must render only when both label and value exist", failures);
  assert(!/makeEl\(["']button["']/.test(liveTicketBranch), "ticket summaries must remain informational instead of becoming a second action", failures);
  const ticketSummaryCss = Array.from(html.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter((match) => /ticket-summary\s+b/i.test(match[1]))
    .map((match) => match[2])
    .join("\n");
  assert(!/background\s*:\s*var\(--(?:accent|action-fill)\)|cursor\s*:\s*pointer/i.test(ticketSummaryCss), "ticket summaries must not reuse primary-action styling", failures);

  const liveBallotBranchStart = html.indexOf('} else if (type === "ballot") {', liveRendererStart);
  const liveBallotBranchEnd = html.indexOf('} else if (type === "bars") {', liveBallotBranchStart);
  const liveBallotBranch = liveBallotBranchStart >= 0 && liveBallotBranchEnd > liveBallotBranchStart
    ? html.slice(liveBallotBranchStart, liveBallotBranchEnd)
    : "";
  assert(liveBallotBranch, "live ballot renderer branch is missing", failures);
  assert(!/tabIndex\s*=\s*-1/.test(liveBallotBranch), "ballot choices must remain in native keyboard order", failures);
  assert(/setAttribute\("aria-pressed",[\s\S]*selectedBallotChoice/.test(liveBallotBranch), "ballot choices must expose their selected state", failures);
  assert(/selectedBallotChoice\s*=\s*option\[0\][\s\S]*syncBallotChoice\(\)[\s\S]*confirmBallot\.focus\(\)/.test(liveBallotBranch), "choosing YES or NO must update selection and move focus to confirmation", failures);
  assert(!/advanceEventStep\(\)/.test(liveBallotBranch), "choosing a ballot option must not submit it immediately", failures);
  assert(/confirmBallot\.disabled\s*=\s*!selectedBallotChoice/.test(liveBallotBranch) && /applyGuidedTarget\(confirmBallot/.test(liveBallotBranch), "ballot confirmation must stay disabled until a choice is selected, then become the guided action", failures);

  const liveActionStart = html.indexOf("function makeLiveActionControl");
  const liveActionEnd = html.indexOf("function actionTargetLabel", liveActionStart);
  const liveActionSource = html.slice(liveActionStart, liveActionEnd);
  assert(/block\.type\s*===\s*"ballot"[\s\S]*return null/.test(liveActionSource), "the ballot must not render a redundant Seal button", failures);

  const nextStart = html.indexOf("function goToNextEvent");
  const nextEnd = html.indexOf("function restartRunFromContinuation", nextStart);
  const nextSource = html.slice(nextStart, nextEnd);
  assert(nextSource.indexOf("!isEventComplete()") >= 0 && nextSource.indexOf("!isEventComplete()") < nextSource.indexOf("stage += 1"), "goToNextEvent must refuse to advance before the current event is complete", failures);

  const controlsStart = html.indexOf("function renderControls");
  const controlsEnd = html.indexOf("function render()", controlsStart);
  const controlsSource = html.slice(controlsStart, controlsEnd);
  assert(/next\.disabled\s*=\s*[^;]*!isEventComplete\(\)[^;]*;/.test(controlsSource), "Next event must be visibly disabled until the current event is complete", failures);
  assert(/next\.hidden\s*=\s*false\s*;/.test(controlsSource) && /continuation\.action/.test(controlsSource), "completed events must expose one clearly labelled continuation control", failures);
  assert(/back\.disabled\s*=\s*!canRewindRunState\(\)/.test(controlsSource), "Back must be disabled only when the run has no previous state", failures);

  const railStart = html.indexOf("function renderRail");
  const railEnd = html.indexOf("function renderFocus", railStart);
  const railSource = html.slice(railStart, railEnd);
  const visitEventSource = runThroughFunctionSource(html, "visitEventFromNavigator");
  assert(/btn\.disabled\s*=\s*!canVisit/.test(railSource) && /nextStage\s*>\s*maxReachedByMode\[nextMode\]/.test(visitEventSource), "future event navigator entries must not bypass the run", failures);

  const proofBranchStart = html.indexOf('} else if (type === "proof") {', liveRendererStart);
  const proofBranchEnd = html.indexOf('} else if (type === "checkout") {', proofBranchStart);
  const proofBranch = html.slice(proofBranchStart, proofBranchEnd);
  assert(/block\.verified\s*===\s*false\s*\?\s*""\s*:\s*"Proof verified"/.test(proofBranch), "an unposted proof must not render as verified", failures);

  const productRendererStart = html.indexOf("function renderProductDemo");
  const productRendererEnd = html.indexOf("function renderStageArt", productRendererStart);
  const productRenderer = html.slice(productRendererStart, productRendererEnd);
  assert(/var\s+appBoundary\s*=\s*appBoundaryForPage\(page\)/.test(productRenderer), "the embedded surface must follow the resolved page ownership", failures);
  assert(/appViewport\.setAttribute\("data-app-theme",\s*appTheme\)/.test(productRenderer), "the embedded app viewport must declare its own theme independently of the run path", failures);
  assert(/brand\.appendChild\(makeEl\("span",\s*"",\s*appBrand\)\)/.test(productRenderer), "the embedded app brand must follow the current app boundary", failures);
  assert(/APP_BOUNDARIES\.handoff\.frameTitle/.test(productRenderer), "the PredictionMoMo court handoff must retain its outer integration frame", failures);
  assert(/makeEl\("span",\s*"app-nav-chip",\s*chrome\.context\)/.test(productRenderer), "the PredictionMoMo web app must keep its normal context chip", failures);
  assert(!/app-backend-chip|backendLabel|sends court cases to the/.test(productRenderer), "DemoThemis integration copy must stay outside the web app", failures);
  assert(/makeEl\("div",\s*"sim-demand-frame"\)/.test(productRenderer) && /makeEl\("div",\s*"sim-demand-frame-tab",\s*frameTitle\)/.test(productRenderer), "Events 07-08 must wrap the browser in the labelled demand frame", failures);
  assert(/demandFrame\.appendChild\(demandFrameTab\)[\s\S]*demandFrame\.appendChild\(preview\)[\s\S]*root\.appendChild\(demandFrame\)/.test(productRenderer), "the demand label must frame the whole browser instead of entering the web app", failures);
  assert(/nav\.appendChild\(brand\)[\s\S]*nav\.appendChild\(tabs\)[\s\S]*nav\.appendChild\(navTools\)/.test(productRenderer), "the app header must retain its brand, section, and navigation-tools structure", failures);
  assert(/navTools\.appendChild\(contextChip\)[\s\S]*navTools\.appendChild\(makeEl\("span",\s*"app-nav-chip",\s*chrome\.user\)\)/.test(productRenderer), "the app header must preserve its context and user identity", failures);
  const protocolBranchIndex = productRenderer.indexOf("if (isSequencePage(page))");
  const appBoundaryIndex = productRenderer.indexOf("var appBoundary = appBoundaryForPage(page)");
  assert(protocolBranchIndex >= 0 && appBoundaryIndex > protocolBranchIndex, "automatic system states must branch to the explainer before any application boundary or browser is constructed", failures);
  assert(/root\.appendChild\(sequence\)/.test(productRenderer) && !/renderProtocolActivity/.test(productRenderer) && !/app-backend-/i.test(html), "the protocol sequence must be a direct standalone surface with no legacy app region", failures);

  const urlStart = html.indexOf("function simulatedAppUrl(");
  const urlEnd = html.indexOf("var LIVE_BLOCK_LAYOUT_WEIGHTS", urlStart);
  assert(urlStart >= 0 && urlEnd > urlStart, "simulated app URL helper is missing", failures);
  if (urlStart >= 0 && urlEnd > urlStart) {
    try {
      const urlContext = {};
      vm.runInNewContext(html.slice(urlStart, urlEnd) + "\nthis.__simulatedAppUrl = simulatedAppUrl;", urlContext, { filename: "the-design.simulated-url.js" });
      const modeStart = html.indexOf("var APP_BOUNDARIES =");
      const modeEnd = html.indexOf("var stage =", modeStart);
      const modeContext = {};
      vm.runInNewContext(html.slice(modeStart, modeEnd) + "\nthis.__appBoundaries = APP_BOUNDARIES;", modeContext, { filename: "the-design.url-boundaries.js" });
      const boundaries = modeContext.__appBoundaries;
      const simulatedUrls = {};
      for (const stageIndex of [0, 1, 2, 3, 4, 5, 6, 7, 9, 11]) {
        const surface = stageIndex < 8 ? "momo" : "themis";
        simulatedUrls[stageIndex] = urlContext.__simulatedAppUrl(pages[stageIndex], boundaries[surface]);
      }
      assert([0, 1, 2, 3, 4, 5, 6, 7].every((index) => /^app\.predictionmomo\.com\//.test(simulatedUrls[index])), "Events 01-08 must remain on the PredictionMoMo app origin", failures);
      assert([9, 11].every((index) => /^court\.demothemis\.com\//.test(simulatedUrls[index])), "participant court events must use the DemoThemis app origin", failures);
      assert(simulatedUrls[7] === "app.predictionmomo.com/markets/england-euro-final/challenge", `Event 08 challenge must use its production PredictionMoMo route (found ${simulatedUrls[7]})`, failures);
      assert(simulatedUrls[6] === "app.predictionmomo.com/markets/england-euro-final/result", `Event 07 result proposal must use its production PredictionMoMo route (found ${simulatedUrls[6]})`, failures);
      assert(simulatedUrls[5] === "app.predictionmomo.com/parlays/new", "Event 06 must open on the production parlay-builder route", failures);
      assert(!/explorer\.demothemis\.com/i.test(html), "protocol explainers must not expose a fake explorer URL", failures);
    } catch (error) {
      failures.push("simulated app URL helper cannot be evaluated: " + error.message);
    }
  }

  assert(/var\s+activeTab\s*=\s*page\.activeTab/.test(html) && /makeEl\("span",\s*"on",\s*activeTab\)/.test(html), "the visible app section must follow the current simulator state", failures);
  assert(/data-sim-steps/.test(html) && /steps\.indexOf\(activeEventStep\)/.test(html), "state-machine highlighting must follow the current action step", failures);
  assert(/function\s+previousRunState\s*\(/.test(html) && /selectedBallotChoice\s*=\s*""/.test(html), "linear run history and ballot state must reset cleanly", failures);
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
  assert((css.match(/font-family:\s*["']Alegreya Sans App["'][\s\S]*?size-adjust:\s*107%/gi) || []).length === 5, "every PredictionMoMo font face must retain the 107% optical calibration", failures);
  assert(/font-family:\s*["']Literata App["'][\s\S]*?size-adjust:\s*97%/i.test(css), "DemoThemis Literata must retain the 97% optical calibration", failures);
  assert(!/font-family:\s*["'](?:Alegreya Sans App|Literata App)["'][\s\S]*?size-adjust:\s*100%/i.test(css), "primary product fonts must not fall back to equal CSS scaling", failures);
  assert(/font-family:\s*["']Noto Sans Symbols 2 App["'][\s\S]*?size-adjust:\s*72%/i.test(css), "UI symbol fallback must match the product cap height", failures);
  assert(/font-family:\s*["']Noto Serif Tibetan App["'][\s\S]*?size-adjust:\s*95%/i.test(css), "Tibetan fallback must match the product cap height", failures);
  assert(/font-synthesis:\s*none/i.test(html) && /font-variant-numeric:\s*lining-nums\s+tabular-nums/i.test(html), "product typography must disable synthetic styles and use stable numeric widths", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.run-control-panel/i.test(html), "event transport controls must inherit product typography", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.sim-step-guide/i.test(html), "current event guide must inherit product typography", failures);
  assert(/\.product-mode-panel\[data-product-mode=["']momo["']\]\s+\.run-control-panel/i.test(html) && /\.product-mode-panel\[data-product-mode=["']themis["']\]\s+\.run-control-panel/i.test(html), "event transport controls must inherit each product palette", failures);
  assert(/\.product-mode-panel\[data-product-mode=["']momo["']\]\s+\.sim-step-guide/i.test(html) && /\.product-mode-panel\[data-product-mode=["']themis["']\]\s+\.sim-step-guide/i.test(html), "current event guide must inherit each product palette", failures);
  assert(/--product-text-caption:\s*\.75rem/i.test(html) && /--product-text-body:\s*\.875rem/i.test(html) && /--product-text-display:\s*1\.3rem/i.test(html) && /--product-text-figure:\s*1\.62rem/i.test(html), "product typography must use a readable shared semantic type scale", failures);
  assert(/--product-weight-control:\s*800/i.test(html) && /--product-weight-control:\s*650/i.test(html), "product typography must compensate weights per font family", failures);
  assert(/--product-leading-copy:\s*1\.4/i.test(html) && /--product-leading-copy:\s*1\.46/i.test(html), "product typography must compensate line spacing per font family", failures);
  assert(/\.sim-app-viewport\s+:where\(\*\)\s*\{\s*letter-spacing:\s*0/i.test(html), "product typography must remove font-dependent tracking inside the app viewport", failures);
  const normalizationMarker = html.indexOf("/* Optical type normalization");
  assert(normalizationMarker >= 0, "product typography normalization block is missing", failures);
  if (normalizationMarker >= 0) {
    const sourceCss = html.slice(0, normalizationMarker);
    const normalizationCss = html.slice(normalizationMarker);
    const uncoveredMicrocopy = [];
    for (const match of sourceCss.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      const selector = match[1].trim().replace(/\s+/g, " ");
      if (/\.machine-/.test(selector)) continue;
      if (/\.sim-(?:browser|url)/.test(selector)) continue;
      if (!/(?:product-demo|app-|live-|sim-|tutorial|stage-|run-progress|event-|fake-|intent-|odds-|wallet-|participant|message|leg-|team-|countdown|beacon-|face-|evidence-|proof-|checkout)/.test(selector)) continue;
      const sizeMatch = match[2].match(/font-size:\s*([0-9.]+)rem/);
      if (!sizeMatch || Number(sizeMatch[1]) >= 0.7 || /::(?:before|after)/.test(selector)) continue;
      const classes = Array.from(selector.matchAll(/\.([a-zA-Z0-9_-]+)/g), (item) => item[1]).filter((name) => !/^sim-(?:tight|ultra|compact)$/.test(name));
      if (!classes.some((name) => normalizationCss.includes("." + name))) uncoveredMicrocopy.push(selector);
    }
    assert(uncoveredMicrocopy.length === 0, "product typography leaves sub-caption text unnormalized: " + uncoveredMicrocopy.join(", "), failures);
  }
  assert(/--bg:\s*#f2e3cd/i.test(html) && /--surface:\s*#fff7e8/i.test(html) && /--accent:\s*#ad520f/i.test(html) && /--accent-ink:\s*#6f4400/i.test(html), "PredictionMoMo must use the high-contrast amber parchment reading palette", failures);
  assert(/\.live-kpis:has\(>\s*\.live-kpi:only-child\)/i.test(html), "single app metrics must stay compact instead of becoming a full-width banner", failures);
  assert(/\.page-appeal-checkout\s+\.app-seat-grid\s*\{[^}]*repeat\(11/i.test(html), "appeal panels must use a dense desktop seat grid", failures);
  assert(/--action-fill:\s*#ad520f/i.test(html) && /--continue-fill:\s*#087068/i.test(html), "PredictionMoMo app actions need distinct brand and continuation colors", failures);
  assert(/--action-fill:\s*#2f7199/i.test(html) && /--continue-ink:\s*#172017/i.test(html), "DemoThemis actions need a readable dark-theme foreground pairing", failures);
  assert(/\.page-create-market\s+\.block-fields/i.test(html) && /\.page-final-receipt\s+\.block-closed/i.test(html), "every app view must expose a scan-first anchor surface", failures);
  assert(/\.live-kpis\s*>\s*\.live-kpi:nth-child\(n\)[\s\S]{0,220}background:\s*var\(--surface\)/i.test(html), "app metrics must use neutral structure instead of decorative category colors", failures);
  const scanHierarchyStart = html.indexOf("/* Scan-first app hierarchy");
  const scanHierarchyCss = scanHierarchyStart >= 0 ? html.slice(scanHierarchyStart, html.indexOf("</style>", scanHierarchyStart)) : "";
  for (const template of ["create-market", "live-market", "order-book", "wallet-unlock", "private-room", "parlay-slip", "resolution-dashboard", "dispute-handoff", "jury-draw", "juror-workspace", "verdict-page", "appeal-checkout", "final-receipt"]) {
    assert(scanHierarchyCss.includes(`.page-${template}`), `scan-first hierarchy is missing the ${template} app view`, failures);
  }
  assert(!/#b83c32|#f7f2e8|#fffdf8/i.test(html), "PredictionMoMo must not retain the red or near-white palette", failures);
}

function checkRunThroughPriorityUxFixes(html, failures) {
  const css = Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi), (match) => match[1]).join("\n");

  function normalizedSelector(selector) {
    return selector.trim().replace(/\s+/g, " ");
  }

  function finalCssValue(selector, property) {
    let value = null;
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = match[1].split(",").map(normalizedSelector);
      if (!selectors.includes(selector)) continue;
      const declarationPattern = new RegExp(`${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;}]+)`, "gi");
      for (const declaration of match[2].matchAll(declarationPattern)) value = declaration[1].trim();
    }
    return value;
  }

  for (const size of ["tight", "ultra"]) {
    const liveColumns = finalCssValue(`.product-demo.sim-${size} .live-main`, "grid-template-columns");
    const kpiColumns = finalCssValue(`.product-demo.sim-${size} .live-kpis`, "grid-template-columns");
    assert(liveColumns === "1fr", `${size} simulator layouts must keep app cards in one readable column`, failures);
    assert(Boolean(kpiColumns) && !/repeat\(\s*3\s*,/i.test(kpiColumns), `${size} simulator metrics must wrap responsively instead of forcing three narrow columns`, failures);
  }
  const responsiveKpiColumns = finalCssValue(".product-mode-panel[data-product-mode] .product-demo .sim-live-preview .live-kpis", "grid-template-columns");
  assert(/repeat\(\s*auto-fit\s*,\s*minmax/i.test(responsiveKpiColumns || ""), "app metrics must use content-sized responsive columns across both product themes", failures);
  assert(/minmax\(\s*0\s*,\s*1fr\s*\)/i.test(finalCssValue(".sim-live-preview", "grid-template-rows") || ""), "the app frame must allow its app viewport to shrink on short screens", failures);
  assert(/--sim-preview-max-height/i.test(finalCssValue(".sim-live-preview", "max-height") || ""), "the app frame must expose a viewport-height cap", failures);
  assert(/auto/i.test(finalCssValue(".sim-app-viewport", "overflow-y") || ""), "a height-capped app frame must keep its app content scrollable", failures);
  assert(/--sim-preview-max-height/i.test(finalCssValue(".protocol-sequence", "max-height") || ""), "the protocol sequence canvas must share the active-surface viewport cap", failures);
  assert(/auto/i.test(finalCssValue(".protocol-sequence-scroll", "overflow-y") || ""), "a height-capped sequence canvas must keep its records scrollable", failures);
  assert(finalCssValue(".product-demo.sim-compact .protocol-trace", "grid-template-columns") === "1fr", "compact protocol sequences must become a vertical process lane", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.product-demo\s+\.protocol-sequence\s+\.protocol-record\.live-card\s*\{[^}]*border-radius:\s*6px[^}]*box-shadow:\s*none/is.test(css), "protocol records must override the later app-card normalization with their flat sequence-node design", failures);
  assert(/\.protocol-sequence\[data-sequence-profile=["']momo["']\]\s*\{[^}]*--protocol-accent:\s*#f0a064/is.test(css), "PredictionMoMo execution sequences must carry a distinct product-linked system palette", failures);
  assert(!/Each mock screen|Product mockup for the current simulation step|The app gets one panel|opens its court app/i.test(html), "standalone explainers must not be described as app or mock screens", failures);

  assert(!/function\s+makeLiveContinuationControl\s*\(/.test(html), "same-app continuation controls must reuse the existing next-event button", failures);
  assert(/function\s+renderRoleHandoff\s*\(/.test(html), "completed events must render their role handoff outside the browser", failures);

  const nextControlTags = openingTags(html, "button").filter((tagHtml) => tagAttributeValue(tagHtml, "id") === "runNext");
  assert(nextControlTags.length === 1, "the run-through must reuse one next-event control instead of rendering duplicate buttons", failures);
  const placementSource = runThroughFunctionSource(html, "nextControlPlacement");
  const dockingSource = runThroughFunctionSource(html, "placeNextEventControl");
  const tutorialDockSource = runThroughFunctionSource(html, "renderTutorialDock");
  assert(Boolean(placementSource) && Boolean(dockingSource), "the next-event control needs explicit adaptive placement logic", failures);
  assert(/!isEventComplete\(\)[\s\S]*return\s+["']outer["']/.test(placementSource), "the next-event control must remain in the simulator controls until the current event is complete", failures);
  assert(/currentSurface\s*===\s*["']protocol["'][^;]*return\s+["']explainer["']/.test(placementSource), "a completed protocol sequence must continue from the outer explainer guide", failures);
  assert(/upcomingSurface\s*===\s*["']protocol["']/.test(placementSource), "an application-to-protocol transition must leave through neutral browser navigation", failures);
  assert(/upcomingSurface\s*!==\s*currentSurface/.test(placementSource) && /continuation\.restart/.test(placementSource), "cross-app transitions and restart must stay outside production app navigation", failures);
  assert(/placement\s*===\s*["']app["'][\s\S]*continuationRow\.appendChild\(next\)[\s\S]*continuationHost\.appendChild\(continuationRow\)/.test(dockingSource), "same-app continuations must dock the existing next control inside the relevant app content", failures);
  assert(!/navTools\.appendChild\(next\)/.test(dockingSource), "same-app continuations must not crowd the app header", failures);
  assert(/nextControlPlacement\(page\)\s*!==\s*["']app["']/.test(tutorialDockSource), "the walkthrough guide must not duplicate a same-app continuation above its in-app button", failures);
  assert(/placement\s*===\s*["']browser["'][\s\S]*browserBar\.appendChild\(next\)/.test(dockingSource), "non-app and cross-app continuations must dock the existing next control in the browser frame", failures);
  assert(/placement\s*===\s*["']explainer["'][\s\S]*guideDock\.appendChild\(next\)/.test(dockingSource), "protocol continuations must dock in the walkthrough guide outside the sequence canvas", failures);
  assert(/runControls\.appendChild\(next\)/.test(dockingSource), "incomplete events must retain the next control in the simulator toolbar", failures);
  assert(/next\.classList\.add\("sim-app-action",\s*"sim-app-continuation"\)/.test(dockingSource) && /\.sim-app-action\s*\{[^}]*background:\s*var\(--accent\)/is.test(css), "in-app continuation navigation must use the active app's primary-action styling", failures);
  assert(/\.sim-browser-next\s*\{[^}]*font-family:\s*var\(--browser-chrome-font\)/is.test(css), "cross-surface continuation navigation must visually belong to the neutral browser frame", failures);
  assert(/\.sim-explainer-next\s*\{[^}]*background:\s*var\(--continue-fill\)/is.test(css), "explainer continuations must use the walkthrough guide's continuation styling", failures);
  assert(/auto\s+minmax\(0,\s*1fr\)\s+auto/i.test(finalCssValue(".sim-browser-bar", "grid-template-columns") || ""), "the browser frame must reserve a distinct navigation position after its URL", failures);

  const navSurfaces = readRunThroughLiteral(html, "EVENT_SURFACES", failures);
  const navFlows = readRunThroughLiteral(html, "APP_FLOWS", failures);
  const navContinuations = readRunThroughLiteral(html, "EVENT_CONTINUATIONS", failures);
  const eventStartSurfaceSource = runThroughFunctionSource(html, "eventStartSurface");
  const nextEventSurfaceSource = runThroughFunctionSource(html, "nextEventSurface");
  if (Array.isArray(navSurfaces) && Array.isArray(navFlows) && Array.isArray(navContinuations) && eventStartSurfaceSource && nextEventSurfaceSource && placementSource) {
    try {
      const navigationContext = {
        APP_FLOWS: navFlows,
        EVENT_SURFACES: navSurfaces,
        stage: 0,
        eventComplete: false
      };
      navigationContext.eventSurfaceDefaults = (stageIndex) => navSurfaces[stageIndex] || { surface: "momo" };
      navigationContext.currentContinuation = () => navContinuations[navigationContext.stage] || null;
      navigationContext.isEventComplete = () => navigationContext.eventComplete;
      vm.runInNewContext(
        [eventStartSurfaceSource, nextEventSurfaceSource, placementSource, "this.__nextControlPlacement = nextControlPlacement;"].join("\n"),
        navigationContext,
        { filename: "the-design.next-control-placement.js" }
      );
      const resolvedCompletionSurfaces = navSurfaces.map((entry) => entry.surface);
      resolvedCompletionSurfaces[11] = "protocol";
      resolvedCompletionSurfaces[resolvedCompletionSurfaces.length - 1] = "momo";
      const expectedPlacements = ["app", "app", "app", "app", "app", "app", "app", "browser", "explainer", "browser", "explainer", "explainer", "browser"];
      for (let stageIndex = 0; stageIndex < navSurfaces.length; stageIndex += 1) {
        navigationContext.stage = stageIndex;
        navigationContext.eventComplete = false;
        assert(navigationContext.__nextControlPlacement({ surface: resolvedCompletionSurfaces[stageIndex] }) === "outer", `Event ${stageIndex + 1} must keep navigation outer while incomplete`, failures);
        navigationContext.eventComplete = true;
        const expectedPlacement = expectedPlacements[stageIndex];
        assert(navigationContext.__nextControlPlacement({ surface: resolvedCompletionSurfaces[stageIndex] }) === expectedPlacement, `Event ${stageIndex + 1} completed navigation must dock in the ${expectedPlacement}`, failures);
      }
    } catch (error) {
      failures.push("adaptive next-event placement cannot be evaluated: " + error.message);
    }
  }

  const startingButtons = openingTags(html, "button").filter((tagHtml) => /\bproduct-tab\b/.test(tagAttributeValue(tagHtml, "class") || ""));
  assert(startingButtons.length === 2, "run-through must retain both starting-point choices", failures);
  assert(startingButtons.every((tagHtml) => !tagAttributeValue(tagHtml, "role") && tagAttributeValue(tagHtml, "aria-pressed") === "false" && !tagAttributeValue(tagHtml, "aria-selected")), "starting points must be ordinary pressed-state buttons rather than tabs", failures);
  assert(/var\s+selectedRunMode\s*=\s*(?:null|["']["'])/.test(html), "the chosen starting path needs stable state separate from the current event", failures);

  const syncStart = html.indexOf("function syncProductMode");
  const syncEnd = html.indexOf("function saveProductProgress", syncStart);
  const syncSource = syncStart >= 0 && syncEnd > syncStart ? html.slice(syncStart, syncEnd) : "";
  assert(/getAttribute\(["']data-product-mode["']\)\s*===\s*selectedRunMode/.test(syncSource) && /setAttribute\(["']aria-pressed["']/.test(syncSource), "starting-point selection must remain tied to selectedRunMode", failures);
  assert(/var\s+(?:mode|stageMode)\s*=\s*productModeForStage\(stage\)/.test(syncSource) && /setAttribute\(["']data-product-mode["'],\s*(?:mode|stageMode)\)/.test(syncSource), "the current journey theme must still follow the current event", failures);
  assert(!/selectedRunMode\s*=\s*productModeForStage\(stage\)/.test(html), "event progress must not overwrite the chosen starting path", failures);

  const selectStart = html.indexOf("function selectProductMode");
  const selectEnd = html.indexOf("function makeEl", selectStart);
  const selectSource = selectStart >= 0 && selectEnd > selectStart ? html.slice(selectStart, selectEnd) : "";
  assert(/selectedRunMode\s*=\s*mode/.test(selectSource), "choosing a starting point must persist selectedRunMode", failures);
  const railStart = html.indexOf("function renderRail");
  const railEnd = html.indexOf("function renderFocus", railStart);
  const railSource = railStart >= 0 && railEnd > railStart ? html.slice(railStart, railEnd) : "";
  assert(!/runStartStage\s*=/.test(railSource), "event navigator visits must not rewrite the selected run boundary", failures);
  const eventNumberClickStart = railSource.indexOf('btn.addEventListener("click"');
  const eventNumberClickEnd = railSource.indexOf("stepList.appendChild(btn)", eventNumberClickStart);
  const eventNumberClickSource = eventNumberClickStart >= 0 && eventNumberClickEnd > eventNumberClickStart
    ? railSource.slice(eventNumberClickStart, eventNumberClickEnd)
    : "";
  const eventVisitSource = runThroughFunctionSource(html, "visitEventFromNavigator");
  assert(
    /visitEventFromNavigator\(nextStage\)/.test(eventNumberClickSource) &&
      /stage\s*=\s*nextStage[\s\S]*resetEventFlow\(false\)/.test(eventVisitSource) &&
      !/nextStage\s*===\s*stage/.test(eventVisitSource) &&
      !/resetEventFlow\([^)]*completedStages/.test(eventVisitSource),
    "every event-number click, including current and completed events, must open Action 1",
    failures
  );
  if (eventVisitSource) {
    try {
      const visitContext = {
        stage: 0,
        activeEventStep: 0,
        activeAction: -1,
        runStartStage: 0,
        openStageGroup: -1,
        selectedRunMode: "momo",
        completedStages: {},
        maxReachedByMode: { momo: 5, themis: 12 },
        productModeForStage(stageIndex) { return stageIndex < 6 ? "momo" : "themis"; },
        saveProductProgress() {},
        setEventNavigatorOpen() {},
        allowNextGuidedReveal() {},
        prepareSimulatorTransition() {},
        render() {}
      };
      visitContext.resetEventFlow = function (toEnd) {
        visitContext.__resetArguments.push(toEnd);
        visitContext.activeEventStep = toEnd ? 99 : 0;
        visitContext.activeAction = visitContext.activeEventStep > 0 ? visitContext.activeEventStep - 1 : -1;
      };
      vm.runInNewContext(eventVisitSource + "\nthis.__visitEventFromNavigator = visitEventFromNavigator;", visitContext, { filename: "the-design.event-navigation.js" });
      for (let targetStage = 0; targetStage < 13; targetStage += 1) {
        for (const startingStage of [targetStage, (targetStage + 1) % 13]) {
          visitContext.stage = startingStage;
          visitContext.activeEventStep = 99;
          visitContext.activeAction = 98;
          visitContext.runStartStage = 0;
          visitContext.selectedRunMode = "momo";
          visitContext.completedStages = Object.fromEntries(Array.from({ length: 13 }, (_, index) => [index, true]));
          visitContext.maxReachedByMode = { momo: 5, themis: 12 };
          visitContext.__resetArguments = [];
          const opened = visitContext.__visitEventFromNavigator(targetStage);
          assert(opened === true, `Event ${targetStage + 1} must remain visitable from the full event navigator`, failures);
          assert(visitContext.stage === targetStage, `Event ${targetStage + 1} navigation must select the clicked event`, failures);
          assert(visitContext.activeEventStep === 0 && visitContext.activeAction === -1, `Event ${targetStage + 1} navigation must land on Action 1`, failures);
          assert(visitContext.__resetArguments.length === 1 && visitContext.__resetArguments[0] === false, `Event ${targetStage + 1} navigation must use the first-action reset`, failures);
          assert(visitContext.completedStages[targetStage] === true, `Event ${targetStage + 1} replay must preserve completion history`, failures);
          assert(visitContext.selectedRunMode === "momo" && visitContext.runStartStage === 0, `Event ${targetStage + 1} replay must preserve the selected starting path`, failures);
        }
      }
      visitContext.runStartStage = 6;
      visitContext.selectedRunMode = "themis";
      for (let targetStage = 6; targetStage < 13; targetStage += 1) {
        visitContext.stage = 12;
        visitContext.activeEventStep = 99;
        visitContext.activeAction = 98;
        visitContext.__resetArguments = [];
        const opened = visitContext.__visitEventFromNavigator(targetStage);
        assert(opened === true && visitContext.activeEventStep === 0 && visitContext.activeAction === -1, `Court-backed Event ${targetStage + 1} navigation must land on Action 1`, failures);
        assert(visitContext.selectedRunMode === "themis" && visitContext.runStartStage === 6, `Court-backed Event ${targetStage + 1} navigation must preserve its starting path`, failures);
      }
    } catch (error) {
      failures.push("event-number Action 1 navigation cannot be evaluated: " + error.message);
    }
  }
  const runScrollStart = html.lastIndexOf('window.addEventListener("scroll"');
  const runScrollEnd = html.indexOf('document.addEventListener("scroll"', runScrollStart);
  const runScrollSource = runScrollStart >= 0 && runScrollEnd > runScrollStart ? html.slice(runScrollStart, runScrollEnd) : "";
  assert(
    Boolean(runScrollSource) && !/closeEventNavigator|collapseLooseStageGroups/.test(runScrollSource),
    "ordinary page scrolling must not close the event navigator before an event-number click completes",
    failures
  );

  const productDemoTag = openingTags(html, "div").find((tagHtml) => tagAttributeValue(tagHtml, "id") === "productDemo");
  const announcementTag = openingTags(html, "div").find((tagHtml) => tagAttributeValue(tagHtml, "id") === "runAnnouncement");
  assert(Boolean(productDemoTag) && !tagAttributeValue(productDemoTag, "aria-live"), "the replaceable walkthrough view must not announce its entire DOM after every action", failures);
  assert(
    Boolean(announcementTag) && /\bsr-only\b/.test(tagAttributeValue(announcementTag, "class") || "") &&
      tagAttributeValue(announcementTag, "role") === "status" && tagAttributeValue(announcementTag, "aria-live") === "polite" &&
      tagAttributeValue(announcementTag, "aria-atomic") === "true",
    "run-through needs one atomic polite status region for concise action announcements",
    failures
  );
  assert(/function\s+announceRunStatus\s*\(/.test(html) && (html.match(/announceRunStatus\s*\(/g) || []).length > 1, "run-through actions must publish concise status updates", failures);
  assert(/function\s+restoreSimulatorFocus\s*\(/.test(html) && (html.match(/restoreSimulatorFocus\s*\(/g) || []).length > 1, "simulator rerenders must restore keyboard focus", failures);
  const restoreStart = html.indexOf("function restoreSimulatorFocus");
  const restoreEnd = html.indexOf("function currentRunStatusMessage", restoreStart);
  const restoreSource = restoreStart >= 0 ? html.slice(restoreStart, restoreEnd > restoreStart ? restoreEnd : undefined) : "";
  assert(/\.focus\(\s*\{\s*preventScroll\s*:\s*true\s*\}\s*\)/.test(restoreSource), "restored simulator focus must not fight the guided scrolling behavior", failures);

  const scrollMathStart = html.indexOf("function computeFrameScrollTop");
  const scrollMathEnd = html.indexOf("function simulatorFrameForPreview", scrollMathStart);
  assert(scrollMathStart >= 0 && scrollMathEnd > scrollMathStart, "run-through must expose deterministic frame-first scroll geometry", failures);
  if (scrollMathStart >= 0 && scrollMathEnd > scrollMathStart) {
    try {
      const scrollContext = {};
      vm.runInNewContext(html.slice(scrollMathStart, scrollMathEnd) + "\nthis.__computeFrameScrollTop = computeFrameScrollTop;", scrollContext, { filename: "the-design.frame-scroll.js" });
      const cases = [
        { label: "short desktop from above", current: 1200, top: -270, bottom: 280, safeTop: 70, safeBottom: 630, max: 5000 },
        { label: "short desktop from below", current: 800, top: 500, bottom: 1052, safeTop: 60, safeBottom: 650, max: 5000 },
        { label: "mobile visual viewport", current: 1400, top: -131, bottom: 449, safeTop: 64, safeBottom: 656, max: 5000 },
        { label: "offset visual viewport", current: 900, top: 420, bottom: 840, safeTop: 118, safeBottom: 590, max: 5000 },
        { label: "already visible", current: 1000, top: 100, bottom: 560, safeTop: 64, safeBottom: 656, max: 5000 }
      ];
      for (const sample of cases) {
        const desired = scrollContext.__computeFrameScrollTop(sample.current, sample.top, sample.bottom, sample.safeTop, sample.safeBottom, sample.max);
        const shift = desired - sample.current;
        const resultingTop = sample.top - shift;
        const resultingBottom = sample.bottom - shift;
        assert(desired >= 0 && desired <= sample.max, `${sample.label} scroll must stay within the document`, failures);
        assert(resultingTop >= sample.safeTop - 1 && resultingBottom <= sample.safeBottom + 1, `${sample.label} must leave the complete active surface inside the visible viewport`, failures);
        if (sample.label === "already visible") assert(desired === sample.current, "an already visible surface must not move", failures);
      }
      for (const viewportHeight of [320, 480, 568, 640, 667, 720, 768, 900, 1080, 1200]) {
        const safeTop = Math.min(84, Math.max(48, Math.round(viewportHeight * 0.1)));
        const safeBottom = viewportHeight - 10;
        const frameHeight = safeBottom - safeTop;
        for (const frameTop of [-frameHeight * 0.72, safeTop + 4, safeBottom - frameHeight * 0.18]) {
          const current = 2400;
          const desired = scrollContext.__computeFrameScrollTop(current, frameTop, frameTop + frameHeight, safeTop, safeBottom, 12000);
          const shift = desired - current;
          const resultingTop = frameTop - shift;
          const resultingBottom = frameTop + frameHeight - shift;
          assert(resultingTop >= safeTop - 1 && resultingBottom <= safeBottom + 1, `${viewportHeight}px viewport must retain the complete height-capped surface`, failures);
        }
      }
    } catch (error) {
      failures.push("run-through frame scroll geometry cannot be evaluated: " + error.message);
    }
  }

  const completedFocusStart = html.indexOf("function focusCompletedEventState");
  const completedFocusEnd = html.indexOf("function scrollToChangedAppArea", completedFocusStart);
  const completedFocusSource = completedFocusStart >= 0 && completedFocusEnd > completedFocusStart ? html.slice(completedFocusStart, completedFocusEnd) : "";
  assert(/querySelector\(["']#runNext["']\)/.test(completedFocusSource) && /focusSimulatorTarget\(button\)/.test(completedFocusSource) && !/scrollToY\(/.test(completedFocusSource), "completed events must focus the newly available contextual continuation without moving the frame", failures);
  const revealStart = html.indexOf("function revealGuidedTargetIfNeeded");
  const revealEnd = html.indexOf("function allowNextGuidedReveal", revealStart);
  const revealSource = revealStart >= 0 && revealEnd > revealStart ? html.slice(revealStart, revealEnd) : "";
  assert(/focusSimulatorTarget\(target\)/.test(revealSource) && !/targetVisible/.test(revealSource), "new events must validate the whole active surface rather than only the highlighted control", failures);
  const surfaceFocusStart = html.indexOf("function focusSimulatorTarget");
  const surfaceFocusEnd = html.indexOf("function focusCompletedEventState", surfaceFocusStart);
  const surfaceFocusSource = surfaceFocusStart >= 0 && surfaceFocusEnd > surfaceFocusStart ? html.slice(surfaceFocusStart, surfaceFocusEnd) : "";
  assert(/querySelector\(["']\.sim-surface-frame["']\)/.test(surfaceFocusSource), "guided focus must resolve the common app-or-explainer surface frame", failures);
  assert(surfaceFocusSource.indexOf("fitSimulatorFrameToViewport(surfaceFrame, bounds)") >= 0 && surfaceFocusSource.indexOf("fitSimulatorFrameToViewport(surfaceFrame, bounds)") < surfaceFocusSource.indexOf("surfaceFrame.contains(target)"), "the active surface must be height-capped even when its walkthrough control sits outside it", failures);
  const revealSurfaceSource = runThroughFunctionSource(html, "revealTargetWithinSurface");
  assert(/\.sim-surface-scroll,\s*\.protocol-sequence-scroll/.test(revealSurfaceSource), "guided reveal must scroll either an app viewport or a protocol sequence canvas", failures);
  const frameRefitSource = runThroughFunctionSource(html, "refitSimulatorFrame");
  const resizeQueueSource = runThroughFunctionSource(html, "queueStageArtResize");
  assert(
    /fitSimulatorFrameToViewport\(surfaceFrame,\s*visibleViewportBounds\(\)\)/.test(frameRefitSource) &&
      !/focusSimulatorTarget|revealTargetWithinSurface|scrollToY|window\.scrollTo|\.scrollTop\s*[+\-]?=/.test(frameRefitSource),
    "responsive simulator fitting must resize the frame without moving either scroll position",
    failures
  );
  assert(/refitSimulatorFrame\(\)/.test(resizeQueueSource), "layout changes must still refit the active simulator frame", failures);
  const ambientResizeStart = html.lastIndexOf('window.addEventListener("resize"');
  const ambientResizeEnd = html.indexOf("initSystemStateMachine();", ambientResizeStart);
  const ambientResizeSource = ambientResizeStart >= 0 && ambientResizeEnd > ambientResizeStart ? html.slice(ambientResizeStart, ambientResizeEnd) : "";
  assert(
    Boolean(ambientResizeSource) &&
      !/scrollToChangedAppArea|focusSimulatorTarget|scrollToY|window\.scrollTo|\.scrollTop\s*[+\-]?=/.test(ambientResizeSource),
    "passive resize observers must not undo manual page or simulator scrolling",
    failures
  );
  const appViewportRule = (css.match(/^\s*\.sim-app-viewport\s*\{([^}]*)\}/im) || [])[1] || "";
  const protocolScrollRule = (css.match(/^\s*\.protocol-sequence-scroll\s*\{([^}]*)\}/im) || [])[1] || "";
  assert(
    /overflow-y\s*:\s*auto/i.test(appViewportRule) && /overscroll-behavior-y\s*:\s*auto/i.test(appViewportRule) &&
      /overflow-y\s*:\s*auto/i.test(protocolScrollRule) && /overscroll-behavior-y\s*:\s*auto/i.test(protocolScrollRule) &&
      !/overscroll-behavior\s*:\s*(?:contain|none)/i.test(appViewportRule + protocolScrollRule),
    "nested app and protocol scrollers must hand boundary scrolling back to the page",
    failures
  );
  const inlineCoachSource = runThroughFunctionSource(html, "renderCoachmarkInline");
  assert(
    !/scrollIntoView|scrollToY|window\.scrollTo|\.scrollTop\s*[+\-]?=/.test(inlineCoachSource),
    "inline action labels must reflow without moving the user's simulator scroll position",
    failures
  );
  assert(
    (html.match(/scrollToChangedAppArea\(\)/g) || []).length === 2 &&
      /function\s+advanceEventStep[\s\S]*?scrollToChangedAppArea\(\)/.test(html) &&
      /function\s+rewindCurrentEventStep[\s\S]*?scrollToChangedAppArea\(\)/.test(html),
    "automatic re-centering must be limited to explicit forward and Back transitions",
    failures
  );

  const productRendererStart = html.indexOf("function renderProductDemo");
  const productRendererEnd = html.indexOf("function renderStageArt", productRendererStart);
  const productRenderer = productRendererStart >= 0 && productRendererEnd > productRendererStart ? html.slice(productRendererStart, productRendererEnd) : "";
  assert(/var\s+appTheme\s*=\s*appBoundary\.appTheme/.test(productRenderer) && /setAttribute\(["']data-app-theme["'],\s*appTheme\)/.test(productRenderer), "the embedded app theme must derive only from its app boundary", failures);
  assert(!/appTheme\s*=\s*productModeForStage|data-app-theme["'],\s*productModeForStage/.test(productRenderer), "the selected run path must not theme the embedded application", failures);
  const leakingRouteViewportRule = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).find((match) => /data-product-mode=["'](?:momo|themis)["']/.test(match[1]) && /sim-app-viewport/.test(match[1]));
  assert(!leakingRouteViewportRule, "route-specific palettes must not leak through the embedded app viewport boundary", failures);
}

function checkBackNavigationCoverage(html, failures) {
  const flows = readRunThroughLiteral(html, "APP_FLOWS", failures);
  const previousSource = runThroughFunctionSource(html, "previousRunState");
  const canRewindSource = runThroughFunctionSource(html, "canRewindRunState");
  const rewindSource = runThroughFunctionSource(html, "rewindCurrentEventStep");
  const tutorialDockSource = runThroughFunctionSource(html, "renderTutorialDock");
  const productRendererSource = runThroughFunctionSource(html, "renderProductDemo");
  const controlsSource = runThroughFunctionSource(html, "renderControls");
  const captureFocusSource = runThroughFunctionSource(html, "captureSimulatorFocus");
  const restoreFocusSource = runThroughFunctionSource(html, "restoreSimulatorFocus");

  assert(Boolean(previousSource), "the run-through needs one deterministic previous-state resolver", failures);
  assert(/previousRunState\(stage,\s*activeEventStep\)/.test(canRewindSource), "Back availability must derive from the shared previous-state resolver", failures);
  assert(
    /var\s+previous\s*=\s*previousRunState\(stage,\s*activeEventStep\)/.test(rewindSource) &&
      /if\s*\(\s*!previous\s*\)\s*return false/.test(rewindSource) &&
      /stage\s*=\s*previous\.stage/.test(rewindSource) &&
      /activeEventStep\s*=\s*previous\.step/.test(rewindSource),
    "every Back control must use the same previous-state transition",
    failures
  );
  assert(!/stage\s*(?:<=|>)\s*runStartStage/.test(rewindSource), "Back must not stop at the Court-backed shortcut boundary", failures);
  assert(
    /surfaceMeta\.view\s*===\s*["']sequence["']\s*&&\s*canRewindRunState\(\)/.test(tutorialDockSource) &&
      /addEventListener\(["']click["'],\s*rewindCurrentEventStep\)/.test(tutorialDockSource),
    "protocol and automatic-sequence screens must expose the shared Back action",
    failures
  );
  assert(
    /var\s+canGoBack\s*=\s*canRewindRunState\(\)/.test(productRendererSource) &&
      /browserBack\.disabled\s*=\s*!canGoBack/.test(productRendererSource) &&
      /browserBack\.addEventListener\(["']click["'],\s*rewindCurrentEventStep\)/.test(productRendererSource),
    "every application screen must expose the shared Back action",
    failures
  );
  assert(
    /back\.disabled\s*=\s*!canRewindRunState\(\)/.test(controlsSource) &&
      /back\.addEventListener\(["']click["'][\s\S]{0,180}rewindCurrentEventStep\(\)/.test(html),
    "the outer Back control must follow the same action-by-action history",
    failures
  );
  assert(
    /sim-browser-back["']\)\s*\|\|\s*active\.classList\.contains\(["']tutorial-rewind/.test(captureFocusSource) &&
      /\.sim-browser-back:not\(\[disabled\]\),\s*\.tutorial-rewind/.test(restoreFocusSource),
    "Back focus must survive application-to-sequence transitions",
    failures
  );

  if (!Array.isArray(flows) || !previousSource) return;
  try {
    const context = { APP_FLOWS: flows };
    vm.runInNewContext(previousSource + "\nthis.__previousRunState = previousRunState;", context, { filename: "the-design.back-history.js" });
    let stateCount = 0;
    let predecessorCount = 0;
    for (let stageIndex = 0; stageIndex < flows.length; stageIndex += 1) {
      const stepCount = Array.isArray(flows[stageIndex] && flows[stageIndex].steps) ? flows[stageIndex].steps.length : 0;
      for (let stepIndex = 0; stepIndex <= stepCount; stepIndex += 1) {
        stateCount += 1;
        const previous = context.__previousRunState(stageIndex, stepIndex);
        if (stageIndex === 0 && stepIndex === 0) {
          assert(previous === null, "Event 1, Action 1 must be the only state without Back", failures);
          continue;
        }
        predecessorCount += 1;
        const expectedStage = stepIndex > 0 ? stageIndex : stageIndex - 1;
        const expectedStep = stepIndex > 0 ? stepIndex - 1 : flows[stageIndex - 1].steps.length;
        assert(
          previous && previous.stage === expectedStage && previous.step === expectedStep,
          `Event ${stageIndex + 1}, state ${stepIndex} must return to Event ${expectedStage + 1}, state ${expectedStep}`,
          failures
        );
      }
    }
    assert(stateCount === 37, "the Back regression matrix must cover all 37 event/action states", failures);
    assert(predecessorCount === 36, "exactly 36 event/action states must have a valid predecessor", failures);
  } catch (error) {
    failures.push("Back navigation history cannot be evaluated: " + error.message);
  }
}

function checkCoachmarkTextAvoidance(html, failures) {
  const helperNames = [
    "coachmarkRect",
    "coachmarkRectIntersection",
    "coachmarkOverlapArea",
    "coachmarkRectContains",
    "coachmarkRectDistance",
    "coachmarkPlacementForRect",
    "coachmarkZoneRank",
    "coachmarkConnectorGeometry",
    "coachmarkConnectorLength",
    "coachmarkConnectorIsUsable",
    "coachmarkConnectorPolyline",
    "routeCoachmarkConnector",
    "coachmarkSegmentHitsRect",
    "scoreCoachmarkCandidate",
    "buildCoachmarkCandidates",
    "coachmarkForbiddenTopLeft",
    "coachmarkUniquePositions",
    "buildCoachmarkVacancyCandidates",
    "compareCoachmarkScores",
    "chooseCoachmarkCandidate"
  ];
  const helperSources = helperNames.map((name) => runThroughFunctionSource(html, name));
  helperNames.forEach((name, index) => {
    assert(Boolean(helperSources[index]), `coachmark text-avoidance helper is missing: ${name}`, failures);
  });
  const chooserSource = runThroughFunctionSource(html, "chooseCoachmarkCandidate");
  assert(/connectorTextHits\s*===\s*0/.test(chooserSource), "floating coachmarks must reject every connector route that crosses visible text", failures);

  const textCollector = runThroughFunctionSource(html, "collectCoachmarkTextRects");
  const positioner = runThroughFunctionSource(html, "positionCoachmarkNow");
  const inlineRenderer = runThroughFunctionSource(html, "renderCoachmarkInline");
  const connectorHider = runThroughFunctionSource(html, "hideCoachmarkConnector");
  const connectorRemover = runThroughFunctionSource(html, "removeCoachmarkConnector");
  const connectorRenderer = runThroughFunctionSource(html, "renderCoachmarkConnector");
  const inlineHost = runThroughFunctionSource(html, "coachmarkInlineHost");
  const railRenderer = runThroughFunctionSource(html, "renderRail");
  const railCoachmarkRefresh = runThroughFunctionSource(html, "refreshCoachmarkAfterRailChange");
  assert(
    /createTreeWalker\([\s\S]*NodeFilter\.SHOW_TEXT/.test(textCollector) &&
      /createRange\(\)/.test(textCollector) &&
      /getClientRects\(\)/.test(textCollector) &&
      /coachmarkClipForElement/.test(textCollector) &&
      /querySelectorAll\(["']input, textarea, select["']\)/.test(textCollector) &&
      /control\.value[\s\S]*placeholder[\s\S]*visibleContent/.test(textCollector),
    "coachmark placement must measure visible, clipping-aware text lines rather than whole UI panels",
    failures
  );
  assert(
    /buildCoachmarkCandidates\([\s\S]*buildCoachmarkVacancyCandidates\([\s\S]*chooseCoachmarkCandidate/.test(positioner) &&
      /if\s*\(\s*!chosen\s*\)[\s\S]*renderCoachmarkInline/.test(positioner),
    "coachmark placement must search adjacent and open text-free space before falling back to an in-flow explanation",
    failures
  );
  assert(
    /actionHost\s*=\s*target\.closest\(["'][^"']*live-action-row/.test(inlineHost) && inlineHost.indexOf("actionHost") < inlineHost.indexOf("sim-surface-frame"),
    "the final in-flow fallback must stay beside the action instead of jumping above the whole app",
    failures
  );
  assert(
    /classList\.add\(["']is-inline["']\)/.test(inlineRenderer) &&
      /insertBefore\(|appendChild\(/.test(inlineRenderer) &&
      /\.target-callout\.is-inline\s*\{[^}]*position:\s*static/is.test(html),
    "the no-clear-space fallback must render in normal flow so it cannot cover visible text",
    failures
  );
  assert(
    /removeCoachmarkConnector\(\)/.test(inlineRenderer) &&
      /removeAttribute\(["']cx["']\)/.test(connectorHider) &&
      /removeAttribute\(["']cy["']\)/.test(connectorHider) &&
      /setAttribute\(["']hidden["']/.test(connectorHider) &&
      /parentNode\.removeChild/.test(connectorRemover),
    "inline and hidden coachmarks must remove every stale connector endpoint",
    failures
  );
  assert(
    /if\s*\(\s*!coachmarkConnectorIsUsable\(candidate\)\s*\)[\s\S]*hideCoachmarkConnector\(\)[\s\S]*return false/.test(connectorRenderer) &&
      connectorRenderer.indexOf("coachmarkConnectorIsUsable(candidate)") < connectorRenderer.indexOf("svg.hidden = false"),
    "a connector endpoint may render only after its visible path passes geometry validation",
    failures
  );
  assert(
    /\.sim-live-preview\.has-inline-coachmark\s*,\s*\.protocol-sequence\.has-inline-coachmark\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/is.test(html) &&
      /\.sim-live-preview\.has-inline-coachmark\s*>\s*\.coachmark-inline-slot\s*,[\s\S]*?\.protocol-sequence\.has-inline-coachmark\s*>\s*\.coachmark-inline-slot\s*\{[^}]*grid-row:\s*2[^}]*order:\s*0/is.test(html) &&
      /\.sim-live-preview\.has-inline-coachmark\s*>\s*\.sim-app-viewport\s*,[\s\S]*?\.protocol-sequence\.has-inline-coachmark\s*>\s*\.protocol-sequence-scroll\s*\{[^}]*grid-row:\s*3/is.test(html) &&
      /classList\.add\(["']has-inline-coachmark["']\)/.test(inlineRenderer),
    "the in-flow fallback must reserve its own row without collapsing the application viewport",
    failures
  );
  assert(
    /dataset\.coachmarkMode\s*=/.test(html) && /dataset\.textOverlaps\s*=/.test(html) && /dataset\.connectorTextOverlaps\s*=/.test(html) && /dataset\.connectorRouted\s*=/.test(html) && /dataset\.connectorVisible\s*=/.test(html) && /dataset\.candidateCount\s*=/.test(html) && /dataset\.vacancyCandidateCount\s*=/.test(html) && /dataset\.clearConnectorCandidateCount\s*=/.test(html),
    "coachmark output must expose text-overlap and candidate audit metadata",
    failures
  );
  assert(
    !/\bis-(?:scrolling|touching|mouse-moving)\b/.test(html) &&
      !/\bis-coachmark-buffering\b/.test(html) &&
      !/\bbufferCoachmark\s*\(/.test(html) &&
      !/\b(?:scrollClassTimeout|touchEndHandler|isMouseMoving|mouseMoveTimeout|mouseStopTimeout)\b/.test(html),
    "pointer movement, touch, scrolling, and target changes must reposition the coachmark without hiding it",
    failures
  );
  assert(
    /refreshCoachmarkAfterRailChange\(\)/.test(railRenderer) &&
      /invalidateCoachmarkGeometry\(["']event-navigator["'],\s*true\)/.test(railCoachmarkRefresh) &&
      /queueCoachmarkPosition\(\)/.test(railCoachmarkRefresh),
    "opening or expanding the event navigator must invalidate and reposition the coachmark",
    failures
  );

  if (helperSources.some((source) => !source)) return;
  try {
    const context = { coachmarkLastPlacement: null };
    vm.runInNewContext(
      [
        "function clampNumber(value, min, max) { return Math.min(max, Math.max(min, value)); }",
        ...helperSources,
        "this.__coachmark = { rect: coachmarkRect, overlap: coachmarkOverlapArea, score: scoreCoachmarkCandidate, build: buildCoachmarkCandidates, vacancy: buildCoachmarkVacancyCandidates, choose: chooseCoachmarkCandidate, route: routeCoachmarkConnector, segmentHits: coachmarkSegmentHitsRect, connectorLength: coachmarkConnectorLength, connectorUsable: coachmarkConnectorIsUsable };"
      ].join("\n"),
      context,
      { filename: "the-design.coachmark-solver.js" }
    );
    const solver = context.__coachmark;
    const boundary = solver.rect(0, 0, 600, 400);
    const target = solver.rect(270, 180, 60, 40);
    const connectorFixture = (length) => ({
      path: length ? `M 0 0 L ${length} 0` : "",
      connectorStart: { x: 0, y: 0 },
      connectorEnd: { x: length, y: 0 },
      connectorSegments: [[{ x: 0, y: 0 }, { x: length, y: 0 }]]
    });
    assert(!solver.connectorUsable(connectorFixture(0)), "a zero-length connector must not expose an endpoint", failures);
    assert(!solver.connectorUsable(connectorFixture(4)) && !solver.connectorUsable(connectorFixture(8)), "a connector shorter than its endpoint must stay hidden", failures);
    assert(solver.connectorUsable(connectorFixture(12)), "a meaningful 12px connector must remain visible", failures);
    const mismatchedEndpoint = connectorFixture(24);
    mismatchedEndpoint.connectorEnd = { x: 30, y: 0 };
    assert(!solver.connectorUsable(mismatchedEndpoint), "a connector endpoint detached from its path must be rejected", failures);
    const invalidConnector = connectorFixture(24);
    invalidConnector.connectorSegments[0][1].x = Infinity;
    assert(!solver.connectorUsable(invalidConnector), "non-finite connector geometry must be rejected", failures);
    const routedConnector = {
      path: "M 0 0 L 0 12 L 20 12 L 20 24",
      connectorStart: { x: 0, y: 0 },
      connectorEnd: { x: 20, y: 24 },
      connectorSegments: [
        [{ x: 0, y: 0 }, { x: 0, y: 12 }],
        [{ x: 0, y: 12 }, { x: 20, y: 12 }],
        [{ x: 20, y: 12 }, { x: 20, y: 24 }]
      ]
    };
    assert(solver.connectorUsable(routedConnector) && solver.connectorLength(routedConnector) === 44, "a valid routed connector must retain its line and endpoint", failures);

    const nearButCoveringText = solver.score(
      { placement: "top", align: "center", width: 120, height: 40, rect: solver.rect(240, 128, 120, 40), distance: 12 },
      target,
      boundary,
      [solver.rect(250, 130, 60, 15)]
    );
    const fartherButClear = solver.score(
      { placement: "left", align: "center", width: 120, height: 40, rect: solver.rect(90, 180, 120, 40), distance: 60 },
      target,
      boundary,
      [solver.rect(250, 130, 60, 15)]
    );
    assert(nearButCoveringText.textHits > 0 && !nearButCoveringText.zeroTextOverlap, "a bubble that covers a visible text line must be rejected as zero-overlap", failures);
    assert(fartherButClear.zeroTextOverlap, "a clear bubble must remain eligible even when farther from the target", failures);
    assert(solver.choose([nearButCoveringText, fartherButClear], "text-priority") === fartherButClear, "zero visible-text overlap must outrank proximity", failures);

    const connectorCrossingText = solver.score(
      { placement: "top", align: "center", width: 120, height: 40, rect: solver.rect(240, 80, 120, 40), distance: 60 },
      target,
      boundary,
      [solver.rect(295, 145, 10, 10)]
    );
    assert(
      connectorCrossingText.textHits === 0 && connectorCrossingText.connectorTextHits > 0 && connectorCrossingText.zeroTextOverlap,
      "the connector fixture must isolate a line-only text crossing",
      failures
    );
    context.coachmarkLastPlacement = null;
    assert(solver.choose([connectorCrossingText], "connector-hard-stop") === null, "a text-crossing connector must force the safe inline fallback", failures);
    assert(solver.choose([connectorCrossingText, fartherButClear], "connector-clear-route") === fartherButClear, "a clear connector route must beat every route that crosses text", failures);
    const crossingObstacle = solver.rect(295, 145, 10, 10);
    assert(solver.route(connectorCrossingText, target, boundary, [crossingObstacle]), "the detour router must find an orthogonal path around a blocking text line", failures);
    assert(
      connectorCrossingText.connectorTextHits === 0 && connectorCrossingText.connectorRouted && connectorCrossingText.connectorSegments.every((segment) => !solver.segmentHits(segment, crossingObstacle)),
      "a routed connector must be recorded only after every segment clears visible text",
      failures
    );

    context.coachmarkLastPlacement = null;
    const candidates = solver.build([{ width: 120, height: 40 }], target, boundary, []);
    assert(candidates.length === 12, "one coachmark size must test four directions and three alignments", failures);
    assert(new Set(candidates.map((candidate) => candidate.placement)).size === 4, "coachmark candidates must include top, bottom, left, and right", failures);
    assert(candidates.every((candidate) => candidate.zeroTextOverlap), "an empty scene must keep every valid directional candidate text-clear", failures);

    context.coachmarkLastPlacement = null;
    const blockedCandidates = solver.build([{ width: 120, height: 40 }], target, boundary, [boundary]);
    assert(solver.choose(blockedCandidates, "inline-fallback") === null, "when every floating placement covers text, the solver must request the in-flow fallback", failures);

    const narrowBoundary = solver.rect(0, 0, 320, 568);
    const wideTarget = solver.rect(16, 300, 288, 40);
    const textBands = [solver.rect(0, 210, 320, 78), solver.rect(0, 352, 320, 80)];
    const narrowZones = [{ name: "viewport", rank: 2, rect: narrowBoundary }];
    const anchoredOnly = solver.build([{ width: 176, height: 72 }], wideTarget, narrowBoundary, textBands, narrowZones);
    assert(solver.choose(anchoredOnly, "remote-pocket") === null, "the focused fixture must block every target-anchored position", failures);
    context.coachmarkLastPlacement = null;
    const remotePocket = solver.vacancy([{ width: 176, height: 72 }], wideTarget, narrowBoundary, textBands, narrowZones);
    const remoteChoice = solver.choose(remotePocket, "remote-pocket");
    assert(
      !remoteChoice || (remoteChoice.align === "free" && remoteChoice.zeroTextOverlap && remoteChoice.connectorTextHits === 0),
      "a remote pocket may be used only when both its label and connector remain text-clear",
      failures
    );
    if (!remoteChoice) {
      assert(
        remotePocket.filter((candidate) => candidate.valid && candidate.zeroTextOverlap).every((candidate) => candidate.connectorTextHits > 0),
        "inline fallback is allowed only when every remote text-clear pocket still has a crossing connector",
        failures
      );
    }
  } catch (error) {
    failures.push("coachmark text-avoidance geometry cannot be evaluated: " + error.message);
  }
}

function checkActionButtonInfoLabels(html, failures) {
  const tagActionSource = runThroughFunctionSource(html, "tagWorkflowAction");
  const clearActionSource = runThroughFunctionSource(html, "clearWorkflowAction");
  const ensureLabelsSource = runThroughFunctionSource(html, "ensureSimulatorButtonInfoLabels");
  const buttonInfoSource = runThroughFunctionSource(html, "simulatorButtonInfo");
  const tooltipSource = runThroughFunctionSource(html, "installSimTooltips");
  const guidedSource = runThroughFunctionSource(html, "applyGuidedTarget");
  const activeTargetSource = runThroughFunctionSource(html, "activeCoachmarkTarget");
  const positionerSource = runThroughFunctionSource(html, "positionCoachmarkNow");
  const queuePositionSource = runThroughFunctionSource(html, "queueCoachmarkPosition");
  const inlineHostSource = runThroughFunctionSource(html, "coachmarkInlineHost");
  const tutorialDockSource = runThroughFunctionSource(html, "renderTutorialDock");
  const validationSource = runThroughFunctionSource(html, "setActionValidation");
  const controlsSource = runThroughFunctionSource(html, "renderControls");
  const renderSource = runThroughFunctionSource(html, "render");

  assert(
    /data-control-role["'],\s*["']workflow-action/.test(tagActionSource) &&
      /data-action-label/.test(tagActionSource) &&
      /data-action-info/.test(tagActionSource),
    "every primary workflow action must carry one explicit label and explainer",
    failures
  );
  assert(
    /querySelectorAll\(["']button["']\)/.test(ensureLabelsSource) &&
      /classList\.contains\(["']guided-target["']\)/.test(ensureLabelsSource) &&
      /button\.disabled/.test(ensureLabelsSource) &&
      /tagInfo\(button,\s*info\)/.test(ensureLabelsSource),
    "the simulator must run one complete post-render label pass over every button",
    failures
  );
  assert(
    /classList\.remove\(["']guided-target["']\)/.test(clearActionSource) &&
      /data-action-label/.test(clearActionSource) &&
      /data-action-info/.test(clearActionSource) &&
      /setAttributeToken\([\s\S]*guidedCoachmark[\s\S]*false/.test(clearActionSource),
    "the reused continuation button must clear stale workflow and coachmark state before every render",
    failures
  );
  assert(
    /#system-run \[data-sim-tip\]/.test(tooltipSource) &&
      /guided-target/.test(tooltipSource) &&
      /match\.disabled/.test(tooltipSource),
    "secondary action labels must work across the full run-through without duplicating guided or disabled controls",
    failures
  );
  assert(
    /button\.id\s*===\s*["']runNext["'][\s\S]*continuation\.action[\s\S]*continuation\.note/.test(buttonInfoSource) &&
      /tutorial-rewind/.test(buttonInfoSource) &&
      /runBack/.test(buttonInfoSource),
    "continuation and previous-state controls must receive contextual action labels",
    failures
  );
  assert(/tagWorkflowAction\(/.test(guidedSource), "application actions must use the shared workflow-label helper", failures);
  assert(/tagWorkflowAction\(advance/.test(tutorialDockSource), "protocol actions must use the shared workflow-label helper", failures);
  assert(
    /clearWorkflowAction\(next\)/.test(controlsSource) &&
      /classList\.add\(["']is-action-cue["'],\s*["']guided-target["']\)/.test(controlsSource) &&
      /tagWorkflowAction\(next,\s*continuation\.action,\s*continuation\.note,\s*["']user["']\)/.test(controlsSource) &&
      /setAttributeToken\(next,\s*["']aria-describedby["'],\s*["']guidedCoachmark["'],\s*true\)/.test(controlsSource) &&
      /ensureSimulatorButtonInfoLabels\(\)[\s\S]*positionCoachmarkNow\(\)/.test(controlsSource),
    "every completed event must promote its enabled continuation into the persistent guided-label lifecycle",
    failures
  );
  assert(
    /root[\s\S]*querySelector\(["']\.guided-target["']\)/.test(activeTargetSource) &&
      /getElementById\(["']runNext["']\)/.test(activeTargetSource) &&
      /classList\.contains\(["']guided-target["']\)/.test(activeTargetSource) &&
      /activeCoachmarkTarget\(\)/.test(positionerSource),
    "coachmark discovery must include both in-app actions and the shared next-event continuation",
    failures
  );
  assert(
    /requestAnimationFrame\(/.test(queuePositionSource) &&
      /setTimeout\([\s\S]*positionCoachmarkNow\(\)[\s\S]*120/.test(queuePositionSource) &&
      /clearTimeout\(coachmarkFallbackTimeout\)/.test(queuePositionSource),
    "coachmark positioning must retain one trailing settle pass when an animation frame is delayed",
    failures
  );
  assert(
    /live-page-continuation/.test(inlineHostSource) &&
      /\.live-page-continuation\s*\{[^}]*flex-wrap:\s*wrap/is.test(html),
    "page-docked continuation labels must have a wrapped inline fallback beside the action",
    failures
  );
  assert(/setAttributeToken\([\s\S]*aria-describedby/.test(validationSource), "validation must preserve the action coachmark description", failures);
  assert(/renderControls\(\);[\s\S]*ensureSimulatorButtonInfoLabels\(\);/.test(renderSource), "action-label coverage must run after every simulator render", failures);

  const flows = readRunThroughLiteral(html, "APP_FLOWS", failures);
  const continuations = readRunThroughLiteral(html, "EVENT_CONTINUATIONS", failures);
  const copy = readRunThroughLiteral(html, "CONTROL_COACH_COPY", failures);
  if (!Array.isArray(flows) || !Array.isArray(continuations) || !copy || typeof copy !== "object") return;
  assert(continuations.length === flows.length, "every simulator event must end with one guided continuation", failures);
  assert(
    continuations.every((continuation) => continuation && String(continuation.action || "").trim() && String(continuation.note || "").trim().split(/\s+/).length >= 6),
    "every completed-event continuation needs a substantive persistent explainer",
    failures
  );
  const guidedStateCount = flows.reduce((total, flow) => total + (flow.steps || []).length, 0) + continuations.length;
  assert(guidedStateCount === 37, `the simulator must expose a guided label in all 37 action states (found ${guidedStateCount})`, failures);
  flows.forEach((flow, eventIndex) => {
    (flow.steps || []).forEach((step, stepIndex) => {
      const label = String(step.actionLabel || String(step.cue || "").replace(/^Tap\s+/i, "") || step.title || "").replace(/\s+/g, " ").trim();
      const explanation = String(copy[label] || step.coach || "").replace(/\s+/g, " ").trim();
      assert(Boolean(label), `Event ${eventIndex + 1} step ${stepIndex + 1} needs an action label`, failures);
      assert(explanation.split(/\s+/).filter(Boolean).length >= 6, `Action \"${label}\" needs substantive explainer copy`, failures);
    });
  });
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

  checkChapterSequence(failures);

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
  checkAppOwnershipData(runThrough, failures);
  checkRunThroughSurfaceSeparation(runThrough, failures);
  checkProductStageGroups(runThrough, failures);
  checkCompactAppViews(runThrough, failures);
  checkProductFontAssets(runThrough, failures);
  checkRunThroughPriorityUxFixes(runThrough, failures);
  checkBackNavigationCoverage(runThrough, failures);
  checkCoachmarkTextAvoidance(runThrough, failures);
  checkActionButtonInfoLabels(runThrough, failures);
  assert(/End-to-end resolution run-through/i.test(runThrough), "run-through chapter missing neutral title", failures);
  assert(/id=["']productTabMomo["']/i.test(runThrough), "run-through missing PredictionMoMo parent tab", failures);
  assert(/id=["']productTabThemis["']/i.test(runThrough), "run-through missing DemoThemis parent tab", failures);
  assert(!/id=["']productModePanel["'][^>]*role=["']tabpanel["']/i.test(runThrough), "starting-point buttons must not control a misleading tabpanel", failures);
  assert(/id=["']productTabMomo["'][^>]*aria-pressed=["']false["']/i.test(runThrough) && /id=["']productTabThemis["'][^>]*aria-pressed=["']false["']/i.test(runThrough), "run-through must start without a preselected starting point", failures);
  assert(/id=["']productModePanel["'][^>]*\shidden(?:\s|>)/i.test(runThrough), "event workflow must stay hidden until a product is selected", failures);
  assert(/var\s+selectedRunMode\s*=\s*(?:null|["']["'])/i.test(runThrough) && /productModePanel\.hidden\s*=\s*false/i.test(runThrough), "starting-point selection must reveal the event workflow", failures);
  assert(/class=["'][^"']*product-mode-nav[^"']*is-awaiting-selection/i.test(runThrough), "initial product chooser must receive center-stage styling", failures);
  assert(/Choose a starting point/i.test(runThrough) && /Court-backed run/i.test(runThrough) && /PredictionMoMo using DemoThemis/i.test(runThrough), "the entry UI must present one PredictionMoMo run with two starting points", failures);
  assert(!/Choose a product|DemoThemis simulation|current product:/i.test(runThrough) && /chosen run:/i.test(runThrough), "DemoThemis must not be presented as a second customer-facing product", failures);
  assert(/productModeNav\.classList\.remove\(["']is-awaiting-selection["']\)/i.test(runThrough), "product chooser must compact after selection", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab/i.test(runThrough) && /\.product-tab:hover/i.test(runThrough), "product choices must expose strong interactive affordances", failures);
  assert(/background:\s*color-mix\(in srgb,\s*var\(--choice-soft\)/i.test(runThrough) && /border:\s*1px solid color-mix\(in srgb,\s*var\(--choice-accent\)/i.test(runThrough), "product choices must carry restrained brand color", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab\s*\{[^}]*background:\s*var\(--choice-accent\)/i.test(runThrough), "initial product choices must use solid button backgrounds", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab:active/i.test(runThrough) && /\.product-mode-nav\.is-awaiting-selection\s+\.product-tab-event\s*\{\s*display:\s*inline-flex/i.test(runThrough), "initial product choices must keep pressed and start affordances at small widths", failures);
  assert(/function\s+selectProductMode\s*\(/.test(runThrough), "run-through product tabs are not wired to simulation state", failures);
  assert(/\.sim-app-viewport\[data-app-theme=["']momo["']\]/i.test(runThrough) && /\.sim-app-viewport\[data-app-theme=["']themis["']\]/i.test(runThrough), "both embedded web apps must expose their own theme boundary", failures);
  assert(/\.sim-live-preview\s*\{[^}]*--browser-chrome-bg:\s*#e8edf1[^}]*--browser-chrome-surface:\s*#f9fbfc[^}]*--browser-chrome-accent:\s*#526b7a/is.test(runThrough), "run-through mock browsers must share one neutral chrome palette", failures);
  assert(/\.sim-live-preview\s*\{[^}]*color:\s*var\(--browser-chrome-ink\)[^}]*font-family:\s*var\(--browser-chrome-font\)[^}]*color-scheme:\s*light/is.test(runThrough), "browser frame must reset inherited product color, type, and native color scheme", failures);
  assert(/\.sim-browser-bar\s*\{[^}]*background:\s*var\(--browser-chrome-bg\)[^}]*font-family:\s*var\(--browser-chrome-font\)/is.test(runThrough), "browser bar must use the shared chrome surface and typography", failures);
  assert(/\.sim-url\s*\{[^}]*border:\s*1px solid var\(--browser-chrome-line\)[^}]*background:\s*var\(--browser-chrome-surface\)[^}]*color:\s*var\(--browser-chrome-muted\)/is.test(runThrough), "browser address field must stay product-neutral", failures);
  assert(!/\.product-mode-panel\[data-product-mode=["'](?:momo|themis)["']\]\s+\.sim-browser-(?:bar|back)/i.test(runThrough), "product themes must not restyle the outer browser chrome", failures);
  assert(!/\.product-mode-panel\[data-product-mode=["'](?:momo|themis)["']\]\s+\.sim-live-preview\s*(?:,|\{)/i.test(runThrough), "product palettes must stop at the app viewport instead of recoloring the browser frame", failures);
  const browserChromeRules = Array.from(runThrough.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter((match) => /\.sim-(?:browser|url)/.test(match[1]));
  const leakingBrowserRule = browserChromeRules.find((match) => /var\(--(?:bg|surface|ink|ink-soft|muted|faint|line|line-strong|accent|accent-soft|accent-ink)\)/.test(match[2]));
  assert(!leakingBrowserRule, "browser chrome must not consume product palette variables", failures);
  const momoThemeRule = runThrough.match(/\.product-mode-panel\[data-product-mode\]\s+\.sim-app-viewport\[data-app-theme=["']momo["']\]\s*\{([^}]*)\}/i);
  const themisThemeRule = runThrough.match(/\.product-mode-panel\[data-product-mode\]\s+\.sim-app-viewport\[data-app-theme=["']themis["']\]\s*\{([^}]*)\}/i);
  const momoThemeCss = momoThemeRule ? momoThemeRule[1] : "";
  const themisThemeCss = themisThemeRule ? themisThemeRule[1] : "";
  assert(momoThemeRule, "the PredictionMoMo viewport override is missing", failures);
  assert(/--bg:\s*#f2e3cd/i.test(momoThemeCss) && /--surface:\s*#fff7e8/i.test(momoThemeCss) && /--ink:\s*#251f1a/i.test(momoThemeCss) && /--accent:\s*#ad520f/i.test(momoThemeCss), "Events 01-08 must keep the PredictionMoMo palette", failures);
  assert(/Alegreya Sans App/i.test(momoThemeCss) && /color-scheme:\s*light/i.test(momoThemeCss), "PredictionMoMo must keep its typography and light controls", failures);
  assert(themisThemeRule, "the DemoThemis viewport theme is missing", failures);
  assert(/--bg:\s*#151a1d/i.test(themisThemeCss) && /--surface:\s*#232a2e/i.test(themisThemeCss) && /--ink:\s*#f6f2e8/i.test(themisThemeCss) && /--accent:\s*#3e7fa8/i.test(themisThemeCss), "Events 09-13 must use the DemoThemis dark palette", failures);
  assert(/Literata App/i.test(themisThemeCss) && /color-scheme:\s*dark/i.test(themisThemeCss), "DemoThemis must use its typography and dark controls", failures);
  const leakingThemisViewportRule = Array.from(runThrough.matchAll(/([^{}]+)\{([^{}]*)\}/g)).find((match) => /data-product-mode=["']themis["']/.test(match[1]) && /sim-app-viewport/.test(match[1]));
  assert(!leakingThemisViewportRule, "the outer run path must not choose the embedded app theme", failures);
  assert(/--bg:\s*#151a1d/i.test(runThrough) && /--surface:\s*#232a2e/i.test(runThrough) && /--ink:\s*#f6f2e8/i.test(runThrough), "the outer DemoThemis journey palette is missing", failures);
  assert(/--accent:\s*#3e7fa8/i.test(runThrough) && /--accent-ink:\s*#c3e7ff/i.test(runThrough), "the outer DemoThemis journey must retain readable court accents", failures);
  assert(/data-product-mode=["']themis["']\]\s+\.simulator-island/i.test(runThrough), "the outer DemoThemis theme must still identify the court journey", failures);
  assert(/\.sim-demand-frame\s*\{[^}]*border:\s*2px solid[^}]*border-radius:\s*18px/is.test(runThrough), "the PredictionMoMo handoff browser must have a distinct integration border", failures);
  assert(/\.sim-demand-frame-tab\s*\{[^}]*color:\s*#fff[^}]*font-size:\s*\.76rem/is.test(runThrough), "the integration border must use the requested white tab title", failures);
  assert(/\.product-demo\.sim-tight\s+\.sim-demand-frame-tab\s*\{[^}]*max-width:\s*calc\(100% - \.5rem\)[^}]*font-size:\s*\.68rem/is.test(runThrough), "the integration tab must remain readable in compact layouts", failures);
  assert(/Seeding DemoThemis with demand from the Application Layer/.test(runThrough), "the application-layer demand frame title is missing", failures);
  assert(!/Full DemoThemis backend|app-backend-chip/i.test(runThrough), "the old backend label must be removed from the web app", failures);
  assert(!/entry\.group\.mode\s*===\s*mode/.test(runThrough), "event navigator must keep every product's event groups visible", failures);
  assert(/data-stage-mode=["']momo["']/i.test(runThrough) && /data-stage-mode=["']themis["']/i.test(runThrough), "event navigator must preserve distinct product group themes", failures);
  assert(/\.product-tab\[data-product-mode=["']momo["']\]\[aria-pressed=["']true["']\]/i.test(runThrough), "Full market run selection must carry its functional accent", failures);
  assert(/\.product-tab\[data-product-mode=["']themis["']\]\[aria-pressed=["']true["']\]/i.test(runThrough), "Court-backed run selection must carry its functional accent", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.event-navigator-toggle/i.test(runThrough), "event navigator interactions must inherit product typography", failures);
  assert(/\.sim-live-preview\s+\.app-tabs\s+span\.on/i.test(runThrough), "active app tabs must carry the selected product accent", failures);
  assert(!/--navigator-band|--app-band|\.event-nav-label::before|\.app-nav::before|conic-gradient|\.app-brand\s+\.dot/i.test(runThrough), "purely decorative product motifs should stay removed", failures);
  assert(!/sim-frame-label|sim-window-dots|sim-live-dot/i.test(runThrough), "duplicated simulator chrome should stay removed", failures);
  assert(!/<body[^>]*class=["'][^"']*product-(?:momo|themis)/i.test(runThrough), "product theme must not be applied to the page body", failures);
  assert(/<p\s+class=["']kicker["']>End-to-end run-through<\/p>/i.test(runThrough), "run-through masthead must stay product-neutral", failures);
  assert(/DemoThemis Intake/i.test(runThrough), "DemoThemis entry event is not branded as court intake", failures);
  assert(/id=["']stageRail["']/i.test(runThrough), "run-through chapter missing stage rail", failures);
  assert(/id=["']focusScene["']/i.test(runThrough), "run-through missing focused one-step scene", failures);
  assert(/id=["']productDemo["']/i.test(runThrough), "run-through missing current walkthrough view", failures);
  assert(/tutorial-advance/i.test(runThrough), "run-through missing outer automatic-event controls", failures);
  assert(/APP_PAGES/i.test(runThrough), "run-through missing canonical staged app pages", failures);
  assert(/sim-role-handoff/i.test(runThrough), "run-through missing outer role handoffs", failures);
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
