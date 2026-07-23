'use client';

import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
import { InstanceBanner } from '@/components/InstanceBanner';
import { explorerAddress, addr, IS_COHORT, MVP_CONFIGURED } from '@/lib/chain';

export default function About() {
  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar title="How it works" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-20">
        <InstanceBanner />

        <section className="court-about-card">
          <p className="court-about-kicker">Live Demo MVP</p>
          <h2>A complete decision in three steps</h2>
          <p className="court-about-dek">
            This MVP gives one precise public question to three verified humans, then records their majority answer
            on World Chain.
          </p>
          <div className="court-about-steps">
            <article>
              <span>01</span>
              <strong>One question opens</strong>
              <p>The question, YES rule, and judged-as-of time are fixed before anyone votes.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Three jurors decide</strong>
              <p>World ID-verified jurors research independently, then seal and reveal their votes.</p>
            </article>
            <article>
              <span>03</span>
              <strong>The chain records it</strong>
              <p>The contract finalizes the majority answer and distributes the case fee by rule.</p>
            </article>
          </div>
        </section>

        <div className="court-about-links">
          <a href="/app">
            <span>Open</span> Live case
          </a>
          <a href="/app?tab=submit">
            <span>Ask</span> Submit a question
          </a>
          {MVP_CONFIGURED && (
            <>
              <a href={explorerAddress(addr.registry)} target="_blank" rel="noreferrer">
                <span>Verify ↗</span> {IS_COHORT ? 'Cohort JurorRegistry' : 'Mainnet JurorRegistry'}
              </a>
              <a href={explorerAddress(addr.court)} target="_blank" rel="noreferrer">
                <span>Verify ↗</span> DisputeCourt
              </a>
            </>
          )}
        </div>

        <details className="court-disclosure">
          <summary>What the product is—and is not</summary>
          <div className="court-disclosure-content text-xs leading-relaxed text-slate-600">
            DemoThemis is a general-purpose court: anyone can define a case, fund the juror fees, and receive an
            on-chain ruling. This MVP demonstrates objective yes-or-no questions; jurors find public information
            independently, the court takes no bets, and votes never depend on token holdings.
          </div>
        </details>
      </Page.Main>
    </>
  );
}
