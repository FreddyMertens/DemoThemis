const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const publicDir = path.join(root, "DemoThemisMVP", "web", "public");

// Reuse the proposal's existing metadata, sitemap, and validation-aware build.
require(path.join(root, "tools", "build-site.js"));

const excluded = new Set(["_headers", "_redirects"]);

function destinationName(name) {
  return name === "index.html" ? "proposal-home.html" : name;
}

function copyEntry(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const child of fs.readdirSync(from)) {
      copyEntry(path.join(from, child), path.join(to, child));
    }
    return;
  }

  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

fs.mkdirSync(publicDir, { recursive: true });

for (const name of fs.readdirSync(dist)) {
  if (excluded.has(name)) continue;

  const destination = path.join(publicDir, destinationName(name));
  fs.rmSync(destination, { recursive: true, force: true });
  copyEntry(path.join(dist, name), destination);
}

// A public/index.html would collide with src/app/page.tsx during `next build`.
fs.rmSync(path.join(publicDir, "index.html"), { force: true });
fs.rmSync(path.join(publicDir, "glossary.html"), { force: true });

console.log("Prepared proposal pages inside the unified Next.js public directory");
