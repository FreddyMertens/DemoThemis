'use client';

import Link from 'next/link';
import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
import { InstanceBanner } from '@/components/InstanceBanner';
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

function CaseCard({ c }: { c: CaseView }) {
  return (
    <Link
      href={`/case/${c.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">Case #{c.id}</span>
        <PhaseBadge phase={c.phase} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <CaseTypeBadge caseType={c.caseType} />
        {c.phase === 'Resolved' && <OutcomeBadge caseType={c.caseType} outcome={c.outcome} />}
        {c.redraws > 0 && (
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">redrawn</span>
        )}
        <span className="text-xs text-slate-400">
          pool {fmtMusd(c.feePool)} · panel {c.panel.length}
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const stats = usePolledData(registryStats);
  const cases = usePolledData(listCases);

  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar title="DemoThemis Court" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch justify-start gap-4 mb-20">
        <InstanceBanner />

        {/* registry stats */}
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

        {/* become a juror */}
        <Link
          href="/onboard"
          className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Become a juror →
        </Link>

        {/* optimistic-funnel framing */}
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-snug text-slate-500">
          Most matters never reach a jury — an escrow release or the optimistic-assertion fast path (a roadmap layer)
          settles them first. The jury is the rare backstop you see here, not the everyday cost.
        </p>

        {/* case list */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Cases</h2>
          <SimulatedBadge />
        </div>
        {cases.loading && !cases.data ? (
          <Skeleton rows={4} />
        ) : cases.error && !cases.data ? (
          <ErrorState error={cases.error} />
        ) : cases.data && cases.data.length > 0 ? (
          <div className="space-y-2">
            {cases.data.map((c) => (
              <CaseCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <EmptyState>
            {IS_COHORT
              ? 'No open cases right now — resolved cases appear here as the keeper advances them.'
              : "No cases yet — the live 3-human capstone hasn't run, so the court is empty by design. The full mechanism is playable now in the sandbox."}
          </EmptyState>
        )}
      </Page.Main>
    </>
  );
}
