// Seedable PRNG for the sandbox.
//
// Mulberry32: a tiny, fast, deterministic generator. A fixed seed reproduces the
// exact same sequence, so the attack curve and the "run 100 cases" sweep look
// identical every time the demo video is shot, and a "re-roll seed" control can
// hand the engine a fresh stream on demand. This is a SIMULATION aid, not a
// security primitive — on-chain draw randomness is blockhash-based (and is a
// documented limitation; drand/VRF is funded-milestone #1). See MECHANISM_DELTA.md.

export type Rng = () => number;

/** The default seed. Chosen once so the flagship curves reproduce for the video. */
export const DEFAULT_SEED = 0x7d_e3_05; // 8_249_605

/** Returns a deterministic [0, 1) generator seeded by `seed`. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** In-place Fisher-Yates shuffle of `arr` using `rng`. Returns the same array. */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let j = arr.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    const t = arr[j];
    arr[j] = arr[k];
    arr[k] = t;
  }
  return arr;
}

/** `k` distinct indices drawn without replacement from [0, n) (a sortition draw). */
export function sampleIndices(rng: Rng, n: number, k: number): number[] {
  const count = Math.min(k, n);
  if (count <= 0) return [];

  // For tiny panels out of very wide pools, allocating and shuffling [0..n) is
  // wildly expensive. Rejection sampling keeps the draw O(k) while preserving a
  // uniform sample without replacement. Keep the old shuffle path for small pools
  // so the core-court seeded demos remain stable.
  if (n > 2048 && count <= n / 4) {
    const picked = new Set<number>();
    while (picked.size < count) picked.add(randInt(rng, n));
    return Array.from(picked);
  }

  const idx = Array.from({ length: n }, (_, i) => i);
  shuffle(rng, idx);
  return idx.slice(0, count);
}
