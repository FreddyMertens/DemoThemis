'use client';

import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { InstanceBanner } from '@/components/InstanceBanner';
import { explorerAddress, addr, IS_COHORT } from '@/lib/chain';

export default function About() {
  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="About" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-20">
        <InstanceBanner />

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">DemoThemis — a human arbitration court</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            DemoThemis settles disputes with a panel of <span className="font-semibold">verified humans</span>,
            not token-weighted stake. Each juror is one World ID — one person, one vote — drawn at random
            after a question is filed, voting by private commit/reveal with a bond at risk. A token-weighted
            oracle can be bought by whoever holds the most stake; a one-human-one-vote court cannot, because
            buying a verdict means buying a random, unknown majority of distinct people. The mainnet deployment
            uses a 3-seat demo panel on purpose; capture-resistance is a function of pool width, and scaling the
            panel and pool is funded-milestone work. Watch the contrast in the sandbox.
          </p>
        </div>

        <div className="space-y-2">
          <a href="/sandbox" className="block rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800 hover:border-slate-300">
            ▶ Sandbox — the &ldquo;buy this verdict&rdquo; attack demo (token court flips, human court holds)
          </a>
          <a href={explorerAddress(addr.registry)} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800 hover:border-slate-300">
            🔗{' '}
            {IS_COHORT
              ? "This cohort's JurorRegistry on the explorer"
              : 'Capstone-ready JurorRegistry — World ID 4.0 (Production verifier) on worldscan'}
          </a>
          <a href={explorerAddress(addr.court)} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800 hover:border-slate-300">
            🔗 This instance&apos;s DisputeCourt on the explorer
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
