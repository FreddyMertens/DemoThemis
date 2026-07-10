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
          A client-side simulation of the DemoThemis arbitration court. The headline below puts a
          token-weighted oracle next to a one-human-one-vote court and lets you try to buy each one.
          Every number is an illustrative model on the design&apos;s published parameters, and the
          curves are seeded so they reproduce exactly.
        </p>
        <div className="sbx-seedbar">
          <span className="sbx-mono">seed: {seed}</span>
          <button className="sbx-btn sbx-btn-ghost" onClick={reroll}>
            Re-roll seed
          </button>
          {seed !== DEFAULT_SEED && (
            <button className="sbx-btn sbx-btn-ghost" onClick={reset}>
              Reset to default
            </button>
          )}
        </div>
      </header>

      {!mounted ? (
        <LoadingSkeletons />
      ) : (
        <>
          <WidgetBoundary name="attack demo">
            <AttackDemo seed={seed} />
          </WidgetBoundary>
          <WidgetBoundary name="optimistic funnel">
            <FunnelReadout />
          </WidgetBoundary>
          <WidgetBoundary name="core court">
            <CoreCourt seed={seed} />
          </WidgetBoundary>

          <div style={{ margin: '2.5rem 0 0' }}>
            <p className="sbx-sec-label">The full mechanism</p>
            <h2>What the chain does not do, simulated</h2>
            <p className="sbx-prose">
              The MVP ships the core court on-chain. Everything below is the rest of the published
              design, running here as a simulation only: the appeal ladder, juror reputation, the
              reward-pool payout, watchers, and both case types. None of it is on-chain yet, and each
              gap is listed in docs/MECHANISM_DELTA.md.
            </p>
          </div>

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
        </>
      )}

      <footer style={{ marginTop: '2.5rem', fontFamily: 'var(--sans)', fontSize: '.82rem', color: 'var(--faint)' }}>
        <p>
          Simulation only. The on-chain court (real World ID registration, real commit/reveal, the
          70/20/10 payout) lives at <a href="/home">/home</a>. The simulation adds the appeal ladder,
          reputation, the reward-pool payout, and watchers on top. None of that is on-chain in the
          MVP. It is all listed in docs/MECHANISM_DELTA.md.
        </p>
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
