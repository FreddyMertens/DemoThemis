const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "break-the-court.html");
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
    fail("Could not find PRESET_CASES object in break-the-court.html");
    return {};
  }
  return Function(`"use strict"; return (${match[1]});`)();
}

function extractVisiblePresetNames(source) {
  return [...source.matchAll(/<button\b[^>]*\bdata-preset="([^"]+)"[^>]*>/g)]
    .filter((match) => /\bclass="[^"]*\bpreset\b[^"]*"/.test(match[0]))
    .map((match) => match[1]);
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

  const startupAnchor = "\n  renderAssumptions();\n  initTabs();";
  const patched = labScript.replace(
    startupAnchor,
    `
  globalThis.__lab = {
    PRESET_CASES,
    STRESS_CASES,
    PROTECTION_BENCHMARKS,
    STRONG_BENCHMARK_RATIO,
    stateFromPreset,
    clampModelState,
    compute,
    modelState,
    runStress,
    stressState,
    attackNarrative,
    attackLabel,
    benchmarkPressure,
    panelFor
  };
  return;${startupAnchor}`
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
  Object.entries(model.benchmarks || {}).forEach(([key, check]) => {
    ["ratio", "actual", "margin", "cost", "benefit"].forEach((field) => {
      const value = check[field];
      if (typeof value === "number" && Number.isFinite(value)) {
        out[`benchmark.${key}.${field}`] = value;
      }
    });
    out[`benchmark.${key}.applicable`] = check.applicable ? 1 : 0;
  });
  return out;
}

const assumptionAffectFields = {
  pricing: ["quotedCaseFee", "requiredCaseFee", "fixedOverheadPerCase", "feeRevenue", "requiredFunding", "processingPool", "operationsPool", "panelCompensation", "rewardTopUp", "supportGap", "effectiveFeeRate"],
  reserve: ["reserve", "reserveUnit", "reservePerPricedVote", "reserveVotes", "reserveBurden", "lazyLoss", "bribeCost", "retentionIncome"],
  lazy: ["lazyIncome", "lazyLoss", "lazyMargin", "lazyRatio", "benchmark.lazy.ratio", "risk.lazy", "clear.lazy"],
  supply: ["effectiveJurors", "drawJurors", "supplyLoss", "retention", "reserveRetention"],
  bribe: ["bribeCost", "bribeBenefit", "bribeMargin", "bribeRatio", "bribeClears", "benchmark.bribe.ratio", "risk.bribe", "clear.bribe"],
  rental: ["rentedPass", "rentalSeats", "baseRentalCapture", "attemptedRentalCapture", "rentalCapture", "benchmark.rental.ratio", "risk.rental", "clear.rental"],
  capture: ["capture", "baseCapture", "attemptedCapture", "benchmark.capture.ratio", "risk.capture", "clear.capture", "drawJurors", "effectiveBloc", "intendedBloc", "coordinatedReady", "rentedPass", "share", "appealFloor"],
  panel: ["panel", "parallelPanels", "correctPanel", "honestPanel", "effectiveSkill", "drawJurors", "risk.capture", "capture"],
  drift: ["keys", "testSeats", "keyScale", "keySignal", "driftRatio", "benchmark.drift.ratio", "effectiveSkill", "risk.drift", "clear.drift"],
  keys: ["keys", "testSeats", "consentedTestCases", "consentedTestSeats", "keySignal", "risk.drift"],
  appeal: ["appealFloor", "panelFloor", "captureFloor", "delayFloor", "griefRatio", "benchmark.grief.ratio", "clear.grief", "risk.grief"],
  grief: ["griefBenefit", "griefMargin", "griefRatio", "appealFloor", "benchmark.grief.ratio", "clear.grief", "risk.grief"],
  safety: ["safety"]
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
    }),
    keyScaleFloor: fromPreset("base", (state) => {
      state.flow = 10000;
      state.stake = 100;
      state.jurors = 100;
      state.syntheticTests = 0;
      state.assumptions.keyJurorShare = 0.1;
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

function stateFor(labModel, name, mutate) {
  const state = cloneState(labModel.stateFromPreset(name));
  if (mutate) mutate(state);
  return labModel.clampModelState(state);
}

function finiteOrInfinity(value) {
  return Number.isFinite(value) || value === Infinity;
}

function assertStrongBenchmark(model, key, label, strongRatio) {
  const check = model.benchmarks && model.benchmarks[key];
  if (!check) {
    fail(`${label} is missing benchmark "${key}"`);
    return;
  }
  if (!check.applicable) {
    fail(`${label} unexpectedly marks benchmark "${key}" as not applicable`);
    return;
  }
  if (!finiteOrInfinity(check.ratio) || check.ratio < strongRatio) {
    fail(`${label} does not hold "${key}" with a strong margin (ratio ${check.ratio})`);
  }
}

function validateProtectionCrossings(labModel) {
  const strongRatio = labModel.STRONG_BENCHMARK_RATIO;
  const controls = [
    {
      label: "one public draw",
      key: "capture",
      preset: "base",
      prepare(state) { state.bloc = 1000; },
      remove(state) { state.lockDraw = false; state.rerolls = 100; }
    },
    {
      label: "ballot privacy",
      key: "bribe",
      preset: "base",
      remove(state) { state.lockBallot = false; }
    },
    {
      label: "live face checks",
      key: "rental",
      preset: "base",
      prepare(state) { state.rented = 1000; },
      remove(state) { state.lockFace = false; }
    },
    {
      label: "pending-pay risk",
      key: "lazy",
      preset: "base",
      remove(state) { state.lockReserve = false; }
    },
    {
      label: "aptitude tests",
      key: "drift",
      preset: "base",
      remove(state) { state.lockKeys = false; state.syntheticTests = 0; }
    },
    {
      label: "appeal pricing",
      key: "grief",
      preset: "base",
      remove(state) { state.lockAppeal = false; }
    }
  ];

  controls.forEach((control) => {
    const protectedState = stateFor(labModel, control.preset, control.prepare);
    const protectedModel = labModel.compute(protectedState);
    assertStrongBenchmark(protectedModel, control.key, `Protected control for ${control.label}`, strongRatio);

    const removedState = cloneState(protectedState);
    control.remove(removedState);
    const removedModel = labModel.compute(labModel.clampModelState(removedState));
    const removedCheck = removedModel.benchmarks && removedModel.benchmarks[control.key];
    if (!removedCheck || !removedCheck.applicable || !finiteOrInfinity(removedCheck.ratio) || removedCheck.ratio >= 1) {
      fail(`Removing ${control.label} does not cross the ${control.key} danger line (ratio ${removedCheck && removedCheck.ratio})`);
    }
  });
}

function validatePanelShortage(labModel) {
  const state = stateFor(labModel, "whale", (candidate) => {
    candidate.jurors = 100;
    candidate.assumptions.drawPoolShare = 0.2;
    candidate.assumptions.seniorPoolShare = 0.15;
  });
  const model = labModel.compute(state);
  if (!model.panelShortage) fail("Panel-shortage test did not create a panel shortage");
  ["baseCapture", "attemptedCapture", "capture", "baseRentalCapture", "attemptedRentalCapture", "rentalCapture", "correctPanel"].forEach((field) => {
    if (model[field] !== null) fail(`Panel shortage must return null for ${field}, received ${model[field]}`);
  });
  if (labModel.modelState(state, model).state !== "bad") {
    fail("Panel shortage must put the model outside its operating range");
  }
}

function validateMonotonicity(labModel) {
  const tolerance = 1e-12;
  function noDecrease(label, low, high) {
    if (low === null || high === null || !finiteOrInfinity(low) || !finiteOrInfinity(high) || high + tolerance < low) {
      fail(`${label} must not decrease (${low} -> ${high})`);
    }
  }
  function noIncrease(label, low, high) {
    if (low === null || high === null || !finiteOrInfinity(low) || !finiteOrInfinity(high) || high > low + tolerance) {
      fail(`${label} must not increase (${low} -> ${high})`);
    }
  }

  const coalitionLow = labModel.compute(stateFor(labModel, "base", (state) => { state.bloc = 300; }));
  const coalitionHigh = labModel.compute(stateFor(labModel, "base", (state) => { state.bloc = 1000; }));
  noDecrease("Coalition-majority chance as recruited attackers rise", coalitionLow.capture, coalitionHigh.capture);

  const retryLow = labModel.compute(stateFor(labModel, "base", (state) => { state.lockDraw = false; state.rerolls = 2; state.bloc = 1000; }));
  const retryHigh = labModel.compute(stateFor(labModel, "base", (state) => { state.lockDraw = false; state.rerolls = 100; state.bloc = 1000; }));
  noDecrease("Coalition-majority chance as draw retries rise", retryLow.capture, retryHigh.capture);

  const rentalLow = labModel.compute(stateFor(labModel, "base", (state) => { state.lockFace = false; state.rented = 100; }));
  const rentalHigh = labModel.compute(stateFor(labModel, "base", (state) => { state.lockFace = false; state.rented = 1000; }));
  noDecrease("Rental-majority chance as unchecked rentals rise", rentalLow.rentalCapture, rentalHigh.rentalCapture);

  const testsLow = labModel.compute(stateFor(labModel, "base", (state) => { state.syntheticTests = 0; }));
  const testsHigh = labModel.compute(stateFor(labModel, "base", (state) => { state.syntheticTests = 10000; }));
  noDecrease("Independent-test signal as graded seats rise", testsLow.keySignal, testsHigh.keySignal);

  const skillLow = labModel.compute(stateFor(labModel, "base", (state) => { state.skill = 0.52; }));
  const skillHigh = labModel.compute(stateFor(labModel, "base", (state) => { state.skill = 0.88; }));
  noDecrease("Correct-majority chance as individual accuracy rises", skillLow.correctPanel, skillHigh.correctPanel);
  const lowQualityState = stateFor(labModel, "base", (state) => { state.skill = 0.52; });
  if (labModel.modelState(lowQualityState, skillLow).state !== "bad") {
    fail("A correct-majority estimate below the operating floor must prevent an overall robust verdict");
  }
  const highQualityState = stateFor(labModel, "base", (state) => { state.skill = 0.88; });
  if (labModel.modelState(highQualityState, skillHigh).state !== "good") {
    fail("A high-quality panel with strong attack benchmarks should receive a strong verdict");
  }

  const reserveLow = labModel.compute(stateFor(labModel, "base", (state) => { state.assumptions.reservePayMultiple = 3; }));
  const reserveHigh = labModel.compute(stateFor(labModel, "base", (state) => { state.assumptions.reservePayMultiple = 9; }));
  noDecrease("Lazy-vote coverage as pending-pay exposure rises", reserveLow.lazyRatio, reserveHigh.lazyRatio);
  noDecrease("Bribe coverage as pending-pay exposure rises", reserveLow.bribeRatio, reserveHigh.bribeRatio);

  const appealLow = labModel.compute(stateFor(labModel, "base", (state) => { state.assumptions.appealDelayRate = 0.004; }));
  const appealHigh = labModel.compute(stateFor(labModel, "base", (state) => { state.assumptions.appealDelayRate = 0.016; }));
  noDecrease("Appeal-delay coverage as appeal pricing rises", appealLow.griefRatio, appealHigh.griefRatio);

  const privateModel = labModel.compute(stateFor(labModel, "base", (state) => { state.lockBallot = true; }));
  const publicModel = labModel.compute(stateFor(labModel, "base", (state) => { state.lockBallot = false; }));
  noIncrease("Receipt-enforceable bribe benefit with ballot privacy enabled", publicModel.bribeBenefit, privateModel.bribeBenefit);
}

function validateAdaptivePricing(labModel) {
  const easy = labModel.compute(stateFor(labModel, "base", (state) => { state.complexity = 0.75; }));
  const hard = labModel.compute(stateFor(labModel, "base", (state) => { state.complexity = 2; }));
  if (hard.requiredCaseFee <= easy.requiredCaseFee) fail("Higher case complexity must raise the required court fee");

  const wideSupply = labModel.compute(stateFor(labModel, "base", (state) => { state.jurors = 5000; }));
  const thinSupply = labModel.compute(stateFor(labModel, "base", (state) => { state.jurors = 100; }));
  if (thinSupply.panelCompensation <= wideSupply.panelCompensation) fail("Thinner eligible juror supply must raise required panel compensation");

  const emptyReserve = labModel.compute(stateFor(labModel, "base", (state) => { state.reserveCoverage = 0; }));
  const fullReserve = labModel.compute(stateFor(labModel, "base", (state) => { state.reserveCoverage = 1.5; }));
  if (emptyReserve.reserveTopUpPerCase <= 0 || Math.abs(fullReserve.reserveTopUpPerCase) > 1e-9) {
    fail("Reward-pool top-up must be positive below target and zero at or above target");
  }

  const base = labModel.compute(stateFor(labModel, "base"));
  if (base.fixedOverheadPerCase >= base.requiredCaseFee) fail("Fixed processing and operations overhead must remain below the full court fee");
  if (base.operationsPerCase > defaultAssumptions.operationsCaseCap + 1e-9) fail("Operations charge exceeds its per-case cap");

  const underpricedState = stateFor(labModel, "base", (state) => {
    state.stake = 100;
    state.fee = 0.005;
    state.caseHours = 4;
    state.complexity = 2;
  });
  const underpriced = labModel.compute(underpricedState);
  if (underpriced.supportGapPerCase <= 0 || labModel.modelState(underpricedState, underpriced).state !== "bad") {
    fail("A quote above the fee ceiling must expose a support gap and leave the modeled operating range");
  }
}

const ranges = extractRangeInputs(html);
const presets = extractPresetObject(html);
const visiblePresetNames = extractVisiblePresetNames(html);
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
  ["Chip", "Why", "Break", "Margin"].forEach((suffix) => {
    if (!html.includes(`id="${id}${suffix}"`)) fail(`Missing attack card field: #${id}${suffix}`);
  });
  if (html.includes(`id="${id}Txt"`)) fail(`Stale attack paragraph remains: #${id}Txt`);
});

if (!html.includes("var STRESS_CASES")) fail("Missing fixed STRESS_CASES definitions");

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

  const presetNames = Object.keys(presets);
  const expectedPresets = ["base", "cold", "surge", "whale", "bloc", "drift"];
  if (presetNames.length !== expectedPresets.length || expectedPresets.some((name) => !presetNames.includes(name))) {
    fail(`PRESET_CASES must be exactly: ${expectedPresets.join(", ")}`);
  }
  if (visiblePresetNames.length !== expectedPresets.length || expectedPresets.some((name) => !visiblePresetNames.includes(name))) {
    fail(`Visible preset buttons must be exactly: ${expectedPresets.join(", ")}`);
  }
  presetNames.forEach((name) => {
    const state = labModel.clampModelState(labModel.stateFromPreset(name));
    const model = labModel.compute(state);
    const verdict = labModel.modelState(state, model);
    if (verdict.state !== "good") {
      fail(`Visible preset "${name}" must be strong, received ${verdict.state} at ${verdict.top.ratio}x on ${verdict.top.key}`);
    }
    if (verdict.teaching) fail(`Visible preset "${name}" unexpectedly disables a required protection`);
    if (model.panelShortage || model.appealPanelShortage) {
      fail(`Visible preset "${name}" cannot form ${model.panelShortage ? "its current" : "its appeal"} panel`);
    }
    Object.entries(model.benchmarks).forEach(([key, check]) => {
      if (check.applicable && (!finiteOrInfinity(check.ratio) || check.ratio < labModel.STRONG_BENCHMARK_RATIO)) {
        fail(`Visible preset "${name}" lacks a strong ${key} margin (ratio ${check.ratio})`);
      }
    });
    attackIds.forEach((id) => {
      const narrative = labModel.attackNarrative(state, model, id);
      if (!narrative || !narrative.check) fail(`Visible preset "${name}" has no benchmark narrative for ${id}`);
    });
  });

  const stress = labModel.runStress();
  const expectedStressIds = ["cold", "surge", "whale", "bloc", "drift", "appeal"];
  const stressIds = stress.rows.map((row) => row.config.id);
  if (stress.rows.length !== expectedStressIds.length || expectedStressIds.some((id) => !stressIds.includes(id))) {
    fail(`Fixed stress cases must be exactly: ${expectedStressIds.join(", ")}`);
  }
  stress.rows.forEach((row) => {
    if (row.state.state !== "good") {
      fail(`Fixed stress case "${row.config.id}" must be strong, received ${row.state.state} at ${row.state.top.ratio}x on ${row.state.top.key}`);
    }
    Object.entries(row.model.benchmarks).forEach(([key, check]) => {
      if (check.applicable && (!finiteOrInfinity(check.ratio) || check.ratio < labModel.STRONG_BENCHMARK_RATIO)) {
        fail(`Fixed stress case "${row.config.id}" lacks a strong ${key} margin (ratio ${check.ratio})`);
      }
    });
  });
  if (stress.broken || stress.watch || stress.held !== 6) {
    fail(`Fixed stress summary must report 6/6 strong; received held=${stress.held}, watch=${stress.watch}, broken=${stress.broken}`);
  }

  validateProtectionCrossings(labModel);
  validatePanelShortage(labModel);
  validateMonotonicity(labModel);
  validateAdaptivePricing(labModel);

  Object.entries(labModel.PROTECTION_BENCHMARKS).forEach(([key, definition]) => {
    if (!definition.label || !["max", "cover", "min"].includes(definition.kind)) {
      fail(`Protection benchmark "${key}" needs a supported kind and readable label`);
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
  fail("break-the-court.html must load assumptions.js before the lab script");
}

if (/window\.ASSUMPTIONS\s*=\s*\[/.test(html)) {
  fail("break-the-court.html still contains an inline ASSUMPTIONS block");
}

[
  "False assertions",
  "false assertion",
  "watcher EV",
  "watch cost",
  "challenge rate",
  "quiet settlement",
  "quietCase",
  "curated outcomes",
  "public outcomes"
].forEach((term) => {
  if (html.includes(term)) fail(`Stale model term remains in break-the-court.html: ${term}`);
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
