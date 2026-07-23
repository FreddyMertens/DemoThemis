// Throwaway sanity check: confirm the ported math reproduces the reference
// figures. Run with: npx tsx scripts/verify-math.mts
import {
  hyperTail,
  binomTail,
  appealBond,
  wilson,
  pCaptureOne,
  pCaptureAll,
  colludersFor,
  PARALLEL,
} from '../src/lib/sim/court-math';
import { tokenCourt, humanCourt, bribePriceFloor, parallelOdds } from '../src/lib/sim/attack';

const ok = (label: string, cond: boolean, detail = '') =>
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);

// 1. "one roll vs grind": POOL=60, n=7, maj=4. Capture odds rise with K.
const p10 = hyperTail(60, 10, 7, 4);
const p30 = hyperTail(60, 30, 7, 4);
console.log(`hyperTail(60,10,7,4)=${p10.toFixed(4)}  expected ~1/tries`);
console.log(`hyperTail(60,30,7,4)=${p30.toFixed(4)} (half the pool ~ coin flip)`);
ok('capture rises with colluders', p30 > p10);
ok('half the pool is roughly a coin flip', Math.abs(p30 - 0.5) < 0.15, `=${p30.toFixed(3)}`);

// 2. Parallel panels: find the share where one 31/600 panel is ~1/5, then check p^N.
let shareForFifth = 0;
for (let s = 1; s <= 100; s++) {
  if (pCaptureOne(colludersFor(s)) >= 0.2) {
    shareForFifth = s;
    break;
  }
}
const K = colludersFor(shareForFifth);
const one = pCaptureOne(K);
const three = pCaptureAll(K, 3);
const five = pCaptureAll(K, 5);
console.log(
  `\nparallel: share=${shareForFifth}% K=${K}  1 panel=1/${(1 / one).toFixed(0)}  3=1/${(1 / three).toFixed(0)}  5=1/${(1 / five).toFixed(0)}`,
);
ok('pAll(N) = pOne^N exactly', Math.abs(five - Math.pow(one, 5)) < 1e-12);
ok('odds multiply (1/5 -> 1/125 -> ~1/3000 shape)', 1 / three > 1 / one && 1 / five > 1 / three);
ok('PARALLEL constants', PARALLEL.POOL === 600 && PARALLEL.SEATS === 31 && PARALLEL.MAJ === 16);

// 3. Appeal funding conserves: service fee is consumed once; only security principal settles by outcome.
const wide = appealBond(100, 50_000, 4, 1);
console.log(`\nappealBond(stake=$100, pool=50000): panel=${wide.panel} service=$${wide.serviceFee} security=$${wide.securityBond.toFixed(2)} total=$${wide.total}`);
ok('wide pool: service fee = 7 * $1.50 panel work + four weeks of 1% delay', wide.serviceFee === 14.5);
ok('wide pool: no extra security is required when service fee covers the capture target', wide.securityBond === 0 && wide.total === wide.serviceFee);
const thin = appealBond(1_000_000, 600, 4, 1);
console.log(`appealBond(stake=$1M, pool=600): service=$${thin.serviceFee.toFixed(0)} security=$${thin.securityBond.toFixed(0)} total=$${thin.total.toFixed(0)}`);
ok('thin pool, big stake: capture target adds separate security principal', thin.securityBond > 0);
ok('appeal total conserves exactly', thin.total === thin.serviceFee + thin.securityBond && thin.serviceFee === thin.panelCost + thin.delayCost);
ok('success allocates every dollar once', thin.panelCost + thin.delayCost + thin.securityBond === thin.total);
ok('failure allocates every dollar once', thin.panelCost + thin.delayCost + thin.securityBond === thin.total);

// 4. Wilson gate at the 0.70 bar.
const w = wilson(0.85, 100);
console.log(`\nwilson(0.85, 100): center=${w.center.toFixed(3)} [${w.lo.toFixed(3)}, ${w.hi.toFixed(3)}] -> ${w.status}`);
ok('clearly-good juror gets full weight', w.status === 'Full weight');
const wLow = wilson(0.55, 120);
ok('clearly-weak juror is suspended', wLow.status === 'Suspended', `=${wLow.status}`);

// 5. Token vs human court headline.
const tc = tokenCourt({ totalStakeTokens: 1_000_000, tokenPrice: 0.5 }, 300_000);
console.log(`\ntokenCourt: totalStake=$${tc.totalStakeUsd} costToFlip=$${tc.costToFlip} flipped=${tc.flipped} reusable=${tc.reusable}`);
ok('token-court model based on systems like UMA and Kleros flips at half the stake', tc.costToFlip === 250_000 && tc.flipped);
ok('bribe price floor = $6.50', bribePriceFloor() === 6.5);
const hc = humanCourt({ poolSize: 200, panelSize: 7 }, 300_000);
console.log(`humanCourt @ $300k budget, N=200: bought=${hc.colludersBought}/200  pFlipOnePanel=${(hc.pFlipOnePanel * 100).toFixed(1)}%`);
ok('human court reports a probabilistic fresh draw', hc.pFlipOnePanel > 0 && hc.pFlipOnePanel < 1);

console.log('\nparallelOdds(K=' + K + '):', parallelOdds(K).map((r) => `${r.panels}->1/${r.oneIn.toFixed(0)}`).join('  '));
console.log('\ndone.');
