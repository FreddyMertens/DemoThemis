(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DemoThemisPanelPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var VERSION = "adaptive-reference-v2";
  var DEFAULTS = Object.freeze({
    status: "provisional calibration — governance ratification required",
    probabilityCeiling: 0.01,
    expectedLossBudget: 100,
    qualityFloor: 0.90,
    formationFloor: 0.999,
    standbyRatio: 0.20,
    standbyMinimum: 2,
    noShowRate: 0.05,
    commonErrorRate: 0.02,
    publishedAttackerShare: 0.25
  });

  var CANDIDATES = Object.freeze([
    Object.freeze({ id: "p7", label: "7 seats", panelSize: 7, panelCount: 1, requiredPanels: 1, totalSeats: 7 }),
    Object.freeze({ id: "p15", label: "15 seats", panelSize: 15, panelCount: 1, requiredPanels: 1, totalSeats: 15 }),
    Object.freeze({ id: "p31", label: "31 seats", panelSize: 31, panelCount: 1, requiredPanels: 1, totalSeats: 31 }),
    Object.freeze({ id: "p31x3", label: "3 × 31 seats", panelSize: 31, panelCount: 3, requiredPanels: 2, totalSeats: 93 }),
    Object.freeze({ id: "p31x5", label: "5 × 31 seats", panelSize: 31, panelCount: 5, requiredPanels: 3, totalSeats: 155 })
  ]);

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function finite(value) { return typeof value === "number" && isFinite(value); }
  function candidateById(id) {
    for (var i = 0; i < CANDIDATES.length; i += 1) if (CANDIDATES[i].id === id) return CANDIDATES[i];
    return null;
  }
  function nextCandidate(id) {
    for (var i = 0; i < CANDIDATES.length - 1; i += 1) if (CANDIDATES[i].id === id) return CANDIDATES[i + 1];
    return null;
  }

  function logGamma(z) {
    var coefficients = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    var g = 7;
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    var x = coefficients[0];
    for (var i = 1; i < g + 2; i += 1) x += coefficients[i] / (z + i);
    var t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function logChoose(n, k) {
    if (k < 0 || k > n || n < 0) return -Infinity;
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  }
  function hypergeometricProbability(population, successes, draws, selectedSuccesses) {
    population = Math.round(population);
    successes = Math.round(successes);
    draws = Math.round(draws);
    selectedSuccesses = Math.round(selectedSuccesses);
    if (population < 0 || successes < 0 || successes > population || draws < 0 || draws > population) return 0;
    if (selectedSuccesses < Math.max(0, draws - (population - successes)) || selectedSuccesses > Math.min(draws, successes)) return 0;
    return Math.exp(logChoose(successes, selectedSuccesses) + logChoose(population - successes, draws - selectedSuccesses) - logChoose(population, draws));
  }
  function hypergeometricTail(population, successes, draws, need) {
    var sum = 0;
    var maximum = Math.min(Math.round(successes), Math.round(draws));
    for (var i = Math.max(0, Math.round(need)); i <= maximum; i += 1) sum += hypergeometricProbability(population, successes, draws, i);
    return clamp(sum, 0, 1);
  }

  function hypergeometricDistribution(population, successes, draws) {
    var lower = Math.max(0, draws - (population - successes));
    var upper = Math.min(draws, successes);
    var distribution = [];
    if (lower > upper) return distribution;
    var probability = hypergeometricProbability(population, successes, draws, lower);
    distribution.push({ selected: lower, probability: probability });
    for (var selected = lower; selected < upper; selected += 1) {
      var numerator = (successes - selected) * (draws - selected);
      var denominator = (selected + 1) * (population - successes - draws + selected + 1);
      probability = denominator > 0 ? probability * numerator / denominator : 0;
      distribution.push({ selected: selected + 1, probability: probability });
    }
    return distribution;
  }

  function exactDisjointControlProbability(population, attackers, candidate) {
    candidate = typeof candidate === "string" ? candidateById(candidate) : candidate;
    population = Math.round(population);
    attackers = Math.round(attackers);
    if (!candidate || population < candidate.totalSeats || attackers < 0 || attackers > population) return null;
    var majority = Math.floor(candidate.panelSize / 2) + 1;
    var states = new Map();
    states.set(attackers + "|0", 1);
    for (var panelIndex = 0; panelIndex < candidate.panelCount; panelIndex += 1) {
      var remainingPopulation = population - panelIndex * candidate.panelSize;
      var next = new Map();
      states.forEach(function (stateProbability, key) {
        var parts = key.split("|");
        var remainingAttackers = Number(parts[0]);
        var controlled = Number(parts[1]);
        var distribution = hypergeometricDistribution(remainingPopulation, remainingAttackers, candidate.panelSize);
        for (var drawIndex = 0; drawIndex < distribution.length; drawIndex += 1) {
          var selected = distribution[drawIndex].selected;
          var probability = distribution[drawIndex].probability;
          if (!probability) continue;
          var nextControlled = controlled + (selected >= majority ? 1 : 0);
          var nextKey = (remainingAttackers - selected) + "|" + nextControlled;
          next.set(nextKey, (next.get(nextKey) || 0) + stateProbability * probability);
        }
      });
      states = next;
    }
    var result = 0;
    states.forEach(function (probability, key) {
      if (Number(key.split("|")[1]) >= candidate.requiredPanels) result += probability;
    });
    return clamp(result, 0, 1);
  }

  function binomialTail(trials, need, probability) {
    trials = Math.round(trials);
    need = Math.round(need);
    probability = clamp(probability, 0, 1);
    if (need <= 0) return 1;
    if (need > trials) return 0;
    if (probability === 0) return 0;
    if (probability === 1) return 1;
    var sum = 0;
    for (var i = need; i <= trials; i += 1) sum += Math.exp(logChoose(trials, i) + i * Math.log(probability) + (trials - i) * Math.log(1 - probability));
    return clamp(sum, 0, 1);
  }

  function correctDecisionProbability(candidate, individualAccuracy, commonErrorRate) {
    candidate = typeof candidate === "string" ? candidateById(candidate) : candidate;
    if (!candidate || !finite(individualAccuracy) || !finite(commonErrorRate)) return null;
    individualAccuracy = clamp(individualAccuracy, 0, 1);
    commonErrorRate = clamp(commonErrorRate, 0, 1);
    var panelCorrect = binomialTail(candidate.panelSize, Math.floor(candidate.panelSize / 2) + 1, individualAccuracy);
    var rulingSetCorrect = binomialTail(candidate.panelCount, candidate.requiredPanels, panelCorrect);
    return clamp((1 - commonErrorRate) * rulingSetCorrect, 0, 1);
  }

  function formationProbability(totalSeats, standbySeats, noShowRate) {
    if (!finite(totalSeats) || !finite(standbySeats) || !finite(noShowRate)) return null;
    totalSeats = Math.round(totalSeats);
    standbySeats = Math.round(standbySeats);
    if (totalSeats <= 0 || standbySeats < 0 || noShowRate < 0 || noShowRate >= 1) return null;
    return binomialTail(totalSeats + standbySeats, totalSeats, 1 - noShowRate);
  }

  function requiredStandbys(totalSeats, settings) {
    var standbys = Math.max(settings.standbyMinimum, Math.ceil(totalSeats * settings.standbyRatio));
    var hardLimit = Math.max(standbys, totalSeats * 2);
    while (standbys < hardLimit && formationProbability(totalSeats, standbys, settings.noShowRate) < settings.formationFloor) standbys += 1;
    return standbys;
  }

  function settingsFrom(input) {
    input = input || {};
    return {
      probabilityCeiling: finite(input.probabilityCeiling) ? input.probabilityCeiling : DEFAULTS.probabilityCeiling,
      expectedLossBudget: finite(input.expectedLossBudget) ? input.expectedLossBudget : DEFAULTS.expectedLossBudget,
      qualityFloor: finite(input.qualityFloor) ? input.qualityFloor : DEFAULTS.qualityFloor,
      formationFloor: finite(input.formationFloor) ? input.formationFloor : DEFAULTS.formationFloor,
      standbyRatio: finite(input.standbyRatio) ? input.standbyRatio : DEFAULTS.standbyRatio,
      standbyMinimum: finite(input.standbyMinimum) ? Math.round(input.standbyMinimum) : DEFAULTS.standbyMinimum,
      noShowRate: finite(input.noShowRate) ? input.noShowRate : DEFAULTS.noShowRate,
      commonErrorRate: finite(input.commonErrorRate) ? input.commonErrorRate : DEFAULTS.commonErrorRate
    };
  }

  function validateInputs(exposure, context, settings) {
    var reasons = [];
    if (!finite(exposure) || exposure <= 0) reasons.push("Locked exposure must be a positive finite amount.");
    if (!context || !finite(context.eligibleCount) || context.eligibleCount < 0) reasons.push("The conservative eligible cohort is unavailable.");
    if (!context || !finite(context.individualAccuracy) || context.individualAccuracy < 0 || context.individualAccuracy > 1) reasons.push("Individual accuracy must be between zero and one.");
    if (!context || typeof context.feeFeasible !== "boolean") reasons.push("Deterministic fee funding must be verified before selection.");
    if (!finite(settings.probabilityCeiling) || settings.probabilityCeiling <= 0 || settings.probabilityCeiling > 1) reasons.push("The probability ceiling is invalid.");
    if (!finite(settings.expectedLossBudget) || settings.expectedLossBudget <= 0) reasons.push("The expected-loss budget is invalid.");
    if (!finite(settings.qualityFloor) || settings.qualityFloor <= 0 || settings.qualityFloor > 1) reasons.push("The quality floor is invalid.");
    if (!finite(settings.formationFloor) || settings.formationFloor <= 0 || settings.formationFloor > 1) reasons.push("The formation floor is invalid.");
    if (!finite(settings.noShowRate) || settings.noShowRate < 0 || settings.noShowRate >= 1) reasons.push("The no-show assumption is invalid.");
    if (!finite(settings.commonErrorRate) || settings.commonErrorRate < 0 || settings.commonErrorRate > 1) reasons.push("The shared-error assumption is invalid.");
    if (!finite(settings.standbyRatio) || settings.standbyRatio < 0) reasons.push("The standby ratio is invalid.");
    if (!finite(settings.standbyMinimum) || settings.standbyMinimum < 0) reasons.push("The standby minimum is invalid.");
    return reasons;
  }

  function evaluateCandidate(input, candidate) {
    input = input || {};
    candidate = typeof candidate === "string" ? candidateById(candidate) : candidate;
    var context = input.context || input;
    var settings = settingsFrom(input.settings || input);
    var exposure = input.exposure;
    var invalid = validateInputs(exposure, context, settings);
    if (!candidate) invalid.push("The ruling-set candidate is unknown.");
    if (invalid.length) return { policyVersion: VERSION, candidate: candidate || null, passes: false, invalid: true, failureReasons: invalid };

    var eligibleCount = Math.floor(context.eligibleCount);
    var standbys = requiredStandbys(candidate.totalSeats, settings);
    var requiredCapacity = candidate.totalSeats + standbys;
    var capacityPass = eligibleCount >= requiredCapacity;
    var scenarios = Array.isArray(context.scenarios) && context.scenarios.length ? context.scenarios : [{ id: "stated", label: "Stated attack scenario", attackerCount: context.attackerCount }];
    var scenarioResults = [];
    var scenarioInvalid = false;
    scenarios.forEach(function (scenario, index) {
      var attackerCount = scenario && finite(scenario.attackerCount) ? Math.round(scenario.attackerCount) : NaN;
      if (!finite(attackerCount) || attackerCount < 0 || attackerCount > eligibleCount) {
        scenarioInvalid = true;
        scenarioResults.push({ id: scenario && scenario.id || "scenario-" + index, label: scenario && scenario.label || "Scenario " + (index + 1), attackerCount: attackerCount, probability: null });
        return;
      }
      scenarioResults.push({
        id: scenario.id || "scenario-" + index,
        label: scenario.label || scenario.id || "Scenario " + (index + 1),
        attackerCount: attackerCount,
        probability: capacityPass ? exactDisjointControlProbability(eligibleCount, attackerCount, candidate) : null
      });
    });
    if (scenarioInvalid) return { policyVersion: VERSION, candidate: candidate, passes: false, invalid: true, failureReasons: ["One or more published attack scenarios are invalid."], scenarios: scenarioResults };

    var worstScenario = null;
    scenarioResults.forEach(function (scenario) {
      if (scenario.probability !== null && (!worstScenario || scenario.probability > worstScenario.probability)) worstScenario = scenario;
    });
    var worstCapture = worstScenario ? worstScenario.probability : null;
    var riskLimit = Math.min(settings.probabilityCeiling, settings.expectedLossBudget / exposure);
    var quality = correctDecisionProbability(candidate, context.individualAccuracy, settings.commonErrorRate);
    var formation = formationProbability(candidate.totalSeats, standbys, settings.noShowRate);
    var feeFeasible = context.feeFeasible === true;
    var capturePass = worstCapture !== null && worstCapture <= riskLimit;
    var qualityPass = quality !== null && quality >= settings.qualityFloor;
    var formationPass = formation !== null && formation >= settings.formationFloor;
    var failures = [];
    if (!capacityPass) failures.push("Needs " + requiredCapacity + " eligible jurors including " + standbys + " deterministic standbys; only " + eligibleCount + " are available.");
    if (capacityPass && !capturePass) failures.push("Worst-case panel control exceeds the published risk limit.");
    if (!qualityPass) failures.push("Modeled correct-ruling probability is below the quality floor.");
    if (!formationPass) failures.push("Modeled panel formation is below the finality floor.");
    if (!feeFeasible) failures.push("The deterministic fee cannot fully fund this ruling set.");

    return {
      policyVersion: VERSION,
      candidate: candidate,
      passes: capacityPass && capturePass && qualityPass && formationPass && feeFeasible,
      invalid: false,
      exposure: exposure,
      eligibleCount: eligibleCount,
      standbySeats: standbys,
      requiredCapacity: requiredCapacity,
      spareEligibleSeats: eligibleCount - requiredCapacity,
      riskLimit: riskLimit,
      worstCapture: worstCapture,
      expectedCorruptedValue: worstCapture === null ? null : worstCapture * exposure,
      worstScenario: worstScenario,
      scenarios: scenarioResults,
      quality: quality,
      formation: formation,
      feeFeasible: feeFeasible,
      requiredFee: finite(context.requiredFee) ? context.requiredFee : null,
      feeCap: finite(context.feeCap) ? context.feeCap : null,
      checks: { capacity: capacityPass, capture: capturePass, quality: qualityPass, formation: formationPass, fee: feeFeasible },
      failureReasons: failures
    };
  }

  function selectConfiguration(input) {
    input = input || {};
    var contexts = input.candidateContexts || {};
    var evaluations = [];
    var selected = null;
    for (var i = 0; i < CANDIDATES.length; i += 1) {
      var candidate = CANDIDATES[i];
      var context = contexts[candidate.id] || input.context || {};
      var evaluation = evaluateCandidate({ exposure: input.exposure, context: context, settings: input.settings || input }, candidate);
      evaluations.push(evaluation);
      if (!selected && evaluation.passes) selected = evaluation;
    }
    var invalid = evaluations.some(function (evaluation) { return evaluation.invalid; });
    return {
      policyVersion: VERSION,
      status: selected ? "SELECTED" : "SECURE_PANEL_UNAVAILABLE",
      selected: selected,
      evaluations: evaluations,
      invalid: invalid,
      failureReasons: selected ? [] : (invalid ? ["Inputs are incomplete or invalid; the case cannot open."] : ["No legal ruling set satisfies every published gate; the case cannot open."])
    };
  }

  function nextAppealConfiguration(currentId, input) {
    var next = nextCandidate(currentId);
    if (!next) return { policyVersion: VERSION, status: "TERMINAL", selected: null, failureReasons: ["The 5 × 31 ruling set is terminal."] };
    var contexts = input && input.candidateContexts || {};
    var context = contexts[next.id] || input && input.context || {};
    var evaluation = evaluateCandidate({ exposure: input && input.exposure, context: context, settings: input && (input.settings || input) }, next);
    return evaluation.passes
      ? { policyVersion: VERSION, status: "SELECTED", selected: evaluation, failureReasons: [] }
      : { policyVersion: VERSION, status: "SECURE_PANEL_UNAVAILABLE", selected: null, evaluation: evaluation, failureReasons: evaluation.failureReasons.slice() };
  }

  return Object.freeze({
    VERSION: VERSION,
    DEFAULTS: DEFAULTS,
    CANDIDATES: CANDIDATES,
    candidateById: candidateById,
    nextCandidate: nextCandidate,
    hypergeometricProbability: hypergeometricProbability,
    hypergeometricTail: hypergeometricTail,
    exactDisjointControlProbability: exactDisjointControlProbability,
    binomialTail: binomialTail,
    correctDecisionProbability: correctDecisionProbability,
    formationProbability: formationProbability,
    requiredStandbys: requiredStandbys,
    evaluateCandidate: evaluateCandidate,
    selectConfiguration: selectConfiguration,
    nextAppealConfiguration: nextAppealConfiguration
  });
});
