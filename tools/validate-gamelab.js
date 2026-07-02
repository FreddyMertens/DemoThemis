const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "game-theory.html");
const assumptionsPath = path.join(root, "assumptions.js");
const html = fs.readFileSync(htmlPath, "utf8");
const assumptions = fs.readFileSync(assumptionsPath, "utf8");

const failures = [];

function fail(message) {
  failures.push(message);
}

function extractRangeInputs(source) {
  const inputs = {};
  const re = /<input\s+id="([^"]+)"\s+type="range"\s+min="([^"]+)"\s+max="([^"]+)"\s+step="([^"]+)"\s+value="([^"]+)"/g;
  let match;
  while ((match = re.exec(source))) {
    inputs[match[1]] = {
      min: Number(match[2]),
      max: Number(match[3]),
      step: Number(match[4]),
      value: Number(match[5])
    };
  }
  return inputs;
}

function extractPresetObject(source) {
  const match = source.match(/var sets = (\{[\s\S]*?\n\s{4}\});/);
  if (!match) {
    fail("Could not find preset object in game-theory.html");
    return {};
  }
  return Function(`"use strict"; return (${match[1]});`)();
}

function extractAssumptionList(source) {
  const match = source.match(/var ASSUMPTIONS = (\[[\s\S]*?\n\]);/);
  if (!match) {
    fail("Could not find ASSUMPTIONS list in assumptions.js");
    return [];
  }
  return Function(`"use strict"; return (${match[1]});`)();
}

function checkRangeValue(name, key, value, range) {
  if (typeof value !== "number") return;
  if (value < range.min || value > range.max) {
    fail(`Preset "${name}" sets ${key}=${value}, outside [${range.min}, ${range.max}]`);
  }
  const steps = (value - range.min) / range.step;
  if (Math.abs(steps - Math.round(steps)) > 1e-8) {
    fail(`Preset "${name}" sets ${key}=${value}, which does not align to step ${range.step}`);
  }
}

const ranges = extractRangeInputs(html);
const presets = extractPresetObject(html);
const assumptionList = extractAssumptionList(assumptions);
const defaultAssumptions = Object.fromEntries(assumptionList.map((item) => [item.id, item.default]));
const requiredIds = [
  "tabPlay",
  "tabStress",
  "tabUnder",
  "weakestOut",
  "weakestSub",
  "stressOut",
  "stressSub",
  "confidenceOut",
  "confidenceSub",
  "stressScore",
  "stressWeakest",
  "stressHeadline",
  "stressCopy",
  "stressList"
];
const attackIds = ["bloc", "bribe", "rental", "lazy", "grief", "drift"];

requiredIds.forEach((id) => {
  if (!html.includes(`id="${id}"`)) fail(`Missing gamelab UX element: #${id}`);
});

attackIds.forEach((id) => {
  ["Chip", "Why", "Break", "Margin", "Explain"].forEach((suffix) => {
    if (!html.includes(`id="${id}${suffix}"`)) fail(`Missing attack card field: #${id}${suffix}`);
  });
  if (html.includes(`id="${id}Txt"`)) fail(`Stale attack paragraph remains: #${id}Txt`);
});

[
  "STRESS_CASES",
  "Current board",
  "Cold start",
  "Demand surge",
  "Whale case",
  "Bloc pressure",
  "Juror drift",
  "Appeal pressure",
  "Break the locks"
].forEach((term) => {
  if (!html.includes(term)) fail(`Missing stress-check term: ${term}`);
});

Object.entries(presets).forEach(([name, preset]) => {
  Object.entries(preset).forEach(([key, value]) => {
    if (ranges[key]) checkRangeValue(name, key, value, ranges[key]);
  });
});

if (
  defaultAssumptions.appealDelayRate * defaultAssumptions.petitionMultiplier <
  defaultAssumptions.griefDelayRate * (1 - defaultAssumptions.finalityAuditDrag)
) {
  fail("Default appeal delay rent does not cover the default griefer delay value");
}

if (!html.includes('<script src="assumptions.js"></script>')) {
  fail("game-theory.html must load assumptions.js before the lab script");
}

if (/window\.ASSUMPTIONS\s*=\s*\[/.test(html)) {
  fail("game-theory.html still contains an inline ASSUMPTIONS block");
}

[
  "False assertions",
  "false assertion",
  "watcher EV",
  "watch cost",
  "challenge rate",
  "curated outcomes",
  "public outcomes"
].forEach((term) => {
  if (html.includes(term)) fail(`Stale model term remains in game-theory.html: ${term}`);
});

[
  "Derived from",
  "Estimated from",
  "Modeled on",
  "Corrected from",
  "Real-world",
  "real networks",
  "estimated payout percentage"
].forEach((term) => {
  if (assumptions.includes(term)) fail(`Unsupported empirical wording remains in assumptions.js: ${term}`);
});

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Gamelab validation passed.");
