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
        <span>What is real?</span>
      </summary>
      <p>
        {IS_COHORT
          ? 'This case history is simulated. The mainnet contracts and World ID 4.0 verifier path are live; the final three-person test is pending.'
          : 'World ID 4.0 gates juror seats. The core contracts are live; the final three-person test is still pending.'}
      </p>
    </details>
  );
}
