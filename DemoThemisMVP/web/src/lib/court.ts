// Read-only on-chain views for the Mini App. All reads go through the viem
// publicClient for the active instance (src/lib/chain.ts). The cohort is rendered
// read-only; writes (register/commit/reveal/open) are the mainnet Step-5 path.
import { keccak256, toBytes, type Address, type Hex } from 'viem';
import { publicClient, addr, CHAIN_META, SUPPORTS_LIVENESS_RECOVERY } from './chain';
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
  /** Fixed cutoff for seating the first panel; zero on legacy deployments or after a successful draw. */
  initialDrawDeadline: bigint;
  /** Fixed first-miss recovery cutoff; zero unless a redraw is waiting. */
  recoveryDeadline: bigint;
  outcome: boolean;
  panel: readonly Address[];
  phase: Phase;
};

/** First block that can contain events from the active court deployment. */
export const COURT_DEPLOY_BLOCK = CHAIN_META.chainId === 480 ? BigInt(31_256_151) : BigInt(30_639_105);

export type ChainEventRef = {
  transactionHash: Hex;
  blockNumber: bigint;
  logIndex: number;
};

export type CaseOpenedEvent = ChainEventRef & {
  caseType: number;
  opener: Address;
  feePool: bigint;
  uri: string;
};

export type PanelDrawnEvent = ChainEventRef & {
  panel: readonly Address[];
  commitDeadline: bigint;
  revealDeadline: bigint;
};

export type CommittedEvent = ChainEventRef & { juror: Address };
export type RevealedEvent = ChainEventRef & { juror: Address; vote: boolean };
export type ResolvedEvent = ChainEventRef & {
  outcome: boolean;
  yes: bigint;
  no: bigint;
};
export type RedrawRecoveryStartedEvent = ChainEventRef & { deadline: bigint };
export type InitialDrawTimedOutEvent = ChainEventRef & {
  refundTo: Address;
  feeRefunded: bigint;
};
export type FeePaidEvent = ChainEventRef & { juror: Address; amount: bigint };
export type FeeDistributedEvent = ChainEventRef & {
  toJurors: bigint;
  toReward: bigint;
  toProtocol: bigint;
};

export type CaseReceiptEvents = {
  caseOpened: CaseOpenedEvent | null;
  panelDrawn: readonly PanelDrawnEvent[];
  committed: readonly CommittedEvent[];
  revealed: readonly RevealedEvent[];
  initialDrawTimedOut: InitialDrawTimedOutEvent | null;
  recoveryStarted: RedrawRecoveryStartedEvent | null;
  recoveryTimedOut: ChainEventRef | null;
  resolved: ResolvedEvent | null;
  feePaid: readonly FeePaidEvent[];
  feeDistributed: FeeDistributedEvent | null;
};

export type PanelJurorActivity = {
  juror: Address;
  committed: boolean;
  commitment: Hex | null;
  commitmentTransactionHash: Hex | null;
  revealed: boolean;
  vote: boolean | null;
  revealTransactionHash: Hex | null;
  payment: bigint;
  paymentTransactionHash: Hex | null;
};

export type CasePanelActivity = {
  panel: readonly PanelJurorActivity[];
  commitmentCount: number;
  revealCount: number;
  revealedVotes: readonly { juror: Address; vote: boolean; transactionHash: Hex | null }[];
};

/** Compact live read model consumed by the active-case screen. */
export type CaseActivity = {
  committedCount: number;
  revealedCount: number;
  yes: number;
  no: number;
  jurors: readonly PanelJurorActivity[];
  events: CaseReceiptEvents;
  feeDistribution: FeeDistributedEvent | null;
};

export type CaseTally = {
  yes: bigint;
  no: bigint;
  revealed: bigint;
  outcome: boolean;
};

export type JurorPayment = {
  juror: Address;
  amount: bigint;
  transactionHash: Hex;
};

/**
 * Event-backed receipt for any court case. The exact-cased transaction-hash
 * keys mirror the Solidity event names, which keeps receipt rendering simple
 * and makes it hard for a caller to accidentally present local-only progress.
 */
export type CaseReceipt = {
  case: CaseView;
  activity: CasePanelActivity;
  tally: CaseTally | null;
  payments: readonly JurorPayment[];
  feeDistribution: FeeDistributedEvent | null;
  events: CaseReceiptEvents;
  transactionHashes: {
    CaseOpened: Hex | null;
    PanelDrawn: readonly Hex[];
    Committed: readonly Hex[];
    Revealed: readonly Hex[];
    InitialDrawTimedOut: Hex | null;
    RedrawRecoveryStarted: Hex | null;
    RedrawRecoveryTimedOut: Hex | null;
    Resolved: Hex | null;
    FeePaid: readonly Hex[];
    FeeDistributed: Hex | null;
  };
};

export type CaseReceiptOptions = {
  /** Override only for a compatible custom deployment. */
  fromBlock?: bigint;
};

export type RegistryStats = {
  jurorCount: number;
  panelSize: number;
  minPool: number;
  bond: bigint;
  bondsHeld: bigint;
  rewardPool: bigint;
};

export async function registryStats(): Promise<RegistryStats> {
  const [jurorCount, panelSize, minPool, bond, bondsHeld, rewardPool] = await Promise.all([
    publicClient.readContract({ address: addr.registry, abi: jurorRegistryAbi, functionName: 'jurorCount' }),
    publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'PANEL_SIZE' }),
    publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'MIN_POOL' }),
    publicClient.readContract({ address: addr.registry, abi: jurorRegistryAbi, functionName: 'BOND' }),
    publicClient.readContract({ address: addr.musd, abi: mockUSDAbi, functionName: 'balanceOf', args: [addr.registry] }),
    publicClient.readContract({ address: addr.musd, abi: mockUSDAbi, functionName: 'balanceOf', args: [addr.rewardPool] }),
  ]);
  return {
    jurorCount: Number(jurorCount),
    panelSize: Number(panelSize),
    minPool: Number(minPool),
    bond,
    bondsHeld,
    rewardPool,
  };
}

/** Active jurors remaining after the court excludes both case parties. */
export async function eligibleJurorCount(party1: Address, party2: Address): Promise<number> {
  if (!SUPPORTS_LIVENESS_RECOVERY) {
    const count = await publicClient.readContract({
      address: addr.registry,
      abi: jurorRegistryAbi,
      functionName: 'jurorCount',
    });
    return Number(count);
  }
  const count = await publicClient.readContract({
    address: addr.court,
    abi: disputeCourtAbi,
    functionName: 'eligibleJurorCount',
    args: [party1, party2],
  });
  return Number(count);
}

export type JurorMembership = {
  registered: boolean;
  bond: bigint;
  activePanels: number;
  active: boolean;
};

/** A wallet's durable registration and current pool status. */
export async function getJurorMembership(who: Address): Promise<JurorMembership> {
  const [registered, bond, activePanels, activeIndex] = await publicClient.readContract({
    address: addr.registry,
    abi: jurorRegistryAbi,
    functionName: 'jurors',
    args: [who],
  });
  return {
    registered,
    bond,
    activePanels: Number(activePanels),
    active: activeIndex !== BigInt(0),
  };
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
  // Calling a getter absent from legacy bytecode reverts. The explicit
  // deployment capability keeps the current public addresses readable while
  // allowing replacement addresses to expose both fixed recovery deadlines.
  const initialDrawDeadlineRead = SUPPORTS_LIVENESS_RECOVERY
    ? publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'initialDrawDeadline', args: [BigInt(id)] })
    : Promise.resolve(BigInt(0));
  const recoveryDeadlineRead = SUPPORTS_LIVENESS_RECOVERY
    ? publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'redrawDeadline', args: [BigInt(id)] })
    : Promise.resolve(BigInt(0));
  const [c, phase, initialDrawDeadline, recoveryDeadline] = await Promise.all([
    publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'getCase', args: [BigInt(id)] }),
    publicClient.readContract({ address: addr.court, abi: disputeCourtAbi, functionName: 'phaseOf', args: [BigInt(id)] }),
    initialDrawDeadlineRead,
    recoveryDeadlineRead,
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
    initialDrawDeadline,
    recoveryDeadline,
    outcome: c.outcome,
    panel: c.panel,
    phase: PHASES[Number(phase)],
  };
}

type EventLogPosition = {
  transactionHash: Hex | null;
  blockNumber: bigint | null;
  logIndex: number | null;
};

const ZERO_HASH = `0x${'0'.repeat(64)}` as Hex;

function eventRef(log: EventLogPosition): ChainEventRef {
  if (log.transactionHash === null || log.blockNumber === null || log.logIndex === null) {
    throw new Error('Receipt event is not yet in a mined block');
  }
  return {
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
  };
}

function lastOf<T>(items: readonly T[]): T | null {
  return items.length === 0 ? null : items[items.length - 1];
}

function requiredEventArg<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Receipt event is missing ${name}`);
  return value;
}

const caseOpenedBlockCache = new Map<string, bigint>();

/** All receipt-relevant logs for one case, filtered by its indexed caseId. */
export async function getCaseReceiptEvents(
  id: number,
  options: CaseReceiptOptions = {},
): Promise<CaseReceiptEvents> {
  const caseId = BigInt(id);
  const fromBlock = options.fromBlock ?? COURT_DEPLOY_BLOCK;
  const cacheKey = `${addr.court.toLowerCase()}:${fromBlock}:${id}`;
  let openedBlock = caseOpenedBlockCache.get(cacheKey);

  if (openedBlock === undefined) {
    const openingLogs = await publicClient.getContractEvents({
      address: addr.court,
      abi: disputeCourtAbi,
      eventName: 'CaseOpened',
      args: { caseId },
      fromBlock,
      toBlock: 'latest',
      strict: true,
    });
    const openingLog = lastOf(openingLogs);
    if (openingLog?.blockNumber !== null && openingLog?.blockNumber !== undefined) {
      openedBlock = openingLog.blockNumber;
      caseOpenedBlockCache.set(cacheKey, openedBlock);
    }
  }

  // Once CaseOpened is found, all later receipt events live in a tiny range.
  // Fetching every court event in that range takes one RPC call; filtering here
  // is substantially lighter than seven full-history eth_getLogs requests per
  // four-second UI poll.
  const logs = await publicClient.getContractEvents({
    address: addr.court,
    abi: disputeCourtAbi,
    fromBlock: openedBlock ?? fromBlock,
    toBlock: 'latest' as const,
    strict: true,
  });
  const caseLogs = logs.filter((log) => log.args.caseId === caseId);
  const openedLogs = caseLogs.filter((log) => log.eventName === 'CaseOpened');
  const drawnLogs = caseLogs.filter((log) => log.eventName === 'PanelDrawn');
  const committedLogs = caseLogs.filter((log) => log.eventName === 'Committed');
  const revealedLogs = caseLogs.filter((log) => log.eventName === 'Revealed');
  const initialDrawTimedOutLogs = caseLogs.filter((log) => log.eventName === 'InitialDrawTimedOut');
  const recoveryStartedLogs = caseLogs.filter((log) => log.eventName === 'RedrawRecoveryStarted');
  const recoveryTimedOutLogs = caseLogs.filter((log) => log.eventName === 'RedrawRecoveryTimedOut');
  const resolvedLogs = caseLogs.filter((log) => log.eventName === 'Resolved');
  const paidLogs = caseLogs.filter((log) => log.eventName === 'FeePaid');
  const distributedLogs = caseLogs.filter((log) => log.eventName === 'FeeDistributed');

  const caseOpened = openedLogs.map((log) => ({
    ...eventRef(log),
    caseType: Number(requiredEventArg(log.args.caseType, 'caseType')),
    opener: requiredEventArg(log.args.opener, 'opener'),
    feePool: requiredEventArg(log.args.feePool, 'feePool'),
    uri: requiredEventArg(log.args.uri, 'uri'),
  }));
  const panelDrawn = drawnLogs.map((log) => ({
    ...eventRef(log),
    panel: requiredEventArg(log.args.panel, 'panel'),
    commitDeadline: requiredEventArg(log.args.commitDeadline, 'commitDeadline'),
    revealDeadline: requiredEventArg(log.args.revealDeadline, 'revealDeadline'),
  }));
  const committed = committedLogs.map((log) => ({
    ...eventRef(log),
    juror: requiredEventArg(log.args.juror, 'juror'),
  }));
  const revealed = revealedLogs.map((log) => ({
    ...eventRef(log),
    juror: requiredEventArg(log.args.juror, 'juror'),
    vote: requiredEventArg(log.args.vote, 'vote'),
  }));
  const initialDrawTimedOut = initialDrawTimedOutLogs.map((log) => ({
    ...eventRef(log),
    refundTo: requiredEventArg(log.args.refundTo, 'refundTo'),
    feeRefunded: requiredEventArg(log.args.feeRefunded, 'feeRefunded'),
  }));
  const recoveryStarted = recoveryStartedLogs.map((log) => ({
    ...eventRef(log),
    deadline: requiredEventArg(log.args.deadline, 'deadline'),
  }));
  const recoveryTimedOut = recoveryTimedOutLogs.map((log) => eventRef(log));
  const resolved = resolvedLogs.map((log) => ({
    ...eventRef(log),
    outcome: requiredEventArg(log.args.outcome, 'outcome'),
    yes: requiredEventArg(log.args.yes, 'yes'),
    no: requiredEventArg(log.args.no, 'no'),
  }));
  const feePaid = paidLogs.map((log) => ({
    ...eventRef(log),
    juror: requiredEventArg(log.args.juror, 'juror'),
    amount: requiredEventArg(log.args.amount, 'amount'),
  }));
  const feeDistributed = distributedLogs.map((log) => ({
    ...eventRef(log),
    toJurors: requiredEventArg(log.args.toJurors, 'toJurors'),
    toReward: requiredEventArg(log.args.toReward, 'toReward'),
    toProtocol: requiredEventArg(log.args.toProtocol, 'toProtocol'),
  }));

  return {
    caseOpened: lastOf(caseOpened),
    panelDrawn,
    committed,
    revealed,
    initialDrawTimedOut: lastOf(initialDrawTimedOut),
    recoveryStarted: lastOf(recoveryStarted),
    recoveryTimedOut: lastOf(recoveryTimedOut),
    resolved: lastOf(resolved),
    feePaid,
    feeDistributed: lastOf(feeDistributed),
  };
}

async function readPanelActivity(
  caseId: number,
  panel: readonly Address[],
  events: CaseReceiptEvents,
): Promise<CasePanelActivity> {
  const states = await Promise.all(
    panel.map(async (juror) => {
      const [commitment, revealed, vote] = await Promise.all([
        publicClient.readContract({
          address: addr.court,
          abi: disputeCourtAbi,
          functionName: 'commitmentOf',
          args: [BigInt(caseId), juror],
        }),
        publicClient.readContract({
          address: addr.court,
          abi: disputeCourtAbi,
          functionName: 'hasRevealed',
          args: [BigInt(caseId), juror],
        }),
        publicClient.readContract({
          address: addr.court,
          abi: disputeCourtAbi,
          functionName: 'voteOf',
          args: [BigInt(caseId), juror],
        }),
      ]);
      return { juror, commitment, revealed, vote };
    }),
  );

  const activity = states.map(({ juror, commitment, revealed, vote }): PanelJurorActivity => {
    const key = juror.toLowerCase();
    const commitEvent = lastOf(events.committed.filter((event) => event.juror.toLowerCase() === key));
    const revealEvent = lastOf(events.revealed.filter((event) => event.juror.toLowerCase() === key));
    const paymentEvents = events.feePaid.filter((event) => event.juror.toLowerCase() === key);
    const paymentEvent = lastOf(paymentEvents);
    const payment = paymentEvents.reduce((sum, event) => sum + event.amount, BigInt(0));
    const committed = commitment.toLowerCase() !== ZERO_HASH;

    return {
      juror,
      committed,
      commitment: committed ? commitment : null,
      commitmentTransactionHash: committed ? (commitEvent?.transactionHash ?? null) : null,
      revealed,
      vote: revealed ? vote : null,
      revealTransactionHash: revealed ? (revealEvent?.transactionHash ?? null) : null,
      payment,
      paymentTransactionHash: paymentEvent?.transactionHash ?? null,
    };
  });

  return {
    panel: activity,
    commitmentCount: activity.filter((juror) => juror.committed).length,
    revealCount: activity.filter((juror) => juror.revealed).length,
    revealedVotes: activity
      .filter((juror): juror is PanelJurorActivity & { vote: boolean } => juror.vote !== null)
      .map((juror) => ({
        juror: juror.juror,
        vote: juror.vote,
        transactionHash: juror.revealTransactionHash,
      })),
  };
}

/**
 * Current per-panel state and its receipt events. Pass a panel already returned
 * by getCase() to avoid one redundant case read on frequently polled screens.
 */
export async function getCaseActivity(
  caseId: number,
  panel?: readonly Address[],
  options: CaseReceiptOptions = {},
): Promise<CaseActivity> {
  const [resolvedPanel, events] = await Promise.all([
    panel === undefined ? getCase(caseId).then((courtCase) => courtCase.panel) : Promise.resolve(panel),
    getCaseReceiptEvents(caseId, options),
  ]);
  const activity = await readPanelActivity(caseId, resolvedPanel, events);
  const finalTally = events.resolved;
  const yes = finalTally === null ? activity.revealedVotes.filter((vote) => vote.vote).length : Number(finalTally.yes);
  const no = finalTally === null ? activity.revealedVotes.filter((vote) => !vote.vote).length : Number(finalTally.no);

  return {
    committedCount: activity.commitmentCount,
    revealedCount: activity.revealCount,
    yes,
    no,
    jurors: activity.panel,
    events,
    feeDistribution: events.feeDistributed,
  };
}

/** Full immutable receipt when resolved, or live partial receipt while active. */
export async function getCaseReceipt(id: number, options: CaseReceiptOptions = {}): Promise<CaseReceipt> {
  const [courtCase, events] = await Promise.all([getCase(id), getCaseReceiptEvents(id, options)]);
  const activity = await readPanelActivity(id, courtCase.panel, events);
  const resolved = events.resolved;

  return {
    case: courtCase,
    activity,
    tally:
      resolved === null
        ? null
        : {
            yes: resolved.yes,
            no: resolved.no,
            revealed: resolved.yes + resolved.no,
            outcome: resolved.outcome,
          },
    payments: events.feePaid.map(({ juror, amount, transactionHash }) => ({ juror, amount, transactionHash })),
    feeDistribution: events.feeDistributed,
    events,
    transactionHashes: {
      CaseOpened: events.caseOpened?.transactionHash ?? null,
      PanelDrawn: events.panelDrawn.map((event) => event.transactionHash),
      Committed: events.committed.map((event) => event.transactionHash),
      Revealed: events.revealed.map((event) => event.transactionHash),
      InitialDrawTimedOut: events.initialDrawTimedOut?.transactionHash ?? null,
      RedrawRecoveryStarted: events.recoveryStarted?.transactionHash ?? null,
      RedrawRecoveryTimedOut: events.recoveryTimedOut?.transactionHash ?? null,
      Resolved: events.resolved?.transactionHash ?? null,
      FeePaid: events.feePaid.map((event) => event.transactionHash),
      FeeDistributed: events.feeDistributed?.transactionHash ?? null,
    },
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
  sequence?: number;
  title?: string;
  type?: string;
  standard?: string;
  question?: string;
  yesRule?: string;
  judgedAsOf?: string;
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
