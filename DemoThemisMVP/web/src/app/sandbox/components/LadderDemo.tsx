'use client';

import { useMemo, useState } from 'react';
import { appealBond, courtMoney, ladderRungs, nearTieDiscount, panelFor, pctText } from '@/lib/sim';
import { Slider, Verdict, Widget } from './primitives';

// The reference appeal-bond widget's exact slider mappings, so the numbers match
// the pitch site (hybrid-juror-system.html stakeVal/poolVal).
const stakeVal = (s: number) => 100 * Math.pow(10, (s / 100) * 5); // $100 .. $10M
const poolVal = (s: number) => Math.round(1000 * Math.pow(50, s / 100)); // 1k .. 50k

export function LadderDemo() {
  const [stakeS, setStakeS] = useState(55);
  const [poolS, setPoolS] = useState(40);
  const [marginS, setMarginS] = useState(15); // 0 = dead tie, 100 = unanimous

  const stake = stakeVal(stakeS);
  const pool = poolVal(poolS);
  const margin01 = marginS / 100;

  const bond = useMemo(() => appealBond(stake, pool), [stake, pool]);
  const tie = useMemo(
    () => nearTieDiscount(bond.bond, bond.capFloor, margin01),
    [bond, margin01],
  );
  const rungs = useMemo(() => ladderRungs(pool), [pool]);
  const activePanel = panelFor(stake);

  const floorMax = Math.max(bond.panelCost, bond.capFloor, 1);

  return (
    <Widget title="The dispute ladder: escalating panels, priced bonds">
      <p className="sbx-prose">
        A losing party can appeal into a larger panel: 7, then 15, then 31 seats. The rung bond is the
        larger of two live floors, the cost to seat the next panel and the cost to price out a capture
        attempt, so appealing is always open to an honest dissenter but never cheap for an attacker.
      </p>

      <div className="sbx-controls">
        <Slider
          label="Case value at stake"
          value={stakeS}
          min={0}
          max={100}
          step={1}
          onChange={setStakeS}
          display={courtMoney(stake)}
        />
        <Slider
          label="Juror pool width"
          value={poolS}
          min={0}
          max={100}
          step={1}
          onChange={setPoolS}
          display={pool.toLocaleString('en-US')}
        />
        <Slider
          label="Verdict margin (left = near tie, right = unanimous)"
          value={marginS}
          min={0}
          max={100}
          step={1}
          onChange={setMarginS}
          display={marginS === 0 ? 'dead tie' : `${marginS}% margin`}
        />
      </div>

      {/* the three rungs */}
      <div className="sbx-panels" style={{ marginBottom: '1rem' }}>
        {rungs.map((r) => (
          <div key={r.panel} className={`sbx-ppanel ${r.panel === activePanel ? 'held' : ''}`}>
            <div className="ph">
              <span>{r.panel} seats</span>
              <span className="pv">{courtMoney(r.example.bond)}</span>
            </div>
            <div className="sbx-sans" style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
              {r.band}
              {r.panel === activePanel ? ' (this case)' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* the two floors for the active rung */}
      <h3>This rung&apos;s bond</h3>
      <div className="sbx-row" style={{ marginBottom: '.3rem' }}>
        <label>Juror-cost floor (seat the next {bond.panel})</label>
        <b>{courtMoney(bond.panelCost)}</b>
      </div>
      <div className="sbx-fillbar" style={{ height: 26, marginBottom: '.5rem' }}>
        <div className="fill" style={{ width: `${Math.max((bond.panelCost / floorMax) * 100, 4)}%`, background: 'var(--accent)' }} />
      </div>
      <div className="sbx-row" style={{ marginBottom: '.3rem' }}>
        <label>Anti-re-roll floor (price out a capture, {pctText(bond.odds)} odds)</label>
        <b>{courtMoney(bond.capFloor)}</b>
      </div>
      <div className="sbx-fillbar" style={{ height: 26 }}>
        <div className="fill bad" style={{ width: `${Math.max((bond.capFloor / floorMax) * 100, bond.capFloor > 0 ? 4 : 0)}%` }} />
      </div>

      <div className="sbx-readout" style={{ marginTop: '1rem' }}>
        <div className="sbx-stat">
          <div className="k">Rung bond (max of the floors)</div>
          <div className="v accent">{courtMoney(bond.bond)}</div>
        </div>
        <div className="sbx-stat">
          <div className="k">After near-tie discount</div>
          <div className="v">{courtMoney(tie.discountedBond)}</div>
        </div>
        <div className="sbx-stat">
          <div className="k">Discount factor</div>
          <div className="v">{Math.round(tie.factor * 100)}%</div>
        </div>
      </div>

      <p className="sbx-note">
        {bond.capFloor <= bond.panelCost ? (
          <>
            The pool is wide enough that capturing a panel is hopeless, so the capture floor rounds
            away and the bond is just the {courtMoney(bond.panelCost)} it costs to seat the next
            panel. An honest dissenter can always afford to appeal.
          </>
        ) : (
          <>
            This pool is thin enough that a bloc could swing a panel, so the capture floor climbs to
            price the attack out at <b>{courtMoney(bond.bond)}</b>. Widen the pool and it falls back
            toward the {courtMoney(bond.panelCost)} cost of the next panel.
          </>
        )}{' '}
        The near-tie discount makes a close verdict cheaper to appeal{' '}
        {tie.clampedToFloor ? (
          <>but it is clamped up to the anti-re-roll floor, so a near-capture cannot be re-rolled cheaply.</>
        ) : (
          <>down to {courtMoney(tie.discountedBond)}, because a near-tie is uncertain by its nature.</>
        )}
      </p>

      {/* two unsynchronized clocks */}
      <h3 style={{ marginTop: '1.4rem' }}>Two clocks, unsynchronized</h3>
      <div className="sbx-compare" style={{ marginTop: '.6rem' }}>
        <div className="sbx-col">
          <h4>
            <span>Appeal window</span>
            <Verdict level="mid">open</Verdict>
          </h4>
          <div className="sbx-fillbar" style={{ height: 22 }}>
            <div className="fill" style={{ width: '62%', background: 'var(--accent)' }} />
          </div>
          <p className="sbx-sans" style={{ fontSize: '.84rem', color: 'var(--muted)', margin: '.5rem 0 0' }}>
            Time left to bond an appeal into the next panel. It resets each rung.
          </p>
        </div>
        <div className="sbx-col">
          <h4>
            <span>Settlement clock</span>
            <Verdict level="good">running</Verdict>
          </h4>
          <div className="sbx-fillbar" style={{ height: 22 }}>
            <div className="fill good" style={{ width: '38%' }} />
          </div>
          <p className="sbx-sans" style={{ fontSize: '.84rem', color: 'var(--muted)', margin: '.5rem 0 0' }}>
            Time until funds finalize if no appeal lands. It runs on its own schedule.
          </p>
        </div>
      </div>
      <p className="sbx-note">
        The two clocks run on different schedules on purpose. An attacker cannot line up the moment an
        appeal closes with the moment funds finalize, so there is no single instant to race.
      </p>
      <p className="sbx-note warn">
        The appeal ladder is a sandbox model of the funded-milestone design, not on-chain in the MVP.
        The deployed court runs a single panel with one automatic redraw. See docs/MECHANISM_DELTA.md.
      </p>
    </Widget>
  );
}
