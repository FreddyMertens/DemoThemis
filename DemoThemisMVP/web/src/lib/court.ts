// Read-only on-chain views for the Mini App. All reads go through the viem
// publicClient for the active instance (src/lib/chain.ts). The cohort is rendered
// read-only; writes (register/commit/reveal/open) are the mainnet Step-5 path.
import { keccak256, toBytes, type Address, type Hex } from 'viem';
import { publicClient, addr } from './chain';
import { disputeCourtAbi } from '@/abi/DisputeCourt';
import { jurorRegistryAbi } from '@/abi/JurorRegistry';
import { dealEscrowAbi } from '@/abi/DealEscrow';
import { mockUSDAbi } from '@/abi/MockUSD';

export const PHASES = ['Open', 'Commit', 'Reveal', 'Resolvable', 'Resolved'] as const;
export type Phase = (typeof PHASES)[number];
export const STATUS = ['Open', 'Drawn', 'Resolved'] as const;

export type CaseView = {
  id: number;
  caseType: number; // 0 = question, 1 = escrow
  status: number;
  redraws: number;
  party1: Address;
  party2: Address;
  criteriaHash: Hex;
  uri: string;
  dealId: bigint;
  feePool: bigint;
  drawBlock: bigint;
  commitDeadline: bigint;
  revealDeadline: bigint;
  outcome: boolean;
  panel: readonly Address[];
  phase: Phase;
};

export type RegistryStats = {
  jurorCount: number;
  bond: bigint;
  bondsHeld: bigint;
  rewardPool: bigint;
};

export async function registryStats(): Promise<RegistryStats> {
  const [jurorCount, bond, bondsHeld, rewardPool] = await Promise.all([
    publicClient.readContract({ address: addr.registry, abi: jurorRegistryAbi, functionName: 'jurorCount' }),
    publicClient.readContract({ address: addr.registry, abi: jurorRegistryAbi, functionName: 'BOND' }),
    publicClient.readContract({ address: addr.musd, abi: mockUSDAbi, functionName: 'balanceOf', args: [addr.registry] }),
    publicClient.readContract({ address: addr.musd, abi: mockUSDAbi, functionName: 'balanceOf', args: [addr.rewardPool] }),
  ]);
  return { jurorCount: Number(jurorCount), bond, bondsHeld, rewardPool };
}

/** A wallet's MUSD balance (6 decimals). */
export async function musdBalanceOf(who: Address): Promise<bigint> {
  return publicClient.readContract({ address: addr.musd, abi: mockUSDAbi, functionName: 'balanceOf', args: [who] });
}

/** Unix-seconds when `who` may next call the faucet (0 = available now). */
export async function faucetAvailableAt(who: Address): Promise<number> {
  const [last, interval] = await Promise.all([
    publicClient.readContract({ address: addr.musd, abi: mockUSDAbi, functionName: 'lastFaucet', args: [who] }),
    publicClient.readContract({ address: addr.musd, abi: mockUSDAbi, functionName: 'FAUCET_INTERVAL' }),
  ]);
  return last === BigInt(0) ? 0 : Number(last + interval);
}

export async function caseCount(): Promise<number> {
  return Number(await publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'caseCount' }));
}

export async function getCase(id: number): Promise<CaseView> {
  const [c, phase] = await Promise.all([
    publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'getCase', args: [BigInt(id)] }),
    publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'phaseOf', args: [BigInt(id)] }),
  ]);
  return {
    id,
    caseType: c.caseType,
    status: c.status,
    redraws: c.redraws,
    party1: c.party1,
    party2: c.party2,
    criteriaHash: c.criteriaHash,
    uri: c.uri,
    dealId: c.dealId,
    feePool: c.feePool,
    drawBlock: c.drawBlock,
    commitDeadline: c.commitDeadline,
    revealDeadline: c.revealDeadline,
    outcome: c.outcome,
    panel: c.panel,
    phase: PHASES[Number(phase)],
  };
}

const caseCache = new Map<number, CaseView>();
let cachedCaseCount = 0;

/** All cases, newest first. Resolved history is immutable, so cache it and only
 * refetch new or still-active cases on each poll. */
export async function listCases(): Promise<CaseView[]> {
  const n = await caseCount();
  if (n === 0) {
    caseCache.clear();
    cachedCaseCount = 0;
    return [];
  }

  if (n < cachedCaseCount) caseCache.clear();

  const idsToRefresh = Array.from({ length: n }, (_, id) => id).filter((id) => {
    const cached = caseCache.get(id);
    return !cached || cached.phase !== 'Resolved';
  });

  // Avoid hitting the public RPC with the entire seeded history at once.
  const batchSize = 24;
  for (let offset = 0; offset < idsToRefresh.length; offset += batchSize) {
    const ids = idsToRefresh.slice(offset, offset + batchSize);
    const fresh = await Promise.all(ids.map((id) => getCase(id)));
    fresh.forEach((courtCase) => caseCache.set(courtCase.id, courtCase));
  }

  cachedCaseCount = n;
  return Array.from({ length: n }, (_, index) => caseCache.get(n - 1 - index)).filter(
    (courtCase): courtCase is CaseView => courtCase !== undefined,
  );
}

export type DealView = {
  payer: Address;
  payee: Address;
  amount: bigint;
  fee: bigint;
  termsHash: Hex;
  uri: string;
  status: number; // 0 None,1 Funded,2 Released,3 Disputed,4 Settled
  caseId: bigint;
};
export const DEAL_STATUS = ['None', 'Funded', 'Released', 'Disputed', 'Settled'] as const;

export async function getDeal(id: bigint): Promise<DealView> {
  const d = await publicClient.readContract({ address: addr.escrow, abi: dealEscrowAbi, functionName: 'getDeal', args: [id] });
  return d as DealView;
}

export type CaseContent = {
  title?: string;
  type?: string;
  standard?: string;
  question?: string;
  resolution?: string;
  terms?: string;
  evidence?: { label: string; url: string }[];
  simulated?: boolean;
};

/** Fetch a case's same-origin JSON and verify it matches the on-chain criteriaHash. */
export async function fetchCaseContent(
  uri: string,
  criteriaHash: string,
): Promise<{ ok: boolean; content?: CaseContent; hash?: string; matches?: boolean; error?: string }> {
  try {
    const res = await fetch(uri);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = await res.text();
    const hash = keccak256(toBytes(text));
    return {
      ok: true,
      content: JSON.parse(text) as CaseContent,
      hash,
      matches: hash.toLowerCase() === criteriaHash.toLowerCase(),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
