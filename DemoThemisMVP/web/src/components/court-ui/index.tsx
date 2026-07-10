import type { Phase } from '@/lib/court';

const PHASE_STYLE: Record<Phase, string> = {
  Open: 'bg-slate-100 text-slate-700',
  Commit: 'bg-blue-100 text-blue-800',
  Reveal: 'bg-violet-100 text-violet-800',
  Resolvable: 'bg-amber-100 text-amber-800',
  Resolved: 'bg-emerald-100 text-emerald-800',
};
const PHASE_LABEL: Record<Phase, string> = {
  Open: 'Open',
  Commit: 'Commit',
  Reveal: 'Reveal',
  Resolvable: 'Ready to resolve',
  Resolved: 'Resolved',
};

export function PhaseBadge({ phase }: { phase: Phase }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PHASE_STYLE[phase]}`}>
      {PHASE_LABEL[phase]}
    </span>
  );
}

export function CaseTypeBadge({ caseType }: { caseType: number }) {
  const escrow = caseType === 1;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        escrow ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
      }`}
    >
      {escrow ? 'Escrow deal' : 'Yes/no question'}
    </span>
  );
}

export function OutcomeBadge({ caseType, outcome }: { caseType: number; outcome: boolean }) {
  const label =
    caseType === 1 ? (outcome ? 'Payee paid' : 'Payer refunded') : outcome ? 'YES' : 'NO';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        outcome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }`}
    >
      {label}
    </span>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xl font-bold tabular-nums text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="w-full animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 w-full rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      <p className="font-semibold">Couldn&apos;t load court data. Retrying…</p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-semibold">Technical error</summary>
        <p className="mt-1 break-all">{error}</p>
      </details>
    </div>
  );
}
