const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://demothemis.netlify.app").replace(/\/+$/, "");

const publicFiles = [
  "index.html",
  "the-design.html",
  "demothemis.html",
  "game-theory.html",
  "prediction-market.html",
  "hybrid-juror-prediction-market-integration.html",
  "governance.html",
  "mvp.html",
  "assumptions.js",
  "assets/common.js",
  "assets/styles.css",
  "assets/vendor/popper-2.11.8.LICENSE.txt",
  "assets/vendor/popper-2.11.8.min.js",
  "assets/vendor/tippy-6.3.7.LICENSE",
  "assets/vendor/tippy-6.3.7.css",
  "assets/vendor/tippy-6.3.7.umd.min.js",
  "assets/vendor/tippy-shift-away-6.3.7.css",
  "assets/fonts/product-app-fonts.css",
  "assets/fonts/alegreya-sans-regular.ttf",
  "assets/fonts/alegreya-sans-medium.ttf",
  "assets/fonts/alegreya-sans-bold.ttf",
  "assets/fonts/alegreya-sans-extrabold.ttf",
  "assets/fonts/alegreya-sans-black.ttf",
  "assets/fonts/literata-ui-variable.ttf",
  "assets/fonts/noto-serif-tibetan-ui-variable.ttf",
  "assets/fonts/noto-sans-symbols-2-ui.ttf",
  "assets/fonts/OFL-Alegreya-Sans.txt",
  "assets/fonts/OFL-Literata.txt",
  "assets/fonts/OFL-Noto-Serif-Tibetan.txt",
  "assets/fonts/OFL-Noto-Sans-Symbols-2.txt"
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

// These routes are supplied by the unified Next.js application rather than the
// proposal's static output directory.
const applicationRoutes = new Set(["/app", "/sandbox", "/home", "/about"]);

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
  if (file.endsWith(".html")) {
    fs.writeFileSync(to, enhanceHtmlMetadata(file, fs.readFileSync(from, "utf8")), "utf8");
  } else {
    fs.copyFileSync(from, to);
  }
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

function pageUrl(file) {
  return file === "index.html" ? `${siteUrl}/` : `${siteUrl}/${file.replace(/\.html$/i, "")}`;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function extractTitle(html, file) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return stripTags(match ? match[1] : file);
}

function extractMetaDescription(html) {
  const namedFirst = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (namedFirst) return stripTags(namedFirst[1]);
  const contentFirst = html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  return stripTags(contentFirst ? contentFirst[1] : "DemoThemis is a proposal for a decentralized court, juror system, and prediction-market bootstrap.");
}

function hasTag(html, pattern) {
  return pattern.test(html);
}

function enhanceHtmlMetadata(file, html) {
  const title = escapeAttr(extractTitle(html, file));
  const description = escapeAttr(extractMetaDescription(html));
  const url = escapeAttr(pageUrl(file));
  const tags = [];

  if (!hasTag(html, /<link\s+[^>]*rel=["']canonical["']/i)) {
    tags.push(`<link rel="canonical" href="${url}">`);
  }
  if (!hasTag(html, /<meta\s+[^>]*property=["']og:type["']/i)) {
    tags.push('<meta property="og:type" content="website">');
  }
  if (!hasTag(html, /<meta\s+[^>]*property=["']og:site_name["']/i)) {
    tags.push('<meta property="og:site_name" content="DemoThemis">');
  }
  if (!hasTag(html, /<meta\s+[^>]*property=["']og:title["']/i)) {
    tags.push(`<meta property="og:title" content="${title}">`);
  }
  if (!hasTag(html, /<meta\s+[^>]*property=["']og:description["']/i)) {
    tags.push(`<meta property="og:description" content="${description}">`);
  }
  if (!hasTag(html, /<meta\s+[^>]*property=["']og:url["']/i)) {
    tags.push(`<meta property="og:url" content="${url}">`);
  }
  if (!hasTag(html, /<meta\s+[^>]*name=["']twitter:card["']/i)) {
    tags.push('<meta name="twitter:card" content="summary">');
  }
  if (!hasTag(html, /<meta\s+[^>]*name=["']twitter:title["']/i)) {
    tags.push(`<meta name="twitter:title" content="${title}">`);
  }
  if (!hasTag(html, /<meta\s+[^>]*name=["']twitter:description["']/i)) {
    tags.push(`<meta name="twitter:description" content="${description}">`);
  }

  if (!tags.length) return html;
  if (!/<\/head>/i.test(html)) throw new Error(`Missing </head> in public HTML file: ${file}`);
  return html.replace(/<\/head>/i, `${tags.join("\n")}\n</head>`);
}

function resolveLocalRef(fromFile, rawRef) {
  const clean = stripHashAndQuery(rawRef.trim());
  if (!clean || isExternal(clean)) return null;
  if (applicationRoutes.has(clean.replace(/\/+$/, "") || "/")) return null;
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

function validateSeoMetadata() {
  const htmlFiles = publicFiles.filter((file) => file.endsWith(".html"));
  const missing = [];
  const required = [
    { label: "canonical", pattern: /<link\s+[^>]*rel=["']canonical["'][^>]*href=["'][^"']+["']/i },
    { label: "og:title", pattern: /<meta\s+[^>]*property=["']og:title["'][^>]*content=["'][^"']+["']/i },
    { label: "og:description", pattern: /<meta\s+[^>]*property=["']og:description["'][^>]*content=["'][^"']+["']/i },
    { label: "og:url", pattern: /<meta\s+[^>]*property=["']og:url["'][^>]*content=["'][^"']+["']/i },
    { label: "twitter:card", pattern: /<meta\s+[^>]*name=["']twitter:card["'][^>]*content=["']summary["']/i },
    { label: "twitter:title", pattern: /<meta\s+[^>]*name=["']twitter:title["'][^>]*content=["'][^"']+["']/i },
    { label: "twitter:description", pattern: /<meta\s+[^>]*name=["']twitter:description["'][^>]*content=["'][^"']+["']/i }
  ];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(outDir, file), "utf8");
    for (const item of required) {
      if (!item.pattern.test(html)) missing.push(`${file}: ${item.label}`);
    }
    const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    if (canonical && canonical[1] !== pageUrl(file)) {
      missing.push(`${file}: canonical should be ${pageUrl(file)}, found ${canonical[1]}`);
    }
  }

  if (missing.length) {
    throw new Error(`Build output is missing SEO/social metadata:\n${missing.join("\n")}`);
  }
}

function buildSitemap() {
  const urls = publicFiles
    .filter((file) => file.endsWith(".html"))
    .map((file) => `  <url><loc>${pageUrl(file)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildHeaders() {
  return `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'\n`;
}

function buildRedirects() {
  return [
    "/vision /demothemis 301",
    "/vision.html /demothemis 301",
    "/juror-court /demothemis 301",
    "/juror-court.html /demothemis 301",
    "/hybrid-juror-system /demothemis 301",
    "/hybrid-juror-system.html /demothemis 301",
    "/ /index.html 200"
  ].join("\n") + "\n";
}

function build404() {
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>DemoThemis: page not found</title>\n<meta name="robots" content="noindex">\n<link rel="stylesheet" href="assets/styles.css">\n</head>\n<body>\n<main class="content wrap" style="padding-top:4rem">\n  <p class="sec-label">404</p>\n  <h1>Page not found</h1>\n  <p>The public site only serves the published DemoThemis chapters and assets.</p>\n  <p><a href="/">Return home</a></p>\n</main>\n</body>\n</html>\n`;
}

ensureInsideRoot(outDir);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

publicFiles.forEach(copyFile);
writeFile("_headers", buildHeaders());
writeFile("_redirects", buildRedirects());
writeFile("robots.txt", "User-agent: *\nAllow: /\nSitemap: " + siteUrl + "/sitemap.xml\n");
writeFile("sitemap.xml", buildSitemap());
writeFile("404.html", build404());

validateLinks();
validateNoInternalArtifacts();
validateSeoMetadata();

console.log(`Built ${publicFiles.length} public files into ${path.relative(root, outDir) || outDir}`);
