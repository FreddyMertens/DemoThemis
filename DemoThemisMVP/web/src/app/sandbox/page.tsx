'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MissionProgress } from '@/components/MissionProgress';
import { DEFAULT_SEED } from '@/lib/sim';
import { Skeleton, useMounted, WidgetBoundary } from './components/primitives';
import { AttackDemo } from './components/AttackDemo';
import { CoreCourt } from './components/CoreCourt';
import { LadderDemo } from './components/LadderDemo';
import { ReputationDemo } from './components/ReputationDemo';
import { RewardPayoutDemo } from './components/RewardPayoutDemo';
import { CaseBrowser } from './components/CaseBrowser';

export default function SandboxPage() {
  const mounted = useMounted();
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [missionAttempted, setMissionAttempted] = useState(false);

  const reroll = () => setSeed((Math.floor(Math.random() * 0x7fffffff) + 1) >>> 0);
  const reset = () => setSeed(DEFAULT_SEED);

  return (
    <>
      <header className="sbx-header sbx-game-header">
        <p className="sbx-sec-label">Mission 1 · test fresh panels</p>
        <h1>Stress-test the verdict</h1>
        <p className="sbx-prose">
          Move the budget. Bought stake can be reused; DemoThemis draws a fresh human jury for every case.
        </p>
      </header>

      <MissionProgress current={1} />

      {!mounted ? (
        <LoadingSkeleton />
      ) : (
        <section className="sbx-primary" aria-label="Fresh-panel mission">
          <WidgetBoundary name="fresh-panel demo">
            <AttackDemo seed={seed} onInteract={() => setMissionAttempted(true)} />
          </WidgetBoundary>
        </section>
      )}

      <section
        className={`sbx-mission-next${missionAttempted ? '' : ' is-locked'}`}
        aria-labelledby="next-mission-title"
        aria-live="polite"
      >
        <span className="sbx-complete-mark" aria-hidden="true">{missionAttempted ? '✓' : '1'}</span>
        <div>
          <p>{missionAttempted ? 'Fresh-panel defense tested' : 'One move left'}</p>
          <h2 id="next-mission-title">
            {missionAttempted ? 'Next: cast a sealed vote.' : 'Test the fresh-panel defense.'}
          </h2>
          <small>
            {missionAttempted
              ? 'Use one sample seat, seal your choice, then reveal it when voting closes.'
              : 'Move the attacker budget or draw a fresh panel to reveal the next defense.'}
          </small>
        </div>
        {missionAttempted && <Link href="/juror-preview">Test sealed voting <span aria-hidden="true">→</span></Link>}
      </section>

      <details className="sbx-seed-details">
        <summary>
          <span>Change this mission&apos;s random draw</span>
          <span className="sbx-mono">Seed {seed}</span>
        </summary>
        <div className="sbx-seedbar" aria-label="Simulation seed controls">
          <button className="sbx-btn sbx-btn-ghost" onClick={reroll}>Re-roll seed</button>
          {seed !== DEFAULT_SEED && (
            <button className="sbx-btn sbx-btn-ghost" onClick={reset}>Reset seed</button>
          )}
          <p>The seed changes simulated people while keeping every result reproducible.</p>
        </div>
      </details>

      <details className="sbx-advanced">
        <summary>
          <span className="sbx-advanced-summary">
            <span className="sbx-advanced-title">
              <strong>Expert lab</strong>
              <span className="sbx-simtag">Optional · roadmap</span>
            </span>
            <small>Full court runs, appeals, reputation, payouts, and example cases</small>
          </span>
        </summary>
        <div className="sbx-advanced-body">
          <p className="sbx-prose">
            These controls preserve the current court research simulator. Roadmap mechanics remain clearly labeled and do
            not describe features already shipped in the live MVP. Every accepted case shown here uses the verified-human court path.
          </p>
          {!mounted ? (
            <LoadingSkeletons />
          ) : (
            <>
              <WidgetBoundary name="core court"><CoreCourt seed={seed} /></WidgetBoundary>
              <WidgetBoundary name="dispute ladder"><LadderDemo /></WidgetBoundary>
              <WidgetBoundary name="reputation gate"><ReputationDemo /></WidgetBoundary>
              <WidgetBoundary name="reward-pool payout"><RewardPayoutDemo seed={seed} /></WidgetBoundary>
              <WidgetBoundary name="case browser"><CaseBrowser seed={seed} /></WidgetBoundary>
            </>
          )}
        </div>
      </details>

      <footer className="sbx-footer">
        Want to skip ahead? <a href="/home">Audit a ruling →</a>
      </footer>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <section className="sbx-widget" aria-busy="true">
      <Skeleton width="38%" height={14} />
      <div style={{ height: 16 }} />
      <Skeleton width="100%" height={70} />
      <div style={{ height: 16 }} />
      <Skeleton width="100%" height={220} />
    </section>
  );
}

function LoadingSkeletons() {
  return (
    <div aria-busy="true">
      {[0, 1].map((i) => (
        <section className="sbx-widget" key={i}>
          <Skeleton width="40%" height={14} />
          <div style={{ height: 12 }} />
          <Skeleton width="100%" height={140} />
        </section>
      ))}
    </div>
  );
}
