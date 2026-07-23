import { IS_COHORT, MVP_CONFIGURED } from '@/lib/chain';

/// A persistent, instance-aware description of the current MVP profile.
export function InstanceBanner() {
  const label = IS_COHORT
    ? 'Engineering cohort · Sepolia · read-only'
    : 'DemoThemis MVP · World Chain · valueless MUSD';

  return (
    <details className={`court-instance${IS_COHORT || !MVP_CONFIGURED ? ' is-simulated' : ' is-live'}`}>
      <summary>
        <i aria-hidden="true" />
        <strong>{label}</strong>
        <span>About this data</span>
      </summary>
      <p>
        {IS_COHORT
          ? 'This internal instance is not part of the public MVP.'
          : 'World ID 4 gates one seat per verified human. Party-aware admission, permissionless recovery, immutable five-minute voting windows, and the three-answer ballot define this MVP.'}
      </p>
    </details>
  );
}
