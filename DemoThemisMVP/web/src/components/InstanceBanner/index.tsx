import { IS_COHORT } from '@/lib/chain';

/// A persistent, instance-aware banner. The honesty rule made visible: the cohort
/// is the labeled simulated scale demo (read-only); the capstone World ID juror
/// flow is on mainnet with valueless MockUSD.
export function InstanceBanner() {
  const label = IS_COHORT
    ? 'Simulation · Sepolia · read-only · ~20 scripted jurors'
    : 'Mainnet demo · valueless MUSD · no real money';

  return (
    <details className={`court-instance${IS_COHORT ? ' is-simulated' : ' is-live'}`}>
      <summary>
        <i aria-hidden="true" />
        <strong>{label}</strong>
        <span>About this data</span>
      </summary>
      <p>
        {IS_COHORT
          ? 'This case history is a read-only simulation. It does not represent activity by real jurors.'
          : 'World ID 4.0 gates juror seats. This screen reads the court contracts on World Chain.'}
      </p>
    </details>
  );
}
