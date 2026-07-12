'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
import { InstanceBanner } from '@/components/InstanceBanner';
import { MissionProgress } from '@/components/MissionProgress';
import { SimulatedBadge } from '@/components/Badges';
import {
  CaseTypeBadge,
  EmptyState,
  ErrorState,
  OutcomeBadge,
  PhaseBadge,
  Skeleton,
  StatCard,
} from '@/components/court-ui';
import { usePolledData } from '@/lib/hooks';
import { listCases, registryStats, type CaseView } from '@/lib/court';
import { fmtMusd } from '@/lib/format';
import { IS_COHORT } from '@/lib/chain';

const CASE_PAGE_SIZE = 12;
type CaseFilter = 'all' | 'active' | 'resolved';

function CaseCard({ c }: { c: CaseView }) {
  const nextAction =
    c.phase === 'Commit'
      ? 'Vote now'
      : c.phase === 'Reveal'
        ? 'Reveal now'
        : c.phase === 'Resolved'
          ? 'View ruling'
          : c.phase === 'Resolvable'
            ? 'Awaiting resolution'
            : 'Waiting for panel';
  return (
    <Link
      href={`/case/${c.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">Case #{c.id}</span>
        <span className="court-case-action">{nextAction} →</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PhaseBadge phase={c.phase} />
        <CaseTypeBadge caseType={c.caseType} />
        {c.phase === 'Resolved' && <OutcomeBadge caseType={c.caseType} outcome={c.outcome} />}
        {c.redraws > 0 && (
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">redrawn</span>
        )}
        <span className="text-xs text-slate-400">
          Fees {fmtMusd(c.feePool)} MUSD · {c.panel.length} jurors
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const stats = usePolledData(registryStats);
  const cases = usePolledData(listCases);
  const [caseFilter, setCaseFilter] = useState<CaseFilter>('all');
  const [visibleCount, setVisibleCount] = useState(CASE_PAGE_SIZE);
  const allCases = cases.data ?? [];
  const filteredCases = allCases.filter((courtCase) => {
    if (caseFilter === 'active') return courtCase.phase !== 'Resolved';
    if (caseFilter === 'resolved') return courtCase.phase === 'Resolved';
    return true;
  });
  const visibleCases = filteredCases.slice(0, visibleCount);

  function chooseFilter(next: CaseFilter) {
    setCaseFilter(next);
    setVisibleCount(CASE_PAGE_SIZE);
  }

  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar title="Court" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch justify-start gap-4 mb-20">
        <MissionProgress current={3} />

        <section className="court-mission-brief is-live" aria-labelledby="live-objective">
          <span aria-hidden="true">03</span>
          <div>
            <p>Mission 3</p>
            <h2 id="live-objective">Open a case and follow its path from panel draw to payout.</h2>
            <small>
              {IS_COHORT
                ? 'This case board is simulated and read-only; each ruling still follows the court lifecycle.'
                : 'Each case exposes its current phase, required action, ruling, and settlement.'}
            </small>
          </div>
        </section>

        <InstanceBanner />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            {IS_COHORT ? 'Practice case board' : 'Live case board'}
          </h2>
          <SimulatedBadge />
        </div>

        {allCases.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Every ruling follows a visible path.</p>
                <p className="mt-0.5 text-xs leading-snug text-slate-500">
                  Panel drawn → votes sealed → votes revealed → ruling paid.
                </p>
              </div>
              <Link
                href="/onboard"
                className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                {IS_COHORT ? 'Preview juror path' : 'Join as a juror'}
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1" role="group" aria-label="Filter court cases">
                {(
                  [
                    ['all', 'All'],
                    ['active', 'Active'],
                    ['resolved', 'Resolved'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseFilter(value)}
                    aria-pressed={caseFilter === value}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                      caseFilter === value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                {Math.min(visibleCount, filteredCases.length)} of {filteredCases.length}
              </span>
            </div>
          </>
        )}

        {cases.loading && !cases.data ? (
          <Skeleton rows={4} />
        ) : cases.error && !cases.data ? (
          <ErrorState error={cases.error} />
        ) : cases.data && cases.data.length > 0 ? (
          filteredCases.length > 0 ? (
            <>
              <div className="space-y-2">
                {visibleCases.map((c) => (
                  <CaseCard key={c.id} c={c} />
                ))}
              </div>
              {visibleCount < filteredCases.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + CASE_PAGE_SIZE)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Show {Math.min(CASE_PAGE_SIZE, filteredCases.length - visibleCount)} more
                </button>
              )}
            </>
          ) : (
            <EmptyState>
              <p className="font-semibold text-slate-800">
                No {caseFilter === 'active' ? 'active' : 'resolved'} cases.
              </p>
              <button type="button" onClick={() => chooseFilter('all')} className="mt-2 text-xs font-semibold underline">
                Show all cases
              </button>
            </EmptyState>
          )
        ) : (
          <EmptyState>
            <p className="font-semibold text-slate-800">
              {IS_COHORT ? 'No open cases right now.' : 'The live court has no cases yet.'}
            </p>
            <p className="mt-1 text-xs">
              {IS_COHORT
                ? 'Resolved cases appear here as the keeper advances them.'
                : 'No cases are open right now. You can still try the complete sample flow.'}
            </p>
            <div className="court-empty-actions">
              <Link href="/sandbox">Try a sample case</Link>
              <Link href="/onboard">Join as a juror</Link>
            </div>
          </EmptyState>
        )}

        <details className="court-disclosure">
          <summary>
            Court numbers
            <span>
              {stats.data
                ? `${stats.data.jurorCount} jurors · ${fmtMusd(stats.data.bondsHeld)} MUSD bonds`
                : stats.loading
                  ? 'Loading…'
                  : 'Unavailable'}
            </span>
          </summary>
          <div className="court-disclosure-content">
            {stats.loading && !stats.data ? (
              <Skeleton rows={1} />
            ) : stats.error && !stats.data ? (
              <ErrorState error={stats.error} />
            ) : stats.data ? (
              <div className="flex gap-2">
                <StatCard
                  label={IS_COHORT ? 'Simulated jurors' : 'Verified jurors'}
                  value={String(stats.data.jurorCount)}
                />
                <StatCard label="Bonds held" value={fmtMusd(stats.data.bondsHeld)} sub="MUSD" />
                <StatCard label="Reward pool" value={fmtMusd(stats.data.rewardPool)} sub="MUSD" />
              </div>
            ) : null}
          </div>
        </details>
      </Page.Main>
    </>
  );
}
