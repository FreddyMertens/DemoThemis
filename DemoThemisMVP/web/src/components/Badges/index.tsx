import { IS_COHORT } from '@/lib/chain';

/// Small "SIMULATED" pill for cohort data (the honesty rule, per-widget). Renders
/// nothing on mainnet, where the data is real.
export function SimulatedBadge({ className = '' }: { className?: string }) {
  if (!IS_COHORT) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ${className}`}
    >
      Simulated
    </span>
  );
}

/// Sponsored mainnet sendTransaction via MiniKit is verified on-device at the final
/// human test, not before, so this is phrased forward-looking (the honesty rule).
/// Shown on register/vote actions (one of the "How we use Worldcoin" claims).
export function GasBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ${className}`}
    >
      World App transaction
    </span>
  );
}
