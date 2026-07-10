'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CASES,
  CaseContent,
  CaseOutcome,
  CourtSim,
  courtMoney,
  loadCase,
  MUSD,
  mulberry32,
} from '@/lib/sim';
import { Skeleton, Verdict, Widget } from './primitives';

const usd = (micro: number) => courtMoney(micro / MUSD);

export function CaseBrowser({ seed }: { seed: number }) {
  const [slug, setSlug] = useState(CASES[0].slug);
  const [content, setContent] = useState<CaseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CaseOutcome | null>(null);

  const selected = CASES.find((c) => c.slug === slug)!;

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    setOutcome(null);
    loadCase(slug)
      .then((c) => {
        if (live) {
          setContent(c);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [slug]);

  const sim = useMemo(() => new CourtSim(mulberry32((seed ^ 0x9c1bca) >>> 0), 200), [seed]);

  const resolve = () => {
    setOutcome(sim.runCase({ panelSize: 7, revealRate: 0.95 }));
  };

  return (
    <Widget title="Both case types: the canned content">
      <p className="sbx-prose">
        The two demo case types: an escrow deal dispute (the headline) and a neutral yes/no
        resolution question. These are illustrative cases of the same two demo types the on-chain
        seed uses (not the same blobs), fetched same-origin. Prediction-style questions are just
        one possible consumer of the resolver; every case here is illustrative and clearly fictional.
      </p>

      {/* case picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1rem' }}>
        <CaseGroup
          label="Escrow disputes"
          items={CASES.filter((c) => c.type === 'escrow')}
          slug={slug}
          onPick={setSlug}
        />
        <CaseGroup
          label="Resolution questions"
          items={CASES.filter((c) => c.type === 'question')}
          slug={slug}
          onPick={setSlug}
        />
      </div>

      {loading && (
        <div>
          <Skeleton width="60%" height={20} />
          <div style={{ height: 10 }} />
          <Skeleton width="100%" height={48} />
          <div style={{ height: 10 }} />
          <Skeleton width="80%" height={48} />
        </div>
      )}

      {error && (
        <div className="sbx-state error" role="alert">
          Could not load this case ({error}). Pick another, or reload the page.
        </div>
      )}

      {!loading && !error && content && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>{content.title}</h3>
            <span className={`sbx-pill ${content.standard === 'objective' ? 'sbx-ps-act' : 'sbx-ps-build'}`}>
              {content.standard}
            </span>
            <span className="sbx-pill" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
              {selected.type === 'escrow' ? 'escrow deal' : 'question'}
            </span>
          </div>
          <p className="sbx-prose" style={{ marginTop: '.6rem' }}>
            {content.question}
          </p>

          {content.terms && (
            <div className="sbx-note">
              <b>Agreed terms:</b> {content.terms}
            </div>
          )}

          <h3 style={{ marginTop: '1rem', fontSize: '.95rem' }}>Evidence</h3>
          <ul className="sbx-list good">
            {content.evidence.map((e, i) => (
              <li key={i}>
                {e.label}{' '}
                <span className="sbx-mono" style={{ fontSize: '.74rem', color: 'var(--faint)' }}>
                  ({e.url})
                </span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: '1rem' }}>
            <button className="sbx-btn" onClick={resolve}>
              Send to the simulated court
            </button>
          </div>

          {outcome && (
            <div style={{ marginTop: '1rem' }}>
              <Verdict level={outcome.outcome ? 'good' : 'mid'}>
                {selected.type === 'escrow'
                  ? outcome.outcome
                    ? 'Verdict: pay the payee'
                    : 'Verdict: refund the payer'
                  : outcome.outcome
                    ? 'Verdict: YES'
                    : 'Verdict: NO'}
              </Verdict>
              <p className="sbx-note">
                A 7-human panel resolved {outcome.yes}-{outcome.no}. The {usd(outcome.payout.feePool)} fee
                split {usd(outcome.payout.toJurorsTotal)} to {outcome.payout.winners.length} coherent
                jurors, {usd(outcome.payout.toReward)} to the reward pool, and{' '}
                {usd(outcome.payout.toProtocol)} to the protocol. Simulated resolution of an
                illustrative case.
              </p>
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}

function CaseGroup({
  label,
  items,
  slug,
  onPick,
}: {
  label: string;
  items: { slug: string }[];
  slug: string;
  onPick: (s: string) => void;
}) {
  return (
    <div>
      <div className="sbx-sans" style={{ fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)', marginBottom: '.35rem' }}>
        {label}
      </div>
      <div className="sbx-seg">
        {items.map((c) => (
          <button key={c.slug} className={c.slug === slug ? 'active' : ''} onClick={() => onPick(c.slug)}>
            {c.slug.replace(/^(escrow|market)-/, '').replace(/-/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}
