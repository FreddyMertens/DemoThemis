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
        Most matters never reach a panel. A deal that completes is released for free, and a bonded
        assertion settles the large majority of questions on a challenge window before any jury is
        drawn. The court is the rare last resort, not the everyday cost.
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
        Honesty note: the bonded-assertion layer (the ~95%-settle-free path) is{' '}
        <b>not in the MVP</b>. It is a funded-milestone item, shown here as the roadmap. MVP demo
        cases go straight to the jury on purpose, because the court is the part being proven.
      </p>
    </Widget>
  );
}
