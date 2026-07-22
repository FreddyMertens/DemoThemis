import { IS_COHORT, SUPPORTS_AUTOMATED_TIMING, SUPPORTS_LIVENESS_RECOVERY } from '@/lib/chain';

/// A persistent, instance-aware banner. The honesty rule made visible: the cohort
/// is the labeled simulated scale demo (read-only); mainnet explicitly separates
/// the immutable legacy deployment from a recovery-enabled replacement.
export function InstanceBanner() {
  const supportsCurrentRelease = SUPPORTS_LIVENESS_RECOVERY && SUPPORTS_AUTOMATED_TIMING;
  const label = IS_COHORT
    ? 'Engineering instance · Sepolia · read-only'
    : supportsCurrentRelease
      ? 'World Chain mainnet · automated court · valueless MUSD'
      : 'World Chain mainnet · legacy court · capstone paused';

  return (
    <details className={`court-instance${IS_COHORT || !supportsCurrentRelease ? ' is-simulated' : ' is-live'}`}>
      <summary>
        <i aria-hidden="true" />
        <strong>{label}</strong>
        <span>About this data</span>
      </summary>
      <p>
        {IS_COHORT
          ? 'This internal instance is not part of the public MVP.'
          : supportsCurrentRelease
            ? 'The documented World ID mainnet Router gates juror seats. Party-aware admission, permissionless recovery, and immutable five-minute voting windows are enforced by the selected court contracts.'
            : 'These source-verified addresses predate party-aware admission, bounded recovery, and immutable voting windows. Their chain state is shown for historical inspection; do not register or run the capstone until the replacement is deployed and selected.'}
      </p>
    </details>
  );
}
