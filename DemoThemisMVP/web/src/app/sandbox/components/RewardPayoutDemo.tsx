'use client';

import { useMemo, useState } from 'react';
import { courtMoney, distributeRewardPool, JurorRep, mulberry32, readJuror } from '@/lib/sim';
import { Slider, Widget } from './primitives';

const POP = 14;

export function RewardPayoutDemo({ seed }: { seed: number }) {
  const [poolUsd, setPoolUsd] = useState(420);

  // a small deterministic population with varied records and recency
  const jurors = useMemo<JurorRep[]>(() => {
    const rng = mulberry32((seed ^ 0x33aa55) >>> 0);
    return Array.from({ length: POP }, (_, id) => ({
      id,
      score: 0.52 + rng() * 0.45,
      cases: 50 + Math.floor(rng() * 100),
      idleCases: Math.floor(rng() * 9),
    }));
  }, [seed]);

  const dist = useMemo(() => distributeRewardPool(poolUsd, jurors), [poolUsd, jurors]);
  const reads = useMemo(() => jurors.map(readJuror), [jurors]);
  const rows = jurors
    .map((j, i) => ({ ...reads[i], share: dist.shares.find((s) => s.id === j.id)! }))
    .sort((a, b) => b.share.amount - a.share.amount);
  const maxShare = Math.max(...dist.shares.map((s) => s.amount), 1);
  const paidCount = dist.shares.filter((s) => s.paid).length;

  return (
    <Widget title="The reward-pool payout: gated and cyclic">
      <p className="sbx-prose">
        On-chain the reward pool only accrues. This is the payout the chain does not do: a periodic
        distribution to active, high-quality jurors, gated by the same 0.70 confidence bar and weighted
        by how recently each juror served. Suspended or idle jurors get nothing.
      </p>

      <div className="sbx-controls">
        <Slider
          label="Pool to distribute this cycle"
          value={poolUsd}
          min={50}
          max={2000}
          step={10}
          onChange={setPoolUsd}
          display={courtMoney(poolUsd)}
        />
      </div>

      <div className="sbx-readout" style={{ marginBottom: '1rem' }}>
        <div className="sbx-stat">
          <div className="k">Paid this cycle</div>
          <div className="v accent">
            {paidCount} / {POP}
          </div>
        </div>
        <div className="sbx-stat">
          <div className="k">Distributed</div>
          <div className="v good">{courtMoney(dist.paidOut)}</div>
        </div>
        <div className="sbx-stat">
          <div className="k">Left in the pool</div>
          <div className="v">{courtMoney(dist.remainder)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <span className="sbx-mono" style={{ fontSize: '.78rem', width: '3.4rem', color: 'var(--faint)' }}>
              #{r.id}
            </span>
            <div
              style={{
                flex: 1,
                height: 22,
                background: 'var(--bg)',
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid var(--line)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${r.share.amount > 0 ? Math.max((r.share.amount / maxShare) * 100, 3) : 0}%`,
                  background: r.eligible ? 'var(--good)' : 'var(--line-strong)',
                }}
              />
            </div>
            <span
              className="sbx-sans"
              style={{ fontSize: '.78rem', width: '8.5rem', textAlign: 'right', color: 'var(--muted)' }}
            >
              {r.eligible ? (
                <>
                  {courtMoney(r.share.amount)}{' '}
                  <span style={{ color: 'var(--faint)' }}>&middot; idle {r.idleCases}</span>
                </>
              ) : (
                <span className="sbx-pill sbx-ps-susp" style={{ fontSize: '.7rem' }}>
                  suspended
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <p className="sbx-note">
        Share is proportional to coherence times recency (recent service is weighted up), and only
        jurors who clear the 0.70 gate are paid. This is a sandbox model of the funded-milestone
        payout, not on-chain in the MVP. The on-chain pool is a passive sink.
      </p>
    </Widget>
  );
}
