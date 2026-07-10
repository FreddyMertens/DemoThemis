'use client';

import { useMemo, useState } from 'react';
import { optimisticFunnel, pctText } from '@/lib/sim';
import { Slider, Widget } from './primitives';

const COLORS: Record<string, string> = {
  released: 'var(--good)',
  assertion: 'var(--accent)',
  jury: 'var(--bad)',
};

export function FunnelReadout() {
  const [thousands, setThousands] = useState(10);
  const total = thousands * 1000;
  const funnel = useMemo(() => optimisticFunnel(total), [total]);

  return (
    <Widget title="The optimistic funnel: the jury is the backstop">
      <p className="sbx-prose">
        This models the full-design funnel: completed deals release directly, while a planned bonded
        assertion settles most questions before a jury is drawn. The deployed MVP skips that planned
        step and sends demo cases straight to the jury.
      </p>

      <div className="sbx-controls">
        <Slider
          label="Matters modeled"
          value={thousands}
          min={1}
          max={100}
          step={1}
          onChange={setThousands}
          display={total.toLocaleString('en-US')}
        />
      </div>

      <div className="sbx-budgetbar" aria-label="funnel breakdown">
        {funnel.stages.map((s) => (
          <div
            key={s.key}
            style={{ width: `${Math.max(s.share * 100, s.count > 0 ? 2 : 0)}%`, background: COLORS[s.key] }}
            title={`${s.label}: ${s.count.toLocaleString('en-US')}`}
          >
            {s.share > 0.06 ? pctText(s.share) : ''}
          </div>
        ))}
      </div>

      <div className="sbx-readout" style={{ marginTop: '1rem' }}>
        {funnel.stages.map((s) => (
          <div className="sbx-stat" key={s.key}>
            <div className="k">
              {s.label}
              {s.roadmap && (
                <span className="sbx-simtag" style={{ marginLeft: '.4rem' }}>
                  Roadmap
                </span>
              )}
            </div>
            <div className="v" style={{ color: COLORS[s.key] }}>
              {s.count.toLocaleString('en-US')}
            </div>
          </div>
        ))}
      </div>

      <p className="sbx-note">
        Only <b>{pctText(funnel.juryShare)}</b> of matters reach a jury panel:{' '}
        {funnel.juryCount.toLocaleString('en-US')} of {funnel.totalMatters.toLocaleString('en-US')}.
      </p>
      <p className="sbx-note warn">
        <b>Roadmap only:</b> the bonded-assertion layer is funded work, not an MVP feature.
      </p>
    </Widget>
  );
}
