// The comparative attack demo — "buy this verdict".
//
// Two oracles resolve the SAME question under the SAME attacker budget:
//   - token-weighted courts like UMA and Kleros: voting power is proportional to
//     stake, so a verdict is for sale to whoever buys a majority of stake. Once
//     bought, it stays bought — the next verdict is free.
//   - the DemoThemis human court: one verified human, one vote; a random panel is
//     drawn AFTER the question; the attacker can only bribe people in the pool,
//     never the (unknown) panel, so capturing it is a dice roll that gets worse as
//     the pool widens — and any captured panel is appealed into a bigger one.
//
// The human-court math is PORTED from court-math.ts (the reference combinatorics).
// The token-court model, based on systems like UMA and Kleros, is authored fresh — there is no reference code for it. See
// the spec in IMPLEMENTATION_PLAN.md §7 and docs/MECHANISM_DELTA.md.

import { hyperTail, pCaptureAll } from './court-math';
import type { Rng } from './prng';
import { sampleIndices } from './prng';

// ===========================================================================
// The bribe-price floor (human court)
// ===========================================================================
//
// The least a rational juror would accept to vote against the evidence is what
// the betrayal costs them: the case fee they forgo by being incoherent, plus the
// bond they put at risk, plus the present value of the future reward income they
// would lose if caught. Per the spec:
//
//   bribePrice = fee($1.50) + bondAtRisk($5) + reputationValue($0)
//
// reputationValue is $0 in the MVP because there is no on-chain reward-pool payout
// yet (the gated cyclic distribution is sandbox-only) — so a juror's future income
// stream is not yet a real cost of corruption. Noted in docs/MECHANISM_DELTA.md.

/** Case fee a coherent juror earns, forgone if bribed ($1.50, the reference number). */
export const FEE_AT_STAKE = 1.5;
/** The $5 bond a bribed juror puts at risk. */
export const BOND_AT_RISK = 5;
/** Present value of future reward income lost if caught — $0 in the MVP. */
export const REPUTATION_VALUE = 0;

/** The per-juror bribe-price floor: $6.50 in the MVP. */
export function bribePriceFloor(): number {
  return FEE_AT_STAKE + BOND_AT_RISK + REPUTATION_VALUE;
}

// ===========================================================================
// Token-weighted court model based on systems like UMA and Kleros (authored fresh)
// ===========================================================================

export interface TokenCourtParams {
  /** Tokens staked behind the oracle. */
  totalStakeTokens: number;
  /** Market price of one token, in dollars. */
  tokenPrice: number;
}

export interface TokenCourtResult {
  totalStakeUsd: number;
  /** Dollars needed to control a voting majority = half the staked value. */
  costToFlip: number;
  /** Did the attacker's budget clear the threshold? */
  flipped: boolean;
  /** Probability of flipping — a step function: 1 at/above the threshold, else 0. */
  pFlip: number;
  /** Once a majority of stake is held, every later verdict is free. */
  reusable: boolean;
}

/**
 * Token-court outcome modelled on systems like UMA and Kleros under `budgetUsd`. The verdict flips with certainty once the
 * budget buys a majority of the staked value, and not at all below it:
 *
 *   costToFlip = 0.5 * totalStakeTokens * tokenPrice
 *   pFlip      = budget >= costToFlip ? 1 : 0
 *
 * There is no sortition and no per-vote risk, so the outcome is deterministic and
 * the captured majority is reusable forever (the "second case free" property).
 */
export function tokenCourt(params: TokenCourtParams, budgetUsd: number): TokenCourtResult {
  const totalStakeUsd = params.totalStakeTokens * params.tokenPrice;
  const costToFlip = 0.5 * totalStakeUsd;
  const flipped = budgetUsd >= costToFlip;
  return {
    totalStakeUsd,
    costToFlip,
    flipped,
    pFlip: flipped ? 1 : 0,
    reusable: true,
  };
}

// ===========================================================================
// DemoThemis human court (ported combinatorics)
// ===========================================================================

export interface HumanCourtParams {
  /** Verified humans in the pool (security is pool *width*). */
  poolSize: number;
  /** Seats on a drawn panel (7 on the cohort). */
  panelSize: number;
}

export interface HumanCourtResult {
  bribePrice: number;
  /** Colluders the budget can buy: floor(budget / bribePrice), capped at the pool. */
  colludersBought: number;
  maj: number;
  /** Exact P(a single random panel is captured) = hyperTail(N, K, panel, maj). */
  pFlipOnePanel: number;
  /** Budget needed to bribe enough of the pool to make capture a coin flip (>=50%). */
  costForCoinFlip: number;
}

function majorityOf(panelSize: number): number {
  return Math.floor(panelSize / 2) + 1;
}

/**
 * Human court outcome under `budgetUsd`. The attacker bribes whole jurors in the
 * pool (they cannot target the panel — it is drawn at random after the question),
 * so the budget buys K = floor(budget / bribePrice) colluders and the verdict
 * flips only if a majority of the drawn panel happens to be colluders:
 *
 *   K     = floor(budget / bribePrice)        (capped at the pool)
 *   pFlip = hyperTail(poolSize, K, panelSize, maj)
 */
export function humanCourt(params: HumanCourtParams, budgetUsd: number): HumanCourtResult {
  const bribePrice = bribePriceFloor();
  const maj = majorityOf(params.panelSize);
  const colludersBought = Math.min(params.poolSize, Math.floor(budgetUsd / bribePrice));
  const pFlipOnePanel = hyperTail(params.poolSize, colludersBought, params.panelSize, maj);
  return {
    bribePrice,
    colludersBought,
    maj,
    pFlipOnePanel,
    costForCoinFlip: costForTargetPFlip(params, 0.5),
  };
}

/**
 * Smallest budget that pushes single-panel capture probability to >= `target`.
 * Walks K up from 0 (each colluder costs one bribe-price) until hyperTail clears
 * the target, so the UI can say "to even reach a coin flip you must bribe K of N,
 * costing $X" — which, as the pool widens, climbs past the value at stake.
 */
export function costForTargetPFlip(params: HumanCourtParams, target: number): number {
  const bribePrice = bribePriceFloor();
  const maj = majorityOf(params.panelSize);
  if (target <= 0) return 0;
  if (hyperTail(params.poolSize, params.poolSize, params.panelSize, maj) < target) {
    return params.poolSize * bribePrice;
  }

  // Capture probability is monotonic in K, so binary search finds the first
  // colluder count that reaches the target without walking the whole pool.
  let lo = maj;
  let hi = params.poolSize;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (hyperTail(params.poolSize, mid, params.panelSize, maj) >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo * bribePrice;
}

// ===========================================================================
// The money shot — P(flip) vs budget, for both courts
// ===========================================================================

export interface FlipCurvePoint {
  budget: number;
  pToken: number;
  pHuman: number;
}

export interface FlipCurve {
  points: FlipCurvePoint[];
  tokenCostToFlip: number;
  /** Budget at which the human curve first reaches a coin flip (may be off-scale). */
  humanCoinFlipBudget: number;
  maxBudget: number;
}

/**
 * Sample both courts' P(flip) across a budget sweep from 0 to `maxBudget`. The
 * token curve is a hard step at its costToFlip; the human curve is the smooth
 * hypergeometric capture probability, which stays low far past the token step and
 * collapses further as the pool widens (crank N to see it).
 */
export function flipCurve(
  token: TokenCourtParams,
  human: HumanCourtParams,
  maxBudget: number,
  steps = 80,
): FlipCurve {
  const tokenCostToFlip = tokenCourt(token, 0).costToFlip;
  const bribePrice = bribePriceFloor();
  const maj = majorityOf(human.panelSize);
  const points: FlipCurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const budget = (maxBudget * i) / steps;
    const colludersBought = Math.min(human.poolSize, Math.floor(budget / bribePrice));
    points.push({
      budget,
      pToken: budget >= tokenCostToFlip && tokenCostToFlip > 0 ? 1 : 0,
      pHuman: hyperTail(human.poolSize, colludersBought, human.panelSize, maj),
    });
  }
  return {
    points,
    tokenCostToFlip,
    humanCoinFlipBudget: costForTargetPFlip(human, 0.5),
    maxBudget,
  };
}

// ===========================================================================
// Above the ceiling — parallel panels (pᴺ), ported
// ===========================================================================

export interface ParallelOddsRow {
  /** Number of parallel panels that must all agree (1 / 3 / 5 by case value). */
  panels: number;
  /** P(all panels captured on one draw) = pCaptureOne(K)^N. */
  pAll: number;
  /** "1 in X" framing of pAll. */
  oneIn: number;
}

/**
 * The 1 / 3 / 5 parallel-panel odds for a given colluder count K. Above the
 * 31-seat ceiling the court seats N non-overlapping panels that must ALL agree, so
 * capture odds multiply: ~1/5 -> 1/125 -> 1/3000.
 */
export function parallelOdds(K: number, panelCounts: number[] = [1, 3, 5]): ParallelOddsRow[] {
  return panelCounts.map((panels) => {
    const pAll = pCaptureAll(K, panels);
    return { panels, pAll, oneIn: pAll > 0 ? 1 / pAll : Infinity };
  });
}

// ===========================================================================
// Honesty check — a deterministic Monte-Carlo capture count
// ===========================================================================

/**
 * Roll `trials` independent panels (seeded, reproducible) and count how many a
 * bloc of `K` colluders captures. Mirrors the reference "X / 1,000" readout so
 * the exact hyperTail figure can be sanity-checked against a simulation. The PRNG
 * makes the count reproduce for the video; pass a re-rolled rng to vary it.
 */
export function monteCarloCaptures(
  rng: Rng,
  poolSize: number,
  K: number,
  panelSize: number,
  trials: number,
): number {
  const maj = majorityOf(panelSize);
  let hits = 0;
  for (let t = 0; t < trials; t++) {
    const seats = sampleIndices(rng, poolSize, panelSize);
    let colluders = 0;
    for (const seat of seats) if (seat < K) colluders++;
    if (colluders >= maj) hits++;
  }
  return hits;
}
