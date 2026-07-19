const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://demothemis.netlify.app").replace(/\/+$/, "");

const publicFiles = [
  "index.html",
  "run-through.html",
  "demothemis.html",
  "break-the-court.html",
  "omenmarketmaker.html",
  "bootstrap-loop.html",
  "governance.html",
  "demothemis-mvp.html",
  "assumptions.js",
  "assets/common.js",
  "assets/brand-rive.js",
  "assets/mvp-simulator.css",
  "assets/run-through-brand.css",
  "assets/styles.css",
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
  "assets/brand/omenmarketmaker/card-grid.svg",
  "assets/brand/omenmarketmaker/wordmark-poster.png",
  "assets/brand/omenmarketmaker/wordmark.riv",
  "assets/brand/social/demothemis-1200x630.jpg",
  "assets/brand/social/mvp-1200x630.jpg",
  "assets/brand/social/omenmarketmaker-1200x630.jpg",
  "assets/brand/social/proposal-home-1200x630.jpg",
  "assets/brand/social/shared-system-1200x630.jpg",
  "assets/vendor/rive/LICENSE.txt",
  "assets/vendor/rive/rive-2.38.5.js",
  "assets/vendor/rive/rive-2.38.5.wasm",
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

const defaultBrandMetadata = {
  icon: "assets/brand/demothemis/favicon.ico",
  icon32: "assets/brand/demothemis/mark-32.png",
  appleIcon: "assets/brand/demothemis/mark-180.png",
  themeColor: "#f6f3f2"
};

const pageBrandMetadata = {
  "index.html": {
    ...defaultBrandMetadata,
    image: "assets/brand/social/proposal-home-1200x630.jpg",
    imageAlt: "DemoThemis and OmenMarketMaker proposal"
  },
  "run-through.html": {
    ...defaultBrandMetadata,
    image: "assets/brand/social/shared-system-1200x630.jpg",
    imageAlt: "DemoThemis and OmenMarketMaker interactive run-through"
  },
  "demothemis.html": {
    ...defaultBrandMetadata,
    image: "assets/brand/social/demothemis-1200x630.jpg",
    imageAlt: "DemoThemis"
  },
  "break-the-court.html": {
    ...defaultBrandMetadata,
    image: "assets/brand/social/demothemis-1200x630.jpg",
    imageAlt: "DemoThemis court attack-resistance chapter"
  },
  "omenmarketmaker.html": {
    icon: "assets/brand/omenmarketmaker/favicon.ico",
    icon32: "assets/brand/omenmarketmaker/mark-32.png",
    appleIcon: "assets/brand/omenmarketmaker/mark-180.png",
    themeColor: "#000402",
    image: "assets/brand/social/omenmarketmaker-1200x630.jpg",
    imageAlt: "OmenMarketMaker"
  },
  "bootstrap-loop.html": {
    ...defaultBrandMetadata,
    image: "assets/brand/social/shared-system-1200x630.jpg",
    imageAlt: "DemoThemis and OmenMarketMaker bootstrap loop"
  },
  "governance.html": {
    ...defaultBrandMetadata,
    image: "assets/brand/social/shared-system-1200x630.jpg",
    imageAlt: "Independent DemoThemis and OmenMarketMaker governance"
  },
  "demothemis-mvp.html": {
    ...defaultBrandMetadata,
    image: "assets/brand/social/mvp-1200x630.jpg",
    imageAlt: "DemoThemis Live Demo MVP"
  }
};

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
const applicationRoutes = new Set(["/app", "/sandbox", "/home", "/about", "/onboard"]);

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

function assetUrl(file) {
  return `${siteUrl}/${file.replace(/^\/+/, "")}`;
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
  const brand = pageBrandMetadata[file] || null;
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
    tags.push(`<meta name="twitter:card" content="${brand ? "summary_large_image" : "summary"}">`);
  }
  if (!hasTag(html, /<meta\s+[^>]*name=["']twitter:title["']/i)) {
    tags.push(`<meta name="twitter:title" content="${title}">`);
  }
  if (!hasTag(html, /<meta\s+[^>]*name=["']twitter:description["']/i)) {
    tags.push(`<meta name="twitter:description" content="${description}">`);
  }

  if (brand) {
    const image = escapeAttr(assetUrl(brand.image));
    const imageAlt = escapeAttr(brand.imageAlt);
    if (!hasTag(html, /<link\s+[^>]*rel=["']icon["']/i)) {
      tags.push(`<link rel="icon" href="${escapeAttr(brand.icon)}">`);
      tags.push(`<link rel="icon" type="image/png" sizes="32x32" href="${escapeAttr(brand.icon32)}">`);
    }
    if (!hasTag(html, /<link\s+[^>]*rel=["']apple-touch-icon["']/i)) {
      tags.push(`<link rel="apple-touch-icon" sizes="180x180" href="${escapeAttr(brand.appleIcon)}">`);
    }
    if (!hasTag(html, /<meta\s+[^>]*name=["']theme-color["']/i)) {
      tags.push(`<meta name="theme-color" content="${escapeAttr(brand.themeColor)}">`);
    }
    if (!hasTag(html, /<meta\s+[^>]*property=["']og:image["']/i)) {
      tags.push(`<meta property="og:image" content="${image}">`);
      tags.push('<meta property="og:image:width" content="1200">');
      tags.push('<meta property="og:image:height" content="630">');
      tags.push(`<meta property="og:image:alt" content="${imageAlt}">`);
    }
    if (!hasTag(html, /<meta\s+[^>]*name=["']twitter:image["']/i)) {
      tags.push(`<meta name="twitter:image" content="${image}">`);
      tags.push(`<meta name="twitter:image:alt" content="${imageAlt}">`);
    }
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
    { label: "twitter:title", pattern: /<meta\s+[^>]*name=["']twitter:title["'][^>]*content=["'][^"']+["']/i },
    { label: "twitter:description", pattern: /<meta\s+[^>]*name=["']twitter:description["'][^>]*content=["'][^"']+["']/i }
  ];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(outDir, file), "utf8");
    const brand = pageBrandMetadata[file] || null;
    for (const item of required) {
      if (!item.pattern.test(html)) missing.push(`${file}: ${item.label}`);
    }
    const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    if (canonical && canonical[1] !== pageUrl(file)) {
      missing.push(`${file}: canonical should be ${pageUrl(file)}, found ${canonical[1]}`);
    }
    const expectedCard = brand ? "summary_large_image" : "summary";
    if (!new RegExp(`<meta\\s+[^>]*name=["']twitter:card["'][^>]*content=["']${expectedCard}["']`, "i").test(html)) {
      missing.push(`${file}: twitter:card should be ${expectedCard}`);
    }
    if (brand) {
      const imageUrl = assetUrl(brand.image).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const brandedRequired = [
        { label: "icon", pattern: /<link\s+[^>]*rel=["']icon["'][^>]*href=["'][^"']+["']/i },
        { label: "apple-touch-icon", pattern: /<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*href=["'][^"']+["']/i },
        { label: "theme-color", pattern: /<meta\s+[^>]*name=["']theme-color["'][^>]*content=["'][^"']+["']/i },
        { label: "og:image", pattern: new RegExp(`<meta\\s+[^>]*property=["']og:image["'][^>]*content=["']${imageUrl}["']`, "i") },
        { label: "twitter:image", pattern: new RegExp(`<meta\\s+[^>]*name=["']twitter:image["'][^>]*content=["']${imageUrl}["']`, "i") }
      ];
      for (const item of brandedRequired) {
        if (!item.pattern.test(html)) missing.push(`${file}: ${item.label}`);
      }
    } else if (/og:image|twitter:image|summary_large_image|assets\/brand/i.test(html)) {
      missing.push(`${file}: page uses brand metadata without a pageBrandMetadata entry`);
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
  const common = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
  return `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n  X-Frame-Options: DENY\n  Content-Security-Policy: ${common}; script-src 'self' 'unsafe-inline'\n\n/\n  Content-Security-Policy: ${common}; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'\n\n/index.html\n  Content-Security-Policy: ${common}; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'\n\n/omenmarketmaker*\n  Content-Security-Policy: ${common}; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'\n`;
}

function buildRedirects() {
  return [
    "/the-design /run-through 301",
    "/the-design.html /run-through 301",
    "/game-theory /break-the-court 301",
    "/game-theory.html /break-the-court 301",
    "/prediction-market /omenmarketmaker 301",
    "/prediction-market.html /omenmarketmaker 301",
    "/hybrid-juror-prediction-market-integration /bootstrap-loop 301",
    "/hybrid-juror-prediction-market-integration.html /bootstrap-loop 301",
    "/mvp /demothemis-mvp 301",
    "/mvp.html /demothemis-mvp 301",
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
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>DemoThemis: page not found</title>\n<meta name="robots" content="noindex">\n<meta name="theme-color" content="#f6f3f2">\n<link rel="icon" href="assets/brand/demothemis/favicon.ico">\n<link rel="stylesheet" href="assets/styles.css">\n</head>\n<body data-page-brand="demothemis">\n<main class="content wrap" style="padding-top:4rem">\n  <img class="brand-mark" src="assets/brand/demothemis/mark-192.png" width="72" height="72" alt="">\n  <p class="sec-label">404</p>\n  <h1>Page not found</h1>\n  <p>The public site only serves the published DemoThemis chapters and assets.</p>\n  <p><a href="/">Return home</a></p>\n</main>\n</body>\n</html>\n`;
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
