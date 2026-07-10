import { formatUnits } from 'viem';

/** MockUSD has 6 decimals. Trims trailing zeros for display. */
export function fmtMusd(x: bigint): string {
  const s = formatUnits(x, 6);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export const shortAddr = (a: string): string =>
  a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;

/** Seconds remaining until a unix-seconds deadline, or 0 if passed. */
export function secsUntil(deadline: bigint): number {
  return Math.max(0, Number(deadline) - Math.floor(Date.now() / 1000));
}

export function fmtCountdown(deadline: bigint): string {
  const s = secsUntil(deadline);
  if (s === 0) return 'elapsed';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
