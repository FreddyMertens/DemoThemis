const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "game-theory.html");
const assumptionsPath = path.join(root, "assumptions.js");
const commonPath = path.join(root, "assets", "common.js");
const buildPath = path.join(root, "tools", "build-site.js");
const html = fs.readFileSync(htmlPath, "utf8");
const assumptions = fs.readFileSync(assumptionsPath, "utf8");
const common = fs.readFileSync(commonPath, "utf8");
const buildScript = fs.readFileSync(buildPath, "utf8");

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
    /renderAssumptions\(\);[\s\S]*?setPreset\("base"\);\s*syncAttackSelection\(\);[\s\S]*?\}\)\(\);\s*$/,
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

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function outputVector(model) {
  const out = {};
  Object.entries(model).forEach(([key, value]) => {
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    if (typeof value === "boolean") out[key] = value ? 1 : 0;
  });
  Object.entries(model.risks || {}).forEach(([key, value]) => {
    if (typeof value === "number" && Number.isFinite(value)) out[`risk.${key}`] = value;
  });
  Object.entries(model.clears || {}).forEach(([key, value]) => {
    out[`clear.${key}`] = value ? 1 : 0;
  });
  return out;
}

const assumptionAffectFields = {
  reserve: ["reserve", "reserveVotes", "reserveBurden", "lazyLoss", "bribeCost", "retentionIncome"],
  lazy: ["lazyIncome", "lazyLoss", "lazyMargin", "risk.lazy", "clear.lazy", "safety"],
  supply: ["effectiveJurors", "drawJurors", "supplyLoss", "retention", "reserveRetention"],
  bribe: ["bribeCost", "bribeClears", "risk.bribe", "clear.bribe", "clearSeverity", "clearCap", "safety"],
  rental: ["rentedPass", "risk.rental", "clear.rental", "safety"],
  capture: ["capture", "baseCapture", "attemptedCapture", "risk.capture", "clear.capture", "drawJurors", "effectiveBloc", "intendedBloc", "coordinatedReady", "rentedPass", "share", "appealFloor"],
  panel: ["panel", "parallelPanels", "honestPanel", "effectiveSkill", "drawJurors", "risk.capture", "capture"],
  drift: ["keys", "keyScale", "keySignal", "effectiveSkill", "risk.drift", "clear.drift", "safety"],
  keys: ["keys", "consentedTests", "keySignal", "risk.drift"],
  appeal: ["appealFloor", "clear.grief", "risk.grief", "safety"],
  grief: ["griefBenefit", "appealFloor", "clear.grief", "risk.grief", "safety"],
  safety: ["safety", "clearCap", "clearSeverity"]
};

function fieldChanged(before, after, field) {
  const a = before[field] || 0;
  const b = after[field] || 0;
  const delta = Math.abs(a - b);
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return delta > Math.max(1e-9, scale * 1e-7);
}

function assumptionMovesAffect(labModel, contexts, assumption, affect) {
  const fields = assumptionAffectFields[affect];
  if (!fields) {
    fail(`Assumption "${assumption.id}" lists unknown affect tag "${affect}"`);
    return true;
  }

  const variants = [
    ["low", assumption.low],
    ["high", assumption.high],
    ["min", assumption.min],
    ["max", assumption.max]
  ].filter(([, value]) => typeof value === "number" && Math.abs(value - assumption.default) > 1e-12);

  return Object.values(contexts).some((context) => {
    const before = outputVector(labModel.compute(context));
    return variants.some(([, value]) => {
      const changed = cloneState(context);
      changed.assumptions[assumption.id] = value;
      const after = outputVector(labModel.compute(labModel.clampModelState(changed)));
      return fields.some((field) => fieldChanged(before, after, field));
    });
  });
}

function buildSensitivityContexts(labModel) {
  function fromPreset(name, mutate) {
    const state = labModel.clampModelState(labModel.stateFromPreset(name));
    if (mutate) mutate(state);
    return labModel.clampModelState(state);
  }

  return {
    base: fromPreset("base"),
    cold: fromPreset("cold"),
    surge: fromPreset("surge"),
    whale: fromPreset("whale"),
    bloc: fromPreset("bloc"),
    drift: fromPreset("drift"),
    rented: fromPreset("base", (state) => { state.rented = 5000; }),
    ballotOpenButCostly: fromPreset("base", (state) => {
      state.lockBallot = false;
      state.fee = 0.005;
      state.careless = 0.1;
      state.slash = 0.25;
      state.lag = 8;
      state.assumptions.reserveFloorVotes = 1;
      state.assumptions.reserveElasticity = 1;
    }),
    bribeClear: fromPreset("whale", (state) => {
      state.lockBallot = false;
      state.stake = 5000000;
    }),
    capturePressure: fromPreset("whale", (state) => {
      state.bloc = 1000;
      state.rented = 3000;
      state.lockFace = true;
    }),
    drawReroll: fromPreset("base", (state) => {
      state.lockDraw = false;
      state.rerolls = 80;
      state.bloc = 1000;
      state.rented = 2000;
    }),
    appealPressure: fromPreset("whale", (state) => {
      state.bloc = 1000;
      state.rented = 3000;
      state.lag = 8;
      state.assumptions.griefDelayRate = 0.02;
    }),
    lazyPressure: fromPreset("surge", (state) => {
      state.careless = 0.5;
      state.lag = 8;
    }),
    noKeys: fromPreset("drift", (state) => {
      state.syntheticTests = 0;
      state.flow = 10000;
    })
  };
}

function validateAssumptionEffects(labModel) {
  const contexts = buildSensitivityContexts(labModel);
  assumptionList.forEach((assumption) => {
    if (!Array.isArray(assumption.affects) || !assumption.affects.length) {
      fail(`Assumption "${assumption.id}" must list at least one affected output`);
      return;
    }
    assumption.affects.forEach((affect) => {
      if (!assumptionMovesAffect(labModel, contexts, assumption, affect)) {
        fail(`Assumption "${assumption.id}" says it changes "${affect}", but no matching model output moved in sensitivity checks`);
      }
    });
  });
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

if (/unpkg\.com/.test(html) || /unpkg\.com/.test(common) || /unpkg\.com/.test(buildScript)) {
  fail("Public gamelab files must use local vendored tooltip assets, not unpkg");
}

[
  "assets/vendor/popper-2.11.8.min.js",
  "assets/vendor/tippy-6.3.7.umd.min.js",
  "assets/vendor/tippy-6.3.7.css",
  "assets/vendor/tippy-shift-away-6.3.7.css"
].forEach((asset) => {
  if (!html.includes(asset) && !buildScript.includes(asset)) {
    fail(`Vendored tooltip asset is not referenced by gamelab/build files: ${asset}`);
  }
});

if (/allowHTML\s*:\s*true/.test(common) || /allowHTML\s*:\s*true/.test(html)) {
  fail("Tooltip HTML rendering must stay disabled for static data-tooltip content");
}

if (/\.innerHTML\s*=/.test(common)) {
  fail("Shared site chrome should build DOM nodes directly instead of assigning innerHTML");
}

Object.entries(presets).forEach(([name, preset]) => {
  Object.entries(preset).forEach(([key, value]) => {
    if (ranges[key]) checkRangeValue(name, key, value, ranges[key]);
  });
});

const labModel = loadLabModel(html, assumptions);
if (labModel) {
  validateAssumptionEffects(labModel);
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
