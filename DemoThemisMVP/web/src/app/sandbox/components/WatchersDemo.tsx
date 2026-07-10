'use client';

import { useState } from 'react';
import { Slider, Verdict, Widget } from './primitives';

const PETITION_FRACTION = 0.05; // >= 5% of the losing side reopens the question

export function WatchersDemo() {
  const [losers, setLosers] = useState(2400);
  const [signatures, setSignatures] = useState(80);

  const threshold = Math.ceil(losers * PETITION_FRACTION);
  const sigMax = Math.max(threshold * 2, 200);

  // Shrinking the losing side shrinks the signatures slider's max, so clamp the
  // signatures state to the new max (a controlled range input pins the thumb but
  // fires no onChange, which would otherwise leave the readout stale).
  const onLosers = (v: number) => {
    setLosers(v);
    const newMax = Math.max(Math.ceil(v * PETITION_FRACTION) * 2, 200);
    setSignatures((s) => Math.min(s, newMax));
  };

  const met = signatures >= threshold;
  const progress = Math.min(100, (signatures / threshold) * 100);

  return (
    <Widget title="Watchers and the loser-side petition">
      <p className="sbx-prose">
        Anyone can watch a settled case and report a verdict they believe is wrong. A report on its own
        changes nothing. To reopen the question, a petition has to gather at least 5% of the side that
        lost, so a shared grievance can escalate but a single sore loser cannot.
      </p>

      <div className="sbx-controls">
        <Slider
          label="People on the losing side"
          value={losers}
          min={20}
          max={10000}
          step={20}
          onChange={onLosers}
          display={losers.toLocaleString('en-US')}
        />
        <Slider
          label="Signatures gathered"
          value={signatures}
          min={0}
          max={sigMax}
          step={1}
          onChange={setSignatures}
          display={signatures.toLocaleString('en-US')}
        />
      </div>

      <div className="sbx-row" style={{ marginBottom: '.3rem' }}>
        <label>Petition threshold (5% of the losing side)</label>
        <b>{threshold.toLocaleString('en-US')}</b>
      </div>
      <div className="sbx-fillbar" style={{ height: 30 }}>
        <div className={`fill ${met ? 'good' : ''}`} style={{ width: `${Math.max(progress, 6)}%`, background: met ? 'var(--good)' : 'var(--accent)' }}>
          {progress >= 12 ? `${Math.round(progress)}%` : ''}
        </div>
      </div>

      <div style={{ marginTop: '.8rem' }}>
        {met ? (
          <Verdict level="good">Petition reaches quorum, the question reopens</Verdict>
        ) : (
          <Verdict level="mid">Reports logged, below the 5% bar</Verdict>
        )}
      </div>

      <p className="sbx-note">
        {met ? (
          <>
            {signatures.toLocaleString('en-US')} of the {threshold.toLocaleString('en-US')} needed have
            signed. The petition escalates to a fresh, larger panel, and the original verdict is held
            pending review.
          </>
        ) : (
          <>
            {signatures.toLocaleString('en-US')} of the {threshold.toLocaleString('en-US')} needed have
            signed. The reports stay on the record, but the verdict stands until the bar is cleared.
          </>
        )}
      </p>
      <p className="sbx-note warn">
        Watchers and the loser-side petition are a sandbox model of the funded-milestone design, not
        on-chain in the MVP. See docs/MECHANISM_DELTA.md.
      </p>
    </Widget>
  );
}
