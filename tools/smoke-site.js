const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://demothemis.netlify.app").replace(/\/+$/, "");

const publicHtml = [
  "index.html",
  "run-through.html",
  "demothemis.html",
  "break-the-court.html",
  "omenmarketmaker.html",
  "bootstrap-loop.html",
  "governance.html",
  "demothemis-mvp.html"
];

const brandImageByPage = {
  "index.html": "assets/brand/social/proposal-home-1200x630.jpg",
  "run-through.html": "assets/brand/social/shared-system-1200x630.jpg",
  "demothemis.html": "assets/brand/social/demothemis-1200x630.jpg",
  "break-the-court.html": "assets/brand/social/demothemis-1200x630.jpg",
  "omenmarketmaker.html": "assets/brand/social/omenmarketmaker-1200x630.jpg",
  "bootstrap-loop.html": "assets/brand/social/shared-system-1200x630.jpg",
  "governance.html": "assets/brand/social/shared-system-1200x630.jpg",
  "demothemis-mvp.html": "assets/brand/social/mvp-1200x630.jpg"
};

const pageThemeByFile = {
  "index.html": "neutral",
  "run-through.html": "neutral",
  "demothemis.html": "demothemis",
  "break-the-court.html": "demothemis",
  "omenmarketmaker.html": "omen",
  "bootstrap-loop.html": "neutral",
  "governance.html": "neutral",
  "demothemis-mvp.html": "demothemis"
};

const requiredBrandAssets = [
  "assets/brand-rive.js",
  "assets/brand/brand-manifest.json",
  "assets/brand/demothemis/favicon.ico",
  "assets/brand/demothemis/mark-16.png",
  "assets/brand/demothemis/mark-32.png",
  "assets/brand/demothemis/mark-180.png",
  "assets/brand/demothemis/mark-192.png",
  "assets/brand/demothemis/mark-512.png",
  "assets/brand/demothemis/wordmark.png",
  "assets/brand/omenmarketmaker/favicon.ico",
  "assets/brand/omenmarketmaker/mark-16.png",
  "assets/brand/omenmarketmaker/mark-32.png",
  "assets/brand/omenmarketmaker/mark-180.png",
  "assets/brand/omenmarketmaker/mark-192.png",
  "assets/brand/omenmarketmaker/mark-512.png",
  "assets/brand/omenmarketmaker/wordmark-poster.png",
  "assets/brand/omenmarketmaker/wordmark.riv",
  ...new Set(Object.values(brandImageByPage)),
  "assets/vendor/rive/LICENSE.txt",
  "assets/vendor/rive/rive-2.38.5.js",
  "assets/vendor/rive/rive-2.38.5.wasm"
];

const chapterSequence = [
  { file: "run-through.html", title: "Run-through", navTitle: "Run-through", chapter: 1 },
  { file: "demothemis.html", title: "DemoThemis", navTitle: "DemoThemis", chapter: 2 },
  { file: "break-the-court.html", title: "Break the court", navTitle: "Break the court", chapter: 3 },
  { file: "omenmarketmaker.html", title: "OmenMarketMaker", navTitle: "OmenMarketMaker", chapter: 4 },
  { file: "bootstrap-loop.html", title: "The bootstrap loop", navTitle: "Bootstrap loop", chapter: 5 },
  { file: "governance.html", title: "Governance", navTitle: "Governance", chapter: 6 }
];

const forbiddenPublicPaths = [
  "/predictionmomo.html",
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

function readRawDist(file) {
  return fs.readFileSync(path.join(outDir, file), "utf8");
}

function normalizeVersionedAssetPaths(content) {
  return String(content).replace(/assets\/v\/[a-f0-9]{12}\//gi, "assets/");
}

function readDist(file) {
  let content = readRawDist(file);
  if (file === "run-through.html") {
    const css = readRawDist("assets/run-through.css");
    const script = readRawDist("assets/run-through.js");
    content = content
      .replace(/(<link\b[^>]*href=["'][^"']*run-through\.css["'][^>]*>)/i, (tag) => `${tag}\n<style data-smoke-external="run-through.css">${css}</style>`)
      .replace(/(<script\b[^>]*src=["'][^"']*run-through\.js["'][^>]*><\/script>)/i, (tag) => `${tag}\n<script data-smoke-external="run-through.js">${script}</script>`);
  }
  return normalizeVersionedAssetPaths(content);
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
  for (const file of ["_headers", "_redirects", "robots.txt", "sitemap.xml", "404.html", "assets/styles.css", "assets/mvp-simulator.css", "assets/common.js"]) {
    assert(fs.existsSync(path.join(outDir, file)), `missing built support file: ${file}`, failures);
  }
  for (const file of requiredBrandAssets) {
    assert(fs.existsSync(path.join(outDir, file)), `missing built brand asset: ${file}`, failures);
  }
}

function checkVersionedAssetBundle(failures) {
  const versions = new Set();
  for (const file of publicHtml.concat("404.html")) {
    const html = readRawDist(file);
    const matches = Array.from(html.matchAll(/assets\/v\/([a-f0-9]{12})\//gi), (match) => match[1]);
    matches.forEach((version) => versions.add(version));
    assert(matches.length > 0, `${file} has no content-versioned asset reference`, failures);
    assert(!/assets\/(?!v\/)/i.test(html), `${file} contains an unversioned proposal asset reference`, failures);
    assert(!/assets\/v\/[a-f0-9]{12}\/[^"'\s)<>]+\?v=/i.test(html), `${file} retains a redundant manual asset cachebuster`, failures);
  }
  assert(versions.size === 1, `proposal pages must share one asset version (found ${Array.from(versions).join(", ") || "none"})`, failures);
  if (versions.size !== 1) return;

  const version = Array.from(versions)[0];
  const assetRoot = path.join(outDir, "assets");
  const versionRoot = path.join(assetRoot, "v", version);
  assert(fs.existsSync(versionRoot), `content-versioned asset bundle is missing: ${version}`, failures);

  const files = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (current === assetRoot && entry.name === "v") continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else files.push(absolute);
    }
  }
  walk(assetRoot);
  files.sort((a, b) => a.split(path.sep).join("/").localeCompare(b.split(path.sep).join("/")));
  files.push(path.join(outDir, "assumptions.js"));
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(outDir, file).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  assert(hash.digest("hex").slice(0, 12) === version, "proposal asset version must be deterministic and content-derived", failures);

  for (const file of [
    "common.js",
    "run-through.css",
    "run-through.js",
    "brand-rive.js",
    "vendor/rive/rive-2.38.5.wasm",
    "brand/omenmarketmaker/wordmark.riv",
    "fonts/product-app-fonts.css",
    "fonts/alegreya-sans-medium.woff2",
    "assumptions.js"
  ]) {
    assert(fs.existsSync(path.join(versionRoot, file)), `versioned proposal asset missing: ${file}`, failures);
  }

  const rawRunThrough = readRawDist("run-through.html");
  assert(!/<style>/i.test(rawRunThrough), "run-through must not retain its large inline stylesheet", failures);
  assert(!/<script(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/i.test(rawRunThrough), "run-through must not retain its large inline program", failures);
  assert(/run-through\.css/i.test(rawRunThrough) && /run-through\.js/i.test(rawRunThrough), "run-through must load its extracted cached assets", failures);
  assert(/rel=["']preload["'][^>]*run-through\.js[^>]*as=["']script["']/i.test(rawRunThrough), "run-through must preload its extracted program", failures);
}

function checkHeaders(failures) {
  const headers = readDist("_headers");
  const genericHeaders = headers.split("\n\n/")[0];
  assert(/Content-Security-Policy:/i.test(headers), "_headers missing Content-Security-Policy", failures);
  assert(/frame-ancestors 'none'/i.test(headers), "CSP missing frame-ancestors 'none'", failures);
  assert(/X-Content-Type-Options: nosniff/i.test(headers), "_headers missing nosniff", failures);
  assert(/Referrer-Policy: strict-origin-when-cross-origin/i.test(headers), "_headers missing Referrer-Policy", failures);
  assert(!/unpkg\.com/i.test(headers), "_headers should not allow unpkg.com", failures);
  assert(!/wasm-unsafe-eval/i.test(genericHeaders), "generic CSP must not grant WASM execution to every route", failures);
  assert(/inline-speculation-rules/i.test(headers), "CSP must allow the safe inline chapter-prerender rules", failures);
  assert(/\/assets\/v\/\*[\s\S]*Cache-Control:\s*public,\s*max-age=31536000,\s*immutable/i.test(headers), "versioned proposal assets must receive immutable browser caching", failures);
  assert(/\/\*\.html[\s\S]*Cache-Control:\s*public,\s*max-age=0,\s*must-revalidate/i.test(headers), "proposal HTML must remain revalidated", failures);
  assert(/\n\/\n[\s\S]*wasm-unsafe-eval/i.test(headers), "proposal homepage CSP must allow its local Rive WASM runtime", failures);
  assert(/\/index\.html[\s\S]*wasm-unsafe-eval/i.test(headers), "index.html CSP must allow its local Rive WASM runtime", failures);
  assert(/\/run-through\*[\s\S]*wasm-unsafe-eval/i.test(headers), "run-through CSP must allow its local Rive WASM runtime", failures);
  assert(/\/omenmarketmaker\*[\s\S]*wasm-unsafe-eval/i.test(headers), "OmenMarketMaker CSP must allow its local Rive WASM runtime", failures);
}

function checkMetadata(file, html, failures) {
  const expectedUrl = file === "index.html" ? `${siteUrl}/` : `${siteUrl}/${file.replace(/\.html$/i, "")}`;
  assert(/<title>[^<]+<\/title>/i.test(html), `${file} missing title`, failures);
  assert(/<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html), `${file} missing description`, failures);
  assert(new RegExp(`<link\\s+[^>]*rel=["']canonical["'][^>]*href=["']${expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(html), `${file} missing expected canonical ${expectedUrl}`, failures);
  assert(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["'][^"']+["']/i.test(html), `${file} missing og:title`, failures);
  assert(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["'][^"']+["']/i.test(html), `${file} missing og:description`, failures);
  const image = brandImageByPage[file];
  const expectedCard = image ? "summary_large_image" : "summary";
  assert(new RegExp(`<meta\\s+[^>]*name=["']twitter:card["'][^>]*content=["']${expectedCard}["']`, "i").test(html), `${file} missing ${expectedCard} twitter:card`, failures);
  if (image) {
    const expectedImageUrl = `${siteUrl}/${image}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert(new RegExp(`<meta\\s+[^>]*property=["']og:image["'][^>]*content=["']${expectedImageUrl}["']`, "i").test(html), `${file} missing route-specific og:image`, failures);
    assert(new RegExp(`<meta\\s+[^>]*name=["']twitter:image["'][^>]*content=["']${expectedImageUrl}["']`, "i").test(html), `${file} missing route-specific twitter:image`, failures);
    assert(/<link\s+[^>]*rel=["']icon["'][^>]*type=["']image\/png["'][^>]*sizes=["']32x32["'][^>]*href=["'][^"']*assets\/brand/i.test(html), `${file} missing branded PNG favicon`, failures);
    assert(/<link\s+[^>]*rel=["']apple-touch-icon["']/i.test(html), `${file} missing apple touch icon`, failures);
    assert(/<meta\s+[^>]*name=["']theme-color["']/i.test(html), `${file} missing theme color`, failures);
  } else {
    assert(!/og:image|twitter:image|summary_large_image|assets\/brand|data-page-brand/i.test(html), `${file} must remain outside the branding redesign`, failures);
  }
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
  assert(navTargets.includes("demothemis-mvp.html"), `${file} primary navigation missing demothemis-mvp.html`, failures);
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
  const marketChapter = readDist("omenmarketmaker.html");
  const homeMarketFeatures = home.match(/<h3\b[^>]*>OmenMarketMaker<\/h3>\s*<p\b[^>]*class=["'][^"']*\bproduct-tagline\b[^"']*["'][^>]*>[\s\S]*?<\/p>\s*<ol[^>]*>([\s\S]*?)<\/ol>/i);
  const chapterMarketFeatures = marketChapter.match(/<h3>OmenMarketMaker: six market features<\/h3>\s*<ol[^>]*>([\s\S]*?)<\/ol>/i);
  const chapterTargets = ["exploited-arbiter", "start-market", "self-custody-tokens", "tradeable-disputes", "peer-to-peer-parlays", "private-markets"];
  const courtProductAt = home.search(/<article\b[^>]*class=["'][^"']*\bproduct\b[^"']*\bcourt\b/i);
  const marketProductAt = home.search(/<article\b[^>]*class=["'][^"']*\bproduct\b[^"']*\bmarket\b/i);
  assert(courtProductAt >= 0 && marketProductAt > courtProductAt, "Home must present the arbitration service as Product one before OmenMarketMaker as Product two", failures);
  assert(
    home.includes("DemoThemis and OmenMarketMaker are entirely separate products but both require the other to exist, DemoThemis needs OmenMarketMaker to bootstrap its existence and create demand and OmenMarketMaker needs DemoThemis' superior arbitration to create a superior product to existing markets."),
    "Home must preserve the requested DemoThemis and OmenMarketMaker dependency statement exactly",
    failures
  );
  assert(Boolean(homeMarketFeatures), "Home is missing the OmenMarketMaker feature summary", failures);
  assert(Boolean(chapterMarketFeatures), "omenmarketmaker.html is missing the shared feature summary", failures);
  if (homeMarketFeatures && chapterMarketFeatures) {
    const featureText = (block) => Array.from(block.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi), (match) => normalizedHtmlText(match[1]));
    assert(JSON.stringify(featureText(chapterMarketFeatures[1])) === JSON.stringify(featureText(homeMarketFeatures[1])), "OmenMarketMaker chapter features must match Home in wording and order", failures);
    const homeTargets = anchorSequence(homeMarketFeatures[1]).map((entry) => entry.href);
    const localTargets = anchorSequence(chapterMarketFeatures[1]).map((entry) => entry.href);
    assert(JSON.stringify(homeTargets) === JSON.stringify(chapterTargets.map((target) => `omenmarketmaker.html#${target}`)), "Home feature points must link to their OmenMarketMaker sections", failures);
    assert(JSON.stringify(localTargets) === JSON.stringify(chapterTargets.map((target) => `#${target}`)), "OmenMarketMaker feature points must link to their local sections", failures);
  }
  const marketSectionTargets = Array.from(marketChapter.matchAll(/<section\b[^>]*\bid=["']([^"']+)["']/gi), (match) => match[1]);
  assert(JSON.stringify(marketSectionTargets) === JSON.stringify(chapterTargets), "OmenMarketMaker value-prop sections must follow the numbered feature order", failures);
  const numberedMarketHeadings = Array.from(
    marketChapter.matchAll(/<p\b[^>]*class=["'][^"']*\bsec-label\b[^"']*["'][^>]*>\s*Value prop\s+(\d+)\s*<\/p>\s*<h2\b[^>]*>\s*(\d+(?:\.\d+)?)(?:\.\s+|\s+)/gi),
    (match) => [match[1], match[2]]
  );
  const expectedMarketHeadings = [["1", "1"], ["2", "2"], ["2", "2.1"], ["2", "2.2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]];
  assert(JSON.stringify(numberedMarketHeadings) === JSON.stringify(expectedMarketHeadings), "OmenMarketMaker value-prop labels and headings must use the canonical numbering", failures);

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
  assert(/function\s+initLocalFileLinks\s*\(\)/.test(commonSource), "assets/common.js is missing local-file Home link handling", failures);
  assert(/location\.protocol\s*!==\s*["']file:["']/.test(commonSource) && /querySelectorAll\(["']a\[href=\\?["']\/\\?["']\]["']\)/.test(commonSource), "local-file Home handling must only rewrite root links under file URLs", failures);
  assert(/initLocalFileLinks\(\);\s*initNav\(\);/.test(commonSource), "local Home links must be repaired before navigation state is initialized", failures);
  assert(/function\s+initChapterWarmup\s*\(/.test(commonSource) && /type\s*=\s*["']speculationrules["']/.test(commonSource) && /eagerness:\s*["']moderate["']/.test(commonSource), "chapter navigation must install moderate intent-based prerendering", failures);
  assert(/rel\s*=\s*["']prefetch["']/.test(commonSource) && /focusin/.test(commonSource) && /pointerdown/.test(commonSource), "chapter navigation must retain keyboard, pointer, and unsupported-browser prefetch fallbacks", failures);
  assert(/connection\.saveData/.test(commonSource) && /location\.protocol\s*!==\s*["']http:["']/.test(commonSource), "chapter warmup must respect data-saving and local-preview constraints", failures);
  assert(/rive-2\.38\.5\.wasm/.test(commonSource) && /wordmark\.riv/.test(commonSource) && /run-through\.js/.test(commonSource), "Run-through intent must warm its program and Rive resources", failures);
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
  assert(/data-chapter-link/.test(siteChrome) && /type\s*=\s*['"]speculationrules['"]/.test(siteChrome) && /warmChapterDocument/.test(siteChrome), "MVP chrome must warm proposal chapters without changing ordinary link navigation", failures);
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

  const runThrough = readDist("run-through.html");
  const demoThemis = readDist("demothemis.html");
  const bootstrapLoop = readDist("bootstrap-loop.html");
  const demoThemisHero = (demoThemis.match(/<header\b[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>([\s\S]*?)<\/header>/i) || ["", ""])[1];
  const simpleDemoThemis = (demoThemis.match(/<section\b[^>]*id=["']simple-version["'][^>]*>([\s\S]*?)<\/section>/i) || ["", ""])[1];
  assert(/<span\s+class=["']pill["']>Start here<\/span>/i.test(runThrough), "Run-through must carry the Start here marker", failures);
  assert(!/<span\s+class=["']pill["']>Start here<\/span>/i.test(demoThemis), "DemoThemis must no longer carry the Start here marker", failures);
  assert(!demoThemisHero.includes("DemoThemis is a bullet proof, unbuyable court for any well-defined case."), "DemoThemis must keep the deleted general-purpose-court paragraph out of the page header", failures);
  assert(
    simpleDemoThemis.includes("DemoThemis is a bullet proof, unbuyable court for any well-defined case. Anyone can fund the jurors and receive a ruling; when money is involved, optional protocol escrow can execute it automatically."),
    "DemoThemis simple version must preserve the requested replacement paragraph exactly",
    failures
  );
  assert(!simpleDemoThemis.includes("The short version is this:"), "DemoThemis simple version must remove the superseded second paragraph", failures);
  assert(demoThemis.includes("The requester submits the question, evidence rules, and juror fee before anyone is drawn. If assets are involved, they may also enter protocol escrow."), "DemoThemis case lifecycle must use the requested submission wording", failures);
  assert(!demoThemis.includes("The requester fixes the question, evidence rules, and juror fee before anyone is drawn."), "DemoThemis case lifecycle must remove the superseded fixes wording", failures);
  assert(!/watched (?:resolution|assertion) window|Most cases settle|A quiet case pays/i.test(demoThemis), "DemoThemis chapter must not claim ownership of optional app-layer resolution windows", failures);
  assert(/Case and fee lock[\s\S]*Jurors are drawn[\s\S]*Presence is checked[\s\S]*Votes stay private[\s\S]*Appeals widen[\s\S]*The ruling returns/i.test(demoThemis), "DemoThemis case lifecycle must remain coherent after removing the app-layer settlement step", failures);
  assert(demoThemis.includes("Every funded case that reaches DemoThemis faces every lock below at once."), "DemoThemis attack model must begin at the funded court boundary", failures);
  assert(demoThemis.includes("Careless voting has a cost") && demoThemis.includes("Jurors can be privately penalized for careless mistakes, making guessing unprofitable without giving richer people more voting power."), "DemoThemis simple attack model must explain juror accountability without unexplained reserve jargon", failures);
  assert(!demoThemis.includes("The reserve prices laziness, not status") && !demoThemis.includes("The live reserve makes careless voting lose money"), "DemoThemis simple attack model must remove the superseded reserve card", failures);
  assert(demoThemis.includes("The jury cannot be rerolled") && demoThemis.includes("Each case gets one publicly verifiable random draw. The requester, an app, and DemoThemis must accept that panel; they cannot discard it and try again."), "DemoThemis simple attack model must explain the one-draw rule in plain language", failures);
  assert(!demoThemis.includes("The draw cannot be shopped") && !demoThemis.includes("One case, one roll, no app-controlled reruns"), "DemoThemis simple attack model must remove the superseded draw-shopping shorthand", failures);
  const readerTabs = Array.from(demoThemis.matchAll(/<button\b[^>]*data-reader-mode=["'](simple|deep)["'][^>]*>/gi), (match) => match[1]);
  assert(JSON.stringify(readerTabs) === JSON.stringify(["simple", "deep"]), "DemoThemis must expose Simple and Deep-dive reader tabs in order", failures);
  assert(/id=["']reader-panel-simple["'][^>]*data-reader-pane=["']simple["']/i.test(demoThemis) && /id=["']reader-panel-deep["'][^>]*data-reader-pane=["']deep["']/i.test(demoThemis), "DemoThemis reader tabs must control two explicit content panels", failures);
  assert(/id=["']simple-problem["'][^>]*data-reader-category=["']problem["'][\s\S]*id=["']why-it-exists["'][\s\S]*id=["']case-lifecycle["']/i.test(demoThemis), "DemoThemis simple Problem and role category must contain the introduction and lifecycle", failures);
  assert(/id=["']simple-resistance["'][^>]*data-reader-category=["']resistance["'][\s\S]*id=["']attack-model["'][\s\S]*id=["']disputes-courts["']/i.test(demoThemis), "DemoThemis simple Attack resistance category must contain the attack and appeal sections", failures);
  assert(/id=["']simple-quality["'][^>]*data-reader-category=["']quality["'][\s\S]*id=["']juror-quality["'][\s\S]*id=["']bootstrap["']/i.test(demoThemis), "DemoThemis simple Juror quality category must contain quality and bootstrap sections", failures);
  const categoryMaps = Array.from(demoThemis.matchAll(/<div\b[^>]*class=["'][^"']*\bunderhood-map\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi), (match) => match[1]);
  assert(categoryMaps.length === 2 && categoryMaps.every((map) => (map.match(/class=["']link-cue["']/g) || []).length === 3), "Both DemoThemis reading modes must expose three clear category buttons", failures);
  assert(categoryMaps.every((map) => !/DemoThemis turns rented arbitration|Verified humans, live reserves|Completed cases, difficulty-adjusted scoring/i.test(map)), "DemoThemis category buttons must not include the old blurbs", failures);
  assert(/categoryTargets\s*=\s*\{[\s\S]*simple:[\s\S]*deep:/i.test(demoThemis) && /addEventListener\(["']hashchange["'],\s*syncFromHash\)/i.test(demoThemis), "DemoThemis reader tabs must preserve category context and respond to deep links", failures);
  const tabSelectionFunction = (demoThemis.match(/function\s+selectFromTab\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/i) || ["", ""])[1];
  assert(tabSelectionFunction && !/scrollToId|scrollIntoView|scrollTo\s*\(/i.test(tabSelectionFunction), "DemoThemis reader-tab clicks must not scroll the page", failures);
  assert(!/Continue for the mechanics|explained once simply and then under the hood/i.test(demoThemis), "DemoThemis must not describe the two reader modes as sequential content", failures);
  assert(demoThemis.includes("Different evidence, one quality record") && demoThemis.includes("No case type is excluded"), "DemoThemis must use one juror-quality record across every case type", failures);
  assert(!/Two courts, one constitution|separate rubric court|kept separate from the objective|only the promised standard and grader change/i.test(demoThemis), "DemoThemis must remove the split objective-versus-rubric accuracy system", failures);
  assert(["Airbnb", "Uber", "eBay", "Google Ads"].every((name) => demoThemis.includes(name)), "DemoThemis consumer examples must name familiar apps instead of describing every category generically", failures);
  assert(/id=["']capture-resistance["'][\s\S]*The clearest way to understand how those defenses work together is to attack them yourself[\s\S]*href=["']break-the-court\.html["'][^>]*>Open Break the Court/i.test(demoThemis), "DemoThemis Attack resistance must introduce and link to the Break the Court lab", failures);
  assert(/Token courts like UMA and Kleros[\s\S]*In token courts like UMA and Kleros/i.test(demoThemis), "DemoThemis must identify UMA and Kleros whenever it introduces token courts", failures);
  assert(/token-weighted courts like UMA and Kleros/i.test(marketChapter), "OmenMarketMaker must use the wording token-weighted courts like UMA and Kleros", failures);
  assert(runThrough.includes("Every case updates juror quality") && runThrough.includes("All well-defined cases contribute to sustainable consensus"), "Run-through must show one quality system for every final case", failures);
  assert(!/Objective or rubric court\?|grade jurors differently|Only clean, checkable outcomes grade jurors|without influencing future juror scores/i.test(runThrough), "Run-through must not exclude non-objective cases from juror-quality scoring", failures);
  assert(bootstrapLoop.includes("Every completed case strengthens scoring") && bootstrapLoop.includes("every final case contributes"), "Bootstrap loop must explain that every final case contributes to juror quality", failures);
  assert(!/Rubric courts handle subjective questions|Every aptitude test passes a quality gate|eligible market outcomes steadily supply independently verified, curated aptitude tests/i.test(bootstrapLoop), "Bootstrap loop must remove the objective-only accuracy model", failures);
  const courtLifecycle = (demoThemis.match(/<section\b[^>]*id=["']case-lifecycle["'][^>]*>([\s\S]*?)<\/section>/i) || ["", ""])[1];
  assert((courtLifecycle.match(/<li\s+class=["']simple-step["']/g) || []).length === 6, "DemoThemis lifecycle must contain exactly six court-owned steps", failures);
  assert(!/\.simple-step:last-child\s*\{[^}]*grid-column/i.test(demoThemis), "DemoThemis six-step lifecycle must not leave an unbalanced spanning row", failures);
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

  assert(/\bMVP\b/i.test(title) && /DemoThemis/i.test(title), "demothemis-mvp.html title should identify the DemoThemis MVP", failures);
  assert(/\bMVP\b/i.test(description) && /\bon[- ]?chain\b/i.test(description), "demothemis-mvp.html description should explain the on-chain MVP", failures);

  const linkTargets = openingTagAttributeValues(html, "a", "href");
  const sameSiteProductLinks = linkTargets.flatMap((target) => {
    try {
      const targetUrl = new URL(target, `${siteUrl}/demothemis-mvp.html`);
      return targetUrl.origin === new URL(siteUrl).origin ? [targetUrl] : [];
    } catch (error) {
      return [];
    }
  });
  assert(
    sameSiteProductLinks.some((target) => target.pathname.replace(/\/+$/, "") === "/app"),
    `demothemis-mvp.html missing same-site live product link: ${siteUrl}/app`,
    failures
  );
  for (const route of ["/sandbox", "/home", "/about"]) {
    assert(
      !sameSiteProductLinks.some((target) => target.pathname.replace(/\/+$/, "") === route),
      `demothemis-mvp.html should not expose the retired ${route} route`,
      failures
    );
  }

  assert(/Preview the whole DemoThemis Live MVP app/i.test(html) && /Click through the whole live MVP/i.test(html), "demothemis-mvp.html should name the experience as a complete click-through MVP preview", failures);
  assert(/id=["']mvp-simulator["']/i.test(html), "demothemis-mvp.html is missing the interactive MVP preview", failures);
  assert(/id=["']mvpTutorialMeta["']/i.test(html) && /id=["']mvpTutorialBack["']/i.test(html) && /id=["']mvpTutorialSkip["']/i.test(html), "demothemis-mvp.html preview is missing its compact in-app tutorial controls", failures);
  assert(!/class=["'][^"']*mvp-sim-step-rail/i.test(html) && !/class=["'][^"']*mvp-browser-shell/i.test(html) && !/id=["']mvpSimNext["']/i.test(html), "demothemis-mvp.html should not retain the outer step rail, browser frame, or duplicate Next control", failures);
  assert(/id=["']mvpSimSurface["']/i.test(html) && /function\s+liveView\s*\(/i.test(html) && /function\s+submitView\s*\(/i.test(html) && /function\s+onboardingView\s*\(/i.test(html), "demothemis-mvp.html preview is missing a public Live MVP route", failures);
  assert(/data-preview-route=["']live["']/i.test(html) && /data-preview-route=["']submit["']/i.test(html) && /data-preview-route=["']onboard["']/i.test(html), "demothemis-mvp.html preview should expose live, submit, and juror routes", failures);
  assert(/function\s+caseAction\s*\(/i.test(html) && /data-sim-action=["']advance["']/i.test(html) && /mvp-tutorial-target/i.test(html), "demothemis-mvp.html tutorial progression should happen on highlighted controls inside the app UI", failures);
  assert(/class=["']is-yes-option/i.test(html) && /class=["']is-no-option/i.test(html) && /class=["']is-insufficient-option/i.test(html) && /data-sim-vote=["']insufficient["']/i.test(html), "demothemis-mvp.html should expose all three persistent ballot controls", failures);
  assert(/function\s+updateTutorial\s*\(/i.test(html) && /Skip to ruling/i.test(html), "demothemis-mvp.html should keep tutorial guidance concise", failures);
  assert(/function\s+initLocalPreviewLinks\s*\(/i.test(html) && /location\.protocol\s*===\s*["']file:["']/i.test(html), "demothemis-mvp.html preview should repair app routes when opened locally", failures);
  assert(/assets\/mvp-simulator\.css/i.test(html), "demothemis-mvp.html is missing the live-product preview stylesheet", failures);
  assert(/\bone (?:official )?question (?:is active|at a time)\b/i.test(html), "demothemis-mvp.html should explain the one-at-a-time rule", failures);
  assert(/\bthree (?:World ID-)?verified humans\b/i.test(html), "demothemis-mvp.html should identify the three verified jurors", failures);
  assert(/\bon[- ]?chain\b/i.test(html), "demothemis-mvp.html should explain the on-chain result", failures);
  assert(/\bJurors research independently\b/i.test(html), "demothemis-mvp.html should explain that jurors research independently", failures);
  assert(/\b20 MUSD case fee locked before the draw\b/i.test(html) && /\b14\.00 MUSD\b/i.test(html) && /\b4\.00 MUSD\b/i.test(html) && /\b2\.00 MUSD\b/i.test(html), "demothemis-mvp.html ruling receipt should account for the fixed 20 MUSD fee using the 70/20/10 split", failures);
  assert(/\bOnly ruling-matching revealers share the 14 MUSD juror pot\b/i.test(html) && /var\s+coherent\s*=\s*jurorAnswers\.filter/i.test(html) && /var\s+jurorShare\s*=\s*14\s*\/\s*coherent/i.test(html) && /var\s+payoutRows\s*=\s*jurorAnswers\.map/i.test(html), "demothemis-mvp.html ruling receipt should derive coherent payouts from the selected three-state answer", failures);
  assert(/\bPermanent 70\s*\/\s*20\s*\/\s*10\b/i.test(html) && /\bFixed question fee\b/i.test(html) && /\bReward pool\b/i.test(html) && /\bProtocol\b/i.test(html), "demothemis-mvp.html should show the court's fixed fee and permanent split", failures);
  assert(!/All completed jurors receive|No permanent fee split|Current demand|Reward-reserve top-up/i.test(html), "demothemis-mvp.html should not retain the superseded completion-pay or demand-quote receipt", failures);
  assert(!/optimistic(?: fast)? path|bonded[- ]assertion|settle(?:s|d)? free|jury is the (?:rare )?backstop/i.test(html), "demothemis-mvp.html must not restore the retired pre-jury settlement path", failures);
  assert(!/\bSafe local preview\b/i.test(html) && !/class=["'][^"']*mvp-sim-footnote/i.test(html), "demothemis-mvp.html should remove the redundant local-preview notice", failures);
  assert(/class=["'][^"']*mvp-button secondary[^"']*["'][^>]*href=["']https:\/\/demothemis\.netlify\.app\/app#oracle-live-panel["'][^>]*>\s*Open the MVP app/i.test(html), "the hero's MVP-app button must navigate directly to the deployed app", failures);
  assert(!/Open the deployed product/i.test(html), "the duplicate deployed-product link must be removed from the preview heading", failures);

  const inlineScripts = Array.from(html.matchAll(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1]);
  for (const [index, script] of inlineScripts.entries()) {
    try {
      new vm.Script(script, { filename: "demothemis-mvp.inline-" + (index + 1) + ".js" });
    } catch (error) {
      failures.push("demothemis-mvp inline script " + (index + 1) + " has invalid JavaScript: " + error.message);
    }
  }
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
  const end = html.indexOf("var MACHINE_FOCUS_COPY =");
  assert(start >= 0 && end > start, "run-through state-machine data block is missing or malformed", failures);
  if (start < 0 || end <= start) return;

  let data;
  try {
    const context = {};
    const source = html.slice(start, end) + "\nthis.__machineData = { phases: SYSTEM_PHASES, states: SYSTEM_STATES, transitions: SYSTEM_TRANSITIONS };";
    vm.runInNewContext(source, context, { filename: "the-design.state-machine-data.js" });
    data = context.__machineData;
  } catch (error) {
    failures.push("run-through state-machine data cannot be evaluated: " + error.message);
    return;
  }

  const phaseIds = new Set(data.phases.map((phase) => phase.id));
  const allStates = data.states;
  const ids = allStates.map((state) => state.id);
  const idSet = new Set(ids);
  assert(data.phases.length === 4 && phaseIds.size === 4, "state machine should have four unique lifecycle phases", failures);
  assert(idSet.size === ids.length, "state machine contains duplicate state IDs", failures);
  assert(data.states.every((state) => phaseIds.has(state.phase)), "state machine contains a lifecycle state with an invalid phase", failures);

  const allowedRoutes = new Set(["dispute"]);
  assert(allStates.every((state) => (state.routes || []).every((route) => allowedRoutes.has(route))), "state machine contains an unknown route tag", failures);
  const mappedStages = Array.from(new Set(data.states.flatMap((state) => state.sim || []))).sort((a, b) => a - b);
  assert(JSON.stringify(mappedStages) === JSON.stringify(Array.from({ length: 13 }, (_, index) => index)), "state machine must map every simulator event from 0 through 12", failures);

  const transitionKinds = new Set(["forward", "branch", "skip", "merge", "loop", "parallel"]);
  assert(data.transitions.length >= 30, "state machine transition model is unexpectedly incomplete", failures);
  assert(data.transitions.every((edge) => idSet.has(edge.from) && idSet.has(edge.to)), "state machine has a transition with an unknown endpoint", failures);
  assert(data.transitions.every((edge) => edge.from !== edge.to && transitionKinds.has(edge.kind) && edge.when), "state machine has an invalid transition shape", failures);

  function hasEdge(from, to, kind) {
    return data.transitions.some((edge) => edge.from === from && edge.to === to && (!kind || edge.kind === kind));
  }
  assert(hasEdge("private-room", "event-close", "skip"), "private rooms must bypass public graduation", failures);
  assert(hasEdge("pooled-claims", "event-close", "skip"), "pooled claims must bypass the optional parlay", failures);
  assert(
    hasEdge("event-close", "resolution-requested", "forward") &&
      hasEdge("resolution-requested", "fee-pool-check", "forward") &&
      hasEdge("fee-pool-check", "resolution-bond-posted", "branch") &&
      hasEdge("fee-pool-check", "fee-exceeds-pool", "branch") &&
      hasEdge("resolution-bond-posted", "court-fee-paid", "forward") &&
      hasEdge("court-fee-paid", "case-locked", "forward"),
    "closed markets must calculate the fee, branch to a caller-funded bond or the precommitted cancellation rule, and lock the paid case atomically",
    failures
  );
  assert(hasEdge("larger-panel", "panel-plan", "loop"), "a funded appeal must loop to a fresh wider panel plan", failures);
  assert(hasEdge("provisional-verdict", "provisional-handoff", "forward") && hasEdge("provisional-handoff", "omen-appeal-choice", "forward") && hasEdge("omen-appeal-choice", "appeal-gate", "forward"), "every provisional court result must return to the OmenMarketMaker appeal interface before the next-rung funding decision", failures);
  const seatCheck = data.states.find((state) => state.id === "seat-checked");
  assert(seatCheck && /deterministic standby/i.test(seatCheck.detail || ""), "seat checks must explain deterministic standby continuity", failures);
  assert(hasEdge("panel-consensus", "provisional-verdict", "branch") && hasEdge("panel-consensus", "insufficient-verdict", "branch"), "parallel panels must explicitly support consensus or an insufficient-information result", failures);
  assert(hasEdge("court-final", "signed-ruling", "forward") && hasEdge("signed-ruling", "ruling-handoff", "forward") && hasEdge("ruling-handoff", "omen-release-rule", "forward") && hasEdge("omen-release-rule", "settle-funds", "forward") && hasEdge("settle-funds", "market-record", "forward"), "the signed DemoThemis ruling must return to OmenMarketMaker before market payout", failures);
  assert(hasEdge("signed-ruling", "quality-update", "parallel") && hasEdge("quality-update", "external-evidence", "parallel") && hasEdge("signed-ruling", "collusion-clock", "parallel"), "juror learning, optional later evidence, and accountability must remain post-finality rails", failures);
  assert(hasEdge("market-record", "bootstrap-loop", "parallel"), "the market-demand loop must begin from a completed OmenMarketMaker record", failures);

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
  assert(routeReaches("dispute", "rules-fixed", "market-record"), "default disputed route is not continuous from question through court to the closed market record", failures);
  assert(!/SYSTEM_EXCEPTIONS|kind:\s*["']exception["']/i.test(html), "run-through must stay focused on successful product routes", failures);
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
    assert(modes.omen && modes.omen.start === 0, "OmenMarketMaker tab must start at Event 01", failures);
    assert(modes.themis && modes.themis.start === 6, "DemoThemis tab must start at Event 07", failures);
    assert(modes.omen.label === "Full market run" && modes.themis.label === "Court-backed run", "run-through starting-point labels are incorrect", failures);
    assert(boundaries.omen.appTheme === "omen" && boundaries.omen.appBrand === "OmenMarketMaker" && boundaries.omen.appOrigin === "app.omenmarketmaker.com" && !boundaries.omen.frameTitle, "OmenMarketMaker app-boundary config is incorrect", failures);
    assert(boundaries.handoff.appTheme === "omen" && boundaries.handoff.appBrand === "OmenMarketMaker" && boundaries.handoff.appOrigin === "app.omenmarketmaker.com", "Events 07-08 must remain inside the OmenMarketMaker app", failures);
    assert(boundaries.handoff.frameTitle === "Seeding DemoThemis with demand from the Application Layer", "Events 07-08 must label the application-layer demand frame", failures);
    assert(boundaries.themis.appTheme === "themis" && boundaries.themis.appBrand === "DemoThemis" && boundaries.themis.appOrigin === "court.demothemis.com" && !boundaries.themis.frameTitle, "DemoThemis app-boundary config is incorrect", failures);
    assert(!boundaries.protocol, "protocol explainers must not be registered as application boundaries", failures);
    assert(eventBoundaries.slice(0, 8).every((boundary) => boundary === boundaries.omen), "Events 01-08 must use the OmenMarketMaker app", failures);
    assert(eventBoundaries[8] === null && eventBoundaries[10] === null && eventBoundaries[12] === null, "draw, tally, and proof relay must have no application boundary", failures);
    assert(eventBoundaries[9] === boundaries.themis && eventBoundaries[11] === boundaries.omen, "juror voting must use DemoThemis while market appeals begin in OmenMarketMaker", failures);
  } catch (error) {
    failures.push("run-through product-mode data cannot be evaluated: " + error.message);
  }
}

function checkAppOwnershipData(html, failures) {
  const pages = readRunThroughLiteral(html, "APP_PAGES", failures);
  if (!Array.isArray(pages)) return;
  assert(pages.length === 13, "APP_PAGES must define all 13 events", failures);
  assert(pages.slice(0, 8).every((page) => /^OmenMarketMaker\b/.test(page.product || "")), "APP_PAGES Events 01-08 must belong to OmenMarketMaker", failures);
  assert([8, 10, 12].every((index) => /on-chain sequence$/i.test(pages[index].product || "")), "automated event data must belong to the DemoThemis on-chain sequence", failures);
  assert(pages[9].product === "DemoThemis" && pages[11].product === "OmenMarketMaker", "APP_PAGES must keep juror voting in DemoThemis and market appeal review in OmenMarketMaker", failures);
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
    const allowedSurfaces = new Set(["omen", "themis", "protocol"]);
    const allowedOwners = new Set(["user", "protocol", "simulator"]);
    assert(surfaces.length === 13, "EVENT_SURFACES must define ownership for all 13 events", failures);
    assert(
      surfaces.every((entry) => entry && allowedSurfaces.has(entry.surface) && typeof entry.actor === "string" && entry.actor.trim() && allowedOwners.has(entry.actionOwner)),
      "every event must declare a valid surface, actor, and actionOwner",
      failures
    );
    assert(surfaces.some((entry) => entry && entry.surface === "omen"), "surface metadata is missing OmenMarketMaker events", failures);
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
      Boolean(finalState && (finalState.surface === "omen" || finalState.product === "OmenMarketMaker")),
      "the run-through must return to OmenMarketMaker for its final state",
      failures
    );
    assert(
      finalBlocks.some((block) => block && block.type === "settlement") && /(?:market resolved|settlement|payout|redeemable)/i.test(finalCopy),
      "the run-through must finish on an OmenMarketMaker settlement result",
      failures
    );
  }

  const protocolRenderer = runThroughFunctionSource(html, "renderProtocolSequence");
  const protocolRecordRenderer = runThroughFunctionSource(html, "renderProtocolRecord");
  const sequencePredicate = runThroughFunctionSource(html, "isSequencePage");
  const sequenceProfile = runThroughFunctionSource(html, "sequenceProfileForPage");
  assert(Boolean(protocolRenderer), "run-through is missing the read-only protocol sequence renderer", failures);
  assert(/page\.view\s*===\s*["']sequence["']/.test(sequencePredicate), "sequence rendering must be independent from product ownership", failures);
  assert(/OmenMarketMaker (?:automatic|solver) execution/.test(sequenceProfile) && /DemoThemis on-chain sequence/.test(sequenceProfile), "one sequence renderer must carry distinct OmenMarketMaker and DemoThemis profiles", failures);
  if (protocolRenderer) {
    assert(!/makeEl\(\s*["']button["']|\.addEventListener\s*\(|makeLiveActionControl|renderLivePage/.test(protocolRenderer), "the protocol sequence canvas must remain read-only and independent of app-page rendering", failures);
    assert(!/sim-live-preview|sim-browser-bar|sim-url|sim-app-viewport|app-window|app-nav/.test(protocolRenderer), "the protocol sequence renderer must not contain browser or app structure", failures);
    assert(/data-sequence-profile/.test(protocolRenderer) && /page\.sequenceSteps\s*\|\|/.test(protocolRenderer), "the sequence canvas must expose its product profile and support focused execution steps", failures);
  }
  assert(Boolean(protocolRecordRenderer) && !/makeEl\(\s*["']button["']|\.addEventListener\s*\(|makeLiveActionControl/.test(protocolRecordRenderer), "protocol record nodes must not contain app controls", failures);
  assert(/setAttribute\(\s*["']data-surface["']|\.dataset\.surface\s*=/.test(html), "run-through renderer must expose the active surface with data-surface", failures);

  const productRenderer = runThroughFunctionSource(html, "renderProductDemo");
  const liveBlockRenderer = runThroughFunctionSource(html, "renderLiveBlock");
  assert(!/function\s+renderRoleHandoff\s*\(/.test(html), "run-through must not render the removed per-event role strip", failures);
  assert(!/renderRoleHandoff|sim-role-handoff/.test(productRenderer), "event renderer must not insert the removed role strip", failures);
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
    const omen = groups.filter((group) => group.mode === "omen");
    const themis = groups.filter((group) => group.mode === "themis");
    assert(omen.length === 2 && omen[0].start === 0 && omen[omen.length - 1].end === 5, "OmenMarketMaker navigator must contain Events 01-06", failures);
    assert(themis.length === 3 && themis[0].start === 6 && themis[themis.length - 1].end === 12, "DemoThemis navigator shell must begin at Event 07", failures);
    assert(groups.every((group) => group.mode === "omen" || group.mode === "themis"), "every event group must belong to a product mode", failures);
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
  assert(resolvedSnapshots.length === 38, `app simulator must expose exactly 38 streamlined states (found ${resolvedSnapshots.length})`, failures);
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
  const cashoutResult = demoSnapshot(6, "after-4");
  assert(
    parlayStart && parlayStart.page.view === "application" && parlayStart.page.route === "/parlays/new" && !(parlayStart.page.blocks || []).some((block) => block.type === "route"),
    "Event 06 must begin as a production parlay builder without backend route controls",
    failures
  );
  assert(
    parlayExecution && parlayExecution.page.surface === "omen" && parlayExecution.page.view === "sequence" && parlayExecution.page.sequenceProfile === "omen" && parlayExecution.page.actionOwner === "protocol",
    "Event 06 placement must leave the app for a read-only OmenMarketMaker execution sequence",
    failures
  );
  assert(
    parlayPosition && parlayPosition.page.view === "application" && parlayPosition.page.route === "/parlays/PM-4821" &&
      (parlayPosition.page.blocks || []).some((block) => block.type === "record" && block.title === "Parlay receipt" && /\$336 locked/i.test(rowValue(block, "Maximum payout escrow") || "") && Array.isArray(block.details) && block.details.length >= 4) &&
      !(parlayPosition.page.blocks || []).some((block) => block.type === "route"),
    "Event 06 must return to a real parlay position with permanent expandable transaction details",
    failures
  );
  assert(
    cashoutExecution && cashoutExecution.page.surface === "omen" && cashoutExecution.page.view === "sequence" && cashoutExecution.page.sequenceProfile === "omen" && cashoutExecution.page.actionOwner === "protocol",
    "Event 06 cashout must leave the app for a read-only OmenMarketMaker execution sequence",
    failures
  );
  assert(
    cashoutResult && cashoutResult.page.view === "application" && cashoutResult.page.route === "/parlays/PM-4821/cashout" &&
      (cashoutResult.page.blocks || []).some((block) => block.type === "settlement" && block.title === "Cashout result" && Array.isArray(block.details) && block.details.length >= 4) &&
      !(cashoutResult.page.blocks || []).some((block) => block.type === "route" || /fill check|revert/i.test(JSON.stringify(block))),
    "Event 06 must finish in the app with a durable cashout result and no backend diagnostics",
    failures
  );

  const resolutionStart = demoSnapshot(7, "start");
  const resolutionRequest = demoBlock(resolutionStart, (block) => block.type === "record" && block.title === "Resolution request");
  const resolutionOdds = demoBlock(resolutionStart, (block) => block.type === "odds" && block.title === "Secondary trading live");
  assert(
    resolutionStart && resolutionStart.page.route === "/markets/england-euro-final/resolution" && rowValue(resolutionRequest, "Exact court fee") === "$92" && rowValue(resolutionRequest, "Bond payer") === "0x4b...91" && /stays here/i.test(rowValue(resolutionRequest, "Outcome backing") || "") && resolutionOdds && resolutionOdds.yes === 91 && resolutionOdds.no === 9,
    "Event 07 must show the exact caller-funded resolution bond and separate outcome backing before court payment",
    failures
  );
  assert(!/challenge period|asserted outcome|bonded assertion/i.test(JSON.stringify(resolutionStart.page)), "Event 07 must not confuse the resolution bond with the removed assertion and watcher path", failures);
  const fundedResolution = demoSnapshot(7, "after-1");
  const fundedRecord = demoBlock(fundedResolution, (block) => block.type === "record" && block.title === "Bonded resolution");
  assert(
    fundedRecord && fundedResolution.page.route === "/markets/england-euro-final/resolution/funded" && rowValue(fundedRecord, "DemoThemis fee") === "$92 paid from bond" && /stays here/i.test(rowValue(fundedRecord, "Outcome collateral") || "") && /^0x/i.test(rowValue(fundedRecord, "Transaction") || ""),
    "Event 07 must finish on a durable caller-bonded resolution record with separate outcome custody",
    failures
  );

  const handoffStart = demoSnapshot(8, "start");
  const handoffRecord = demoBlock(handoffStart, (block) => block.type === "record" && block.title === "Bonded handoff");
  const handoffBoundary = demoBlock(handoffStart, (block) => block.type === "table" && block.title === "Product boundary");
  const handoffStartOdds = demoBlock(handoffStart, (block) => block.type === "odds" && block.title === "Current market odds");
  assert(
    handoffStart && handoffStart.page.route === "/markets/england-euro-final/court-handoff" && /Move to DemoThemis/i.test(rowValue(handoffRecord, "Case and evidence rules") || "") && rowValue(handoffRecord, "Resolution payment") === "$92 caller bond" && /stays at OmenMarketMaker/i.test(rowValue(handoffRecord, "Outcome collateral") || "") && rowValue(handoffBoundary, "OmenMarketMaker") === "Holds outcome collateral",
    "Event 08 must make the caller-bonded case handoff and separate outcome custody immediately understandable",
    failures
  );
  assert(handoffStartOdds && handoffStartOdds.yes === 91 && handoffStartOdds.no === 9, "Event 08 must keep the unchanged 91/9 secondary-market price through the handoff", failures);
  const handoffEnd = demoSnapshot(8, "after-1");
  const courtRecord = demoBlock(handoffEnd, (block) => block.type === "record" && block.title === "Court intake");
  const custodyTable = demoBlock(handoffEnd, (block) => block.type === "table" && block.title === "Separate custody");
  const handoffEndOdds = demoBlock(handoffEnd, (block) => block.type === "odds" && block.title === "Secondary trading live");
  assert(
    courtRecord && handoffEnd.page.route === "/markets/england-euro-final/court-case" && /Case #1182/i.test(courtRecord.value || "") && rowValue(courtRecord, "Rules") === "Locked" && rowValue(courtRecord, "Panel") === "7 seats" && rowValue(courtRecord, "Court fee") === "$92 paid" && rowValue(custodyTable, "Outcome collateral") === "$118,000" && /Paid from caller bond/i.test(JSON.stringify(custodyTable || {})),
    "Event 08 must open a draw-ready court intake record paid from the caller bond without moving outcome collateral",
    failures
  );
  assert(handoffEndOdds && handoffEndOdds.yes === 91 && handoffEndOdds.no === 9, "Event 08 must not fabricate a price jump during the administrative handoff", failures);

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
    ballotBlock && JSON.stringify((ballotBlock.options || []).map((option) => option[0])) === JSON.stringify(["YES", "NO", "INSUFFICIENT INFORMATION"]),
    "Event 10 must expose exactly the YES, NO, and INSUFFICIENT INFORMATION ballot choices",
    failures
  );
  const ballotRecord = demoBlock(demoSnapshot(10, "after-1"), (block) => block.type === "record" && block.title === "Submission details");
  const ballotRecordCopy = JSON.stringify(ballotRecord || {});
  assert(
    ballotRecord && rowValue(ballotRecord, "Ballot") === "Hidden" && /open until deadline/i.test(rowValue(ballotRecord, "Re-keying") || "") && /pending/i.test(rowValue(ballotRecord, "Fee") || "") && !/\b(?:YES|NO)\b/.test(ballotRecordCopy),
    "Event 10 must keep the ballot replaceable and retain submission details without revealing the selected outcome",
    failures
  );

  const appealStart = demoSnapshot(12, "start");
  const appealStartResult = demoBlock(appealStart, (block) => block.type === "record" && block.title === "Provisional court result");
  const appealCheckoutState = demoSnapshot(12, "after-1");
  const appealCheckout = demoBlock(appealCheckoutState, (block) => block.type === "appealCrowdfund" && block.title === "Crowdfunded appeal funding");
  assert(
    appealCheckout && appealCheckout.goal === 31000 && appealCheckout.funded === 18400 && appealCheckout.remaining === 12600 && appealCheckout.serviceFee === 14200 && appealCheckout.securityBond === 16800 && appealCheckout.serviceFee + appealCheckout.securityBond === appealCheckout.goal && Array.isArray(appealCheckout.quoteRows) && rowValue({ rows: appealCheckout.quoteRows }, "Service fee subtotal") === "$14,200" && rowValue({ rows: appealCheckout.quoteRows }, "Security bond") === "$16,800" && rowValue({ rows: appealCheckout.quoteRows }, "Total appeal funding") === "$31,000",
    "Event 12 must show a conserved public appeal goal split into tagged service fee and separately escrowed security",
    failures
  );
  assert(appealStartResult && /Provisional/i.test(appealStartResult.value || "") && /UTC/i.test(rowValue(appealStartResult, "Deadline") || ""), "Event 12 must return the provisional verdict and exact appeal deadline to OmenMarketMaker", failures);
  assert(appealCheckout && appealCheckout.destination === "DemoThemis appeal contract" && /pro-rata/i.test(appealCheckout.note || "") && /refund/i.test(appealCheckout.note || ""), "Event 12 must keep appeal contributions directly attributed and refundable when the public goal expires short", failures);
  const contributedAppealState = demoSnapshot(12, "after-2");
  const contributedAppeal = demoBlock(contributedAppealState, (block) => block.type === "appealCrowdfund" && block.title === "Crowdfunded appeal funding");
  assert(contributedAppeal && contributedAppeal.funded === 22400 && contributedAppeal.userContribution === 4000 && contributedAppeal.serviceFee === 14200 && contributedAppeal.securityBond === 16800 && contributedAppeal.contributors.some((row) => /You/.test(row[0]) && row[1] === 4000), "Event 12 must record the connected wallet's contribution and proportional tagged funding share before the crowd completes the goal", failures);
  const fundedAppealState = demoSnapshot(12, "after-3");
  const fundedAppealRoute = demoBlock(fundedAppealState, (block) => block.type === "route" && block.title === "Appeal funding complete");
  assert(fundedAppealState.page.surface === "protocol" && fundedAppealRoute && /14,200 paid once/.test(JSON.stringify(fundedAppealRoute)) && /16,800 locked/.test(JSON.stringify(fundedAppealRoute)), "Event 12 must start adjudication only after the service fee is funded and the separate security bond is locked", failures);
  const returnedAppealResult = demoSnapshot(12, "after-5");
  assert(returnedAppealResult.page.surface === "omen" && returnedAppealResult.page.template === "appeal-result" && /NO 9.6/i.test(JSON.stringify(returnedAppealResult.page)) && /31-person/i.test(JSON.stringify(returnedAppealResult.page)), "Event 12 must return the 15-person provisional result and the next appeal window to OmenMarketMaker", failures);

  const proofStart = demoBlock(demoSnapshot(11, "start"), (block) => block.type === "proof");
  const proofPosted = demoBlock(demoSnapshot(11, "after-1"), (block) => block.type === "proof" && block.title === "Aggregate tally");
  const proofVerified = demoBlock(demoSnapshot(11, "after-2"), (block) => block.type === "proof" && block.title === "Verified verdict");
  assert(proofStart && proofStart.verified === false, "Event 11 must mark the unposted aggregate proof as unverified", failures);
  assert(proofPosted && proofPosted.verified === false, "Event 11 must keep the posted tally unverified until its explicit proof check", failures);
  assert(proofVerified && /verified/i.test((proofVerified.stamp || "") + " " + (proofVerified.note || "")), "Event 11 must show the verified verdict as the durable protocol result", failures);

  function seatBlocksFor(event) {
    return snapshots
      .filter((snapshot) => snapshot.event === event)
      .flatMap((snapshot) => snapshot.page.blocks || [])
      .filter((block) => block.type === "seats");
  }

  const jurySeats = seatBlocksFor(9);
  const appealSeats = seatBlocksFor(12);
  assert(jurySeats.length > 0 && jurySeats.every((block) => block.count === 7), "Event 09 must render the documented first-rung 7-seat jury", failures);
  assert(jurySeats.every((block) => block.on === 0 || block.on === 7), "Event 09 active-seat count must be either 0 or 7", failures);
  assert(appealSeats.length > 0 && appealSeats.every((block) => block.count === 15), "Event 12 must render exactly 15 first-appeal seats", failures);
  assert(appealSeats.every((block) => block.on === 0 || block.on === 15), "Event 12 active-seat count must be either 0 or 15", failures);

  const compactDemoStepCounts = [1, 1, 2, 1, 2, 6, 2];
  assert(
    JSON.stringify(flows.slice(6).map((flow) => (flow.steps || []).length)) === JSON.stringify(compactDemoStepCounts),
    "Court-path Events 07-13 must retain the explicit 1/1/2/1/2/6/2 product-boundary path",
    failures
  );
  const exactSimulatorStepCounts = [1, 1, 1, 1, 2, 4, 1, 1, 2, 1, 2, 6, 2];
  assert(
    JSON.stringify(flows.map((flow) => (flow.steps || []).length)) === JSON.stringify(exactSimulatorStepCounts),
    "the OmenMarketMaker-to-DemoThemis simulator must retain its streamlined 13-event state path",
    failures
  );
  const configuredBlocks = pages.flatMap((page) => page.blocks || []).concat(
    flows.flatMap((flow) => (flow.steps || []).flatMap((step) => step.after && step.after.blocks || []))
  );
  assert(!configuredBlocks.some((block) => block && block.type === "receipt"), "receipt cards must not return as mandatory simulator states", failures);
  const confirmationSteps = flows.flatMap((flow) => (flow.steps || []).filter((step) => step.toast));
  assert(confirmationSteps.length >= 10 && confirmationSteps.every((step) => step.toast.title && step.toast.body && step.toast.detail), "meaningful destination changes must define concise in-app confirmation copy", failures);
  const appealEnd = demoSnapshot(12, "after-" + flows[11].steps.length);
  const appealEndCopy = JSON.stringify(appealEnd && appealEnd.page || {});
  assert(/\bNO\b/i.test(appealEndCopy) && /final|resolved/i.test(appealEndCopy), "Event 12 must show a final NO appeal verdict before finality", failures);
  const finalityStartCopy = JSON.stringify(demoSnapshot(13, "start").page);
  const finalityJurorCopy = JSON.stringify(demoSnapshot(13, "after-1").page);
  const finalityEndCopy = JSON.stringify(demoSnapshot(13, "after-" + flows[12].steps.length).page);
  assert(/\bNO\b/i.test(finalityStartCopy) && /final/i.test(finalityStartCopy), "Event 13 must carry the final NO verdict into court finality", failures);
  assert(/Juror 04|juror wallet/i.test(finalityJurorCopy) && /rating/i.test(finalityJurorCopy) && /\+\$92\.00|"fee":92/i.test(finalityJurorCopy), "Event 13 must fund the private juror wallet and update the juror rating before market settlement", failures);
  assert(/relay/i.test(finalityStartCopy) && /OmenMarketMaker/i.test(finalityEndCopy), "Event 13 must relay one final proof back to OmenMarketMaker", failures);
  assert(/Settlement complete|Payout received|\$210\.50|"status":"Paid"/i.test(finalityEndCopy) && !/Redeemable|redeem/i.test(finalityEndCopy), "Event 13 must finish on a paid OmenMarketMaker settlement with no contradictory redemption state", failures);
  assert(demoSnapshot(9, "start").page.surface === "protocol" && demoSnapshot(9, "after-2").page.surface === "protocol", "Event 09 must remain on the protocol sequence canvas from start through completion", failures);
  assert(demoSnapshot(11, "start").page.surface === "protocol" && demoSnapshot(11, "after-2").page.surface === "protocol", "Event 11 must remain on the protocol sequence canvas from start through completion", failures);
  assert(demoSnapshot(12, "start").page.surface === "omen" && demoSnapshot(12, "after-1").page.surface === "omen" && demoSnapshot(12, "after-2").page.surface === "omen" && demoSnapshot(12, "after-3").page.surface === "protocol" && demoSnapshot(12, "after-4").page.surface === "protocol" && demoSnapshot(12, "after-5").page.surface === "omen" && demoSnapshot(12, "after-6").page.surface === "protocol", "Event 12 must keep partial crowdfunding in Omen, start DemoThemis only at 100%, return the provisional result to Omen, and close in DemoThemis finality", failures);
  assert(demoSnapshot(13, "start").page.surface === "protocol" && demoSnapshot(13, "after-1").page.surface === "themis" && demoSnapshot(13, "after-2").page.surface === "omen", "Event 13 must settle the private juror account before replacing the sequence canvas with the OmenMarketMaker payout app", failures);
  assert(pages.slice(0, 8).every((page) => /^OmenMarketMaker\b/.test(page.product || "")), "Events 01-08 must remain owned by OmenMarketMaker", failures);
  assert([8, 10, 12].every((index) => /on-chain sequence$/i.test(pages[index].product || "")), "automated court events must be presented as the DemoThemis on-chain sequence", failures);
  assert(pages[9].product === "DemoThemis" && pages[11].product === "OmenMarketMaker", "juror voting must remain DemoThemis-owned while the market appeal interface is OmenMarketMaker-owned", failures);
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
    "appealCrowdfund", "ballot", "bars", "beacon", "capital", "checklist", "checkout", "closed", "countdown", "evidence",
    "faceChecks", "fields", "fill", "handoff", "legs", "liquidity", "marketTrade", "odds", "participants", "proof",
    "jurorSettlement", "receipt", "record", "route", "scoreboard", "seats", "settlement", "table", "ticket", "tokens", "utilities", "yield"
  ]);
  const moneyValuePattern = /^(?:[$£€]\s*\d[\d,]*(?:\.\d+)?[kmb]?|\d[\d,]*(?:\.\d+)?[kmb]?\s*(?:USD|USDC|WLD|ETH))$/i;
  const actionVerbPattern = /^(?:submit|contribute|deposit|supply|stake|buy|sell|take|fill|post|publish|pay|resolve|claim|invite|lock|build|cash\s*out|run|check|seal|open|show|challenge|return|restart)\b/i;
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
        case "record":
          assertText(block.value, `${blockLabel} value`);
          assert(Array.isArray(block.details) && block.details.length >= 2, `${blockLabel} must preserve at least two permanent details`, failures);
          if (Array.isArray(block.details)) assertTupleList(block.details, 2, `${blockLabel} details`);
          break;
        case "settlement":
          assertText(block.value, `${blockLabel} value`);
          assertText(block.status, `${blockLabel} status`);
          assert(Array.isArray(block.details) && block.details.length >= 4, `${blockLabel} must preserve payout and proof details`, failures);
          if (Array.isArray(block.details)) assertTupleList(block.details, 2, `${blockLabel} details`);
          break;
        case "appealCrowdfund":
          for (const field of ["goal", "funded", "remaining", "walletBalance", "userContribution"]) {
            assert(Number.isFinite(block[field]) && block[field] >= 0, `${blockLabel} ${field} must be a non-negative number`, failures);
          }
          assert(block.funded + block.remaining === block.goal, `${blockLabel} funded and remaining values must equal the goal`, failures);
          assertText(block.deadline, `${blockLabel} deadline`);
          assertText(block.destination, `${blockLabel} destination`);
          assertText(block.note, `${blockLabel} note`);
          assert(Number.isFinite(block.serviceFee) && block.serviceFee >= 0, `${blockLabel} serviceFee must be a non-negative number`, failures);
          assert(Number.isFinite(block.securityBond) && block.securityBond >= 0, `${blockLabel} securityBond must be a non-negative number`, failures);
          assert(block.serviceFee + block.securityBond === block.goal, `${blockLabel} service fee and security bond must conserve the funding goal`, failures);
          assert(typeof block.editable === "boolean", `${blockLabel} editable must be boolean`, failures);
          assert(Array.isArray(block.contributors), `${blockLabel} contributors must be a list`, failures);
          if (Array.isArray(block.contributors) && block.contributors.length) assertTupleList(block.contributors, 4, `${blockLabel} contributors`);
          if (Array.isArray(block.quoteRows)) assertTupleList(block.quoteRows, 3, `${blockLabel} quoteRows`);
          break;
        case "jurorSettlement":
          for (const field of ["source", "destination", "vote", "voteLabel", "finalVerdict", "note"]) {
            assertText(block[field], `${blockLabel} ${field}`);
          }
          for (const field of ["balanceBefore", "balanceAfter", "fee", "reserveDebit", "netCredit", "ratingBefore", "ratingAfter", "ratingDelta"]) {
            assert(Number.isFinite(block[field]), `${blockLabel} ${field} must be numeric`, failures);
          }
          assert(["up", "down"].includes(block.ratingDirection), `${blockLabel} ratingDirection must be up or down`, failures);
          assertTupleList(block.factors, 2, `${blockLabel} factors`);
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
    "Graduate the market",
    "Open the ERC-20 order book",
    "Create private room",
    "Build a parlay",
    "Open court resolution",
    "Review product handoff"
  ];
  assert(
    expectedInAppContinuationLabels.every((label, index) => continuations[index] && continuations[index].action === label),
    "Events 01-07 must use concise production-style in-app continuation labels",
    failures
  );
  assert(continuations.every((continuation) => continuation && continuation.dock !== "card"), "event continuations must use the destination page or product boundary instead of a receipt card", failures);
  assert(continuations[6] && continuations[6].targetTitle === "Bonded resolution", "Event 07 handoff navigation must attach to the bonded resolution record", failures);
  assert(continuations[9] && continuations[9].action === "View aggregate tally" && continuations[10] && continuations[10].action === "Review appeal in OmenMarketMaker" && continuations[11] && continuations[11].action === "View final proof relay", "court-path continuation labels must describe the next visible state and product boundary", failures);
  assert(flows[6] && flows[7] && flows[6].start.actor === "Resolution caller" && /^0x/i.test(flows[6].start.account || "") && flows[7].start.account === "Protocol", "the resolution screen must show its caller while the automatic handoff remains protocol-owned", failures);

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
    for (const key of ["rows", "details", "left", "right", "tabs", "steps", "people", "legs", "tokens"]) {
      if (key === "details" && block && (block.type === "record" || block.type === "settlement") && !block.open) continue;
      copy += visibleArray(block && block[key]);
    }
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
    12: ["EURO-FINAL · Resolution", "0x51...9b"],
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
    const appBoundary = page && page.surface === "themis" ? appBoundaries.themis : appBoundaries.omen;
    const appBrand = visibleScalar(appBoundary && appBoundary.appBrand || page && page.product);
    const sourceContext = visibleScalar(page && page.context || chrome[0]);
    const frameTitle = event === 8 ? visibleScalar(appBoundaries.handoff && appBoundaries.handoff.frameTitle) : "";
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

  const maxStateCopyBudgets = { 7: 370, 8: 425, 9: 350, 10: 380, 11: 386, 12: 850, 13: 520 };
  const traversalCopyBudgets = { 7: 1416, 8: 1534, 9: 1350, 10: 1433, 11: 1450, 12: 4950, 13: 1991 };
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
    const largestStateIndex = stateCopyLengths.indexOf(largestStateCopy);
    const largestStateName = eventStates[largestStateIndex] && eventStates[largestStateIndex].state;
    assert(largestStateCopy <= maxStateCopyBudgets[event], `Event ${event} state ${largestStateName} exceeds its existing maximum visible app-copy budget (${largestStateCopy} > ${maxStateCopyBudgets[event]})`, failures);
    assert(eventTraversalCopy <= traversalCopyBudgets[event], `Event ${event} increases DemoThemis traversal copy (${eventTraversalCopy} > ${traversalCopyBudgets[event]})`, failures);
    demoTraversalCopy += eventTraversalCopy;
  }

  assert(demoTraversalCopy <= 12750, `court-path traversal copy must stay within the 12,750-character product-boundary budget (found ${demoTraversalCopy})`, failures);

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
  const startingPosition = (eventOne.blocks || []).find((block) => block.title === "Initial liquidity");
  assert(marketForm && !(marketForm.rows || []).some((row) => /^category$/i.test(row[0])), "Event 01 market form must omit demo-only category metadata", failures);
  const resolveCondition = marketForm && (marketForm.rows || []).find((row) => /^resolve condition$/i.test(row[0]));
  assert(marketForm && marketForm.editable && resolveCondition && resolveCondition[2] === "textarea", "Event 01 must provide an editable resolve-condition textarea", failures);
  const openingOffers = startingPosition && startingPosition.offers || [];
  assert(startingPosition && startingPosition.type === "liquidity" && openingOffers.some((offer) => offer[0] === "YES" && offer[1] === "yes") && openingOffers.some((offer) => offer[0] === "NO" && offer[1] === "no"), "Event 01 must let the creator deposit initial liquidity into YES, NO, or both", failures);
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
  const event2Position = snapshots.find((snapshot) => snapshot.event === 2 && snapshot.state === "after-1");
  const event3Graduated = snapshots.find((snapshot) => snapshot.event === 3 && snapshot.state === "start");
  const event3Lending = snapshots.find((snapshot) => snapshot.event === 3 && snapshot.state === "after-1");
  const event4OrderBook = snapshots.find((snapshot) => snapshot.event === 4 && snapshot.state === "start");
  const event4Fill = snapshots.find((snapshot) => snapshot.event === 4 && snapshot.state === "after-1");
  const event5Funded = snapshots.find((snapshot) => snapshot.event === 5 && snapshot.state === "after-2");
  const snapshotCopy = (snapshot) => JSON.stringify(snapshot && snapshot.page || {});
  assert(event1Published && event1Published.page.route === "/m/england-euro-final" && /Market details/.test(snapshotCopy(event1Published)) && !/\/receipt/.test(event1Published.page.route), "Event 01 must publish directly to the actual public market page", failures);
  assert(/\$690/.test(snapshotCopy(event2Position)) && /\$50 YES/.test(snapshotCopy(event2Position)) && /\+8%/.test(snapshotCopy(event2Position)) && /treated like \$54/.test(snapshotCopy(event2Position)), "Event 02 must create one clearly explained early-entry position without a second pool action", failures);
  assert(/Claims tokenized/.test(snapshotCopy(event3Graduated)) && /820\.6/.test(snapshotCopy(event3Graduated)) && /Deposit YES to earn/.test(snapshotCopy(event3Graduated)) && !/How your order will fill/.test(snapshotCopy(event3Graduated)), "Event 03 must graduate the pool into wallet-held ERC-20 claims before order-book trading", failures);
  assert(/250 YES deposited/.test(snapshotCopy(event3Lending)) && /12\.4%/.test(snapshotCopy(event3Lending)) && /protected (?:lending|borrowing)/i.test(snapshotCopy(event3Lending)), "Event 03 must retain the protected ERC-20 lending demonstration after graduation", failures);
  assert(!/\bSupply\b|\bSupplied\b|Amount to supply|Supply fee/.test(snapshotCopy(event3Graduated) + snapshotCopy(event3Lending)), "Event 03 yield UX must consistently use deposit and withdraw terminology", failures);
  assert(/Buy 740 ERC-20 YES/.test(snapshotCopy(event4OrderBook)) && /500 YES available/.test(snapshotCopy(event4OrderBook)) && /240 YES needed/.test(snapshotCopy(event4OrderBook)) && /60/.test(snapshotCopy(event4OrderBook)) && !/Live pool|Pool remainder/.test(snapshotCopy(event4OrderBook)), "Event 04 must trade only graduated ERC-20 limit orders", failures);
  assert(/740 ERC-20 YES/.test(snapshotCopy(event4Fill)) && /\$434\.00/.test(snapshotCopy(event4Fill)) && /\$306\.00/.test(snapshotCopy(event4Fill)) && /58\.65/.test(snapshotCopy(event4Fill)) && /Trade record/.test(snapshotCopy(event4Fill)) && !/Live pool|Pool remainder/.test(snapshotCopy(event4Fill)), "Event 04 fill must use the two cheapest ERC-20 sell orders and retain exact transaction details", failures);
  assert(/\$20,000 locked/.test(snapshotCopy(event5Funded)) && /PM-ROOM-204/.test(snapshotCopy(event5Funded)) && !/60c|40c/.test(snapshotCopy(event5Funded)), "Event 05 funded room must show coherent equal-stake terms and a room reference", failures);
  assert(!/Final payout unlocked|redeem YES\/NO/.test(html), "Event 13 supporting copy must remain consistent with its automatic settlement", failures);

  assert(!/function\s+renderIntentStrip\s*\(/.test(html), "app views must not render the removed Why/Money/Next strip", failures);
  assert(!/title\.appendChild\(makeEl\("span",\s*"",\s*blockTypeLabel\(type\)\)\)/.test(html), "app cards must not repeat internal block-type labels", failures);
  const toastAnimationStart = html.indexOf("@keyframes toast-rise");
  const toastAnimationEnd = html.indexOf("@keyframes browser-back-icon-nudge", toastAnimationStart);
  const toastAnimation = toastAnimationStart >= 0 && toastAnimationEnd > toastAnimationStart ? html.slice(toastAnimationStart, toastAnimationEnd) : "";
  assert(/to\s*\{\s*opacity:\s*1/.test(toastAnimation) && /@keyframes\s+toast-away/.test(toastAnimation) && /@keyframes\s+toast-progress/.test(toastAnimation), "in-app confirmation must enter clearly, remain briefly, and then disappear", failures);
  assert(/function\s+renderStepConfirmation\s*\(/.test(html) && /sim-toast-icon/.test(html) && /aria-hidden/.test(html), "state feedback must render as one non-interactive in-app confirmation", failures);
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
      /block\.title\s*===\s*"Market details"/.test(liveFieldDraftSource),
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
      /block\.title\s*===\s*"Escrow record"/.test(liveFieldDraftSource) &&
      !/block\.title\s*===\s*"Escrow record"[\s\S]{0,360}setReceiptDetail\(block,\s*"Resolve rule"/.test(liveFieldDraftSource),
    "edited private-room terms must persist in the terms view without bloating the permanent escrow record",
    failures
  );
  assert(/document\.createElement\(controlType\s*===\s*"textarea"\s*\?\s*"textarea"\s*:\s*"input"\)/.test(html), "editable market forms must use native inputs and textareas", failures);
  assert(/amountInput\.type\s*=\s*"number"/.test(html) && /amountInput\.addEventListener\("input",\s*syncLiquidityOffer\)/.test(html), "opening-liquidity amounts must be editable native numeric controls", failures);
  assert(/liquidityPreview\.setAttribute\("aria-live",\s*"polite"\)/.test(html) && /Opening odds/.test(html) && /Opening escrow/.test(html), "opening-liquidity controls must expose live odds and escrow feedback", failures);
  assert(/function\s+currentStepValidation\s*\(/.test(html) && /marketFieldsReady/.test(html) && /roomFieldsReady/.test(html), "editable market and room actions must validate required fields", failures);
  assert(html.includes('if (!/^(?:YES|NO)$/i.test(cleanTip(roomSide)))') && html.includes('Choose YES or NO for your side.'), "private-room side entry must accept only a coherent YES or NO position", failures);
  assert(liveFieldDraftSource.includes('if (block.type === "participants")') && liveFieldDraftSource.includes('["Bob", "Signed " + opposingSide]'), "private-room participants must reflect the edited opposing sides after funding", failures);
  assert(/safeLiquidityAmount\(marketLiquidityDraft\.yes\)[\s\S]{0,120}safeLiquidityAmount\(marketLiquidityDraft\.no\)\s*<=\s*0/.test(html), "market publishing must require funded opening liquidity", failures);
  assert(/function\s+advanceEventStep\s*\(options\)\s*\{[\s\S]{0,220}currentStepValidation\(\)/.test(html), "invalid form state must be unable to advance the simulator", failures);
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
  assert(/brand\.appendChild\(makeProductWordmark\(appTheme\s*===\s*"omen"\s*\?\s*"omen"\s*:\s*"demothemis",\s*"app-brand-wordmark",\s*appBrand,\s*true\)\)/.test(productRenderer), "the embedded app wordmark must follow the current app boundary and use the live Omen wordmark", failures);
  assert(/APP_BOUNDARIES\.handoff\.frameTitle/.test(productRenderer), "the OmenMarketMaker court handoff must retain its outer integration frame", failures);
  assert(/makeEl\("span",\s*"app-nav-chip",\s*chrome\.context\)/.test(productRenderer), "the OmenMarketMaker web app must keep its normal context chip", failures);
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
        const surface = stageIndex < 8 ? "omen" : "themis";
        simulatedUrls[stageIndex] = urlContext.__simulatedAppUrl(pages[stageIndex], boundaries[surface]);
      }
      assert([0, 1, 2, 3, 4, 5, 6, 7].every((index) => /^app\.omenmarketmaker\.com\//.test(simulatedUrls[index])), "Events 01-08 must remain on the OmenMarketMaker app origin", failures);
      assert([9, 11].every((index) => /^court\.demothemis\.com\//.test(simulatedUrls[index])), "participant court events must use the DemoThemis app origin", failures);
      assert(simulatedUrls[7] === "app.omenmarketmaker.com/markets/england-euro-final/court-handoff", `Event 08 handoff must use its production OmenMarketMaker route (found ${simulatedUrls[7]})`, failures);
      assert(simulatedUrls[6] === "app.omenmarketmaker.com/markets/england-euro-final/resolution", `Event 07 court request must use its production OmenMarketMaker route (found ${simulatedUrls[6]})`, failures);
      assert(simulatedUrls[5] === "app.omenmarketmaker.com/parlays/new", "Event 06 must open on the production parlay-builder route", failures);
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
    "alegreya-sans-medium.woff2",
    "alegreya-sans-bold.woff2",
    "alegreya-sans-extrabold.woff2",
    "alegreya-sans-black.woff2",
    "literata-ui-variable.woff2",
    "noto-serif-tibetan-ui-variable.woff2",
    "noto-sans-symbols-2-ui.woff2"
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
  assert(/font-family:\s*["']Alegreya Sans App["']/i.test(css), "OmenMarketMaker font face is missing", failures);
  assert(/font-family:\s*["']Literata App["']/i.test(css) && /font-weight:\s*200\s+900/i.test(css), "DemoThemis variable font range is missing", failures);
  assert(/font-family:\s*["']Noto Serif Tibetan App["']/i.test(css) && /unicode-range:\s*U\+0F00-0FFF/i.test(css), "Tibetan fallback range is missing", failures);
  assert(/font-family:\s*["']Noto Sans Symbols 2 App["']/i.test(css), "UI symbol fallback is missing", failures);
  assert(!/alegreya-sans-regular|font-weight:\s*400[\s\S]*?Alegreya Sans App/i.test(css), "the unused Alegreya Sans 400 face must stay out of the delivered stylesheet", failures);
  assert(!/\.ttf\b|format\(["']truetype["']\)/i.test(css), "product fonts must use compressed WOFF2 delivery", failures);
  assert((css.match(/font-family:\s*["']Alegreya Sans App["'][\s\S]*?size-adjust:\s*107%/gi) || []).length === 4, "every used OmenMarketMaker font face must retain the 107% optical calibration", failures);
  assert(/font-family:\s*["']Literata App["'][\s\S]*?size-adjust:\s*97%/i.test(css), "DemoThemis Literata must retain the 97% optical calibration", failures);
  assert(!/font-family:\s*["'](?:Alegreya Sans App|Literata App)["'][\s\S]*?size-adjust:\s*100%/i.test(css), "primary product fonts must not fall back to equal CSS scaling", failures);
  assert(/font-family:\s*["']Noto Sans Symbols 2 App["'][\s\S]*?size-adjust:\s*72%/i.test(css), "UI symbol fallback must match the product cap height", failures);
  assert(/font-family:\s*["']Noto Serif Tibetan App["'][\s\S]*?size-adjust:\s*95%/i.test(css), "Tibetan fallback must match the product cap height", failures);
  assert(/font-synthesis:\s*none/i.test(html) && /font-variant-numeric:\s*lining-nums\s+tabular-nums/i.test(html), "product typography must disable synthetic styles and use stable numeric widths", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.run-control-panel/i.test(html), "event transport controls must inherit product typography", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.sim-step-guide/i.test(html), "current event guide must inherit product typography", failures);
  assert(/\.product-mode-panel\[data-product-mode=["']omen["']\]\s+\.run-control-panel/i.test(html) && /\.product-mode-panel\[data-product-mode=["']themis["']\]\s+\.run-control-panel/i.test(html), "event transport controls must inherit each product palette", failures);
  assert(/\.product-mode-panel\[data-product-mode=["']omen["']\]\s+\.sim-step-guide/i.test(html) && /\.product-mode-panel\[data-product-mode=["']themis["']\]\s+\.sim-step-guide/i.test(html), "current event guide must inherit each product palette", failures);
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
  assert(/--bg:\s*#f2e3cd/i.test(html) && /--surface:\s*#fff7e8/i.test(html) && /--accent:\s*#ad520f/i.test(html) && /--accent-ink:\s*#6f4400/i.test(html), "OmenMarketMaker must use the high-contrast amber parchment reading palette", failures);
  assert(/\.live-kpis:has\(>\s*\.live-kpi:only-child\)/i.test(html), "single app metrics must stay compact instead of becoming a full-width banner", failures);
  assert(/\.page-appeal-checkout\s+\.app-seat-grid\s*\{[^}]*repeat\(11/i.test(html), "appeal panels must use a dense desktop seat grid", failures);
  assert(/--action-fill:\s*#ad520f/i.test(html) && /--continue-fill:\s*#087068/i.test(html), "OmenMarketMaker app actions need distinct brand and continuation colors", failures);
  assert(/--action-fill:\s*#2f7199/i.test(html) && /--continue-ink:\s*#172017/i.test(html), "DemoThemis actions need a readable dark-theme foreground pairing", failures);
  assert(/\.page-create-market\s+\.block-fields/i.test(html) && /\.page-final-receipt\s+\.block-closed/i.test(html), "every app view must expose a scan-first anchor surface", failures);
  assert(/\.live-kpis\s*>\s*\.live-kpi:nth-child\(n\)[\s\S]{0,220}background:\s*var\(--surface\)/i.test(html), "app metrics must use neutral structure instead of decorative category colors", failures);
  const scanHierarchyStart = html.indexOf("/* Scan-first app hierarchy");
  const scanHierarchyCss = scanHierarchyStart >= 0 ? html.slice(scanHierarchyStart, html.indexOf("</style>", scanHierarchyStart)) : "";
  for (const template of ["create-market", "live-market", "order-book", "wallet-unlock", "private-room", "parlay-slip", "resolution-request", "court-handoff", "jury-draw", "juror-workspace", "verdict-page", "appeal-review", "appeal-checkout", "appeal-crowdfund", "appeal-result", "final-receipt"]) {
    assert(scanHierarchyCss.includes(`.page-${template}`), `scan-first hierarchy is missing the ${template} app view`, failures);
  }
  assert(!/#b83c32|#f7f2e8|#fffdf8/i.test(html), "OmenMarketMaker must not retain the red or near-white palette", failures);
}

function checkRunThroughPriorityUxFixes(html, failures) {
  const css = Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi), (match) => match[1]).join("\n");
  const simulatorSizeSource = runThroughFunctionSource(html, "updateSimulatorSizeState");

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
  assert(/isCompact\s*=\s*width\s*<=\s*760/.test(simulatorSizeSource), "tablet-width product surfaces must enter the compact layout before cards become unreadable", failures);
  assert(/@container\s+live-card\s*\(max-width:\s*16rem\)[\s\S]*?\.receipt-detail\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/i.test(css), "narrow receipt cards must stack their label and value instead of collapsing the value track", failures);
  assert(/@container\s+run-stage\s*\(max-width:\s*760px\)[\s\S]*?\.live-main[\s\S]*?\.protocol-sequence-records[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/i.test(css), "tablet product surfaces must stack app cards and protocol records in one readable column", failures);
  assert(/\.liquidity-grid\s*\{[^}]*grid-template-columns:\s*1fr/is.test(css), "opening YES and NO liquidity offers must use full rows instead of compressing nested controls", failures);
  assert(/\.liquidity-offer\s*\{[^}]*grid-template-columns:\s*minmax\(\s*4rem\s*,\s*auto\s*\)\s+minmax\(\s*7rem\s*,\s*1fr\s*\)/is.test(css), "opening liquidity controls must reserve readable room for both the side and amount", failures);
  assert(/\.liquidity-caption\s*\{[^}]*white-space:\s*nowrap/is.test(css), "the liquidity label must not collapse into one letter per line", failures);
  assert(/\.page-create-market\s+\.live-card\.block-fields\s*\{[^}]*minmax\(\s*min\(\s*14rem\s*,\s*100%\s*\)/is.test(css), "create-market fields must stack before their controls become unreadably narrow", failures);
  assert(/\.machine-phase-grid\s*\{[^}]*grid-template-columns:\s*repeat\(\s*2\s*,\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*\)/is.test(css), "the lifecycle map must not force four text-heavy phases into narrow columns", failures);
  assert(/\.machine-phase:nth-child\(3\)\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*2/is.test(css) && /\.machine-phase:nth-child\(4\)\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*2/is.test(css), "the two-column lifecycle map must preserve a continuous reading path", failures);
  assert(/@media\s*\(max-width:\s*920px\)[\s\S]*?\.machine-phase-grid\s*\{[^}]*grid-template-columns:\s*1fr/is.test(css), "the lifecycle map must become one column on narrower screens", failures);
  const responsiveKpiColumns = finalCssValue(".product-mode-panel[data-product-mode] .product-demo .sim-live-preview .live-kpis", "grid-template-columns");
  assert(/repeat\(\s*auto-fit\s*,\s*minmax/i.test(responsiveKpiColumns || ""), "app metrics must use content-sized responsive columns across both product themes", failures);
  assert(/minmax\(\s*0\s*,\s*1fr\s*\)/i.test(finalCssValue(".sim-live-preview", "grid-template-rows") || ""), "the app frame must allow its app viewport to shrink on short screens", failures);
  assert(/--sim-preview-max-height/i.test(finalCssValue(".sim-live-preview", "max-height") || ""), "the app frame must expose a viewport-height cap", failures);
  assert(/auto/i.test(finalCssValue(".sim-app-viewport", "overflow-y") || ""), "a height-capped app frame must keep its app content scrollable", failures);
  assert(/--sim-preview-max-height/i.test(finalCssValue(".protocol-sequence", "max-height") || ""), "the protocol sequence canvas must share the active-surface viewport cap", failures);
  assert(/auto/i.test(finalCssValue(".protocol-sequence-scroll", "overflow-y") || ""), "a height-capped sequence canvas must keep its records scrollable", failures);
  assert(finalCssValue(".product-demo.sim-compact .protocol-trace", "grid-template-columns") === "1fr", "compact protocol sequences must become a vertical process lane", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.product-demo\s+\.protocol-sequence\s+\.protocol-record\.live-card\s*\{[^}]*border-radius:\s*6px[^}]*box-shadow:\s*none/is.test(css), "protocol records must override the later app-card normalization with their flat sequence-node design", failures);
  assert(/\.protocol-sequence\[data-sequence-profile=["']omen["']\]\s*\{[^}]*--protocol-accent:\s*#f0a064/is.test(css), "OmenMarketMaker execution sequences must carry a distinct product-linked system palette", failures);
  assert(!/Each mock screen|Product mockup for the current simulation step|The app gets one panel|opens its court app/i.test(html), "standalone explainers must not be described as app or mock screens", failures);

  assert(!/function\s+makeLiveContinuationControl\s*\(/.test(html), "same-app continuation controls must reuse the existing next-event button", failures);
  assert(!/function\s+renderRoleHandoff\s*\(/.test(html), "the redundant per-event role strip must stay removed", failures);

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
      navigationContext.eventSurfaceDefaults = (stageIndex) => navSurfaces[stageIndex] || { surface: "omen" };
      navigationContext.currentContinuation = () => navContinuations[navigationContext.stage] || null;
      navigationContext.isEventComplete = () => navigationContext.eventComplete;
      vm.runInNewContext(
        [eventStartSurfaceSource, nextEventSurfaceSource, placementSource, "this.__nextControlPlacement = nextControlPlacement;"].join("\n"),
        navigationContext,
        { filename: "the-design.next-control-placement.js" }
      );
      const resolvedCompletionSurfaces = navSurfaces.map((entry) => entry.surface);
      resolvedCompletionSurfaces[11] = "protocol";
      resolvedCompletionSurfaces[resolvedCompletionSurfaces.length - 1] = "omen";
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
  assert(/var\s+stageMode\s*=\s*productModeForStage\(stage\)/.test(syncSource) && /setAttribute\(["']data-product-mode["'],\s*selectedRunMode\)/.test(syncSource) && /setAttribute\(["']data-current-section["'],\s*stageMode\)/.test(syncSource), "the chosen starting point must stay separate from the current event section", failures);
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
        selectedRunMode: "omen",
        completedStages: {},
        maxReachedByMode: { omen: 5, themis: 12 },
        productModeForStage(stageIndex) { return stageIndex < 6 ? "omen" : "themis"; },
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
          visitContext.selectedRunMode = "omen";
          visitContext.completedStages = Object.fromEntries(Array.from({ length: 13 }, (_, index) => [index, true]));
          visitContext.maxReachedByMode = { omen: 5, themis: 12 };
          visitContext.__resetArguments = [];
          const opened = visitContext.__visitEventFromNavigator(targetStage);
          assert(opened === true, `Event ${targetStage + 1} must remain visitable from the full event navigator`, failures);
          assert(visitContext.stage === targetStage, `Event ${targetStage + 1} navigation must select the clicked event`, failures);
          assert(visitContext.activeEventStep === 0 && visitContext.activeAction === -1, `Event ${targetStage + 1} navigation must land on Action 1`, failures);
          assert(visitContext.__resetArguments.length === 1 && visitContext.__resetArguments[0] === false, `Event ${targetStage + 1} navigation must use the first-action reset`, failures);
          assert(visitContext.completedStages[targetStage] === true, `Event ${targetStage + 1} replay must preserve completion history`, failures);
          assert(visitContext.selectedRunMode === "omen" && visitContext.runStartStage === 0, `Event ${targetStage + 1} replay must preserve the selected starting path`, failures);
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
  const leakingRouteViewportRule = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).find((match) => /data-product-mode=["'](?:omen|themis)["']/.test(match[1]) && /sim-app-viewport/.test(match[1]));
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
        let expectedStep = stepIndex > 0 ? stepIndex - 1 : flows[stageIndex - 1].steps.length;
        while (stepIndex > 0 && expectedStep > 0 && flows[stageIndex].steps[expectedStep] && flows[stageIndex].steps[expectedStep].autoAdvance) expectedStep -= 1;
        assert(
          previous && previous.stage === expectedStage && previous.step === expectedStep,
          `Event ${stageIndex + 1}, state ${stepIndex} must return to Event ${expectedStage + 1}, state ${expectedStep}`,
          failures
        );
      }
    }
    assert(stateCount === 38, "the Back regression matrix must cover all 38 streamlined states", failures);
    assert(predecessorCount === 37, "exactly 37 streamlined states must have a valid predecessor", failures);
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
  assert(/connectorTextHits\s*===\s*0\s*&&\s*coachmarkConnectorIsUsable\(candidate\)/.test(chooserSource), "floating coachmarks must reject detached or too-short connector routes", failures);

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
      /control\.value[\s\S]*placeholder[\s\S]*visibleContent/.test(textCollector) &&
      /querySelectorAll\(["']\.sim-result-toast["']\)[\s\S]*noticeGap\s*=\s*10[\s\S]*visibleNotice/.test(textCollector),
    "coachmark placement must measure visible, clipping-aware text and keep floating confirmations unobstructed",
    failures
  );
  assert(
    /animationName\s*!==\s*["']toast-rise["'][\s\S]*invalidateCoachmarkGeometry\(["']toast-entered["'],\s*true\)[\s\S]*invalidateCoachmarkGeometry\(["']toast-dismissed["'],\s*true\)/.test(html),
    "coachmark placement must be recomputed after a confirmation settles and after it disappears",
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
      /classList\.add\(["']has-inline-coachmark["']\)/.test(inlineRenderer) &&
      /--sim-toast-safe-top/.test(inlineRenderer) &&
      /--sim-toast-safe-top/.test(html),
    "the in-flow fallback must reserve its own row without collapsing the application viewport or covering a confirmation",
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
    /root[\s\S]*querySelector\(["']\.guided-target:not\(:disabled\)["']\)/.test(activeTargetSource) &&
      /getElementById\(["']runNext["']\)/.test(activeTargetSource) &&
      /classList\.contains\(["']guided-target["']\)/.test(activeTargetSource) &&
      /activeCoachmarkTarget\(\)/.test(positionerSource),
    "coachmark discovery must include enabled in-app actions and the shared next-event continuation",
    failures
  );
  assert(/coach\.hidden\s*=\s*true/.test(positionerSource) && /coach\.hidden\s*=\s*false/.test(positionerSource), "off-screen coachmarks must remain hidden until they have a valid target rectangle", failures);
  assert(!/compactCoachmark/.test(positionerSource) && /if\s*\(\s*!chosen\s*\)[\s\S]*renderCoachmarkInline\(/.test(positionerSource), "compact product surfaces must try the same collision-free placement solver before falling back beside the action", failures);
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
  assert(guidedStateCount === 38, `the simulator must expose a clear label in all 38 user and automatic states (found ${guidedStateCount})`, failures);
  const automaticSteps = flows.flatMap((flow) => (flow.steps || []).filter((step) => step.autoAdvance));
  assert(automaticSteps.length === 8 && automaticSteps.every((step) => step.actionOwner === "protocol"), "exactly eight internal protocol transitions must autoplay without extra user taps", failures);
  flows.forEach((flow, eventIndex) => {
    (flow.steps || []).forEach((step, stepIndex) => {
      const label = String(step.actionLabel || String(step.cue || "").replace(/^Tap\s+/i, "") || step.title || "").replace(/\s+/g, " ").trim();
      const explanation = String(copy[label] || step.coach || "").replace(/\s+/g, " ").trim();
      assert(Boolean(label), `Event ${eventIndex + 1} step ${stepIndex + 1} needs an action label`, failures);
      assert(explanation.split(/\s+/).filter(Boolean).length >= 6, `Action \"${label}\" needs substantive explainer copy`, failures);
    });
  });
}

function checkBrandSystem(failures) {
  const builtRunThrough = readDist("run-through.html");
  assert(/<body\b[^>]*data-page-brand=["']neutral["']/i.test(builtRunThrough), "run-through must use the shared neutral page shell", failures);
  assert(/assets\/run-through-brand\.css/i.test(builtRunThrough), "run-through is missing its dedicated product-brand layer", failures);
  assert(/brand-with-wordmark[\s\S]*assets\/brand\/demothemis\/wordmark\.png/i.test(builtRunThrough), "run-through navigation must use the DemoThemis wordmark", failures);
  assert(/data-omen-rive[\s\S]*assets\/brand\/omenmarketmaker\/wordmark-poster\.png/i.test(builtRunThrough), "run-through selector must use the live OmenMarketMaker wordmark", failures);
  assert(/data-active-brand/i.test(builtRunThrough) && /activeBrandForPage/i.test(builtRunThrough), "run-through appearance must follow the active product surface", failures);
  assert(/SYSTEM_STATE_OWNERS/i.test(builtRunThrough) && /data-owner/i.test(builtRunThrough), "run-through lifecycle states must expose product ownership", failures);
  const runThroughBrand = readDist("assets/run-through-brand.css");
  assert(!/tutorial-inline-slot|dockTutorialInsideFrame/i.test(builtRunThrough) && !/\.target-callout\s*\{[^}]*display:\s*none\s*!important/i.test(runThroughBrand), "guided action labels must remain dynamically positioned instead of being pinned above the simulated app", failures);
  assert(/target-callout-step/i.test(builtRunThrough) && /currentActionOwner\(\)\s*===\s*["']user["']\)\s*return null/.test(builtRunThrough), "user-action progress and explainer copy must move with the dynamic button label instead of duplicating it at the top", failures);

  for (const [file, theme] of Object.entries(pageThemeByFile)) {
    const html = readDist(file);
    assert(new RegExp(`<body\\b[^>]*data-page-brand=["']${theme}["']`, "i").test(html), `${file} is missing its scoped ${theme} page theme`, failures);
    assert(/assets\/brand\//i.test(html), `${file} has no deployed brand asset reference`, failures);
    const siteNav = (html.match(/<nav\b[^>]*class=["'][^"']*\bsitenav\b[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i) || ["", ""])[1];
    assert(/brand-with-wordmark[\s\S]*assets\/brand\/demothemis\/wordmark\.png/i.test(siteNav), `${file} navigation must use the supplied DemoThemis wordmark`, failures);
    assert(!/brand-with-mark[\s\S]*assets\/brand\/demothemis\/mark-32\.png/i.test(siteNav), `${file} navigation must not rebuild DemoThemis from the favicon and live text`, failures);
  }

  const styles = readDist("assets/styles.css");
  const requiredTokens = [
    ["dt-canvas", "#f5eee8"],
    ["dt-emboss", "#ccbbaf"],
    ["dt-accent", "#786a5e"],
    ["dt-ink", "#292522"],
    ["dt-emission", "#00e5ff"],
    ["dt-emission-ink", "#006f7b"],
    ["omm-black", "#000402"],
    ["omm-green", "#04e26d"],
    ["omm-mint", "#5dfeaa"],
    ["omm-white", "#fefefe"]
  ];
  for (const [name, value] of requiredTokens) {
    assert(new RegExp(`--${name}:\\s*${value}`, "i").test(styles), `shared styles missing logo-derived ${name} token`, failures);
  }
  assert(/--dt-wordmark-underline:\s*linear-gradient\([\s\S]*?rgba\(var\(--dt-emission-rgb\),\s*\.16\)\s*0%[\s\S]*?var\(--dt-emission\)\s*42%[\s\S]*?var\(--dt-emission\)\s*50%[\s\S]*?var\(--dt-emission\)\s*58%[\s\S]*?center\s*\/\s*100%\s*2px\s*no-repeat,\s*linear-gradient\([\s\S]*?rgba\(var\(--dt-emission-rgb\),\s*\.16\)\s*50%[\s\S]*?center\s*\/\s*100%\s*100%\s*no-repeat/i.test(styles), "shared wordmark underline needs a continuous cyan two-pixel light core inside its subtle scalable halo", failures);
  assert(/--dt-wordmark-underline-shape:\s*polygon\([\s\S]*?0\s+38%[\s\S]*?50%\s+0[\s\S]*?100%\s+38%[\s\S]*?100%\s+62%[\s\S]*?50%\s+100%[\s\S]*?0\s+62%/i.test(styles), "shared wordmark underline must taper in thickness as well as opacity toward both edges", failures);
  assert(/body\[data-page-brand=["']demothemis["']\]/i.test(styles), "DemoThemis page theme is not scoped", failures);
  assert(/body\[data-page-brand=["']omen["']\]/i.test(styles), "OmenMarketMaker page theme is not scoped", failures);
  assert(/\[data-brand=["'](?:demothemis|omen|neutral|shared)["']\]/i.test(styles), "ownership-level brand primitives are missing", failures);
  assert(/forced-colors:\s*active/i.test(styles) && /prefers-reduced-motion:\s*reduce/i.test(styles) && /@media\s+print/i.test(styles), "brand system is missing accessibility or print fallbacks", failures);

  const emissionTail = styles.split("/* ===== DemoThemis emission system: underline, equal rim, illustration ===== */")[1] || "";
  const staticEmission = emissionTail.split("/* ===== homepage chapter buttons: product-colour emission rims ===== */")[0];
  const chapterRims = emissionTail.split("/* ===== homepage chapter buttons: product-colour emission rims ===== */")[1] || "";
  assert(Boolean(staticEmission), "shared styles are missing the DemoThemis cyan interaction system", failures);
  assert(/body\[data-page-brand=["']demothemis["']\]/i.test(staticEmission) && /:not\(\[data-page-brand=["']omen["']\]\)/i.test(staticEmission), "cyan interactions must be scoped to DemoThemis and exclude OmenMarketMaker", failures);
  assert(/\.sitenav\s+:is\(\.brand,\s*\.nav-links a\)::after/i.test(staticEmission) && /background:\s*transparent[\s\S]*?box-shadow:\s*none/i.test(staticEmission), "DemoThemis navigation must use emitted underlines rather than glowing boxes", failures);
  assert(/\.sitenav\s+:is\(\.brand,\s*\.nav-links a\)::after\s*\{[^}]*left:\s*\.46rem;[^}]*opacity:\s*\.22;[^}]*transform:\s*scaleX\(\.3\)[^}]*transform-origin:\s*center/i.test(staticEmission), "idle site-navigation underlines must remain text-width-relative while extending to thirty percent of each label", failures);
  assert(/\.sitenav \.brand\.brand-with-wordmark::after\s*\{[^}]*right:\s*0;[^}]*top:\s*calc\(50%\s*\+\s*clamp\(\.52rem,\s*\.856vw,\s*\.642rem\)\s*\+\s*3px\);[^}]*bottom:\s*auto;[^}]*left:\s*0;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*84\s*\/\s*1;[^}]*background:\s*var\(--dt-wordmark-underline\)[^}]*opacity:\s*\.52[^}]*transform:\s*scaleX\(1\)/i.test(staticEmission), "DemoThemis nav wordmark needs a visibly full-width, proportionally scaled idle underline with the canonical three-pixel image gap", failures);
  assert(/\.sitenav \.brand\.brand-with-wordmark:hover::after\s*\{[^}]*filter:\s*var\(--dt-wordmark-underline-hover-filter\)/i.test(staticEmission), "DemoThemis nav wordmark needs the strong layered hover emission", failures);
  assert(/\.dt-wordmark-emission::after\s*\{[^}]*right:\s*0;[^}]*top:\s*calc\(100%\s*\+\s*3px\);[^}]*bottom:\s*auto;[^}]*left:\s*0;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*84\s*\/\s*1;[^}]*background:\s*var\(--dt-wordmark-underline\)[^}]*clip-path:\s*var\(--dt-wordmark-underline-shape\)[^}]*opacity:\s*\.52/i.test(staticEmission) && /\.dt-wordmark-emission:hover::after\s*\{[^}]*var\(--dt-wordmark-underline-hover-filter\)[^}]*opacity:\s*1/i.test(staticEmission), "static DemoThemis hero and product wordmarks must share the canonical three-pixel gap, taper, scale, and hover underline", failures);
  assert(!/\.reading-pane|\.reading-category|(?:^|[\s,(])\.is-active(?:[\s,):]|$)/im.test(staticEmission), "emission selectors must not wrap article panes or rely on generic active-state classes", failures);
  assert(/\.simple-step[\s\S]*?\.simple-card[\s\S]*?\.diagram-inner[\s\S]*?\.widget/i.test(staticEmission), "static DemoThemis teaching graphics are missing their restrained illustration treatment", failures);
  assert(/box-shadow:\s*0 0 0 1px var\(--dt-emission\),\s*0 0 10px rgba\(var\(--dt-emission-rgb\)/i.test(staticEmission), "hover rims must use an equal stroke and centred zero-offset halo", failures);
  assert(/:not\(:disabled\):hover/i.test(staticEmission) && /:not\(:disabled\):active/i.test(staticEmission), "static DemoThemis controls need distinct hover and pressed states", failures);
  assert(/aria-selected=["']true["']/i.test(staticEmission) && /aria-pressed=["']true["']/i.test(staticEmission), "static DemoThemis controls need persistent selected/on states", failures);
  assert(/body\[data-page-brand=["']demothemis["']\] :is\(\.mvp-button\.primary, \.mvp-submit-action\):not\(:disabled\)\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--dt-emission\)\s*5%,\s*var\(--dt-surface\)\)[^}]*color:\s*var\(--dt-ink\)/i.test(staticEmission), "static MVP primary actions must use cyan light on ivory instead of a solid taupe fill", failures);
  assert(/:disabled/i.test(staticEmission) && /:focus-visible/i.test(staticEmission), "static DemoThemis controls need disabled and keyboard-focus states", failures);
  assert(/outline:\s*2px solid var\(--dt-emission-ink\)/i.test(staticEmission) && /0 0 0 5px rgba\(var\(--dt-emission-rgb\)/i.test(staticEmission), "DemoThemis keyboard focus needs a contrast-safe core and cyan halo", failures);
  assert(/prefers-reduced-motion:\s*reduce/i.test(staticEmission) && /forced-colors:\s*active/i.test(staticEmission), "DemoThemis interactions need reduced-motion and forced-colors fallbacks", failures);
  const staticEmissionAnimations = Array.from(staticEmission.matchAll(/animation\s*:\s*([^;]+);/gi), (match) => match[1].trim());
  assert(staticEmissionAnimations.every((value) => /^(?:dt-card-rim-orbit\s+7\.5s\s+linear\s+infinite|none)$/i.test(value)), "DemoThemis emission must stay state-driven apart from the intentional homepage card-rim orbit", failures);
  assert(/@keyframes\s+dt-card-rim-orbit[\s\S]*?--dt-card-rim-angle:\s*360deg/i.test(staticEmission) && /\.product\[data-brand=["']demothemis["']\]::after\s*\{[^}]*conic-gradient\([^}]*mask-composite:\s*exclude[^}]*animation:\s*dt-card-rim-orbit\s+7\.5s\s+linear\s+infinite/i.test(staticEmission), "homepage DemoThemis card needs the intentional masked cyan comet rim", failures);
  assert(/prefers-reduced-motion:\s*reduce[\s\S]*?\.product\[data-brand=["']demothemis["']\]::after\s*\{[^}]*animation:\s*none/i.test(staticEmission), "homepage DemoThemis card rim must stop for reduced motion", failures);

  const previewInteractionStyles = readDist("assets/mvp-simulator.css");
  const previewEmission = previewInteractionStyles.split("/* MVP emission: underline navigation, equal control rims, quiet illustration colour. */")[1] || "";
  assert(Boolean(previewEmission) && /--dt-emission/i.test(previewEmission), "embedded MVP preview is missing the shared cyan emission states", failures);
  assert(/\.mvp-sim-context-nav :is\(button, a\)::after\s*\{[^}]*opacity:\s*\.22;[^}]*transform:\s*scaleX\(\.3\)/i.test(previewEmission), "embedded preview idle navigation underlines must use the longer relative width", failures);
  assert(/\.mvp-sim-site-brand::after\s*\{[^}]*right:\s*0;[^}]*left:\s*0;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*84\s*\/\s*1;[^}]*var\(--dt-wordmark-underline\)[^}]*clip-path:\s*var\(--dt-wordmark-underline-shape\)[^}]*opacity:\s*\.52/i.test(previewEmission), "embedded MVP wordmark must share the full-width proportionally scaled tapered underline", failures);
  assert(/mvp-sim-context-nav[\s\S]*?::after/i.test(previewEmission) && /oracle-fact[\s\S]*?oracle-seat/i.test(previewEmission), "embedded MVP preview needs underline navigation and illustration highlights", failures);
  assert(/oracle-vote-options button:focus-visible/i.test(previewEmission) && /YES\/NO preserve green\/taupe meaning/i.test(previewEmission), "embedded MVP voting must keep semantic colors while gaining cyan keyboard focus", failures);
  assert(/:not\(:disabled\):hover/i.test(previewEmission) && /:not\(:disabled\):active/i.test(previewEmission) && /:disabled/i.test(previewEmission), "embedded MVP controls need hover, pressed, and disabled states", failures);
  assert(/\.mvp-sim-product :is\(\.mvp-tutorial-actions button:last-child, \.oracle-primary-action, \.mvp-preview-onboard-status button\):not\(:disabled\)\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--dt-emission\)\s*5%,\s*var\(--surface\)\)[^}]*color:\s*var\(--ink\)/i.test(previewEmission), "embedded MVP primary actions must replace the clashing taupe fill with a restrained cyan wash", failures);
  assert(/:is\(\.mvp-preview-world-badge, \.mvp-preview-onboard-icon, \.mvp-preview-disclosure li > b\)\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--dt-emission\)\s*9%,\s*var\(--surface\)\)[^}]*color:\s*var\(--dt-emission-ink\)/i.test(previewEmission), "embedded MVP onboarding markers must use cyan light on ivory instead of solid taupe", failures);
  assert(/\.mvp-tutorial-target::after\s*\{[^}]*background:\s*var\(--dt-emission\)[^}]*box-shadow:\s*0 0 0 1px rgba\(var\(--dt-emission-rgb\)/i.test(previewInteractionStyles) && /@keyframes mvp-tutorial-target\s*\{[^}]*var\(--dt-emission-rgb\)[\s\S]*?var\(--dt-emission-rgb\)/i.test(previewInteractionStyles), "embedded MVP tutorial focus must use the restrained cyan guide pulse instead of the old brown and purple treatment", failures);
  assert(/prefers-reduced-motion:\s*reduce/i.test(previewEmission) && /forced-colors:\s*active/i.test(previewEmission), "embedded MVP interactions need accessibility fallbacks", failures);
  assert(!/animation\s*:/i.test(previewEmission), "embedded MVP emission must not add a continuous animation", failures);

  const demoStageRule = (styles.match(/\.brand-stage--demothemis\s*\{([^}]*)\}/i) || ["", ""])[1];
  assert(/background:\s*transparent/i.test(demoStageRule) && /box-shadow:\s*none/i.test(demoStageRule), "DemoThemis wordmark stage must sit directly on the ivory page without a decorative rectangle", failures);
  assert(/\.brand-stage--demothemis::after\s*\{[^}]*display:\s*none/i.test(styles), "DemoThemis wordmark stage must suppress the shared framed-stage outline", failures);

  const home = readDist("index.html");
  const homeDemoProduct = (home.match(/<article\b[^>]*data-brand=["']demothemis["'][^>]*>([\s\S]*?)<\/article>/i) || ["", ""])[1];
  const homeOmenProduct = (home.match(/<article\b[^>]*data-brand=["']omen["'][^>]*>([\s\S]*?)<\/article>/i) || ["", ""])[1];
  assert(/class=["']map-card["'][^>]*href=["']run-through\.html["'][^>]*data-brand=["']shared["']/i.test(home), "the end-to-end run-through chapter must use the mixed product rim", failures);
  assert((home.match(/class=["']map-card["'][^>]*data-brand=/gi) || []).length === 6, "every homepage chapter button must declare its product-rim ownership", failures);
  assert((home.match(/class=["']chapter-owner-coin(?:\s+chapter-owner-coin--shared)?["']/gi) || []).length === 6, "every homepage chapter button must carry its product ownership coin", failures);
  assert((home.match(/chapter-owner-coin--shared[\s\S]*?chapter-owner-rotor[\s\S]*?omenmarketmaker\/mark-32\.png[\s\S]*?demothemis\/mark-32\.png/gi) || []).length === 3, "mixed homepage chapters must use the two-sided OmenMarketMaker and DemoThemis medallion", failures);
  assert(/\.chapter-owner-coin--shared\s*\{[^}]*conic-gradient\([^}]*var\(--omm-green\)[^}]*var\(--dt-emission\)[^}]*perspective:\s*10rem/i.test(chapterRims) && /\.chapter-owner-rotor\s*\{[^}]*transform-style:\s*preserve-3d[^}]*animation:\s*chapter-owner-coin-turn\s+10s\s+linear\s+infinite/i.test(chapterRims), "homepage mixed-product medallions need a stable two-colour bezel around a dedicated continuously turning 3D rotor", failures);
  assert(/@keyframes\s+chapter-owner-coin-turn\s*\{\s*from\s*\{\s*transform:\s*rotateY\(0deg\)[^}]*\}\s*to\s*\{\s*transform:\s*rotateY\(360deg\)/i.test(chapterRims) && /\.chapter-owner-rotor::before\s*\{[^}]*width:\s*3px[^}]*rotateY\(90deg\)[^}]*animation:\s*chapter-owner-coin-edge\s+10s\s+linear\s+infinite/i.test(chapterRims) && /@keyframes\s+chapter-owner-coin-edge[\s\S]*?22%,\s*28%,\s*72%,\s*78%\s*\{\s*opacity:\s*1/i.test(chapterRims) && /rotateY\(180deg\)\s+translateZ\(1\.45px\)/i.test(chapterRims), "homepage medallion motion must rotate continuously and keep a visible CSS side wall at both edge-on positions", failures);
  assert(/@keyframes\s+chapter-owner-coin-back-face[\s\S]*?25%,\s*74\.99%\s*\{\s*visibility:\s*visible/i.test(chapterRims), "the continuously rotating homepage medallion must reliably reveal its DemoThemis face", failures);
  assert(/bootstrap-loop\.html["']\] \.chapter-owner-coin--shared\s*\{[^}]*-3\.33s/i.test(chapterRims) && /governance\.html["']\] \.chapter-owner-coin--shared\s*\{[^}]*-6\.67s/i.test(chapterRims), "mixed homepage medallions must use staggered phases", failures);
  assert(/\.map-card\[data-brand=["']demothemis["']\][^{]*\{[^}]*--chapter-rim:\s*linear-gradient\([^}]*var\(--dt-emission\)/i.test(chapterRims), "DemoThemis chapter buttons must use a full cyan emission rim", failures);
  assert(/\.map-card\[data-brand=["']omen["']\][^{]*\{[^}]*--chapter-rim:\s*linear-gradient\([^}]*var\(--omm-green\)/i.test(chapterRims), "OmenMarketMaker chapter buttons must use a full green emission rim", failures);
  assert(/\.map-card\[data-brand=["']shared["']\][^{]*\{[^}]*--chapter-rim:\s*conic-gradient\([^}]*var\(--dt-emission\)[\s\S]*?var\(--omm-green\)[\s\S]*?animation:\s*chapter-rim-orbit\s+8s\s+linear\s+infinite/i.test(chapterRims), "mixed chapter buttons must use the rotating half-cyan, half-green rim", failures);
  assert(/\.map-card\[data-brand\]::before\s*\{[^}]*inset:\s*-1px;[^}]*background:\s*var\(--chapter-rim\)[^}]*filter:\s*blur\(var\(--chapter-glow-blur\)\)/i.test(chapterRims), "chapter glow must follow an equal full-card rim rather than a side stripe", failures);
  assert(/:hover\s*\{[^}]*--chapter-glow-opacity:\s*\.78/i.test(chapterRims) && /:focus-visible\s*\{[^}]*--chapter-glow-opacity:\s*\.88/i.test(chapterRims) && /:active\s*\{[^}]*--chapter-glow-opacity:\s*\.54/i.test(chapterRims), "chapter rims need distinct hover, keyboard-focus, and pressed emission states", failures);
  assert(/prefers-reduced-motion:\s*reduce[\s\S]*?animation:\s*none/i.test(chapterRims) && /forced-colors:\s*active[\s\S]*?\.map-card\[data-brand\][\s\S]*?border:\s*1px solid ButtonText/i.test(chapterRims), "animated mixed chapter rims need reduced-motion and forced-colors fallbacks", failures);
  assert(/product-logo-lockup--demothemis[\s\S]*assets\/brand\/demothemis\/wordmark\.png/i.test(homeDemoProduct), "homepage DemoThemis card must use the full supplied wordmark", failures);
  assert(/product-logo-lockup--demothemis[\s\S]*dt-wordmark-emission[\s\S]*wordmark\.png/i.test(homeDemoProduct), "homepage DemoThemis wordmark is missing its canonical underline wrapper", failures);
  assert(/<h3\b[^>]*class=["'][^"']*\bsr-only\b[^"']*["'][^>]*>DemoThemis<\/h3>/i.test(homeDemoProduct), "homepage DemoThemis logo must replace the visible typed title while preserving the article heading", failures);
  assert(!/<h3\b(?![^>]*\bsr-only\b)[^>]*>\s*DemoThemis\s*<\/h3>/i.test(homeDemoProduct), "homepage DemoThemis card must not repeat the logo as a visible typed title", failures);
  assert(/product-logo-lockup--omen[\s\S]*data-omen-rive[\s\S]*wordmark-poster\.png[\s\S]*<canvas/i.test(homeOmenProduct), "homepage OmenMarketMaker card must use the Rive wordmark with a static poster fallback", failures);
  assert(/<h3\b[^>]*class=["'][^"']*\bsr-only\b[^"']*["'][^>]*>OmenMarketMaker<\/h3>/i.test(homeOmenProduct), "homepage Omen logo must replace the visible typed title while preserving the article heading", failures);
  assert(!/<h3\b(?![^>]*\bsr-only\b)[^>]*>\s*OmenMarketMaker\s*<\/h3>/i.test(homeOmenProduct), "homepage Omen card must not repeat the logo as a visible typed title", failures);
  assert(/assets\/vendor\/rive\/rive-2\.38\.5\.js/i.test(home) && /assets\/brand-rive\.js/i.test(home), "homepage Omen card is missing its local Rive scripts", failures);
  assert(/\.product-pair \.product\[data-brand=["']omen["']\][^{]*\{[^}]*var\(--omm-black\)/i.test(styles), "homepage Omen card must use its near-black brand canvas", failures);
  assert(/\.product-logo-lockup--demothemis img\s*\{[^}]*width:\s*min\(100%,\s*25rem\)/i.test(styles), "homepage DemoThemis wordmark must be integrated directly into the card canvas", failures);
  assert(/body\[data-page-brand=["']neutral["']\] \.product-pair \.product\[data-brand=["']demothemis["']\]\s*\{[^}]*border:\s*1px solid rgba\(var\(--dt-emission-rgb\)[^}]*box-shadow:\s*0 0 0 1px/i.test(styles), "homepage DemoThemis card must use the equal cyan emission rim", failures);
  assert(/body\[data-page-brand=["']neutral["']\] \.product-pair \.product\[data-brand=["']demothemis["']\]\s*\{[^}]*box-shadow:\s*0 0 0 1px rgba\(var\(--dt-emission-rgb\),\s*\.08\),\s*0 0 4px rgba\(var\(--dt-emission-rgb\),\s*\.035\)/i.test(styles), "homepage DemoThemis card idle halo must remain restrained", failures);
  assert(/\.product\[data-brand=["']demothemis["']\]::before\s*\{[^}]*display:\s*none/i.test(styles), "homepage DemoThemis card must remove the old unequal top accent stroke", failures);
  assert(/\.product\[data-brand=["']demothemis["']\]:hover\s*\{[^}]*0 0 12px rgba\(var\(--dt-emission-rgb\)/i.test(styles), "homepage DemoThemis card needs a centred hover glow", failures);
  assert(/\.product\[data-brand=["']demothemis["']\] \.product-summary-label\s*\{(?!\s*color:)(?![^}]*;\s*color:)[^}]*text-decoration-color:\s*rgba\(var\(--dt-emission-rgb\),\s*\.42\)[^}]*text-decoration-thickness:\s*1px[^}]*text-underline-offset:\s*\.24em/i.test(styles), "homepage DemoThemis labels must retain their original text colours with the canonical idle underline", failures);
  assert(/\.product\[data-brand=["']demothemis["']\] \.product-summary-label:hover\s*\{[^}]*text-decoration-color:\s*var\(--dt-emission\)[^}]*text-decoration-thickness:\s*2px[^}]*text-shadow:/i.test(styles), "homepage DemoThemis labels must each have the canonical cyan hover underline", failures);
  assert(/\.product\[data-brand=["']demothemis["']\] \.product-summary-label:active\s*\{[^}]*text-decoration-color:\s*var\(--dt-emission-ink\)[^}]*transition-duration:\s*45ms/i.test(styles), "homepage DemoThemis label underlines need a responsive pressed state", failures);
  assert(/\.product-pair\s*\{[^}]*grid-auto-rows:\s*1fr[^}]*align-items:\s*stretch/i.test(styles) && /\.product-pair \.product\s*\{[^}]*height:\s*100%/i.test(styles), "homepage product cards must form an equal-height, equal-width desktop pair", failures);
  assert(/\.product-pair \.product\[data-brand=["']omen["']\] ol\.product-jumps li\s*\{[^}]*background:\s*var\(--omm-surface\)/i.test(styles), "homepage Omen feature rows must use an opaque surface so the card mesh stays behind them", failures);
  assert(/\.product-pair \.product\[data-brand=["']omen["']\]::after\s*\{[^}]*card-grid\.svg[^}]*animation:\s*omen-card-grid-scroll\s+30s\s+linear\s+infinite/i.test(styles) && /@keyframes\s+omen-card-grid-scroll\s*\{[^}]*translateX\(-340px\)/i.test(styles), "homepage Omen card grid must move its cached tile with one linear compositor-friendly translation", failures);
  const omenCardGrid = readDist("assets/brand/omenmarketmaker/card-grid.svg");
  assert(/width=["']34["'][^>]*height=["']34["']/i.test(omenCardGrid) && /stroke-opacity=["']\.32["']/i.test(omenCardGrid), "homepage Omen card grid must use a visible cached 34-pixel tile", failures);
  assert(/\.product-pair \.product\[data-brand=["']omen["']\] \.product-jumps a\s*\{[^}]*text-decoration:\s*none/i.test(styles) && /\.product-pair \.product\[data-brand=["']omen["']\] \.product-jumps a:hover,[\s\S]*?text-decoration-color:\s*var\(--omm-mint\)/i.test(styles), "homepage Omen links must reveal their green underlines only on hover or keyboard focus", failures);
  assert(/prefers-reduced-motion:\s*reduce[\s\S]*?\.product-pair \.product\[data-brand=["']omen["']\]::after,\s*body\[data-page-brand=["']omen["']\] \.hero\.brand-hero::after\s*\{[^}]*animation:\s*none/i.test(styles), "Omen card and chapter meshes must respect reduced-motion preferences", failures);

  const demoChapter = readDist("demothemis.html");
  const demoHero = (demoChapter.match(/<header\b[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>([\s\S]*?)<\/header>/i) || ["", ""])[1];
  assert(/\.reader-switch\s*\{[^}]*position:\s*sticky;[^}]*top:\s*4rem;[^}]*z-index:\s*35/i.test(demoChapter), "DemoThemis reading-depth tabs must remain sticky below the site navigation at every screen width", failures);
  assert(/\.reading-pane section\[id\],\s*\.reading-category\[id\]\s*\{[^}]*scroll-margin-top:\s*10rem/i.test(demoChapter), "DemoThemis section anchors must clear both sticky navigation layers", failures);
  assert(/\.reader-switch\.is-stuck \.reader-tabs\s*\{[^}]*width:\s*min\(calc\(100% - \.75rem\),\s*32rem\)[^}]*padding:\s*\.28rem/i.test(demoChapter) && /classList\.toggle\(["']is-stuck["'],\s*readerSwitch\.getBoundingClientRect\(\)\.top\s*<=\s*stickyTop\s*\+\s*1\)/i.test(demoChapter), "DemoThemis reading-depth tabs must compact only after reaching their sticky position", failures);
  assert(/<div\s+class=["']reader-switch["']>/i.test(demoChapter) && !/<div\s+class=["'][^"']*reader-switch[^"']*\breveal\b/i.test(demoChapter), "sticky reading-depth navigation must render without a scroll-reveal transform", failures);
  assert(/brand-stage--demothemis/i.test(demoHero) && /class=["']sr-only["']>DemoThemis<\/span>/i.test(demoHero), "DemoThemis hero must keep one accessible product name with the full visual wordmark", failures);
  assert(/brand-stage--demothemis[\s\S]*dt-wordmark-emission[\s\S]*wordmark\.png/i.test(demoHero), "DemoThemis chapter hero wordmark is missing its canonical underline wrapper", failures);
  assert(!/title-product/i.test(demoHero), "DemoThemis hero must not repeat its wordmark as a second visible product-name title", failures);

  const omen = readDist("omenmarketmaker.html");
  assert(/Every deposit remains outcome collateral/i.test(omen) && /eligible caller posts the exact court fee as a bond/i.test(omen), "OmenMarketMaker must explain caller-bonded resolution without skimming deposits before resolution", failures);
  assert(/YES or NO reimburses it from both sides pro-rata/i.test(omen) && /insufficient information leaves the pool whole/i.test(omen), "OmenMarketMaker must explain both directional reimbursement and the insufficient-information consequence", failures);
  assert(/No court-fee estimate or reserve is collected while betting/i.test(omen) && /Caller bond at request/i.test(omen), "OmenMarketMaker's interactive pool must keep resolution funding outside the betting pool", failures);
  assert(!/var RESOLUTION_RATE|var JURY_QUOTE|var reserve = pot \* RESOLUTION_RATE|recorded purchase prices/i.test(omen), "OmenMarketMaker must not retain the retired pre-betting reserve model", failures);
  assert(/return gross \/ own/i.test(omen), "the pool widget must show gross outcome shares without deducting a pre-betting resolution reserve", failures);
  assert(/data-omen-rive/i.test(omen) && /wordmark-poster\.png/i.test(omen) && /omen-brand-canvas/i.test(omen), "OmenMarketMaker hero must provide both a static poster and Rive canvas", failures);
  assert(/assets\/vendor\/rive\/rive-2\.38\.5\.js/i.test(omen) && /assets\/brand-rive\.js/i.test(omen), "OmenMarketMaker hero is missing its local Rive scripts", failures);
  const omenHero = (omen.match(/<header\b[^>]*class=["'][^"']*\bbrand-hero\b[^"']*["'][^>]*>([\s\S]*?)<\/header>/i) || ["", ""])[1];
  assert(/data-omen-rive[^>]*role=["']img["'][^>]*aria-label=["']OmenMarketMaker["']/i.test(omenHero), "OmenMarketMaker hero logo must provide the visible page-title identity", failures);
  assert(/<h1>Open markets with unbuyable arbitration<\/h1>/i.test(omenHero), "OmenMarketMaker hero must keep the capitalized non-duplicative descriptor as its page heading", failures);
  assert(!/<p\b[^>]*class=["'][^"']*\bkicker\b/i.test(omenHero) && !/<h1[^>]*>[^<]*OmenMarketMaker/i.test(omenHero), "OmenMarketMaker hero must not repeat its Rive logo in either text-title position", failures);
  assert(/<title>OmenMarketMaker: Open markets with unbuyable arbitration<\/title>/i.test(omen), "OmenMarketMaker document title must capitalize Open", failures);
  assert(/body\[data-page-brand=["']omen["']\] \.hero\.brand-hero::after\s*\{[^}]*card-grid\.svg[^}]*animation:\s*omen-card-grid-scroll\s+30s\s+linear\s+infinite/i.test(styles), "OmenMarketMaker hero must share the animated product-card mesh", failures);
  const riveLoader = readDist("assets/brand-rive.js");
  assert(/querySelectorAll\(["']\[data-omen-rive\]["']\)/i.test(riveLoader), "Rive loader must support both homepage and chapter wordmarks", failures);
  assert(/RuntimeLoader\.setWasmUrl/i.test(riveLoader) && /vendor\/rive\/rive-2\.38\.5\.wasm/i.test(riveLoader) && /document\.currentScript/i.test(riveLoader), "Rive loader must resolve its self-hosted WASM file from the active asset bundle", failures);
  assert(/RIVE_PLAYBACK_RATE\s*=\s*0\.5/i.test(riveLoader) && /elapsedTime\s*\*\s*RIVE_PLAYBACK_RATE/i.test(riveLoader), "Omen Rive wordmarks must play at half speed without reducing their render frame rate", failures);
  assert(/prefers-reduced-motion:\s*reduce/i.test(riveLoader), "Rive loader must respect reduced motion", failures);
  assert(/IntersectionObserver/i.test(riveLoader) && /visibilitychange/i.test(riveLoader) && /\.cleanup\(/i.test(riveLoader), "Rive loader must lazy-start, pause offscreen, and clean up", failures);
  assert(/MutationObserver/i.test(riveLoader) && /function\s+syncShells\s*\(/i.test(riveLoader), "Rive loader must discover simulator wordmarks created after page load", failures);
  assert(/ResizeObserver/i.test(riveLoader) && /resizeDrawingSurfaceToCanvas/i.test(riveLoader), "Rive wordmarks must resize cleanly with responsive simulator layouts", failures);

  const mvp = readDist("demothemis-mvp.html");
  for (const file of publicHtml.filter((name) => name !== "omenmarketmaker.html")) {
    const page = readDist(file);
    assert(/assets\/brand\/demothemis\/mark-32\.png/i.test(page) && !/mark-32\.png\?v=/i.test(page), `${file} must use the content-versioned DemoThemis favicon without a duplicate query cachebuster`, failures);
    assert(!/assets\/brand\/demothemis\/favicon\.ico/i.test(page), `${file} must not prefer the cached legacy DemoThemis ICO`, failures);
  }
  assert(/mvp-sim-site-brand[\s\S]*assets\/brand\/demothemis\/wordmark\.png/i.test(mvp), "MVP preview header is missing the full DemoThemis wordmark", failures);
  assert(/brand-stage--demothemis[\s\S]*dt-wordmark-emission[\s\S]*wordmark\.png/i.test(mvp), "MVP page hero wordmark is missing its canonical underline wrapper", failures);
  assert(!/mvp-sim-site-brand[\s\S]{0,300}assets\/brand\/demothemis\/mark-32\.png/i.test(mvp), "MVP preview header must not use the favicon-plus-text lockup", failures);
  assert(/\.mvp-hero \.brand-stage--demothemis\s*\{[^}]*place-items:\s*center start/i.test(styles) && /\.mvp-hero \.brand-wordmark\s*\{[^}]*object-position:\s*left center/i.test(styles), "MVP hero wordmark must align with the left edge of its title copy", failures);

  const appRoot = path.join(root, "DemoThemisMVP", "web", "src");
  const appLayout = fs.readFileSync(path.join(appRoot, "app", "layout.tsx"), "utf8");
  const appManifest = fs.readFileSync(path.join(appRoot, "app", "manifest.ts"), "utf8");
  const appPage = fs.readFileSync(path.join(appRoot, "app", "page.tsx"), "utf8");
  const sandboxPage = fs.readFileSync(path.join(appRoot, "app", "sandbox", "page.tsx"), "utf8");
  const simIndex = fs.readFileSync(path.join(appRoot, "lib", "sim", "index.ts"), "utf8");
  const siteChrome = fs.readFileSync(path.join(appRoot, "components", "SiteChrome", "index.tsx"), "utf8");
  const rpSignatureRoute = fs.readFileSync(path.join(appRoot, "app", "api", "rp-signature", "route.ts"), "utf8");
  const appStyles = fs.readFileSync(path.join(appRoot, "app", "globals.css"), "utf8");
  const sandboxStyles = fs.readFileSync(path.join(appRoot, "app", "sandbox", "sandbox.css"), "utf8");
  const appHeroRule = (appStyles.match(/\.oracle-hero\s*\{([^}]*)\}/i) || ["", ""])[1];
  const appBrandLockupRule = (appStyles.match(/\.oracle-brand-lockup\s*\{([^}]*)\}/i) || ["", ""])[1];
  const appBrandImageRule = (appStyles.match(/\.oracle-brand-lockup\s+img\s*\{([^}]*)\}/i) || ["", ""])[1];
  assert(/wordmark\.png/i.test(siteChrome) && /site-brand-wordmark/i.test(siteChrome), "live MVP chrome is missing the full DemoThemis wordmark", failures);
  assert(/RP_ID not configured/i.test(rpSignatureRoute) && /RP_ID_PATTERN\.test\(rpId\)/i.test(rpSignatureRoute), "RP-signature route must fail closed when RP_ID is missing or malformed", failures);
  assert(!/\?\?\s*["']rp_[0-9a-f]+["']/i.test(rpSignatureRoute), "RP-signature route must not silently fall back to a hard-coded relying-party ID", failures);
  assert(/Cache-Control["']?\s*:\s*["']no-store["']/i.test(rpSignatureRoute), "RP signatures must be returned with no-store cache control", failures);
  assert(!/mark-32\.png|site-brand-word["']/i.test(siteChrome), "live MVP chrome must not rebuild DemoThemis from the favicon and live text", failures);
  assert(/wordmark\.png/i.test(appPage) && /oracle-brand-lockup/i.test(appPage), "live MVP hero is missing its DemoThemis wordmark lockup", failures);
  assert(!/optimistic(?: fast)? path|bonded[- ]assertion|settle(?:s|d)? free|jury is the (?:rare )?backstop/i.test(appPage), "live MVP roadmap must not restore the retired pre-jury settlement path", failures);
  assert(/Every accepted case shown here uses the verified-human court path/i.test(sandboxPage), "sandbox must state that every accepted case uses the court", failures);
  assert(!/FunnelReadout|WatchersDemo|optimistic funnel|WidgetBoundary name=["']watchers/i.test(sandboxPage) && !/export \* from ["']\.\/funnel["']/i.test(simIndex), "sandbox must not retain retired funnel or post-finality watcher modules", failures);
  assert(/#f6f3f2|#f2efec|#e9e8e5/i.test(appHeroRule) && !/#292522|#1d1a18|#1d1b2a/i.test(appHeroRule), "live MVP hero must use DemoThemis ivory and stone rather than a dark brand background", failures);
  assert(/background:\s*transparent/i.test(appBrandLockupRule) && /border:\s*0/i.test(appBrandLockupRule) && /box-shadow:\s*none/i.test(appBrandLockupRule), "live MVP wordmark must sit directly on the ivory hero without a decorative rectangle", failures);
  assert(!/invert\s*\(/i.test(appBrandImageRule), "live MVP wordmark must preserve the supplied raster colors rather than invert them", failures);
  const appEmission = appStyles.split("/* ===== DemoThemis emission: underline, equal rim, illustration ===== */")[1] || "";
  assert(/--dt-emission:\s*#00e5ff/i.test(appStyles) && /--dt-emission-ink:\s*#006f7b/i.test(appStyles), "live MVP is missing the canonical cyan and readable teal tokens", failures);
  assert(Boolean(appEmission) && /:not\(:disabled\):hover/i.test(appEmission) && /:not\(:disabled\):active/i.test(appEmission), "live MVP controls need cyan hover and pressed states", failures);
  assert(/:is\([\s\S]*?\.app-button\.is-primary,[\s\S]*?\.juror-mission-complete a,[\s\S]*?\.court-empty-actions a:first-child,[\s\S]*?\.oracle-primary-action[\s\S]*?\):not\(:disabled\)\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--dt-emission\)\s*5%,\s*var\(--surface\)\)[^}]*color:\s*var\(--ink\)/i.test(appEmission), "live MVP primary actions must use the minimalist cyan-on-ivory hierarchy", failures);
  assert(/\.court-page \.bg-slate-900,[\s\S]*?\.mission-progress li\.is-active \.mission-progress-number,[\s\S]*?\.juror-step\.is-active[\s\S]*?background:\s*color-mix\(in srgb,\s*var\(--dt-emission\)\s*9%,\s*var\(--surface\)\)\s*!important/i.test(appEmission), "live MVP active markers and legacy dark buttons must no longer retain the solid taupe fill", failures);
  assert(/aria-selected=["']true["']/i.test(appEmission) && /aria-pressed=["']true["']/i.test(appEmission) && /:disabled/i.test(appEmission), "live MVP controls need selected/on and disabled states", failures);
  assert(/oracle-vote-options button\.is-selected\.is-yes/i.test(appEmission) && /oracle-vote-options button\.is-selected\.is-no/i.test(appEmission), "live MVP YES/NO voting must preserve semantic selection colors", failures);
  assert(/:is\(\.site-brand,\s*\.site-chapters a,\s*\.mvp-context-links a\)::after/i.test(appEmission), "live MVP navigation must use emitted underlines rather than glowing boxes", failures);
  assert(/:is\(\.site-brand,\s*\.site-chapters a,\s*\.mvp-context-links a\)::after\s*\{[^}]*opacity:\s*\.22;[^}]*transform:\s*scaleX\(\.3\)/i.test(appEmission), "live MVP idle navigation underlines must use the longer relative width", failures);
  assert(/\.site-brand\.site-brand::after\s*\{[^}]*right:\s*0;[^}]*left:\s*0;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*84\s*\/\s*1;[^}]*var\(--dt-wordmark-underline\)[^}]*clip-path:\s*var\(--dt-wordmark-underline-shape\)[^}]*opacity:\s*\.52/i.test(appEmission) && /\.oracle-brand-lockup::after\s*\{[^}]*right:\s*0;[^}]*left:\s*0;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*84\s*\/\s*1;[^}]*var\(--dt-wordmark-underline\)[^}]*clip-path:\s*var\(--dt-wordmark-underline-shape\)[^}]*opacity:\s*0?\.52/i.test(appStyles), "live MVP chrome and hero wordmarks must share the full-width proportionally scaled tapered underline", failures);
  assert(/\.app-mechanism-step[\s\S]*?\.app-concept-card[\s\S]*?\.oracle-fact/i.test(appEmission), "live MVP is missing restrained cyan treatment for neutral teaching graphics", failures);
  assert(/prefers-reduced-motion:\s*reduce/i.test(appEmission) && /forced-colors:\s*active/i.test(appEmission) && !/animation\s*:/i.test(appEmission), "live MVP emission needs static, accessible fallbacks without looping animation", failures);

  const sandboxEmission = sandboxStyles.split("/* Sandbox emission: equal control rims and restrained teaching-graphic colour. */")[1] || "";
  assert(/--dt-emission:\s*#00e5ff/i.test(sandboxStyles) && /--dt-emission-ink:\s*#006f7b/i.test(sandboxStyles), "sandbox is missing the canonical DemoThemis emission tokens", failures);
  assert(Boolean(sandboxEmission) && /:not\(:disabled\):hover/i.test(sandboxEmission) && /:not\(:disabled\):active/i.test(sandboxEmission), "sandbox controls need hover and pressed emission states", failures);
  assert(/details\[open\]\s*>\s*summary/i.test(sandboxEmission) && /:disabled/i.test(sandboxEmission) && /:focus-visible/i.test(sandboxEmission), "sandbox controls need open, disabled, and focus states", failures);
  assert(/\.sbx-steps li[\s\S]*?\.sbx-stat[\s\S]*?\.sbx-widget/i.test(sandboxEmission), "sandbox teaching graphics are missing their restrained illustration treatment", failures);
  assert(/prefers-reduced-motion:\s*reduce/i.test(sandboxEmission) && /forced-colors:\s*active/i.test(sandboxEmission), "sandbox emission needs accessibility fallbacks", failures);
  assert(/summary_large_image/i.test(appLayout) && /mvp-1200x630\.jpg/i.test(appLayout) && /mark-180\.png/i.test(appLayout), "live MVP metadata is missing branded social and icon assets", failures);
  assert(/mark-32\.png\?v=20260721-dt2/i.test(appLayout) && !/favicon\.ico/i.test(appLayout), "live MVP metadata must prefer the cache-busted DemoThemis PNG favicon", failures);
  assert(/mark-192\.png/i.test(appManifest) && /mark-512\.png/i.test(appManifest) && /theme_color:\s*'#f6f3f2'/i.test(appManifest), "live MVP manifest is missing its complete DemoThemis icon set", failures);
  assert(!fs.existsSync(path.join(appRoot, "app", "favicon.ico")), "live MVP must not emit a competing automatic ICO favicon", failures);

  const notFound = readDist("404.html");
  assert(/data-page-brand=["']demothemis["']/i.test(notFound) && /assets\/brand\/demothemis\/mark-192\.png/i.test(notFound), "404 page is missing the DemoThemis identity", failures);
  assert(/assets\/brand\/demothemis\/mark-32\.png/i.test(notFound) && !/mark-32\.png\?v=/i.test(notFound) && !/assets\/brand\/demothemis\/favicon\.ico/i.test(notFound), "404 page must use the content-versioned DemoThemis favicon", failures);

  const generator = fs.readFileSync(path.join(root, "tools", "generate-brand-assets.py"), "utf8");
  const socialDemo = (generator.match(/def\s+social_demo\([^)]*\)[^:]*:\s*([\s\S]*?)\n\s*def\s+social_omen/i) || ["", ""])[1];
  const socialShared = (generator.match(/def\s+social_shared\([^)]*\)[^:]*:\s*([\s\S]*?)\n\s*def\s+social_mvp/i) || ["", ""])[1];
  assert(/Image\.new\([^\n]*DT\["canvas"\]/i.test(socialDemo) && !/Image\.new\([^\n]*DT\["ink"\]/i.test(socialDemo), "DemoThemis social card generator must begin on ivory", failures);
  assert(!/rounded_rectangle/i.test(socialDemo), "DemoThemis social card must not wrap the full wordmark in a decorative rectangle", failures);
  assert(/Image\.new\([^\n]*DT\["canvas"\]/i.test(socialShared) && /OMM\["black"\]/i.test(socialShared), "shared social card must keep the DemoThemis half ivory and the Omen half black", failures);
  assert(/draw_dt_underline\(card,\s*\(70,\s*356,\s*545,\s*370\)\)/i.test(socialShared), "shared social card must include the canonical DemoThemis cyan underline", failures);
  assert(/draw_omen_grid\(draw,\s*\(600,\s*0,\s*1200,\s*630\)/i.test(socialShared), "shared social card must carry the OmenMarketMaker mesh across its entire half", failures);
  assert(/poster_path\.is_file\(\)[\s\S]*?retired button-era lockup[\s\S]*?Image\.open\(poster_path\)/i.test(generator), "brand generation must preserve the approved current static OmenMarketMaker wordmark instead of rebuilding the legacy button crop", failures);

  const previewServer = fs.readFileSync(path.join(root, "tools", "preview-mvp.js"), "utf8");
  assert(/relative\s*\|\|\s*["']index\.html["']/i.test(previewServer), "local preview server must resolve its root to the proposal homepage", failures);
  assert(/url\.pathname\s*===\s*["']\/["'][\s\S]{0,120}redirect\(response,\s*["']\/index\.html["']\)/i.test(previewServer), "local preview server must route / to the proposal homepage", failures);
  assert(!/url\.pathname\s*===\s*["']\/["'][\s\S]{0,120}demothemis-mvp\.html/i.test(previewServer), "local preview server must not replace the homepage with the MVP", failures);
  for (const route of ["/app", "/home", "/onboard"]) {
    assert(previewServer.includes(`url.pathname === "${route}"`), `local preview server must preserve the ${route} MVP shortcut`, failures);
  }
}

function checkBuiltHtml(failures) {
  const sharedStyles = readDist("assets/styles.css");
  const neutralLevel = (name) => {
    const match = sharedStyles.match(new RegExp(`--${name}:\\s*([^;]+)`));
    return match ? match[1].trim() : "";
  };
  const neutralLevels = [neutralLevel("canvas"), neutralLevel("bg"), neutralLevel("surface")];
  assert(neutralLevels.every(Boolean) && new Set(neutralLevels).size === 3, "page canvas, inset panels, and raised cards must use distinct neutral colors", failures);
  assert(/body\s*\{[^}]*background:\s*var\(--canvas\)/s.test(sharedStyles), "the editorial page must use the dedicated canvas color", failures);

  for (const file of publicHtml) {
    const html = readDist(file);
    checkMetadata(file, html, failures);
    checkMvpNavigation(file, html, failures);
    checkProposalHomeLinks(file, html, failures);
    assert(!/unpkg\.com/i.test(html), `${file} should not load unpkg.com`, failures);
    assert(/assets\/styles\.css/i.test(html), `${file} missing shared stylesheet`, failures);
  }

  checkBrandSystem(failures);

  checkChapterSequence(failures);

  checkProposalHomeLinks("404.html", readDist("404.html"), failures);

  checkMvpPage(readDist("demothemis-mvp.html"), failures);

  const gameLab = readDist("break-the-court.html");
  assert(/Break the court/i.test(gameLab), "game-theory chapter missing Break the court title", failures);
  assert(/assets\/vendor\/popper-2\.11\.8\.min\.js/i.test(gameLab), "gamelab missing vendored Popper", failures);
  assert(/assets\/vendor\/tippy-6\.3\.7\.umd\.min\.js/i.test(gameLab), "gamelab missing vendored Tippy", failures);
  assert(/role=["']tablist["']/i.test(gameLab), "gamelab missing tablist role", failures);
  assert(/data-attack=["']bloc["']/i.test(gameLab), "gamelab missing coordinated attack card", failures);

  const demoThemis = readDist("demothemis.html");
  assert(/DemoThemis: the most ambitious human infrastructure ever made/i.test(demoThemis), "DemoThemis chapter missing public title", failures);
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

  const runThrough = readDist("run-through.html");
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
  assert(/Run-through: from initial liquidity to an unbuyable verdict/i.test(runThrough), "run-through chapter missing public title", failures);
  assert(/options:\s*\[\["YES",\s*"good"\],\s*\["NO",\s*"bad"\],\s*\["INSUFFICIENT INFORMATION",\s*"insufficient"\]\]/i.test(runThrough), "run-through juror ballot must expose YES, NO, and INSUFFICIENT INFORMATION", failures);
  assert(/applyInsufficientBallotTally/i.test(runThrough) && /NO 4–2–1/i.test(runThrough), "run-through must preserve an insufficient-information ballot in its aggregate tally", failures);
  assert(/id=["']productTabOmen["']/i.test(runThrough), "run-through missing OmenMarketMaker parent tab", failures);
  assert(/id=["']productTabThemis["']/i.test(runThrough), "run-through missing DemoThemis parent tab", failures);
  assert(!/id=["']productModePanel["'][^>]*role=["']tabpanel["']/i.test(runThrough), "starting-point buttons must not control a misleading tabpanel", failures);
  assert(/id=["']productTabOmen["'][^>]*aria-pressed=["']false["']/i.test(runThrough) && /id=["']productTabThemis["'][^>]*aria-pressed=["']false["']/i.test(runThrough), "run-through must start without a preselected starting point", failures);
  assert(/id=["']productModePanel["'][^>]*\shidden(?:\s|>)/i.test(runThrough), "event workflow must stay hidden until a product is selected", failures);
  assert(/var\s+selectedRunMode\s*=\s*(?:null|["']["'])/i.test(runThrough) && /productModePanel\.hidden\s*=\s*false/i.test(runThrough), "starting-point selection must reveal the event workflow", failures);
  assert(/class=["'][^"']*product-mode-nav[^"']*is-awaiting-selection/i.test(runThrough), "initial product chooser must receive center-stage styling", failures);
  assert(/Choose a starting point/i.test(runThrough) && /Court-backed run/i.test(runThrough) && /OmenMarketMaker using DemoThemis/i.test(runThrough), "the entry UI must present one OmenMarketMaker run with two starting points", failures);
  assert(!/Choose a product|DemoThemis simulation|current product:/i.test(runThrough) && /chosen run:/i.test(runThrough), "DemoThemis must not be presented as a second customer-facing product", failures);
  assert(/productModeNav\.classList\.remove\(["']is-awaiting-selection["']\)/i.test(runThrough), "product chooser must compact after selection", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab/i.test(runThrough) && /\.product-tab:hover/i.test(runThrough), "product choices must expose strong interactive affordances", failures);
  assert(/background:\s*color-mix\(in srgb,\s*var\(--choice-soft\)/i.test(runThrough) && /border:\s*1px solid color-mix\(in srgb,\s*var\(--choice-accent\)/i.test(runThrough), "product choices must carry restrained brand color", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab\s*\{[^}]*background:\s*var\(--choice-accent\)/i.test(runThrough), "initial product choices must use solid button backgrounds", failures);
  assert(/\.product-mode-nav\.is-awaiting-selection\s+\.product-tab:active/i.test(runThrough) && /\.product-mode-nav\.is-awaiting-selection\s+\.product-tab-event\s*\{\s*display:\s*inline-flex/i.test(runThrough), "initial product choices must keep pressed and start affordances at small widths", failures);
  assert(/function\s+selectProductMode\s*\(/.test(runThrough), "run-through product tabs are not wired to simulation state", failures);
  assert(/\.sim-app-viewport\[data-app-theme=["']omen["']\]/i.test(runThrough) && /\.sim-app-viewport\[data-app-theme=["']themis["']\]/i.test(runThrough), "both embedded web apps must expose their own theme boundary", failures);
  assert(/\.sim-live-preview\s*\{[^}]*--browser-chrome-bg:\s*#e8edf1[^}]*--browser-chrome-surface:\s*#f9fbfc[^}]*--browser-chrome-accent:\s*#526b7a/is.test(runThrough), "run-through mock browsers must share one neutral chrome palette", failures);
  assert(/\.sim-live-preview\s*\{[^}]*color:\s*var\(--browser-chrome-ink\)[^}]*font-family:\s*var\(--browser-chrome-font\)[^}]*color-scheme:\s*light/is.test(runThrough), "browser frame must reset inherited product color, type, and native color scheme", failures);
  assert(/\.sim-browser-bar\s*\{[^}]*background:\s*var\(--browser-chrome-bg\)[^}]*font-family:\s*var\(--browser-chrome-font\)/is.test(runThrough), "browser bar must use the shared chrome surface and typography", failures);
  assert(/\.sim-url\s*\{[^}]*border:\s*1px solid var\(--browser-chrome-line\)[^}]*background:\s*var\(--browser-chrome-surface\)[^}]*color:\s*var\(--browser-chrome-muted\)/is.test(runThrough), "browser address field must stay product-neutral", failures);
  assert(!/\.product-mode-panel\[data-product-mode=["'](?:omen|themis)["']\]\s+\.sim-browser-(?:bar|back)/i.test(runThrough), "product themes must not restyle the outer browser chrome", failures);
  assert(!/\.product-mode-panel\[data-product-mode=["'](?:omen|themis)["']\]\s+\.sim-live-preview\s*(?:,|\{)/i.test(runThrough), "product palettes must stop at the app viewport instead of recoloring the browser frame", failures);
  const browserChromeRules = Array.from(runThrough.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter((match) => /\.sim-(?:browser|url)/.test(match[1]));
  const leakingBrowserRule = browserChromeRules.find((match) => /var\(--(?:bg|surface|ink|ink-soft|muted|faint|line|line-strong|accent|accent-soft|accent-ink)\)/.test(match[2]));
  assert(!leakingBrowserRule, "browser chrome must not consume product palette variables", failures);
  const runBrandCss = readDist("assets/run-through-brand.css");
  assert(/data-active-brand=["']omen["']/i.test(runBrandCss) && /--bg:\s*var\(--omm-black\)/i.test(runBrandCss), "OmenMarketMaker surfaces must use the near-black and green brand palette", failures);
  assert(/data-app-theme=["']omen["'][\s\S]*?--accent:\s*var\(--omm-green\)/i.test(runBrandCss), "OmenMarketMaker app screens must use electric-green interaction states", failures);
  assert(/card-grid\.svg/i.test(runBrandCss) && /run-omen-grid-scroll\s+30s\s+linear\s+infinite/i.test(runBrandCss), "OmenMarketMaker surfaces need the smooth moving brand grid", failures);
  assert(/data-active-brand=["']demothemis["']/i.test(runBrandCss) && /--bg:\s*var\(--dt-canvas\)/i.test(runBrandCss), "DemoThemis surfaces must use the ivory brand canvas", failures);
  assert(/data-app-theme=["']themis["'][\s\S]*?--accent:\s*var\(--dt-emission\)/i.test(runBrandCss), "DemoThemis app screens must use cyan emission states", failures);
  assert(/protocol-sequence:not\(\[data-sequence-profile=["']omen["']\]\)[\s\S]*?--protocol-bg:\s*var\(--dt-canvas\)/i.test(runBrandCss), "DemoThemis protocol sequences must remain light ivory rather than black", failures);
  assert(/\.app-brand-wordmark/i.test(runBrandCss) && /makeProductWordmark\(appTheme\s*===\s*["']omen["']/i.test(runThrough), "simulated app navigation must use the supplied full wordmarks", failures);
  assert(/classList\.add\(["']omen-rive-shell["'],\s*["']run-rive-wordmark["']\)/i.test(runThrough) && /makeProductWordmark\(appTheme\s*===\s*["']omen["'][\s\S]{0,160},\s*true\)/i.test(runThrough), "simulator OmenMarketMaker identities must use the full Rive wordmark with a poster fallback", failures);
  assert(/data-product-mode["'],\s*selectedRunMode/i.test(runThrough) && /setAttribute\(["']data-active-brand["'],\s*activeBrand\)/i.test(runThrough), "starting-point state and active product ownership must remain separate", failures);
  assert(/\.sim-demand-frame\s*\{[^}]*border:\s*2px solid[^}]*border-radius:\s*18px/is.test(runThrough), "the OmenMarketMaker handoff browser must have a distinct integration border", failures);
  assert(/\.sim-demand-frame-tab\s*\{[^}]*color:\s*#fff[^}]*font-size:\s*\.76rem/is.test(runThrough), "the integration border must use the requested white tab title", failures);
  assert(/\.product-demo\.sim-tight\s+\.sim-demand-frame-tab\s*\{[^}]*max-width:\s*calc\(100% - \.5rem\)[^}]*font-size:\s*\.68rem/is.test(runThrough), "the integration tab must remain readable in compact layouts", failures);
  assert(/Seeding DemoThemis with demand from the Application Layer/.test(runThrough), "the application-layer demand frame title is missing", failures);
  assert(!/Full DemoThemis backend|app-backend-chip/i.test(runThrough), "the old backend label must be removed from the web app", failures);
  assert(!/entry\.group\.mode\s*===\s*mode/.test(runThrough), "event navigator must keep every product's event groups visible", failures);
  assert(/data-stage-mode=["']omen["']/i.test(runThrough) && /data-stage-mode=["']themis["']/i.test(runThrough), "event navigator must preserve distinct product group themes", failures);
  assert(/\.product-tab\[data-product-mode=["']omen["']\]\[aria-pressed=["']true["']\]/i.test(runThrough), "Full market run selection must carry its functional accent", failures);
  assert(/\.product-tab\[data-product-mode=["']themis["']\]\[aria-pressed=["']true["']\]/i.test(runThrough), "Court-backed run selection must carry its functional accent", failures);
  assert(/\.product-mode-panel\[data-product-mode\]\s+\.event-navigator-toggle/i.test(runThrough), "event navigator interactions must inherit product typography", failures);
  assert(/\.sim-live-preview\s+\.app-tabs\s+span\.on/i.test(runThrough), "active app tabs must carry the selected product accent", failures);
  assert(!/--navigator-band|--app-band|\.event-nav-label::before|\.app-nav::before|conic-gradient|\.app-brand\s+\.dot/i.test(runThrough), "purely decorative product motifs should stay removed", failures);
  assert(!/sim-frame-label|sim-window-dots|sim-live-dot/i.test(runThrough), "duplicated simulator chrome should stay removed", failures);
  assert(!/<body[^>]*class=["'][^"']*product-(?:omen|themis)/i.test(runThrough), "product theme must not be applied to the page body", failures);
  assert(/<p\s+class=["']kicker["']>End-to-end run-through<\/p>/i.test(runThrough), "run-through masthead must stay product-neutral", failures);
  assert(/DemoThemis Intake/i.test(runThrough), "DemoThemis entry event is not branded as court intake", failures);
  assert(/id=["']stageRail["']/i.test(runThrough), "run-through chapter missing stage rail", failures);
  assert(/id=["']focusScene["']/i.test(runThrough), "run-through missing focused one-step scene", failures);
  assert(/id=["']productDemo["']/i.test(runThrough), "run-through missing current walkthrough view", failures);
  assert(/tutorial-advance/i.test(runThrough), "run-through missing outer automatic-event controls", failures);
  assert(/APP_PAGES/i.test(runThrough), "run-through missing canonical staged app pages", failures);
  assert(!/sim-role-handoff|data-role-handoff/i.test(runThrough), "run-through must not include the removed per-event role strip", failures);
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
  assert(/id=["']machineTextFlow["']/i.test(runThrough), "run-through state machine missing text alternative", failures);
  assert(["all", "omen", "demothemis"].every((focus) => new RegExp(`data-machine-focus=["']${focus}["']`, "i").test(runThrough)), "run-through state machine must offer whole-system, OmenMarketMaker-only, and DemoThemis-only views", failures);
  assert(/role=["']radiogroup["'][^>]*aria-label=["']Choose which product to show["']/i.test(runThrough) && /setMachineFocus\(["']demothemis["'],\s*false\)/i.test(runThrough), "state-map product views must be one mutually exclusive selector with DemoThemis visible by default", failures);
  assert(/data-machine-focus=["']demothemis["'][^>]*aria-checked=["']true["'][^>]*>DemoThemis<[^]*data-machine-focus=["']all["'][^]*data-machine-focus=["']omen["']/i.test(runThrough), "DemoThemis must be the first and initially selected state-map tab", failures);
  assert(/function\s+makeProductFavicon\s*\(/i.test(runThrough) && /assets\/brand\/omenmarketmaker\/mark-32\.png/i.test(runThrough) && /assets\/brand\/demothemis\/mark-32\.png/i.test(runThrough) && /machine-owner-icons--shared/i.test(runThrough), "state cards must use product favicons, including both favicons on shared handoffs", failures);
  assert(/\.machine-owner-icons--shared\s*\{[^}]*transform-style:\s*preserve-3d[^}]*animation:\s*machine-owner-coin-turn\s+6\.4s\s+ease-in-out\s+infinite/i.test(runBrandCss) && /\.machine-owner-icons--shared \.machine-owner-icon\s*\{[^}]*box-sizing:\s*border-box[^}]*backface-visibility:\s*hidden[^}]*transform:\s*rotateY\(0deg\)/i.test(runBrandCss) && /\.machine-owner-icons--shared \.machine-owner-icon \+ \.machine-owner-icon\s*\{[^}]*transform:\s*rotateY\(180deg\)/i.test(runBrandCss) && !/\.machine-owner-icons--shared \.machine-owner-icon(?: \+ \.machine-owner-icon)?\s*\{[^}]*translateZ/i.test(runBrandCss) && /@keyframes\s+machine-owner-coin-turn[\s\S]*?rotateY\(360deg\)/i.test(runBrandCss), "shared state-map ownership must combine two identically aligned favicon faces as one CSS-only rotating coin", failures);
  assert(/\.machine-state:is\([^}]+\) \.machine-owner-icons--shared \.machine-owner-icon\s*\{[^}]*box-shadow:/i.test(runBrandCss) && !/\.machine-state:is\([^}]+\) \.machine-owner-icons--shared\s*\{[^}]*filter:/i.test(runBrandCss), "shared coin hover glow must stay on its faces instead of flattening the 3D parent", failures);
  assert(/\.machine-owner-icon\s*\{[^}]*box-shadow:\s*0 0 0 1px transparent,\s*0 0 0 transparent[^}]*filter:\s*none[^}]*transition:\s*box-shadow/i.test(runBrandCss) && /\.machine-owner-icons:not\(\.machine-owner-icons--shared\) \.machine-owner-icon\s*\{[^}]*box-shadow:[^}]*transform:/i.test(runBrandCss), "standalone state-map favicons must use a stable rim transition instead of a first-hover image filter", failures);
  assert(/@keyframes\s+machine-owner-coin-front-face[\s\S]*?33%,\s*83\.9%\s*\{\s*visibility:\s*hidden/i.test(runBrandCss) && /@keyframes\s+machine-owner-coin-back-face[\s\S]*?33%,\s*83\.9%\s*\{\s*visibility:\s*visible/i.test(runBrandCss), "shared coin must explicitly switch its paintable face so hover compositing cannot cover DemoThemis with Omen", failures);
  assert(/prefers-reduced-motion:\s*reduce[\s\S]*?\.machine-owner-icons--shared\s*\{[^}]*animation:\s*none[\s\S]*?\.machine-owner-icons--shared \.machine-owner-icon\s*\{[^}]*animation:\s*none/i.test(runBrandCss), "shared state-map coin and its face switching must stop for reduced motion", failures);
  assert(/className\s*\|\|\s*["']product-favicon["']/i.test(runThrough) && !/makeProductWordmark\(state\.owner,\s*["']machine-owner-mark/i.test(runThrough), "state cards must not retain full static wordmarks", failures);
  assert(/MACHINE_PHASE_BRANDS/i.test(runThrough) && /machine-phase-brand/i.test(runThrough) && /makeProductWordmark\(brand,\s*["']machine-phase-wordmark["']/i.test(runThrough), "phase headings must carry the full static product wordmarks", failures);
  assert(!/data-machine-route=["']quiet["']|Fast settlement|bonded assertion|watcher window/i.test(runThrough), "run-through must not restore the removed fast-settlement path", failures);
  assert(/SYSTEM_STATES/i.test(runThrough), "run-through state machine missing canonical lifecycle data", failures);
  assert(!/machineExceptionGrid|data-machine-route=["']exceptions["']|SYSTEM_EXCEPTIONS|Pre-written rule still needed|What can go wrong\?/i.test(runThrough), "run-through must not restore the removed failure rail", failures);
  assert(!/>\s*Disputed market\s*</i.test(runThrough) && !/>\s*Whole map\s*</i.test(runThrough), "state-map controls must not retain the redundant disputed-market and whole-map route toggle", failures);
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

  checkVersionedAssetBundle(failures);
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
