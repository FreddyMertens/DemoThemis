'use client';

import { useMemo, useState } from 'react';
import {
  baselineCredit,
  DRAW_CAP,
  drawWeight,
  WILSON_BAR,
  WILSON_WINDOW,
  wilson,
} from '@/lib/sim';
import { Slider, Widget } from './primitives';

// Map an accuracy in [0.4, 1.0] onto a 0-100% track (reference confidence-gate pct()).
const pct = (x: number) => Math.max(0, Math.min(100, ((x - 0.4) / 0.6) * 100));

const STATUS_CLASS: Record<string, string> = {
  'Full weight': 'sbx-ps-act',
  'Building a record': 'sbx-ps-build',
  Suspended: 'sbx-ps-susp',
};

export function ReputationDemo() {
  const [accPct, setAccPct] = useState(85);
  const [cases, setCases] = useState(100);

  const p = accPct / 100;
  const w = useMemo(() => wilson(p, cases), [p, cases]);
  const weight = drawWeight(p);

  // leave-one-out illustration: same juror, two cases of different difficulty
  const easyCredit = baselineCredit(true, 0.95); // agreeing with an easy unanimous panel
  const splitCredit = baselineCredit(true, 0.55); // being right on a divided panel

  return (
    <Widget title="Juror reputation: the confidence gate">
      <p className="sbx-prose">
        A juror keeps full weight only when a 95% confidence interval on their coherence sits entirely
        above 0.70. One bad run does not suspend a veteran, and a short lucky streak does not promote a
        newcomer. The interval has to clear the bar, not just the point estimate.
      </p>

      <div className="sbx-controls">
        <Slider
          label="Observed coherence"
          value={accPct}
          min={40}
          max={100}
          step={1}
          onChange={setAccPct}
          display={`${accPct}%`}
        />
        <Slider
          label={`Cases in the window (${WILSON_WINDOW.min} to ${WILSON_WINDOW.max})`}
          value={cases}
          min={1}
          max={200}
          step={1}
          onChange={setCases}
          display={`${cases} case${cases === 1 ? '' : 's'}`}
        />
      </div>

      {/* the Wilson track */}
      <div
        style={{
          position: 'relative',
          height: 46,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          margin: '0.6rem 0 0.4rem',
        }}
      >
        {/* the 0.70 bar */}
        <div
          style={{
            position: 'absolute',
            top: -4,
            bottom: -4,
            left: `${pct(WILSON_BAR)}%`,
            width: 2,
            background: 'var(--ink)',
          }}
        />
        {/* the Wilson band */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            height: 22,
            left: `${pct(w.lo)}%`,
            width: `${Math.max(0, pct(w.hi) - pct(w.lo))}%`,
            background: 'color-mix(in srgb, var(--accent) 35%, transparent)',
            borderRadius: 6,
          }}
        />
        {/* the center mark */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            bottom: 8,
            left: `${pct(w.center)}%`,
            width: 3,
            background: 'var(--accent-ink)',
            borderRadius: 2,
          }}
        />
      </div>
      <div className="sbx-row sbx-sans" style={{ fontSize: '.78rem', color: 'var(--faint)' }}>
        <span>40%</span>
        <span>bar 70%</span>
        <span>100%</span>
      </div>

      <div className="sbx-readout" style={{ marginTop: '1rem' }}>
        <div className="sbx-stat">
          <div className="k">Wilson 95% interval</div>
          <div className="v" style={{ fontSize: '1.1rem' }}>
            {Math.round(w.lo * 100)}% to {Math.round(w.hi * 100)}%
          </div>
        </div>
        <div className="sbx-stat">
          <div className="k">Status</div>
          <div className="v">
            <span className={`sbx-pill ${STATUS_CLASS[w.status]}`}>{w.status}</span>
          </div>
        </div>
        <div className="sbx-stat">
          <div className="k">Draw weight (cap {DRAW_CAP}x)</div>
          <div className="v accent">{weight.toFixed(2)}x</div>
        </div>
      </div>

      <p className="sbx-note">
        Draw rate rises with the record but is capped at <b>{DRAW_CAP}x</b> a newcomer. No reputation,
        however spotless, makes a single juror drawn often enough to be worth buying.
      </p>

      <h3 style={{ marginTop: '1.4rem' }}>Why agreement alone earns little</h3>
      <p className="sbx-prose">
        Coherence is credited leave-one-out: you are scored on the signal you add over the panel that
        would have decided without you. Agreeing with an easy, near-unanimous verdict is nearly free
        credit, so it counts for almost nothing. Being right on a divided panel is where the record is
        made.
      </p>
      <div className="sbx-readout">
        <div className="sbx-stat">
          <div className="k">Right on an easy 7-0 case</div>
          <div className="v" style={{ color: 'var(--faint)' }}>
            +{easyCredit.toFixed(2)}
          </div>
        </div>
        <div className="sbx-stat">
          <div className="k">Right on a divided panel</div>
          <div className="v good">+{splitCredit.toFixed(2)}</div>
        </div>
      </div>

      <p className="sbx-note warn">
        <b>Simulation and privacy:</b> this screen exposes a score only to explain the model. The
        production design keeps each juror&apos;s reputation and punishment history private; implementing
        that privacy is funded work, not an MVP feature. The deployed court currently draws uniformly.
      </p>
    </Widget>
  );
}
