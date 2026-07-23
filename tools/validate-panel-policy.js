const assert = require("assert");
const policy = require("../assets/panel-policy.js");

const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }
function close(actual, expected, tolerance, message) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) failures.push(`${message}: expected ${expected}, received ${actual}`);
}

function combinations(values, choose) {
  const out = [];
  function walk(start, picked) {
    if (picked.length === choose) { out.push(picked.slice()); return; }
    for (let index = start; index <= values.length - (choose - picked.length); index += 1) {
      picked.push(values[index]); walk(index + 1, picked); picked.pop();
    }
  }
  walk(0, []);
  return out;
}

function bruteDisjoint(population, attackers, candidate) {
  const people = Array.from({ length: population }, (_, index) => index);
  const attackerSet = new Set(people.slice(0, attackers));
  let favorable = 0;
  let total = 0;
  const majority = Math.floor(candidate.panelSize / 2) + 1;
  function draw(remaining, panelIndex, controlled) {
    if (panelIndex === candidate.panelCount) {
      total += 1;
      if (controlled >= candidate.requiredPanels) favorable += 1;
      return;
    }
    combinations(remaining, candidate.panelSize).forEach((panel) => {
      const selected = new Set(panel);
      const attackerSeats = panel.filter((person) => attackerSet.has(person)).length;
      draw(remaining.filter((person) => !selected.has(person)), panelIndex + 1, controlled + (attackerSeats >= majority ? 1 : 0));
    });
  }
  draw(people, 0, 0);
  return favorable / total;
}

check(policy.VERSION === "adaptive-reference-v2", "Policy version must be explicit and stable");
check(Object.isFrozen(policy.CANDIDATES) && Object.isFrozen(policy.DEFAULTS), "Published policy records must be immutable");
check(policy.CANDIDATES.map((candidate) => candidate.id).join(",") === "p7,p15,p31,p31x3,p31x5", "Candidate order must remain strictly 7 → 15 → 31 → 3×31 → 5×31");
check(policy.candidateById("p31x3").requiredPanels === 2 && policy.candidateById("p31x5").requiredPanels === 3, "Parallel decisions must use 2-of-3 and 3-of-5 panel majorities");

const miniature = { id: "mini", label: "3×3", panelSize: 3, panelCount: 3, requiredPanels: 2, totalSeats: 9 };
close(policy.exactDisjointControlProbability(10, 4, miniature), bruteDisjoint(10, 4, miniature), 1e-12, "Exact disjoint dynamic program must match brute-force enumeration");
close(policy.exactDisjointControlProbability(30, 8, policy.candidateById("p7")), policy.hypergeometricTail(30, 8, 7, 4), 1e-12, "Single-panel control must match the hypergeometric tail");

function contexts(eligibleCount, attackerShare, accuracy, feeFeasible = true) {
  const result = {};
  policy.CANDIDATES.forEach((candidate) => {
    const eligible = candidate.panelSize === 31 ? Math.floor(eligibleCount * 0.75) : eligibleCount;
    result[candidate.id] = {
      eligibleCount: eligible,
      individualAccuracy: accuracy,
      feeFeasible,
      scenarios: [{ id: "published", label: "Published envelope", attackerCount: Math.ceil(eligible * attackerShare) }]
    };
  });
  return result;
}

const low = policy.selectConfiguration({ exposure: 100, candidateContexts: contexts(800, 0.10, 0.80) });
check(low.status === "SELECTED" && low.selected.candidate.id === "p7", "A low-risk fixture should select the first passing configuration");

const exposures = [100, 100000, 1000000, 100000000];
let previousRank = -1;
exposures.forEach((exposure) => {
  const result = policy.selectConfiguration({ exposure, candidateContexts: contexts(2000, 0.20, 0.82) });
  const rank = result.selected ? policy.CANDIDATES.findIndex((candidate) => candidate.id === result.selected.candidate.id) : policy.CANDIDATES.length;
  check(rank >= previousRank, `Raising exposure must not select a weaker configuration at ${exposure}`);
  previousRank = rank;
});

const attackerCases = [0.05, 0.10, 0.20, 0.30, 0.49];
previousRank = -1;
attackerCases.forEach((share) => {
  const result = policy.selectConfiguration({ exposure: 1000000, candidateContexts: contexts(2000, share, 0.82) });
  const rank = result.selected ? policy.CANDIDATES.findIndex((candidate) => candidate.id === result.selected.candidate.id) : policy.CANDIDATES.length;
  check(rank >= previousRank, `Raising attacker weight must not select a weaker configuration at ${share}`);
  previousRank = rank;
});

const invalid = policy.selectConfiguration({ exposure: 0, candidateContexts: contexts(800, 0.10, 0.80) });
check(invalid.status === "SECURE_PANEL_UNAVAILABLE" && invalid.invalid && !invalid.selected, "Zero or unverifiable exposure must fail closed");

const missingFeeEvidence = policy.evaluateCandidate({ exposure: 1000, context: { eligibleCount: 800, individualAccuracy: 0.90, scenarios: [{ attackerCount: 10 }] } }, "p7");
check(missingFeeEvidence.invalid && !missingFeeEvidence.passes, "Missing fee-funding evidence must fail closed");

const captured = policy.selectConfiguration({ exposure: 1000000, candidateContexts: contexts(2000, 0.50, 0.85) });
check(captured.status === "SECURE_PANEL_UNAVAILABLE" && !captured.selected, "A cohort at 50% attacker weight must not receive an unsafe fallback");

const shortage = policy.evaluateCandidate({ exposure: 1000, context: { eligibleCount: 7, individualAccuracy: 0.90, feeFeasible: true, scenarios: [{ attackerCount: 0 }] } }, "p7");
check(!shortage.passes && !shortage.checks.capacity && shortage.requiredCapacity > 7, "Capacity must include deterministic standbys");
check(shortage.formation >= policy.DEFAULTS.formationFloor, "Standby calculation must meet the published formation floor before capacity is tested");

const feeFailure = policy.selectConfiguration({ exposure: 1000, candidateContexts: contexts(800, 0.05, 0.90, false) });
check(feeFailure.status === "SECURE_PANEL_UNAVAILABLE" && feeFailure.evaluations.every((evaluation) => !evaluation.checks.fee), "An unfunded panel must fail independently of security");

const first = JSON.stringify(policy.selectConfiguration({ exposure: 500000, candidateContexts: contexts(1200, 0.18, 0.84) }));
const second = JSON.stringify(policy.selectConfiguration({ exposure: 500000, candidateContexts: contexts(1200, 0.18, 0.84) }));
check(first === second, "Identical frozen inputs must produce byte-for-byte identical results");

const terminal = policy.nextAppealConfiguration("p31x5", { exposure: 1000, candidateContexts: contexts(2000, 0.05, 0.90) });
check(terminal.status === "TERMINAL", "5×31 must be the terminal appeal rung");
const appeal = policy.nextAppealConfiguration("p15", { exposure: 1000, candidateContexts: contexts(2000, 0.05, 0.90) });
check(!appeal.selected || appeal.selected.candidate.id === "p31", "An appeal may only advance to the immediate stronger rung");

if (failures.length) {
  console.error(`Panel policy validation failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Panel policy validation passed (${policy.VERSION}; exact finite-pool math, fail-closed selection, monotonicity, capacity, fees, and appeals)`);
