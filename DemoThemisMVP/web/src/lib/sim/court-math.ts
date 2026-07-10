// Court combinatorics and economic floors — PORTED VERBATIM from the pitch site.
//
// The sandbox must produce the same numbers as the reference widgets, so this
// file copies the published JavaScript rather than re-deriving anything. Each
// block cites its source file and line range in reference/demothemis-site/ and
// spells out the formula. Do not "improve" these — drift here means the sandbox
// stops matching the pitch site, which is the whole point of porting.

// ===========================================================================
// Combinatorics — from juror-court.html, the window.__court block (~363-405)
// ===========================================================================

// Lanczos approximation of ln(Gamma(z)). Lets us compute ln(n!) = lgamma(n+1)
// for large n without overflow, so the binomial/hypergeometric tails stay stable
// at pool sizes in the hundreds.
function lgamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// ln( n choose k ) = ln(n!) - ln(k!) - ln((n-k)!).
function logChoose(n: number, k: number): number {
  if (k < 0 || k > n || n < 0) return -Infinity;
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
}

/**
 * P(X >= k) for X ~ Binomial(n, p). Computed in log space, summed over the tail.
 * Used where colluders are an unbounded fraction p of an effectively infinite
 * pool (each seat is captured independently with probability p).
 */
export function binomTail(n: number, k: number, p: number): number {
  if (p <= 0) return k <= 0 ? 1 : 0;
  if (p >= 1) return k <= n ? 1 : 0;
  let s = 0;
  for (let i = k; i <= n; i++) {
    s += Math.exp(logChoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
  }
  return Math.min(1, Math.max(0, s));
}

/**
 * P(X >= maj) for X ~ Hypergeometric(N, K, n): draw n seats without replacement
 * from a pool of N that contains K colluders, and ask the chance at least `maj`
 * of the drawn seats are colluders. This is the exact capture probability of a
 * single sortition draw, the heart of the attack demo.
 */
export function hyperTail(N: number, K: number, n: number, maj: number): number {
  K = Math.min(K, N);
  const lo = Math.max(maj, Math.max(0, n - (N - K)));
  const hi = Math.min(n, K);
  if (lo > hi) return 0;
  const denom = logChoose(N, n);
  let s = 0;
  for (let i = lo; i <= hi; i++) {
    s += Math.exp(logChoose(K, i) + logChoose(N - K, n - i) - denom);
  }
  return Math.min(1, Math.max(0, s));
}

// ===========================================================================
// Formatters — from juror-court.html (~407-419)
// ===========================================================================

/** Compact money: $1.2M / $12k / $1.5k / $42 / $4.50. Mirrors courtMoney(). */
export function courtMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n >= 1_000_000) return sign + '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return sign + '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  if (n >= 20) return sign + '$' + Math.round(n);
  return sign + '$' + n.toFixed(2);
}

/** Probability text: 0% / <0.01% / 2.34% / 12.3%. Mirrors pctText(). */
export function pctText(x: number): string {
  if (x <= 0) return '0%';
  if (x < 0.0001) return '<0.01%';
  return (x * 100).toFixed(x < 0.1 ? 2 : 1) + '%';
}

// ===========================================================================
// Wilson confidence gate — from hybrid-juror-system.html (~382-428)
// ===========================================================================

/** Coherence bar a juror's score must clear with confidence to keep full weight. */
export const WILSON_BAR = 0.7;
/** 95% two-sided normal quantile. */
export const WILSON_Z = 1.96;
/** The suspension decision is made over a rolling window of recent cases. */
export const WILSON_WINDOW = { min: 50, max: 150 } as const;

export type WilsonStatus = 'Full weight' | 'Building a record' | 'Suspended';

export interface WilsonResult {
  center: number;
  half: number;
  lo: number;
  hi: number;
  status: WilsonStatus;
}

/**
 * Wilson 95% interval for an observed accuracy `p` over `n` cases, plus the gate
 * status. The gate is deliberately conservative on *both* sides: a juror is only
 * suspended when the whole interval sits below the bar, and only credited full
 * weight when the whole interval sits above it. In between they are "building a
 * record" and draw at newcomer weight. Verbatim from the confidence-gate widget.
 *
 *   center = (p + z^2/2n) / (1 + z^2/n)
 *   half   = (z / (1 + z^2/n)) * sqrt( p(1-p)/n + z^2/4n^2 )
 */
export function wilson(p: number, n: number): WilsonResult {
  const z2 = WILSON_Z * WILSON_Z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (WILSON_Z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  const lo = Math.max(0, center - half);
  const hi = Math.min(1, center + half);

  let status: WilsonStatus;
  if (center + half < WILSON_BAR) status = 'Suspended';
  else if (center - half >= WILSON_BAR) status = 'Full weight';
  else status = 'Building a record';

  return { center, half, lo, hi, status };
}

// ===========================================================================
// Appeal-bond pricing — from hybrid-juror-system.html (~452-538)
// ===========================================================================

/** Anchor pool width (jurors) at which capture odds are evaluated. */
export const MSTAR = 500;
/** Multiplier on the capture-floor (anti-re-roll): bond >= LAMBDA * odds * stake. */
export const LAMBDA = 2;
/** The per-seat case fee used by the reference ladder math ($1.50). NOTE: the
 *  deployed core court charges $2 per question case; the sandbox keeps each widget
 *  on its own source-of-truth number (see docs/MECHANISM_DELTA.md). */
export const FEE_LADDER = 1.5;

/** Stake-scaled panel size: 7 below $10k, 15 below $1M, else 31. Verbatim panelFor(). */
export function panelFor(stake: number): number {
  return stake < 10000 ? 7 : stake < 1_000_000 ? 15 : 31;
}

export interface AppealBond {
  panel: number;
  maj: number;
  share: number;
  odds: number;
  /** Juror-cost floor: it costs this much to seat the next panel. */
  panelCost: number;
  /** Anti-re-roll / capture floor: LAMBDA * P(capture) * stake. */
  capFloor: number;
  /** The rung bond actually charged = max of the live floors. */
  bond: number;
}

/**
 * Price one rung of the appeal ladder for a case worth `stake`, defended by a
 * pool of `pool` jurors. Verbatim from the appeal-bond widget.
 *
 *   panel     = panelFor(stake)              (7 / 15 / 31)
 *   maj       = floor(panel/2) + 1
 *   share     = min(1, MSTAR / pool)         (a bloc's reach into the anchor pool)
 *   odds      = binomTail(panel, maj, share) (chance that reach captures a panel)
 *   panelCost = panel * FEE_LADDER           (juror-cost floor)
 *   capFloor  = LAMBDA * odds * stake        (anti-re-roll / capture floor)
 *   bond      = max(panelCost, capFloor)
 *
 * NOTE: the reference *prose* names three floors (juror-cost, anti-re-roll,
 * delay-rent) but the published JS computes only the two above. We port the JS
 * verbatim so the bond figures match the pitch site; the delay-rent floor is a
 * roadmap refinement, not computed. See docs/MECHANISM_DELTA.md.
 */
export function appealBond(stake: number, pool: number): AppealBond {
  const panel = panelFor(stake);
  const maj = Math.floor(panel / 2) + 1;
  const share = Math.min(1, MSTAR / pool);
  const odds = binomTail(panel, maj, share);
  const panelCost = panel * FEE_LADDER;
  const capFloor = LAMBDA * odds * stake;
  const bond = Math.max(panelCost, capFloor);
  return { panel, maj, share, odds, panelCost, capFloor, bond };
}

// ===========================================================================
// Parallel panels above the ceiling — from juror-court.html (~671-789)
// ===========================================================================

/** Fixed pool/seat/majority for the parallel-panels widget. */
export const PARALLEL = { POOL: 600, SEATS: 31, MAJ: 16 } as const;

/** Colluder count for a given share (% of the pool). Mirrors K(). */
export function colludersFor(sharePct: number): number {
  return Math.round((sharePct / 100) * PARALLEL.POOL);
}

/** Exact P(one 31-seat panel is captured) given K colluders in the 600 pool. */
export function pCaptureOne(K: number): number {
  return hyperTail(PARALLEL.POOL, K, PARALLEL.SEATS, PARALLEL.MAJ);
}

/**
 * P(all N independent panels fall on the same draw) = pCaptureOne(K)^N. Above the
 * 31-seat ceiling the court seats N non-overlapping panels (N = 1/3/5 by case
 * value) that must ALL agree, so capture odds multiply: ~1/5 -> 1/125 -> 1/3000.
 */
export function pCaptureAll(K: number, N: number): number {
  return Math.pow(pCaptureOne(K), N);
}
