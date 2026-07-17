const fs = require("fs");
const path = require("path");

const pnpmModules = path.join(__dirname, "..", "DemoThemisMVP", "web", "node_modules", ".pnpm");
const postcssPackage = fs.readdirSync(pnpmModules).filter((name) => name.startsWith("postcss@")).sort().at(-1);
const postcss = require(path.join(pnpmModules, postcssPackage, "node_modules", "postcss"));

const root = path.resolve(__dirname, "..");
const failures = [];

const publicPages = [
  "index.html",
  "run-through.html",
  "demothemis.html",
  "break-the-court.html",
  "predictionmomo.html",
  "bootstrap-loop.html",
  "governance.html",
  "demothemis-mvp.html"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function matches(source, pattern, message) {
  check(pattern.test(source), message);
}

function sectionAfter(source, marker, label) {
  const index = source.indexOf(marker);
  check(index >= 0, `${label} is missing its responsive reading section`);
  return index >= 0 ? source.slice(index) : "";
}

for (const page of publicPages) {
  const html = read(page);
  for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    postcss.parse(style[1], { from: page });
  }
  matches(html, /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width/i, `${page} is missing a responsive viewport`);
  matches(html, /<link\s+rel=["']stylesheet["']\s+href=["']assets\/styles\.css["']/i, `${page} is missing the shared reading stylesheet`);
  matches(html, /<h1\b/i, `${page} is missing its primary heading`);
  check(!/<(?:h1|h2|h3|p)\b[^>]*style=["'][^"']*white-space\s*:\s*nowrap/i.test(html), `${page} forces reader-facing text onto one line`);
}

const shared = read("assets/styles.css");
postcss.parse(shared, { from: "assets/styles.css" });
const sharedReading = sectionAfter(shared, "/* ===== responsive reading system ===== */", "shared chapters");
matches(sharedReading, /body\s*\{[^}]*font-size:\s*1\.125rem[^}]*line-height:\s*1\.72/s, "desktop chapter body scale is missing");
matches(sharedReading, /\.wrap\s*\{[^}]*max-width:\s*45rem/s, "chapter reading measure must stay near 45rem");
matches(sharedReading, /\.hero h1\s*\{[^}]*font-size:\s*3\.5rem[^}]*line-height:\s*1\.08/s, "desktop chapter title scale is missing");
matches(sharedReading, /@media\s*\(max-width:\s*720px\)[\s\S]*?body\s*\{[^}]*font-size:\s*1\.0875rem/s, "tablet chapter scale is missing");
matches(sharedReading, /@media\s*\(max-width:\s*480px\)[\s\S]*?body\s*\{[^}]*font-size:\s*1\.0625rem/s, "phone chapter scale is missing");
matches(sharedReading, /body \*\s*\{[^}]*letter-spacing:\s*0\s*!important/s, "chapter typography must use neutral tracking");
matches(sharedReading, /\.btn,[\s\S]*?min-height:\s*2\.75rem/s, "shared controls need a 44px interaction floor");
check(!/font-size\s*:\s*clamp\(/i.test(sharedReading), "the final chapter reading scale must use discrete type steps");

const index = read("index.html");
matches(index, /@media\s*\(max-width:\s*640px\)\s*\{\s*\.products\s*\{[^}]*grid-template-columns:\s*1fr/s, "home product cards do not stack on phones");

const runThrough = read("run-through.html");
const runReading = sectionAfter(runThrough, "/* Responsive reading guardrails", "run-through");
matches(runReading, /--product-text-caption:\s*\.78rem/, "simulator caption floor is too small");
matches(runReading, /--product-text-meta:\s*\.84rem/, "simulator metadata floor is too small");
matches(runReading, /--product-text-body:\s*\.9rem/, "simulator explanatory copy floor is too small");
matches(runThrough, /@media\s*\(max-width:\s*920px\)[\s\S]*?\.machine-phase-grid\s*\{\s*grid-template-columns:\s*1fr/s, "state phases do not stack at tablet width");
matches(runThrough, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.machine-state-row\.is-branch\s*\{\s*grid-template-columns:\s*1fr/s, "state branches do not stack on narrow phones");
matches(runThrough, /@container\s+run-stage\s*\(max-width:\s*620px\)/, "simulator is missing its tablet container layout");
matches(runThrough, /@container\s+run-stage\s*\(max-width:\s*380px\)/, "simulator is missing its narrow container layout");
check(!/font-size\s*:\s*clamp\(/i.test(runReading), "the final simulator reading scale must use discrete type steps");

const demoThemis = read("demothemis.html");
matches(demoThemis, /@media\s*\(max-width:\s*880px\)[^}]*\.simple-grid[\s\S]*?grid-template-columns:\s*1fr/, "DemoThemis card grids do not stack at tablet width");
matches(demoThemis, /\.dial-wrap\s*\{[^}]*overflow-x:\s*auto/s, "DemoThemis data table lacks horizontal containment");
matches(demoThemis, /\.simple-step p,[\s\S]*?font-size:\s*\.92rem/s, "DemoThemis diagram explanations are undersized");

const gameLab = read("break-the-court.html");
matches(gameLab, /@media\s*\(max-width:\s*880px\)\s*\{\s*\.lab-grid\s*\{\s*grid-template-columns:\s*1fr/s, "game lab columns do not stack at tablet width");
matches(gameLab, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.scoreboard\s*\{\s*grid-template-columns:\s*1fr/s, "game lab scores do not stack on narrow phones");
matches(gameLab, /\.node p,[\s\S]*?font-size:\s*\.86rem[^}]*line-height:\s*1\.55/s, "game lab explanations are undersized");

const market = read("predictionmomo.html");
matches(market, /\.parts-wrap\s*\{[^}]*overflow-x:\s*auto/s, "market comparison table lacks horizontal containment");
matches(market, /@media\s*\(max-width:\s*700px\)\s*\{\s*\.oracle-case-grid\s*\{\s*grid-template-columns:\s*1fr/s, "market evidence cards do not stack on phones");
matches(market, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.pmbtns\s*\{[^}]*grid-template-columns:\s*1fr/s, "market action buttons do not stack on narrow phones");

const bootstrap = read("bootstrap-loop.html");
matches(bootstrap, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.test-path\s*\{\s*grid-template-columns:\s*1fr/s, "bootstrap test path does not stack on narrow phones");

const governance = read("governance.html");
matches(governance, /\.vals-wrap\s*\{[^}]*overflow-x:\s*auto/s, "governance table lacks horizontal containment");
matches(governance, /@media\s*\(max-width:\s*760px\)\s*\{\s*\.houses\s*\{\s*grid-template-columns:\s*1fr/s, "governance houses do not stack at tablet width");

const appCss = read("DemoThemisMVP/web/src/app/globals.css");
const appReading = sectionAfter(appCss, "Responsive reading system", "unified app");
matches(appReading, /body\s*\{[^}]*font-size:\s*1rem[^}]*line-height:\s*1\.6/s, "unified app body scale is missing");
matches(appReading, /\.court-page \.text-xs,[\s\S]*?font-size:\s*0\.8rem/s, "protected court microcopy floor is missing");
matches(appReading, /\.court-page \[class\*='text-\[9px\]'\],[\s\S]*?font-size:\s*0\.8rem\s*!important/s, "protected court arbitrary-size utilities evade the reading floor");
matches(appReading, /\.oracle-hero h1\s*\{[^}]*font-size:\s*3\.85rem[^}]*line-height:\s*1\.04/s, "oracle desktop title scale is missing");
matches(appReading, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.oracle-proof-stack\s*\{[^}]*grid-template-columns:\s*1fr/s, "oracle proof cards do not stack on phones");
matches(appReading, /\.oracle-proof-card small,[\s\S]*?display:\s*block/s, "oracle proof explanations remain hidden on phones");
matches(appReading, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.court-case-facts\s*\{\s*grid-template-columns:\s*1fr/s, "court fact strips do not stack on phones");
matches(appReading, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.juror-local-progress\s*\{\s*grid-template-columns:\s*1fr/s, "juror progress does not stack on narrow phones");
for (const width of [1040, 820, 680, 420]) {
  matches(appReading, new RegExp(`@media\\s*\\(max-width:\\s*${width}px\\)`), `unified app is missing its ${width}px reading breakpoint`);
}
check(!/font-size\s*:\s*clamp\(/i.test(appReading), "the final unified app scale must use discrete type steps");

const sandboxCss = read("DemoThemisMVP/web/src/app/sandbox/sandbox.css");
const sandboxReading = sectionAfter(sandboxCss, "/* ---- responsive reading system", "sandbox");
matches(sandboxReading, /\.sbx\s*\{[^}]*font-size:\s*1\.0625rem[^}]*line-height:\s*1\.68/s, "sandbox desktop scale is missing");
matches(sandboxReading, /\.sbx-mission-brief p,[\s\S]*?font-size:\s*0\.84rem/s, "sandbox mission guidance is undersized");
matches(sandboxReading, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.sbx-headline-score\s*\{\s*grid-template-columns:\s*1fr/s, "sandbox score controls do not stack on narrow phones");
check(!/font-size\s*:\s*clamp\(/i.test(sandboxReading), "the final sandbox scale must use discrete type steps");

if (failures.length) {
  console.error(`Reading layout audit failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Reading layout audit passed for ${publicPages.length} public pages and all unified app surfaces.`);
