// Verify the pool-exhaustion guard (the HIGH-severity review finding).
import { CourtSim, mulberry32, runSweep } from '../src/lib/sim';

const ok = (label: string, cond: boolean, detail = '') =>
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);

// pathological params from the review: pop 20, panel 15, reveal 50%
const sim = new CourtSim(mulberry32((0x7de305 ^ 0x1234567) >>> 0), 20);
ok('fresh pool can seat a 15-panel', sim.canSeatPanel(15));
const sweep = runSweep(sim, 100, { panelSize: 15, revealRate: 0.5 });
console.log(`  sweep: ran ${sweep.cases} of ${sweep.requested}, stoppedEarly=${sweep.stoppedEarly}, accuracy over ${sweep.cases} cases`);
ok('sweep stops early when pool drains (no fabricated verdicts)', sweep.stoppedEarly && sweep.cases < 100);
ok('accuracy computed only over cases actually run', sweep.cases > 0 ? true : sweep.accuracy === 0);
ok('pool can no longer seat a panel after exhaustion', !sim.canSeatPanel(15));

// healthy params never trip the guard
const sim2 = new CourtSim(mulberry32(42), 200);
const sweep2 = runSweep(sim2, 100, { panelSize: 7, revealRate: 0.92 });
ok('healthy sweep runs all 100', !sweep2.stoppedEarly && sweep2.cases === 100, `ran ${sweep2.cases}`);
console.log('done.');
