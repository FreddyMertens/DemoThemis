'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
import { InstanceBanner } from '@/components/InstanceBanner';

function PreviewNote() {
  return (
    <div className="court-preview-note" role="note">
      <span>Preview only</span>
      <div>
        <strong>Case creation is disabled in this public review.</strong>
        <Link href="/sandbox">Try the complete flow in the sandbox →</Link>
      </div>
    </div>
  );
}

export default function Dispute() {
  const [tab, setTab] = useState<'escrow' | 'question'>('escrow');

  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar title="Case preview" />
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
            Yes/no question
          </button>
        </div>

        {tab === 'escrow' ? (
          <section className="court-case-preview" aria-label="Escrow deal preview">
            <p>
              Deposit a payment plus a 2% fee. Releasing pays the payee and returns the fee; disputing sends the case to
              jurors.
            </p>
            <dl className="court-case-facts">
              <div>
                <dt>Fee</dt>
                <dd>2% held</dd>
              </div>
              <div>
                <dt>No dispute</dt>
                <dd>Fee returned</dd>
              </div>
              <div>
                <dt>Dispute</dt>
                <dd>Jurors decide</dd>
              </div>
            </dl>
            <p className="court-case-sample">
              Sample juror question: “Should the payee be paid under the linked terms?”
            </p>
          </section>
        ) : (
          <section className="court-case-preview" aria-label="Yes or no question preview">
            <p>
              Pay 2 MUSD to ask a drawn panel of verified humans a yes/no question. Votes stay sealed until reveal.
            </p>
            <dl className="court-case-facts">
              <div>
                <dt>Fee</dt>
                <dd>2 MUSD</dd>
              </div>
              <div>
                <dt>Ballot</dt>
                <dd>Sealed → reveal</dd>
              </div>
              <div>
                <dt>Fee split</dt>
                <dd>70 · 20 · 10</dd>
              </div>
            </dl>
            <p className="court-case-sample">70% jurors · 20% reward pool · 10% protocol</p>
          </section>
        )}
      </Page.Main>
    </>
  );
}
