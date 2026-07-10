'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
import { InstanceBanner } from '@/components/InstanceBanner';
import { IS_COHORT } from '@/lib/chain';

function PreviewNote() {
  return (
    <div className="court-preview-note" role="note">
      <span>Preview only</span>
      <div>
        <strong>Dispute creation is not enabled in this public review build.</strong>
        <p>
          {IS_COHORT
            ? 'This cohort is read-only. On mainnet, a non-juror wallet opens the case; jurors verify, commit, and reveal inside World App through the sponsored-gas path.'
            : 'The mainnet path opens a case from a non-juror wallet; the juror flow runs in World App through the sponsored-gas path captured at the capstone.'}
        </p>
        {IS_COHORT && <Link href="/juror-preview">Test the juror flow locally →</Link>}
      </div>
    </div>
  );
}

export default function Dispute() {
  const [tab, setTab] = useState<'escrow' | 'question'>('escrow');

  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar title="Open a dispute" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-20">
        <InstanceBanner />
        <PreviewNote />

        <div className="flex gap-2">
          <button
            onClick={() => setTab('escrow')}
            aria-pressed={tab === 'escrow'}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${tab === 'escrow' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 text-slate-500'}`}
          >
            Escrow deal
          </button>
          <button
            onClick={() => setTab('question')}
            aria-pressed={tab === 'question'}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${tab === 'question' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 text-slate-500'}`}
          >
            Resolution question
          </button>
        </div>

        {tab === 'escrow' ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">
              Fund a deal to a payee with a <span className="font-semibold">2% fee</span> held on top. Release pays the
              payee and refunds the fee — no court cost. If you dispute, the fee funds a juror case asking{' '}
              <em>&ldquo;should the payee be paid under the linked terms?&rdquo;</em>
            </p>
            <label className="block text-xs font-medium text-slate-500">
              Payee address
              <input
                disabled
                placeholder="0x…"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Amount (MUSD)
              <input
                disabled
                placeholder="50"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500"
            >
              Create deal
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">
              Open a yes/no resolution question with a <span className="font-semibold">2 MUSD</span> fee. A random panel
              of verified humans is drawn, votes by private commit/reveal, and the majority resolves it. The fee splits
              70/20/10 (jurors / reward pool / protocol).
            </p>
            <label className="block text-xs font-medium text-slate-500">
              Question
              <input
                disabled
                placeholder="Did X happen by date Y?"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500"
            >
              Open question (2 MUSD)
            </button>
          </div>
        )}
      </Page.Main>
    </>
  );
}
