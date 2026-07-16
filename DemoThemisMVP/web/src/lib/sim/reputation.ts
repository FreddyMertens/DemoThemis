// Juror reputation and the reward-pool payout — sandbox-only layers.
//
// The Wilson suspension gate is ported (court-math.ts: wilson, WILSON_BAR). The
// draw-rate cap, the leave-one-out baseline credit, and the gated cyclic payout are
// SANDBOX MODELS of the reference design (hybrid-juror-system.html / run-through.html),
// none of them on-chain in the MVP. Labeled as such; see docs/MECHANISM_DELTA.md.

import { wilson, WILSON_BAR, WilsonResult } from './court-math';

/** A high-rep juror draws at most this many times a newcomer's rate. */
export const DRAW_CAP = 3;

/**
 * Draw weight from a coherence score in [0,1]. A newcomer (no record, treated as the
 * 0.5 baseline) draws at weight 1; weight rises with score but is capped at 3x, so no
 * juror — however good their record — can be drawn often enough to be worth capturing.
 */
export function drawWeight(score: number): number {
  const above = Math.max(0, (score - 0.5) / 0.5); // 0 at 0.5, 1 at 1.0
  return Math.min(DRAW_CAP, 1 + (DRAW_CAP - 1) * above);
}

/**
 * Leave-one-out baseline credit for one case: how much signal a juror added over the
 * panel that would have decided without them. `looBaselineCorrectProb` is the chance
 * the rest of the panel reaches the right verdict on its own. Agreeing with an easy
 * unanimous panel earns almost nothing; being right on a genuine split earns the most.
 * Returns a value in roughly [-1, 1].
 */
export function baselineCredit(jurorCorrect: boolean, looBaselineCorrectProb: number): number {
  return (jurorCorrect ? 1 : 0) - looBaselineCorrectProb;
}

export interface JurorRep {
  id: number;
  /** Observed coherence rate over the window. */
  score: number;
  /** Cases in the scoring window. */
  cases: number;
  /** Cases since this juror last served (recency, for the payout weighting). */
  idleCases: number;
}

export interface RepReadout extends JurorRep {
  wilson: WilsonResult;
  weight: number;
  eligible: boolean;
}

/** Score a juror: Wilson gate + draw weight. Eligible = not suspended. */
export function readJuror(j: JurorRep): RepReadout {
  const w = wilson(j.score, j.cases);
  return {
    ...j,
    wilson: w,
    weight: drawWeight(j.score),
    eligible: w.status !== 'Suspended',
  };
}

export interface PayoutShare {
  id: number;
  weight: number;
  amount: number;
  paid: boolean;
}

/**
 * The gated cyclic reward-pool distribution (sandbox-only, funded-milestone #3).
 * The accrued pool is shared among jurors who clear the Wilson 0.70 gate, weighted by
 * coherence and by recency (recently-active jurors are weighted up). Suspended or
 * inactive jurors get nothing. Integer-cent split with the remainder left in the pool.
 *
 *   weight_i = score_i * recency_i   (recency = 1 / (1 + idleCases))
 *   share_i  = floor(pool * weight_i / sum(weight))
 */
export function distributeRewardPool(pool: number, jurors: JurorRep[]): {
  shares: PayoutShare[];
  paidOut: number;
  remainder: number;
} {
  const reads = jurors.map(readJuror);
  const eligible = reads.filter((r) => r.eligible && r.score > 0);
  const weights = eligible.map((r) => r.score * (1 / (1 + r.idleCases)));
  const total = weights.reduce((a, b) => a + b, 0);

  const shares: PayoutShare[] = reads.map((r) => ({ id: r.id, weight: 0, amount: 0, paid: false }));
  let paidOut = 0;
  if (total > 0) {
    eligible.forEach((r, i) => {
      const amount = Math.floor((pool * weights[i]) / total);
      const slot = shares.find((s) => s.id === r.id)!;
      slot.weight = weights[i];
      slot.amount = amount;
      slot.paid = amount > 0;
      paidOut += amount;
    });
  }
  return { shares, paidOut, remainder: pool - paidOut };
}

export { WILSON_BAR };
