const fs = require('fs');

let content = fs.readFileSync('break-the-court.html', 'utf8');

const rewrites = {
  flow: "The total dollar amount of court cases expected to happen every month.",
  stake: "The typical amount of money fought over in a single court case.",
  challenge: "The percentage of all conflicts that actually end up going to court.",
  lag: "The number of weeks the system waits for an appeal before settling a case.",
  fee: "The percentage fee taken from settlements to fund the system.",
  payShare: "The percentage of the court fee that goes directly to pay the jurors.",
  rewardShare: "The percentage of the court fee set aside to reward good jurors over time.",
  jurors: "The total number of active jurors available to be drawn for cases.",
  skill: "How often careful jurors vote correctly (e.g., 68% of the time).",
  careless: "The extra mistake rate added by lazy or careless jurors.",
  slash: "The percentage of a juror's staked money they lose if they vote incorrectly.",
  bloc: "The number of coordinated attackers trying to rig the system.",
  rented: "The number of honest juror accounts that attackers have secretly rented.",
  rerolls: "The number of times the system redraws a panel if it looks suspicious.",
  watchCost: "The cost for a watcher to monitor one settlement window for errors.",
  falseRate: "The percentage of settlements that contain a false assertion.",
  
  reserveFloorVotes: "The minimum amount of pending votes we assume exist even when the system is quiet.",
  reserveElasticity: "How quickly the required reserve grows when the system gets busy.",
  lazyShortcutShare: "How much money a lazy juror can still make without doing real work.",
  reserveExitBurden: "How much unpaid work a juror will tolerate before they quit.",
  reserveExitSharpness: "How quickly jurors quit once the workload becomes too high.",
  reserveExitMax: "The maximum percentage of jurors who might quit due to high workload.",
  
  faceSurvival: "The percentage of rented accounts that can pass a face scan and still vote.",
  ballotResidualRisk: "The leftover risk of bribery even when votes are hidden.",
  unsealedBribeScale: "How much risk increases if attackers can verify how people voted.",
  bribeClearRisk: "The risk level when a bribe is cheaper than the money being fought over.",
  
  drawPoolShare: "The percentage of jurors who are actually online and ready to be picked.",
  seniorPoolShare: "The percentage of jurors who have enough experience for large panels.",
  parallelPanels: "The minimum number of separate panels required to agree on a result.",
  
  assertionWatchMultiple: "How much larger the watcher bond must be compared to the cost of watching.",
  assertionStakeShare: "The minimum bond required to make a claim, as a percentage of the total stake.",
  watcherCurve: "How hard it is to get more watchers even if the rewards are high.",
  watcherBaseCapacity: "The number of cases the watcher network can handle normally.",
  watcherCapacityElasticity: "How quickly the watcher network grows when rewards increase.",
  assertionImpactScale: "How much damage escaping false claims do to the system's safety score.",
  
  keyUsableShare: "The percentage of quiet cases that can actually be used to grade jurors.",
  consentedTestShare: "The percentage of extra test cases used to grade jurors with their permission.",
  keyScaleFloor: "The minimum number of test cases needed before grading starts to matter.",
  keyJurorShare: "How many test cases are needed per juror to prevent them from drifting.",
  reputationSkillLift: "The slight increase in accuracy gained from experienced, high-reputation jurors.",
  
  rewardEligibleShare: "The percentage of jurors who qualify for the long-term reward pool.",
  rewardRetentionCredit: "How much long-term rewards help convince jurors not to quit.",
  rewardRetentionLift: "The extra loyalty gained from paying good jurors over time.",
  rewardSkillLift: "The slight increase in carefulness from rewarding good jurors.",
  rewardSignalScale: "How much reward money is needed before it actually starts helping retention.",
  
  appealCaptureMultiplier: "How much an appeal costs compared to the risk of a rigged panel.",
  appealDelayRate: "The weekly fee charged to someone dragging out a case via appeals.",
  griefDelayRate: "How much an attacker benefits from dragging out a case.",
  petitionMultiplier: "The extra friction added when a loser tries to appeal again.",
  finalityAuditDrag: "How much later audits reduce the value of a rigged case.",
  
  captureWeight: "How much panel rigging lowers the system's overall safety score.",
  bribeWeight: "How much bribery lowers the system's overall safety score.",
  rentalWeight: "How much rented accounts lower the system's overall safety score.",
  lazyWeight: "How much lazy voting lowers the system's overall safety score.",
  assertionWeight: "How much false claims lower the system's overall safety score.",
  griefWeight: "How much appeal griefing lowers the system's overall safety score.",
  driftWeight: "How much juror drift lowers the system's overall safety score.",
  clearPenalty: "The maximum penalty applied to the safety score when an attack succeeds."
};

Object.keys(rewrites).forEach(id => {
  const regex = new RegExp(`({[^}]*id:\\s*"${id}"[^}]*copy:\\s*")[^"]+(".*})`, 'g');
  content = content.replace(regex, `$1${rewrites[id]}$2`);
});

fs.writeFileSync('break-the-court.html', content);
console.log('Rewrote tooltips in break-the-court.html');
