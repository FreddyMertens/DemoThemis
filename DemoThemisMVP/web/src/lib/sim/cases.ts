// Canned case content for the sandbox — illustrative cases of the same two demo
// types (escrow deal + resolution question) as the on-chain cohort, NOT the same
// blobs (the cohort seed/keeper open the q-*/e-* files in web/public/cases/).
// All labeled-as-illustrative; the simulated court resolves them client-side.

export interface CaseContent {
  title: string;
  question: string;
  standard: 'objective' | 'rubric';
  evidence: { label: string; url: string }[];
  /** Present on escrow (type A) cases only. */
  terms?: string;
}

export interface CaseRef {
  slug: string;
  type: 'escrow' | 'question';
}

/** Manifest of the canned cases (authored in web/public/cases/). */
export const CASES: CaseRef[] = [
  { slug: 'escrow-logo-brief', type: 'escrow' },
  { slug: 'escrow-site-missing-feature', type: 'escrow' },
  { slug: 'escrow-used-gpu-faulty', type: 'escrow' },
  { slug: 'escrow-translation-quality', type: 'escrow' },
  { slug: 'escrow-deposit-damage', type: 'escrow' },
  { slug: 'escrow-bulk-short-shipment', type: 'escrow' },
  { slug: 'market-eth-close-4000', type: 'question' },
  { slug: 'market-match-winner', type: 'question' },
  { slug: 'market-cpi-above-3', type: 'question' },
  { slug: 'market-tvl-exceeds', type: 'question' },
  { slug: 'market-film-opening', type: 'question' },
  { slug: 'market-temp-record', type: 'question' },
];

/** Fetch one case's content from the same-origin public folder. */
export async function loadCase(slug: string): Promise<CaseContent> {
  const res = await fetch(`/cases/${slug}.json`);
  if (!res.ok) throw new Error(`case ${slug} not found (${res.status})`);
  return (await res.json()) as CaseContent;
}
