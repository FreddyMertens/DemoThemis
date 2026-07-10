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
          <p className="court-about-kicker">Build status</p>
          <h2>What is real in this MVP?</h2>
          <p className="court-about-dek">
            DemoThemis uses verified humans—not token balances—to settle disputes. This build clearly separates what
            is live, simulated, and still pending.
          </p>
          <div className="court-about-steps">
            <article>
              <span>01</span>
              <strong>Live</strong>
              <p>Core contracts, escrow settlement, commit/reveal, and the World ID verifier path.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Simulated</strong>
              <p>The wider product journey, scale cohort, appeals, reputation, rewards, and watchers.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Pending</strong>
              <p>The final three-person test, production randomness, receipt-free ballots, and security review.</p>
            </article>
          </div>
        </section>

        <div className="court-about-links">
          <a href="/sandbox">
            <span>Try</span> Verdict-attack sandbox
          </a>
          <a href={explorerAddress(addr.registry)} target="_blank" rel="noreferrer">
            <span>Verify ↗</span> {IS_COHORT ? 'Cohort JurorRegistry' : 'Mainnet JurorRegistry'}
          </a>
          <a href={explorerAddress(addr.court)} target="_blank" rel="noreferrer">
            <span>Verify ↗</span> DisputeCourt
          </a>
          <a href="/demothemis.html">
            <span>Read</span> Full design
          </a>
        </div>

        <details className="court-disclosure">
          <summary>What the product is—and is not</summary>
          <div className="court-disclosure-content text-xs leading-relaxed text-slate-600">
            DemoThemis is a neutral resolver for escrow, marketplace conflicts, and objective yes/no questions. It
            takes no bet, sets no odds, and holds no stake. Integrations use the court; they are not the court itself.
          </div>
        </details>
      </Page.Main>
    </>
  );
}
