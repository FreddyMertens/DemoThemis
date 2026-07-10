// The optimistic funnel — "the jury is the rare backstop, not the everyday cost".
//
// Most matters never reach a panel: an escrow deal that completes is released for
// free, and in the full design a bonded assertion settles the large majority of
// questions on a challenge window before any jury is drawn. Only the challenged
// remainder reaches the court. This readout makes that visible.
//
// HONESTY RULE: the optimistic assertion layer is NOT in the MVP. The ~95%-settle-
// free figure is a property of the funded-milestone optimistic layer (UMA-style),
// shown here as the roadmap, never as MVP behavior. MVP demo cases go straight to
// the jury on purpose (the court is the novel claim). Stages sourced from the
// roadmap are flagged `roadmap: true`. See IMPLEMENTATION_PLAN.md §1, §7.

export interface FunnelStage {
  key: string;
  label: string;
  /** Share of all matters that end at this stage (0-1). */
  share: number;
  count: number;
  /** True if this stage models the roadmap optimistic layer, not MVP behavior. */
  roadmap: boolean;
}

export interface Funnel {
  totalMatters: number;
  stages: FunnelStage[];
  /** Share of all matters that reach a jury panel. */
  juryShare: number;
  juryCount: number;
}

// Illustrative model fractions. Labeled as a model everywhere they surface.
const RELEASED_FREE = 0.8; // escrow deals that complete without a dispute
const ASSERTION_SETTLES = 0.95; // of disputed/asserted matters, settled free on the
// challenge window — the optimistic layer (roadmap)

/**
 * Build the funnel for `totalMatters` hypothetical matters. The shares are an
 * illustrative model on the design's layering, not measured usage.
 *
 *   released free        = 80% (escrow happy path)
 *   of the rest, 95% settle on the bonded assertion (ROADMAP optimistic layer)
 *   the challenged tail  reaches a jury panel — the backstop
 */
export function optimisticFunnel(totalMatters = 10_000): Funnel {
  const released = Math.round(totalMatters * RELEASED_FREE);
  const contested = totalMatters - released;
  const assertionSettled = Math.round(contested * ASSERTION_SETTLES);
  const reachedJury = contested - assertionSettled;

  const stages: FunnelStage[] = [
    {
      key: 'released',
      label: 'Released free (deal completed, no dispute)',
      share: released / totalMatters,
      count: released,
      roadmap: false,
    },
    {
      key: 'assertion',
      label: 'Settled on the bonded assertion, unchallenged',
      share: assertionSettled / totalMatters,
      count: assertionSettled,
      roadmap: true,
    },
    {
      key: 'jury',
      label: 'Challenged, reached a jury panel',
      share: reachedJury / totalMatters,
      count: reachedJury,
      roadmap: false,
    },
  ];

  return {
    totalMatters,
    stages,
    juryShare: reachedJury / totalMatters,
    juryCount: reachedJury,
  };
}
