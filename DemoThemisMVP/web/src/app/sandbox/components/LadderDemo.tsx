'use client';

import { useMemo, useState } from 'react';
import { appealBond, courtMoney, ladderRungs, panelFor, pctText } from '@/lib/sim';
import { Slider, Verdict, Widget } from './primitives';

// The reference appeal-bond widget's exact slider mappings, so the numbers match
// the pitch site (hybrid-juror-system.html stakeVal/poolVal).
const stakeVal = (s: number) => 100 * Math.pow(10, (s / 100) * 5); // $100 .. $10M
const poolVal = (s: number) => Math.round(1000 * Math.pow(50, s / 100)); // 1k .. 50k

export function LadderDemo() {
  const [stakeS, setStakeS] = useState(55);
  const [poolS, setPoolS] = useState(40);
  const [marginS, setMarginS] = useState(15); // 0 = dead tie, 100 = unanimous
  const [weeks, setWeeks] = useState(4);

  const stake = stakeVal(stakeS);
  const pool = poolVal(poolS);
  const margin01 = marginS / 100;

  const bond = useMemo(() => appealBond(stake, pool, weeks, margin01), [stake, pool, weeks, margin01]);
  const rungs = useMemo(() => ladderRungs(pool), [pool]);
  const activePanel = panelFor(stake);

  const floorMax = Math.max(bond.serviceFee, bond.capFloor, 1);

  return (
    <Widget title="The dispute ladder: escalating panels, priced bonds">
      <p className="sbx-prose">
        A losing party can appeal into a larger panel: 7, then 15, then 31 seats. Every quote separates
        a non-refundable service fee, which pays the new panel and delay compensation once, from a
        security bond that returns on success or is forfeited on failure.
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
        <Slider
          label="Appeal window"
          value={weeks}
          min={2}
          max={8}
          step={1}
          onChange={setWeeks}
          display={`${weeks} weeks`}
        />
      </div>

      {/* the three rungs */}
      <div className="sbx-panels" style={{ marginBottom: '1rem' }}>
        {rungs.map((r) => (
          <div key={r.panel} className={`sbx-ppanel ${r.panel === activePanel ? 'held' : ''}`}>
            <div className="ph">
              <span>{r.panel} seats</span>
              <span className="pv">{courtMoney(r.example.total)}</span>
            </div>
            <div className="sbx-sans" style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
              {r.band}
              {r.panel === activePanel ? ' (this case)' : ''}
            </div>
          </div>
        ))}
      </div>

      <h3>This rung&apos;s conserved funding quote</h3>
      <div className="sbx-row" style={{ marginBottom: '.3rem' }}>
        <label>Panel work fee (seat the next {bond.panel})</label>
        <b>{courtMoney(bond.panelCost)}</b>
      </div>
      <div className="sbx-fillbar" style={{ height: 26, marginBottom: '.5rem' }}>
        <div className="fill" style={{ width: `${Math.max((bond.panelCost / floorMax) * 100, 4)}%`, background: 'var(--accent)' }} />
      </div>
      <div className="sbx-row" style={{ marginBottom: '.3rem' }}>
        <label>Delay compensation ({bond.weeks} weeks × 1% of locked value)</label>
        <b>{courtMoney(bond.delayCost)}</b>
      </div>
      <div className="sbx-fillbar" style={{ height: 26, marginBottom: '.5rem' }}>
        <div className="fill" style={{ width: `${Math.max((bond.delayCost / floorMax) * 100, 4)}%`, background: 'var(--mid)' }} />
      </div>
      <div className="sbx-row" style={{ marginBottom: '.3rem' }}>
        <label>Adjusted anti-re-roll target ({pctText(bond.odds)} capture odds × {Math.round(bond.confidenceFactor * 100)}% confidence)</label>
        <b>{courtMoney(bond.capFloor)}</b>
      </div>
      <div className="sbx-fillbar" style={{ height: 26 }}>
        <div className="fill bad" style={{ width: `${Math.max((bond.capFloor / floorMax) * 100, bond.capFloor > 0 ? 4 : 0)}%` }} />
      </div>

      <div className="sbx-readout" style={{ marginTop: '1rem' }}>
        <div className="sbx-stat">
          <div className="k">Service fee · panel + delay</div>
          <div className="v">{courtMoney(bond.serviceFee)}</div>
        </div>
        <div className="sbx-stat">
          <div className="k">Security bond · return/forfeit</div>
          <div className="v">{courtMoney(bond.securityBond)}</div>
        </div>
        <div className="sbx-stat">
          <div className="k">Total appeal funding</div>
          <div className="v accent">{courtMoney(bond.total)}</div>
        </div>
      </div>

      <p className="sbx-note">
        {bond.securityBond === 0 ? (
          <>
            The service fee already exceeds the adjusted anti-re-roll target, so no additional
            security bond is required.
          </>
        ) : (
          <>
            The anti-re-roll target exceeds the service fee, so the remaining{' '}
            <b>{courtMoney(bond.securityBond)}</b> is locked as security.
          </>
        )}{' '}If the appeal succeeds, that security principal returns pro-rata from escrow. If it fails,
        only that security principal enters the reward pool. The {courtMoney(bond.serviceFee)} service
        fee is never allocated a second time.
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
        The appeal ladder is a sandbox model of the funded-milestone design, not part of the MVP.
        The current MVP uses one three-person panel with one bounded retry. See docs/MECHANISM_DELTA.md.
      </p>
    </Widget>
  );
}
