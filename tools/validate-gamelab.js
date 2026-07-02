const fs = require("fs");
const path = require("path");
const vm = require("vm");

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
  const match = source.match(/var PRESET_CASES = (\{[\s\S]*?\n\s{2}\});/);
  if (!match) {
    fail("Could not find PRESET_CASES object in game-theory.html");
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

function loadLabModel(htmlSource, assumptionsSource) {
  const scripts = [...htmlSource.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  const labScript = scripts[scripts.length - 1];
  if (!labScript) {
    fail("Could not find gamelab inline script");
    return null;
  }

  const patched = labScript.replace(
    /renderAssumptions\(\);[\s\S]*?if \(typeof window\.initTooltips === 'function'\) window\.initTooltips\(\);\s*\}\)\(\);/,
    "globalThis.__lab = { PRESET_CASES, stateFromPreset, clampModelState, compute, modelState, runStress, attackNarrative, riskText, attackLabel };\n})();"
  );

  if (patched === labScript) {
    fail("Could not instrument gamelab model for preset validation");
    return null;
  }

  const context = { console, window: {} };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(assumptionsSource, context);
  vm.runInContext(patched, context);

  if (!context.__lab) fail("Gamelab model did not expose validation hooks");
  return context.__lab || null;
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
  "Move sliders or turn off locks to make a scenario fail",
  "Current setup",
  "Cold start",
  "Case surge",
  "Huge case",
  "Coordinated attack",
  "Crowd-following",
  "Delay attack"
].forEach((term) => {
  if (!html.includes(term)) fail(`Missing stress-check term: ${term}`);
});

if (html.includes('data-preset="broken"')) {
  fail('Broken-locks failure demo must not appear as a normal Try preset');
}

[
  "Failure demo",
  "Remove safety locks",
  "sanity fail"
].forEach((term) => {
  if (html.includes(term)) fail(`Default scenario checks must not include a forced failure demo: ${term}`);
});

if (!html.includes('id="bloc" type="range" min="0" max="1000"')) {
  fail("Coordinated attackers slider must cap at 1,000");
}

if (/span\([^)]*,\s*100,\s*80000\)|clamp\(s\.jurors,\s*100,\s*80000\)/.test(html)) {
  fail("Gamelab active-juror scale must not exceed 5,000");
}

if (!/\.attack-line\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(html)) {
  fail("Attack-card explanation rows must use a single readable column");
}

if (!/function syncAssumptionOutputs\(\)\s*\{[\s\S]*?updateRangeTrack\(range\)/.test(html)) {
  fail("Assumption sliders must refresh their filled track when their displayed values sync");
}

Object.entries(presets).forEach(([name, preset]) => {
  Object.entries(preset).forEach(([key, value]) => {
    if (ranges[key]) checkRangeValue(name, key, value, ranges[key]);
  });
});

const labModel = loadLabModel(html, assumptions);
if (labModel) {
  Object.keys(presets).forEach((name) => {
    const state = labModel.clampModelState(labModel.stateFromPreset(name));
    const model = labModel.compute(state);
    const verdict = labModel.modelState(model);
    if (verdict.cleared.length) {
      fail(`Preset "${name}" allows attacks to clear: ${verdict.cleared.map(labModel.attackLabel).join(", ")}`);
    }
    attackIds.forEach((id) => {
      const narrative = labModel.attackNarrative(state, model, id);
      if (narrative.clears || narrative.risk > 0.35) {
        fail(`Preset "${name}" does not beat ${id}: ${narrative.clears ? "clears" : "watch"} at ${labModel.riskText(narrative.risk)}`);
      }
    });
    const stress = labModel.runStress(state);
    if (stress.broken) {
      fail(`Preset "${name}" fails ${stress.broken} scenario check${stress.broken === 1 ? "" : "s"}`);
    }
    if (stress.watch) {
      fail(`Preset "${name}" puts ${stress.watch} scenario check${stress.watch === 1 ? "" : "s"} on watch`);
    }
  });
}

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
