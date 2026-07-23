import type { Address, Hex } from 'viem';
import type { CaseView, RegistryStats } from './court';
import { eligibleJurorCount, listCases, registryStats } from './court';
import { BOND, MVP_CONFIGURED, SUPPORTS_LIVENESS_RECOVERY } from './chain';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export type QuestionQueueEntry = {
  sequence: number;
  slug: string;
  uri: string;
  criteriaHash: Hex;
  title: string;
};

export type QuestionQueueManifest = {
  version: 1;
  policy: 'one-active-at-a-time';
  officialOpener: Address;
  questions: QuestionQueueEntry[];
};

export type OracleDashboard = {
  stats: RegistryStats;
  activeCase: CaseView | null;
  resolvedCases: CaseView[];
  nextQuestion: QuestionQueueEntry | null;
  queue: QuestionQueueEntry[];
  officialOpener: Address;
  officialEligibleJurors: number;
  overlappingActiveCases: number;
  unofficialActiveCaseIds: number[];
};

let manifestCache: QuestionQueueManifest | null = null;

function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function isHash(value: unknown): value is Hex {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isQueueEntry(value: unknown): value is QuestionQueueEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<QuestionQueueEntry>;
  return (
    Number.isInteger(entry.sequence) &&
    typeof entry.slug === 'string' &&
    typeof entry.uri === 'string' &&
    isHash(entry.criteriaHash) &&
    typeof entry.title === 'string'
  );
}

export async function loadQuestionManifest(): Promise<QuestionQueueManifest> {
  if (manifestCache) return manifestCache;
  const response = await fetch('/cases/question-queue.json', { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Question queue unavailable (HTTP ${response.status})`);
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== 'object') throw new Error('Question queue manifest is malformed.');
  const possible = raw as Partial<QuestionQueueManifest>;
  const questions = Array.isArray(possible.questions) ? possible.questions : [];
  const sequencesAreExact = questions.every((entry, index) => isQueueEntry(entry) && entry.sequence === index + 1);
  if (
    possible.version !== 1 ||
    possible.policy !== 'one-active-at-a-time' ||
    !isAddress(possible.officialOpener) ||
    questions.length !== 21 ||
    !sequencesAreExact
  ) {
    throw new Error('Question queue must contain 21 valid, sequential entries and a fixed official opener.');
  }
  manifestCache = {
    version: 1,
    policy: 'one-active-at-a-time',
    officialOpener: possible.officialOpener,
    questions: questions as QuestionQueueEntry[],
  };
  return manifestCache;
}

export async function loadQuestionQueue(): Promise<QuestionQueueEntry[]> {
  return (await loadQuestionManifest()).questions;
}

/** Return the manifest entry only when every official queue identity field matches. */
export function officialQueueEntryForCase(
  manifest: QuestionQueueManifest,
  courtCase: CaseView,
): QuestionQueueEntry | undefined {
  if (courtCase.caseType !== 0 || courtCase.party1.toLowerCase() !== manifest.officialOpener.toLowerCase()) {
    return undefined;
  }
  const entry = manifest.questions.find((question) => question.uri === courtCase.uri);
  return entry?.criteriaHash.toLowerCase() === courtCase.criteriaHash.toLowerCase() ? entry : undefined;
}

export async function loadOracleDashboard(): Promise<OracleDashboard> {
  if (!MVP_CONFIGURED) {
    const manifest = await loadQuestionManifest();
    return {
      stats: {
        jurorCount: 0,
        panelSize: 3,
        minPool: 4,
        bond: BOND,
        bondsHeld: BigInt(0),
        rewardPool: BigInt(0),
      },
      activeCase: null,
      resolvedCases: [],
      nextQuestion: manifest.questions[0] ?? null,
      queue: manifest.questions,
      officialOpener: manifest.officialOpener,
      officialEligibleJurors: 0,
      overlappingActiveCases: 0,
      unofficialActiveCaseIds: [],
    };
  }
  const [stats, cases, manifest] = await Promise.all([registryStats(), listCases(), loadQuestionManifest()]);
  const officialEligibleJurors = SUPPORTS_LIVENESS_RECOVERY
    ? await eligibleJurorCount(manifest.officialOpener, ZERO_ADDRESS)
    : stats.jurorCount;
  const queueCases = cases.filter((courtCase) => officialQueueEntryForCase(manifest, courtCase) !== undefined);
  const activeCases = queueCases.filter((courtCase) => courtCase.phase !== 'Resolved').sort((a, b) => a.id - b.id);
  const resolvedCases = queueCases.filter((courtCase) => courtCase.phase === 'Resolved').sort((a, b) => b.id - a.id);
  const officialCaseIds = new Set(queueCases.map((courtCase) => courtCase.id));
  const unofficialActiveCaseIds = cases
    .filter((courtCase) => courtCase.phase !== 'Resolved' && !officialCaseIds.has(courtCase.id))
    .map((courtCase) => courtCase.id)
    .sort((a, b) => a - b);
  const filedUris = new Set(queueCases.map((courtCase) => courtCase.uri));
  const nextQuestion = manifest.questions.find((entry) => !filedUris.has(entry.uri)) ?? null;

  return {
    stats,
    activeCase: activeCases[0] ?? null,
    resolvedCases,
    nextQuestion,
    queue: manifest.questions,
    officialOpener: manifest.officialOpener,
    officialEligibleJurors,
    overlappingActiveCases: Math.max(0, activeCases.length - 1),
    unofficialActiveCaseIds,
  };
}

export function queueEntryForUri(queue: QuestionQueueEntry[], uri: string): QuestionQueueEntry | undefined {
  return queue.find((entry) => entry.uri === uri);
}
