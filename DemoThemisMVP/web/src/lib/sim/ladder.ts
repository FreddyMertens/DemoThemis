// The dispute ladder — escalating panels and the rung bond.
//
// The rung price is the ported appeal-bond math (court-math.ts: appealBond, the max
// of the juror-cost floor and the anti-re-roll capture floor). On top of that the
// sandbox adds the near-tie discount and the two unsynchronized clocks, which are
// SANDBOX MODELS (the reference describes them in prose; there is no published JS for
// the discount), labeled as such in the UI and in docs/MECHANISM_DELTA.md.

import { appealBond, AppealBond, panelFor } from './court-math';

export interface Rung {
  panel: number;
  /** Stake band that lands a case on this panel size (panelFor). */
  band: string;
  /** A representative bond at the middle of the band, for the ladder visual. */
  example: AppealBond;
}

/** The three rungs 7 / 15 / 31, with a representative bond at each, for a given pool. */
export function ladderRungs(pool: number): Rung[] {
  return [
    { panel: 7, band: 'under $10k', example: appealBond(5_000, pool) },
    { panel: 15, band: '$10k to $1M', example: appealBond(100_000, pool) },
    { panel: 31, band: 'over $1M', example: appealBond(2_000_000, pool) },
  ];
}

export interface NearTie {
  /** Multiplier on the base rung bond, from the verdict margin. */
  factor: number;
  discountedBond: number;
  /** True if the discount was clamped up to the anti-re-roll floor. */
  clampedToFloor: boolean;
}

/**
 * Near-tie discount: a close verdict is cheaper to appeal than a lopsided one,
 * because a near-tie is genuinely uncertain and deserves a second look. But the
 * discount is clamped above the anti-re-roll capture floor, so a bloc that nearly
 * captured a panel cannot cheaply re-roll it. `margin01` is 0 at a dead tie and 1
 * at a unanimous verdict. SANDBOX MODEL (no reference JS for the discount curve).
 */
export function nearTieDiscount(baseBond: number, capFloor: number, margin01: number): NearTie {
  const minFactor = 0.4; // even a dead tie still costs 40% of the rung
  const factor = minFactor + (1 - minFactor) * Math.max(0, Math.min(1, margin01));
  const raw = baseBond * factor;
  const discountedBond = Math.max(capFloor, raw);
  return { factor, discountedBond, clampedToFloor: raw < capFloor };
}

/** The panel size a case of `stake` lands on (re-export of the ported band map). */
export { panelFor };
