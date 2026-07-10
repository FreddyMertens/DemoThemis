'use client';

import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
import { InstanceBanner } from '@/components/InstanceBanner';
import { explorerAddress, addr, IS_COHORT } from '@/lib/chain';

export default function About() {
  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar title="About" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-20">
        <InstanceBanner />

        <section className="court-about-card">
          <p className="court-about-kicker">The mechanism</p>
          <h2>Human arbitration, without purchased voting power.</h2>
          <p className="court-about-dek">
            DemoThemis settles disputes with verified humans instead of token-weighted stake. Its mainnet deployment
            deliberately uses a three-seat demo panel; expanding the pool and panel is funded milestone work.
          </p>
          <div className="court-about-steps">
            <article>
              <span>01</span>
              <strong>One human, one seat</strong>
              <p>One World ID cannot return through a second wallet to gain another juror seat.</p>
            </article>
            <article>
              <span>02</span>
              <strong>A late random draw</strong>
              <p>The panel is chosen after the question is filed, so it cannot be targeted early.</p>
            </article>
            <article>
              <span>03</span>
              <strong>A sealed, bonded vote</strong>
              <p>Commit/reveal hides early votes; a bond puts careless participation at risk.</p>
            </article>
          </div>
        </section>

        <div className="court-about-links">
          <a href="/sandbox">
            <span>Try</span> The “buy this verdict” sandbox
          </a>
          <a href={explorerAddress(addr.registry)} target="_blank" rel="noreferrer">
            <span>Verify ↗</span>{' '}
            {IS_COHORT ? "This cohort's JurorRegistry" : 'Mainnet JurorRegistry and World ID 4.0 verifier'}
          </a>
          <a href={explorerAddress(addr.court)} target="_blank" rel="noreferrer">
            <span>Verify ↗</span> This instance&apos;s DisputeCourt
          </a>
          <a href="/demothemis.html">
            <span>Read</span> The full DemoThemis design
          </a>
        </div>

        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-snug text-slate-500">
          {IS_COHORT
            ? 'The juror/case history shown in this app is the simulated Sepolia cohort (labeled simulated everywhere). The non-simulated chain slice is the source-verified mainnet contracts plus the World ID verifier path; real human usage begins at the capstone.'
            : 'This is the capstone-ready mainnet instance with valueless MockUSD. No real money is at stake; the demo panel size is a disclosed parameter, and no real human has registered yet.'}
        </p>
      </Page.Main>
    </>
  );
}
