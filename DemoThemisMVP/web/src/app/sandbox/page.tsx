'use client';

import { useState } from 'react';
import { DEFAULT_SEED } from '@/lib/sim';
import { Skeleton, useMounted, WidgetBoundary } from './components/primitives';
import { AttackDemo } from './components/AttackDemo';
import { FunnelReadout } from './components/FunnelReadout';
import { CoreCourt } from './components/CoreCourt';
import { LadderDemo } from './components/LadderDemo';
import { ReputationDemo } from './components/ReputationDemo';
import { RewardPayoutDemo } from './components/RewardPayoutDemo';
import { WatchersDemo } from './components/WatchersDemo';
import { CaseBrowser } from './components/CaseBrowser';

export default function SandboxPage() {
  const mounted = useMounted();
  const [seed, setSeed] = useState(DEFAULT_SEED);

  const reroll = () => setSeed((Math.floor(Math.random() * 0x7fffffff) + 1) >>> 0);
  const reset = () => setSeed(DEFAULT_SEED);

  return (
    <>
      <header className="sbx-header">
        <p className="sbx-sec-label">Courtroom simulator</p>
        <h1>Buy this verdict</h1>
        <p className="sbx-prose">
          Try to buy the same verdict in two court models. This seeded, client-side simulation uses
          the published design parameters; the same seed reproduces the same results.
        </p>
      </header>

      {!mounted ? (
        <LoadingSkeletons />
      ) : (
        <>
          <section className="sbx-primary" aria-label="Core simulation journey">
            <WidgetBoundary name="attack demo">
              <AttackDemo seed={seed} />
            </WidgetBoundary>
          </section>

          <details className="sbx-seed-details sbx-guide-details">
            <summary>
              <span>How to use this simulator</span>
              <span>3 short steps</span>
            </summary>
            <section className="sbx-orientation" aria-labelledby="sbx-start-title">
              <div className="sbx-orientation-head">
                <p className="sbx-sec-label">Guide</p>
                <h2 id="sbx-start-title">Three things to try</h2>
              </div>
              <ol className="sbx-steps">
                <li>
                  <span aria-hidden="true">1</span>
                  <div>
                    <strong>Set an attack budget</strong>
                    <p>Compare a stake vote with a drawn human panel.</p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">2</span>
                  <div>
                    <strong>Follow the funnel</strong>
                    <p>See why a jury should be the last resort.</p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">3</span>
                  <div>
                    <strong>Run the court</strong>
                    <p>Draw a panel, reveal votes, and settle fees.</p>
                  </div>
                </li>
              </ol>
            </section>
          </details>

          <details className="sbx-seed-details">
            <summary>
              <span>Simulation settings</span>
              <span className="sbx-mono">Seed {seed}</span>
            </summary>
            <div className="sbx-seedbar" aria-label="Simulation seed controls">
              <button className="sbx-btn sbx-btn-ghost" onClick={reroll}>
                Re-roll seed
              </button>
              {seed !== DEFAULT_SEED && (
                <button className="sbx-btn sbx-btn-ghost" onClick={reset}>
                  Reset seed
                </button>
              )}
              <p>Changing the seed changes simulated people while keeping the model reproducible.</p>
            </div>
          </details>

          <section className="sbx-primary" aria-label="Remaining core simulation journey">
            <WidgetBoundary name="optimistic funnel">
              <FunnelReadout />
            </WidgetBoundary>
            <WidgetBoundary name="core court">
              <CoreCourt seed={seed} />
            </WidgetBoundary>
          </section>

          <details className="sbx-advanced">
            <summary>
              <span className="sbx-advanced-summary">
                <span className="sbx-advanced-title">
                  <strong>Simulated full design: advanced mechanics</strong>
                  <span className="sbx-simtag">Simulation · roadmap</span>
                </span>
                <small>Appeals, reputation, reward payouts, watchers, and example cases</small>
              </span>
            </summary>
            <div className="sbx-advanced-body">
              <p className="sbx-prose">
                These funded-design mechanics are interactive models, not live MVP features. Each
                widget remains labeled, and every gap is documented in docs/MECHANISM_DELTA.md.
              </p>
              <WidgetBoundary name="dispute ladder">
                <LadderDemo />
              </WidgetBoundary>
              <WidgetBoundary name="reputation gate">
                <ReputationDemo />
              </WidgetBoundary>
              <WidgetBoundary name="reward-pool payout">
                <RewardPayoutDemo seed={seed} />
              </WidgetBoundary>
              <WidgetBoundary name="watchers">
                <WatchersDemo />
              </WidgetBoundary>
              <WidgetBoundary name="case browser">
                <CaseBrowser seed={seed} />
              </WidgetBoundary>
            </div>
          </details>
        </>
      )}

      <footer className="sbx-footer">
        <a href="/home">Compare this model with the on-chain MVP →</a>
      </footer>
    </>
  );
}

function LoadingSkeletons() {
  return (
    <div aria-busy="true">
      {[0, 1, 2].map((i) => (
        <section className="sbx-widget" key={i}>
          <Skeleton width="40%" height={14} />
          <div style={{ height: 12 }} />
          <Skeleton width="100%" height={64} />
          <div style={{ height: 12 }} />
          <Skeleton width="100%" height={120} />
        </section>
      ))}
    </div>
  );
}
