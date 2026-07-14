#!/usr/bin/env node
/**
 * Conservative operator for the official World Chain mainnet question queue.
 *
 * It broadcasts at most one transaction per invocation and never casts a juror
 * vote. The default is a read-only dry run; add --execute to broadcast the one
 * indicated operator action. Funding and approval prerequisites each consume a
 * run, so opening can only happen on a later invocation.
 *
 *   node scripts/mainnet-question-keeper.mjs
 *   PRIVATE_KEY=0x... node scripts/mainnet-question-keeper.mjs --execute
 */
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requireFromWeb = createRequire(new URL('../web/package.json', import.meta.url));
const {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  keccak256,
  maxUint256,
} = requireFromWeb('viem');
const { privateKeyToAccount } = requireFromWeb('viem/accounts');
const { worldchain } = requireFromWeb('viem/chains');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'web', 'public');
const MANIFEST_PATH = path.join(PUBLIC, 'cases', 'question-queue.json');
const DEPLOYMENT_PATH = path.join(ROOT, 'contracts', 'deployments', 'worldchain-mainnet.json');
const RPC = process.env.RPC ?? 'https://worldchain-mainnet.gateway.tenderly.co';
const REQUIRED_JURORS = BigInt(3);
const MIN_HUMAN_DURATION = BigInt(300);
const EXECUTE = process.argv.includes('--execute');
const HELP = process.argv.includes('--help') || process.argv.includes('-h');
const unknownArgs = process.argv.slice(2).filter((arg) => !['--execute', '--help', '-h'].includes(arg));

if (HELP) {
  console.log(`Usage:
  node scripts/mainnet-question-keeper.mjs          # read-only next-action report
  PRIVATE_KEY=0x... node scripts/mainnet-question-keeper.mjs --execute

The operator funds/approves/opens/draws/resolves one step at a time.
Jurors commit and reveal manually.`);
  process.exit(0);
}
if (unknownArgs.length !== 0) throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}`);

const deployment = JSON.parse(await readFile(DEPLOYMENT_PATH, 'utf8'));
if (deployment.chainId !== 480) throw new Error('Keeper requires the World Chain mainnet deployment (chain 480).');

const COURT = getAddress(deployment.contracts.DisputeCourt);
const REGISTRY = getAddress(deployment.contracts.JurorRegistry);
const MUSD = getAddress(deployment.contracts.MockUSD);

const caseComponents = [
  { name: 'caseType', type: 'uint8' },
  { name: 'status', type: 'uint8' },
  { name: 'redraws', type: 'uint8' },
  { name: 'party1', type: 'address' },
  { name: 'party2', type: 'address' },
  { name: 'criteriaHash', type: 'bytes32' },
  { name: 'uri', type: 'string' },
  { name: 'dealId', type: 'uint256' },
  { name: 'feePool', type: 'uint256' },
  { name: 'drawBlock', type: 'uint64' },
  { name: 'commitDeadline', type: 'uint64' },
  { name: 'revealDeadline', type: 'uint64' },
  { name: 'outcome', type: 'bool' },
  { name: 'panel', type: 'address[]' },
];

const courtAbi = [
  {
    type: 'function',
    name: 'caseCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getCase',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: caseComponents }],
  },
  {
    type: 'function',
    name: 'phaseOf',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'uint256' }],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'CASE_FEE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'MIN_POOL',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'PANEL_SIZE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'commitDuration',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'revealDuration',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'commitmentOf',
    stateMutability: 'view',
    inputs: [
      { name: 'caseId', type: 'uint256' },
      { name: 'juror', type: 'address' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'hasRevealed',
    stateMutability: 'view',
    inputs: [
      { name: 'caseId', type: 'uint256' },
      { name: 'juror', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'openQuestion',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'criteriaHash', type: 'bytes32' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ name: 'caseId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'draw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'caseId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'resolve',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'caseId', type: 'uint256' }],
    outputs: [],
  },
];

const registryAbi = [
  {
    type: 'function',
    name: 'jurorCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isActive',
    stateMutability: 'view',
    inputs: [{ name: 'who', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
];

const tokenAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  { type: 'function', name: 'faucet', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
];

const publicClient = createPublicClient({ chain: worldchain, transport: http(RPC) });
const privateKey = process.env.PRIVATE_KEY?.trim().replace(/^['"]|['"]$/g, '');
if (EXECUTE && !privateKey) throw new Error('PRIVATE_KEY is required with --execute.');
const account = privateKey ? privateKeyToAccount(privateKey) : null;
const operator = account?.address ?? getAddress(process.env.OPERATOR_ADDRESS ?? deployment.deployer);
const walletClient = account
  ? createWalletClient({ account, chain: worldchain, transport: http(RPC) })
  : null;

async function loadQueue() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  if (manifest.version !== 1 || manifest.policy !== 'one-active-at-a-time') {
    throw new Error('Unsupported question queue manifest version or policy.');
  }
  if (!Array.isArray(manifest.questions) || manifest.questions.length !== 21) {
    throw new Error('Question queue must contain exactly 21 entries.');
  }
  const officialOpener = getAddress(manifest.officialOpener);

  const seenSlugs = new Set();
  const seenUris = new Set();
  const allowedQuestionKeys = [
    'judgedAsOf',
    'question',
    'sequence',
    'simulated',
    'standard',
    'title',
    'type',
    'yesRule',
  ];

  const questions = await Promise.all(
    [...manifest.questions]
      .sort((a, b) => a.sequence - b.sequence)
      .map(async (entry, index) => {
        const sequence = index + 1;
        if (entry.sequence !== sequence) throw new Error(`Queue sequence must be contiguous at ${sequence}.`);
        if (
          typeof entry.slug !== 'string' ||
          typeof entry.uri !== 'string' ||
          typeof entry.criteriaHash !== 'string' ||
          typeof entry.title !== 'string'
        ) {
          throw new Error(`Queue entry ${sequence} is malformed.`);
        }
        if (seenSlugs.has(entry.slug) || seenUris.has(entry.uri)) throw new Error(`Duplicate queue entry ${sequence}.`);
        seenSlugs.add(entry.slug);
        seenUris.add(entry.uri);

        const expectedUri = `/cases/queue/${entry.slug}.json`;
        if (entry.uri !== expectedUri) throw new Error(`Queue entry ${sequence} has a non-canonical URI.`);
        const filePath = path.join(PUBLIC, ...entry.uri.slice(1).split('/'));
        const bytes = await readFile(filePath);
        const question = JSON.parse(bytes.toString('utf8'));
        const keys = Object.keys(question).sort();
        if (JSON.stringify(keys) !== JSON.stringify(allowedQuestionKeys)) {
          throw new Error(`${entry.uri} must contain only the approved question fields.`);
        }
        if (
          question.sequence !== entry.sequence ||
          question.title !== entry.title ||
          question.type !== 'question' ||
          question.standard !== 'public-research' ||
          question.simulated !== false ||
          typeof question.question !== 'string' ||
          typeof question.yesRule !== 'string' ||
          Number.isNaN(Date.parse(question.judgedAsOf))
        ) {
          throw new Error(`${entry.uri} does not match its manifest entry or schema.`);
        }

        const hash = keccak256(new Uint8Array(bytes));
        if (entry.criteriaHash.toLowerCase() !== hash.toLowerCase()) {
          throw new Error(`Manifest hash does not match the exact bytes of ${entry.uri}.`);
        }
        return { ...entry, hash, question };
      }),
  );
  return { officialOpener, questions };
}

async function readCourtCases() {
  const count = Number(
    await publicClient.readContract({ address: COURT, abi: courtAbi, functionName: 'caseCount' }),
  );
  const cases = await Promise.all(
    Array.from({ length: count }, async (_, id) => ({
      id,
      data: await publicClient.readContract({
        address: COURT,
        abi: courtAbi,
        functionName: 'getCase',
        args: [BigInt(id)],
      }),
    })),
  );
  return cases;
}

async function phaseOf(caseId) {
  return Number(
    await publicClient.readContract({
      address: COURT,
      abi: courtAbi,
      functionName: 'phaseOf',
      args: [BigInt(caseId)],
    }),
  );
}

async function send(label, contract) {
  if (!EXECUTE || account === null || walletClient === null) {
    console.log(`DRY RUN: would ${label}`);
    return null;
  }
  const { request } = await publicClient.simulateContract({ ...contract, account });
  const hash = await walletClient.writeContract(request);
  console.log(`${label}: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`${label} reverted: ${hash}`);
  return hash;
}

function refuseExpectedAction(message) {
  if (EXECUTE) throw new Error(message);
  console.log(`BLOCKED: ${message}`);
  process.exit(0);
}

function waitForJurors(message) {
  console.log(`WAITING: ${message}`);
  process.exit(0);
}

function requireExactJurorCount(nextAction, jurorCount) {
  if (jurorCount === REQUIRED_JURORS) return;
  if (jurorCount < REQUIRED_JURORS) {
    waitForJurors(`${nextAction} will begin after exactly ${REQUIRED_JURORS} active jurors register; found ${jurorCount}.`);
  }
  refuseExpectedAction(
    `Refusing to ${nextAction}: the official demo requires exactly ${REQUIRED_JURORS} active jurors; found ${jurorCount}. An extra juror must leave the active pool.`,
  );
}

async function reportJurorProgress(active) {
  const states = await Promise.all(
    active.data.panel.map(async (juror) => {
      const [commitment, revealed] = await Promise.all([
        publicClient.readContract({
          address: COURT,
          abi: courtAbi,
          functionName: 'commitmentOf',
          args: [BigInt(active.id), juror],
        }),
        publicClient.readContract({
          address: COURT,
          abi: courtAbi,
          functionName: 'hasRevealed',
          args: [BigInt(active.id), juror],
        }),
      ]);
      return { committed: !/^0x0{64}$/i.test(commitment), revealed };
    }),
  );
  console.log(`Juror progress: ${states.filter((state) => state.committed).length}/${states.length} sealed, ${states.filter((state) => state.revealed).length}/${states.length} revealed.`);
}

const { officialOpener, questions: queue } = await loadQueue();
const queueByUri = new Map(queue.map((entry) => [entry.uri, entry]));
const allCases = await readCourtCases();
const officialCases = allCases.filter(({ data }) => {
  const entry = queueByUri.get(data.uri);
  return (
    Number(data.caseType) === 0 &&
    entry !== undefined &&
    data.party1.toLowerCase() === officialOpener.toLowerCase() &&
    data.criteriaHash.toLowerCase() === entry.hash.toLowerCase()
  );
});
const officialCaseIds = new Set(officialCases.map(({ id }) => id));
const unresolvedNonOfficialCases = allCases.filter(
  ({ id, data }) => !officialCaseIds.has(id) && Number(data.status) !== 2,
);

const seenOfficialUris = new Set();
for (const courtCase of officialCases) {
  const entry = queueByUri.get(courtCase.data.uri);
  if (seenOfficialUris.has(entry.uri)) throw new Error(`Official question filed more than once: ${entry.uri}`);
  seenOfficialUris.add(entry.uri);
}

const filedSequences = officialCases.map(({ data }) => queueByUri.get(data.uri).sequence).sort((a, b) => a - b);
filedSequences.forEach((sequence, index) => {
  if (sequence !== index + 1) throw new Error('Official questions were not filed as a contiguous queue prefix.');
});

const officialWithPhases = await Promise.all(
  officialCases.map(async (courtCase) => ({ ...courtCase, phase: await phaseOf(courtCase.id) })),
);
const activeCases = officialWithPhases.filter(({ phase }) => phase !== 4);
if (activeCases.length > 1) {
  throw new Error(`Refusing to advance: ${activeCases.length} official queue cases are unresolved.`);
}

const [jurorCount, minPool, panelSize, commitDuration, revealDuration, operatorIsJuror] = await Promise.all([
  publicClient.readContract({ address: REGISTRY, abi: registryAbi, functionName: 'jurorCount' }),
  publicClient.readContract({ address: COURT, abi: courtAbi, functionName: 'MIN_POOL' }),
  publicClient.readContract({ address: COURT, abi: courtAbi, functionName: 'PANEL_SIZE' }),
  publicClient.readContract({ address: COURT, abi: courtAbi, functionName: 'commitDuration' }),
  publicClient.readContract({ address: COURT, abi: courtAbi, functionName: 'revealDuration' }),
  publicClient.readContract({
    address: REGISTRY,
    abi: registryAbi,
    functionName: 'isActive',
    args: [operator],
  }),
]);
const phaseNames = ['Open', 'Commit', 'Reveal', 'Resolvable', 'Resolved'];

if (minPool !== REQUIRED_JURORS || panelSize !== REQUIRED_JURORS) {
  throw new Error(`Keeper requires the deployed 3/3 court; found panel ${panelSize}, minimum pool ${minPool}.`);
}

console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'read-only dry run'}`);
console.log(`Operator: ${operator}${operatorIsJuror ? ' (ACTIVE JUROR - unsafe for opening)' : ' (non-juror)'}`);
console.log(`Official opener: ${officialOpener}`);
console.log(`Active jurors: ${jurorCount} / exactly ${REQUIRED_JURORS} required`);
console.log(`Voting windows: ${commitDuration}s seal / ${revealDuration}s reveal (minimum ${MIN_HUMAN_DURATION}s each)`);
console.log(`Official queue: ${officialCases.length}/${queue.length} filed`);
console.log(
  unresolvedNonOfficialCases.length === 0
    ? 'Unresolved nonofficial court cases: none'
    : `Unresolved nonofficial court case IDs: ${unresolvedNonOfficialCases.map(({ id }) => id).join(', ')}`,
);

if (activeCases.length === 1) {
  const active = activeCases[0];
  const entry = queueByUri.get(active.data.uri);
  console.log(`Active: #${entry.sequence} case ${active.id}, ${entry.title} (${phaseNames[active.phase]})`);

  if (active.phase === 0) {
    if (unresolvedNonOfficialCases.length !== 0) {
      refuseExpectedAction(
        `Refusing to draw official case ${active.id}: unresolved nonofficial court case IDs ${unresolvedNonOfficialCases.map(({ id }) => id).join(', ')} must be resolved first.`,
      );
    }
    requireExactJurorCount(`draw official case ${active.id}`, jurorCount);
    if (commitDuration < MIN_HUMAN_DURATION || revealDuration < MIN_HUMAN_DURATION) {
      refuseExpectedAction(`Refusing to draw: set both voting windows to at least ${MIN_HUMAN_DURATION} seconds first.`);
    }
    const block = await publicClient.getBlockNumber();
    if (block <= active.data.drawBlock) {
      console.log(`No action: draw becomes available after block ${active.data.drawBlock} (latest ${block}).`);
      process.exit(0);
    }
    await send(`draw case ${active.id}`, {
      address: COURT,
      abi: courtAbi,
      functionName: 'draw',
      args: [BigInt(active.id)],
    });
    process.exit(0);
  }

  if (active.phase === 1 || active.phase === 2) {
    await reportJurorProgress(active);
    const deadline = active.phase === 1 ? active.data.commitDeadline : active.data.revealDeadline;
    console.log(`No operator action: jurors act manually until ${new Date(Number(deadline) * 1000).toISOString()}.`);
    process.exit(0);
  }

  if (active.phase === 3) {
    await reportJurorProgress(active);
    await send(`resolve case ${active.id}`, {
      address: COURT,
      abi: courtAbi,
      functionName: 'resolve',
      args: [BigInt(active.id)],
    });
    if (EXECUTE) {
      const resultingPhase = await phaseOf(active.id);
      console.log(
        resultingPhase === 4
          ? `Case ${active.id} resolved. A later keeper run may open the next question.`
          : `Case ${active.id} did not reach quorum and returned to ${phaseNames[resultingPhase]}; no next question was opened.`,
      );
    }
    process.exit(0);
  }

  throw new Error(`Unknown court phase ${active.phase} for case ${active.id}.`);
}

const next = queue.find((entry) => !seenOfficialUris.has(entry.uri));
if (!next) {
  console.log('Queue complete: all 21 official questions have been filed and resolved.');
  process.exit(0);
}
if (unresolvedNonOfficialCases.length !== 0) {
  refuseExpectedAction(
    `Refusing to open question ${next.sequence}: unresolved nonofficial court case IDs ${unresolvedNonOfficialCases.map(({ id }) => id).join(', ')} must be resolved first.`,
  );
}
requireExactJurorCount(`open question ${next.sequence}`, jurorCount);
if (commitDuration < MIN_HUMAN_DURATION || revealDuration < MIN_HUMAN_DURATION) {
  refuseExpectedAction(
    `Refusing to open question ${next.sequence}: set both voting windows to at least ${MIN_HUMAN_DURATION} seconds first.`,
  );
}
if (operator.toLowerCase() !== officialOpener.toLowerCase()) {
  refuseExpectedAction(`Refusing to open: this wallet is not the fixed official opener ${officialOpener}.`);
}
if (operatorIsJuror) {
  refuseExpectedAction(
    'Refusing to open: the operator is an active juror and would make a three-person draw impossible.',
  );
}

const fee = await publicClient.readContract({ address: COURT, abi: courtAbi, functionName: 'CASE_FEE' });
const [balance, allowance] = await Promise.all([
  publicClient.readContract({ address: MUSD, abi: tokenAbi, functionName: 'balanceOf', args: [operator] }),
  publicClient.readContract({
    address: MUSD,
    abi: tokenAbi,
    functionName: 'allowance',
    args: [operator, COURT],
  }),
]);

console.log(`Next: #${next.sequence} ${next.title}`);
console.log(`Exact URI: ${next.uri}`);
console.log(`Exact hash: ${next.hash}`);

if (balance < fee) {
  await send('claim valueless MUSD from the faucet', {
    address: MUSD,
    abi: tokenAbi,
    functionName: 'faucet',
    args: [],
  });
  console.log('A later keeper run may approve the court or open the question.');
  process.exit(0);
}
if (allowance < fee) {
  await send('approve the court to collect the question fee', {
    address: MUSD,
    abi: tokenAbi,
    functionName: 'approve',
    args: [COURT, maxUint256],
  });
  console.log('A later keeper run may open the question.');
  process.exit(0);
}

const countBefore = allCases.length;
await send(`open official question ${next.sequence}`, {
  address: COURT,
  abi: courtAbi,
  functionName: 'openQuestion',
  args: [next.hash, next.uri],
});

if (EXECUTE) {
  const countAfter = Number(
    await publicClient.readContract({ address: COURT, abi: courtAbi, functionName: 'caseCount' }),
  );
  if (countAfter !== countBefore + 1) throw new Error('openQuestion succeeded but caseCount did not advance by one.');
  const opened = await publicClient.readContract({
    address: COURT,
    abi: courtAbi,
    functionName: 'getCase',
    args: [BigInt(countBefore)],
  });
  if (opened.uri !== next.uri || opened.criteriaHash.toLowerCase() !== next.hash.toLowerCase()) {
    throw new Error('New case does not match the exact queued URI/hash.');
  }
  console.log(`Opened case ${countBefore}. A later keeper run may draw its panel.`);
}
