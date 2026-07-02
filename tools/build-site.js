const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://demothemis.netlify.app").replace(/\/+$/, "");

const publicFiles = [
  "index.html",
  "vision.html",
  "juror-court.html",
  "hybrid-juror-system.html",
  "prediction-market.html",
  "hybrid-juror-prediction-market-integration.html",
  "zero-to-one.html",
  "compounding.html",
  "the-design.html",
  "governance.html",
  "game-theory.html",
  "breaking-the-court.html",
  "hardening-the-court.html",
  "finishing-the-court.html",
  "rebuilding-the-court.html",
  "juror-exam-downsides.html",
  "assumptions.js",
  "assets/common.js",
  "assets/styles.css"
];

const internalNamePatterns = [
  /\.md$/i,
  /\.py$/i,
  /^SKILL\.md$/i,
  /^toupdate\.md$/i,
  /^review\.md$/i,
  /^game-theory-qa/i,
  /^game-theory-audit\.html$/i,
  /^rewrite/i,
  /^tools\//i,
  /^temp/i,
  /^fix/i,
  /^screenshot\./i
];

function toPosix(file) {
  return file.split(path.sep).join("/");
}

function ensureInsideRoot(target) {
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside repository: ${target}`);
  }
}

function copyFile(file) {
  const from = path.join(root, file);
  const to = path.join(outDir, file);
  if (!fs.existsSync(from)) throw new Error(`Missing public source file: ${file}`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function writeFile(file, content) {
  const to = path.join(outDir, file);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, content, "utf8");
}

function stripHashAndQuery(value) {
  return value.split("#")[0].split("?")[0];
}

function isExternal(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|$)/i.test(value);
}

function resolveLocalRef(fromFile, rawRef) {
  const clean = stripHashAndQuery(rawRef.trim());
  if (!clean || isExternal(clean)) return null;
  const baseDir = clean.startsWith("/") ? outDir : path.dirname(path.join(outDir, fromFile));
  const relativeRef = clean.startsWith("/") ? clean.slice(1) : clean;
  const normalized = relativeRef.endsWith("/") ? path.join(relativeRef, "index.html") : relativeRef;
  const target = path.normalize(path.join(baseDir, normalized));
  if (!target.startsWith(outDir)) {
    throw new Error(`Invalid local reference outside dist from ${fromFile}: ${rawRef}`);
  }
  return target;
}

function validateLinks() {
  const htmlFiles = publicFiles.filter((file) => file.endsWith(".html"));
  const attrRe = /\b(?:href|src)=["']([^"']+)["']/gi;
  const missing = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(outDir, file), "utf8");
    let match;
    while ((match = attrRe.exec(html))) {
      const target = resolveLocalRef(file, match[1]);
      if (target && !fs.existsSync(target)) {
        missing.push(`${file} -> ${match[1]}`);
      }
    }
  }

  if (missing.length) {
    throw new Error(`Build output has missing local links:\n${missing.join("\n")}`);
  }
}

function validateNoInternalArtifacts() {
  const found = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = toPosix(path.relative(outDir, abs));
      if (entry.isDirectory()) {
        walk(abs);
      } else if (internalNamePatterns.some((pattern) => pattern.test(rel))) {
        found.push(rel);
      }
    }
  }
  walk(outDir);
  if (found.length) {
    throw new Error(`Internal artifacts leaked into deploy output:\n${found.join("\n")}`);
  }
}

function buildSitemap() {
  const urls = publicFiles
    .filter((file) => file.endsWith(".html"))
    .map((file) => `  <url><loc>${siteUrl}/${file === "index.html" ? "" : file}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildHeaders() {
  return `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://unpkg.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'\n`;
}

function build404() {
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>DemoThemis: page not found</title>\n<meta name="robots" content="noindex">\n<link rel="stylesheet" href="assets/styles.css">\n</head>\n<body>\n<main class="content wrap" style="padding-top:4rem">\n  <p class="sec-label">404</p>\n  <h1>Page not found</h1>\n  <p>The public site only serves the published DemoThemis chapters and assets.</p>\n  <p><a href="index.html">Return home</a></p>\n</main>\n</body>\n</html>\n`;
}

ensureInsideRoot(outDir);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

publicFiles.forEach(copyFile);
writeFile("_headers", buildHeaders());
writeFile("_redirects", "/ /index.html 200\n");
writeFile("robots.txt", "User-agent: *\nAllow: /\nSitemap: " + siteUrl + "/sitemap.xml\n");
writeFile("sitemap.xml", buildSitemap());
writeFile("404.html", build404());

validateLinks();
validateNoInternalArtifacts();

console.log(`Built ${publicFiles.length} public files into ${path.relative(root, outDir) || outDir}`);
