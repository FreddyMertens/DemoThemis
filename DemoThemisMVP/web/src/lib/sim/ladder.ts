// The dispute ladder — escalating panels and the rung bond.
//
// Each rung quote conserves money explicitly: a non-refundable service fee pays
// panel work and delay compensation once, while a separate security bond is
// returned on success or forfeited on failure. The verdict margin adjusts only the
// anti-re-roll target, never the service fee.

import { appealBond, AppealBond, panelFor } from './court-math';

export interface Rung {
  panel: number;
  /** Stake band that lands a case on this panel size (panelFor). */
  band: string;
  /** A representative conserved appeal quote at the middle of the band. */
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

/** The panel size a case of `stake` lands on (re-export of the ported band map). */
export { panelFor };
