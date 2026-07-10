import { IS_COHORT } from '@/lib/chain';

/// A persistent, instance-aware banner. The honesty rule made visible: the cohort
/// is the labeled simulated scale demo (read-only); the capstone World ID juror
/// flow is on mainnet with valueless MockUSD.
export function InstanceBanner() {
  return (
    <div
      className={`w-full rounded-xl border px-3 py-2 text-xs leading-snug ${
        IS_COHORT
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-blue-300 bg-blue-50 text-blue-900'
      }`}
    >
      {IS_COHORT ? (
        <>
          <span className="font-semibold">Simulated scale demo</span> — runs on the{' '}
          <span className="font-semibold">World Chain Sepolia</span> cohort (chain 4801),
          read-only. ~20 scripted jurors and these cases are{' '}
          <span className="font-semibold">simulated and disclosed</span>. The real
          one-human-one-seat World ID 4.0 verifier path is on{' '}
          <span className="font-semibold">mainnet</span> for the capstone (see the About tab).
        </>
      ) : (
        <>
          <span className="font-semibold">Capstone-ready on World Chain mainnet</span> (chain 480)
          with <span className="font-semibold">valueless MockUSD</span> — no real money is
          at stake. Juror seats are gated by real on-chain World ID 4.0 verification.
        </>
      )}
    </div>
  );
}
