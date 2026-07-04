const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://demothemis.netlify.app").replace(/\/+$/, "");

const publicHtml = [
  "index.html",
  "demothemis.html",
  "game-theory.html",
  "prediction-market.html",
  "hybrid-juror-prediction-market-integration.html",
  "the-design.html",
  "governance.html"
];

const forbiddenPublicPaths = [
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

function checkBuiltHtml(failures) {
  for (const file of publicHtml) {
    const html = readDist(file);
    checkMetadata(file, html, failures);
    assert(!/unpkg\.com/i.test(html), `${file} should not load unpkg.com`, failures);
    assert(/assets\/styles\.css/i.test(html), `${file} missing shared stylesheet`, failures);
  }
  const gameLab = readDist("game-theory.html");
  assert(/Break the court/i.test(gameLab), "game-theory chapter missing Break the court title", failures);
  assert(/assets\/vendor\/popper-2\.11\.8\.min\.js/i.test(gameLab), "gamelab missing vendored Popper", failures);
  assert(/assets\/vendor\/tippy-6\.3\.7\.umd\.min\.js/i.test(gameLab), "gamelab missing vendored Tippy", failures);
  assert(/role=["']tablist["']/i.test(gameLab), "gamelab missing tablist role", failures);
  assert(/data-attack=["']bloc["']/i.test(gameLab), "gamelab missing coordinated attack card", failures);

  const demoThemis = readDist("demothemis.html");
  assert(/DemoThemis: the simple version and the deep dive/i.test(demoThemis), "DemoThemis chapter missing combined title", failures);
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
  assert(/Run through the whole system/i.test(runThrough), "run-through chapter missing new title", failures);
  assert(/id=["']stageRail["']/i.test(runThrough), "run-through chapter missing stage rail", failures);
  assert(/id=["']focusScene["']/i.test(runThrough), "run-through missing focused one-step scene", failures);
  assert(/id=["']stepSvg["']/i.test(runThrough), "run-through missing illustrated step SVG", failures);
  assert(/id=["']playResult["']/i.test(runThrough), "run-through missing interactive step feedback", failures);
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
  assert(/data-loop=["']trust["']/i.test(runThrough), "run-through missing bootstrap-loop trust node", failures);
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
