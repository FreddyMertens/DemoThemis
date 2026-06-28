const fs = require('fs');

let content = fs.readFileSync('game-theory.html', 'utf8');

const rewrites = {
  // Traffic and volume
  flow: "The total dollar value of ordinary cases expected to arrive in court each month.",
  stake: "The typical dollar amount at risk in a contested case.",
  challenge: "The percentage of total case flow that escalates to court instead of settling quietly.",
  lag: "The number of weeks an appeal delays final settlement, locking up staked funds.",
  
  // Base economics
  fee: "The percentage fee taken from settlements to fund juror pay, rewards, and operations.",
  payShare: "The percentage of the settlement fee distributed directly to jurors as base pay.",
  rewardShare: "The percentage of the settlement fee distributed to a pool to reward high-quality jurors over time.",
  
  // Jurors and pools
  jurors: "The total number of active, retained jurors available in the system.",
  skill: "The probability that a careful juror will vote correctly on a case.",
  careless: "The extra mistake rate caused by lazy jurors voting randomly or carelessly.",
  slash: "The percentage of a juror's staked funds they lose if they vote on the wrong side.",
  
  // Attack vectors
  bloc: "The number of coordinated human attackers trying to capture a panel.",
  rented: "The number of honest juror accounts that attackers have secretly rented.",
  rerolls: "The number of times a panel is redrawn to prevent attackers from predicting the outcome.",
  watchCost: "The dollar cost for an independent watcher to monitor one settlement window.",
  falseRate: "The percentage of settlements where someone attempts to slip through a false assertion.",
  
  // Advanced Assummptions (Detailed accuracy pass)
  reserveFloorVotes: "The minimum pending votes per juror we assume exist, even during low volume, for modeling purposes.",
  reserveElasticity: "How aggressively the required reserve scales up when pending votes pile onto each retained juror.",
  lazyShortcutShare: "The percentage of normal pay a lazy juror expects to earn while skipping the effort to review the case.",
  reserveExitBurden: "The number of locked pending votes a juror will tolerate before they start quitting the system.",
  reserveExitSharpness: "How rapidly the pool of jurors shrinks once the reserve burden exceeds the exit tolerance.",
  reserveExitMax: "The maximum percentage of the juror pool that can be priced out by excessive reserve burden.",
  
  faceSurvival: "The percentage of rented credentials that successfully bypass liveness/face checks to vote.",
  ballotResidualRisk: "The leftover risk of bribery coordination even when ballots are receipt-free.",
  unsealedBribeScale: "How much bribery risk scales up if attackers can cryptographically verify how people voted.",
  bribeClearRisk: "The probability a bribe succeeds when it costs less than the contested stake.",
  
  drawPoolShare: "The percentage of retained jurors who are actually online, eligible, and reachable for a draw.",
  seniorPoolShare: "The percentage of retained jurors who have enough history to sit on the largest panels.",
  parallelPanels: "The minimum number of separate panels that must agree to finalize an outcome.",
  
  assertionWatchMultiple: "How many times larger the assertion bond must be compared to the cost of watching a window.",
  assertionStakeShare: "The minimum assertion bond required, expressed as a percentage of the contested stake.",
  watcherCurve: "A friction metric; higher values mean expected watcher profit attracts capacity more slowly.",
  watcherBaseCapacity: "The number of settlement windows the watcher network can cover when bounty matches cost.",
  watcherCapacityElasticity: "How rapidly watcher capacity scales up as the expected bounty exceeds the watch cost.",
  assertionImpactScale: "How severely the frequency of escaped false assertions degrades the system's overall safety score.",
  
  keyUsableShare: "The percentage of quiet settlements that survive curation and spot checks to grade jurors.",
  consentedTestShare: "The percentage of contested cases used as private tests to grade jurors with their consent.",
  keyScaleFloor: "The minimum number of test cases required before juror grading produces reliable anti-drift signals.",
  keyJurorShare: "The ratio of usable keys needed relative to the juror supply before drift signals become strong.",
  reputationSkillLift: "The slight increase in overall panel accuracy gained from weighting experienced, high-reputation jurors.",
  
  rewardEligibleShare: "The percentage of retained jurors who meet the quality threshold to receive reward pool payouts.",
  rewardRetentionCredit: "How effectively long-term rewards offset the frustration of carrying unpaid reserve burdens.",
  rewardRetentionLift: "The extra retention stability gained from rewarding high-quality jurors over time.",
  rewardSkillLift: "The slight increase in carefulness motivated by rewarding high-quality jurors over time.",
  rewardSignalScale: "The threshold of reward income (relative to base pay) needed before retention benefits materialize.",
  
  appealCaptureMultiplier: "How much the appeal floor is multiplied to price in the risk of panel capture.",
  appealDelayRate: "The weekly stake percentage charged to someone imposing a delay via appeals.",
  griefDelayRate: "The weekly stake percentage an attacker is assumed to gain by dragging out a case.",
  petitionMultiplier: "The friction multiplier applied when the loser attempts to appeal to the next rung.",
  finalityAuditDrag: "The reduction in an attacker's griefing value caused by post-finality accountability audits.",
  
  captureWeight: "How aggressively panel capture risk degrades the illustrative safety index.",
  bribeWeight: "How aggressively bribery risk degrades the illustrative safety index.",
  rentalWeight: "How aggressively rented-seat risk degrades the illustrative safety index.",
  lazyWeight: "How aggressively lazy-juror risk degrades the illustrative safety index.",
  assertionWeight: "How aggressively false-assertion risk degrades the illustrative safety index.",
  griefWeight: "How aggressively appeal-grief risk degrades the illustrative safety index.",
  driftWeight: "How aggressively juror-drift risk degrades the illustrative safety index.",
  clearPenalty: "The hard penalty applied to cap the safety index if any attack vector succeeds completely."
};

Object.keys(rewrites).forEach(id => {
  const regex = new RegExp(`({[^}]*id:\\s*"${id}"[^}]*copy:\\s*")[^"]+(".*})`, 'g');
  content = content.replace(regex, `$1${rewrites[id]}$2`);
});

fs.writeFileSync('game-theory.html', content);
console.log('Rewrote tooltips in game-theory.html for extreme accuracy and clarity.');
