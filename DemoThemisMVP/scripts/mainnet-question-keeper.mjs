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
  parseEventLogs,
} = requireFromWeb('viem');
const { privateKeyToAccount } = requireFromWeb('viem/accounts');
const { worldchain } = requireFromWeb('viem/chains');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'web', 'public');
const MANIFEST_PATH = path.join(PUBLIC, 'cases', 'question-queue.json');
const DEPLOYMENT_PATH = path.join(ROOT, 'contracts', 'deployments', 'worldchain-mainnet.json');
const RPC = process.env.RPC ?? 'https://worldchain-mainnet.gateway.tenderly.co';
const EXPECTED_PANEL_SIZE = BigInt(3);
const MIN_HUMAN_DURATION = BigInt(300);
const EXPECTED_WORLD_ID_PROTOCOL_VERSION = BigInt(4);
const WORLD_ID_V4_PRODUCTION_VERIFIER = getAddress('0x00000000009E00F9FE82CfeeBB4556686da094d7');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
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
const replacementMetadataReady =
  deployment.currentSourceMatchesDeployment === true &&
  deployment.livenessRecovery?.boundedRedrawWindow === true &&
  deployment.livenessRecovery?.permissionlessTimeoutFinalizer === true &&
  deployment.livenessRecovery?.permit2Rebond === true &&
  deployment.livenessRecovery?.eligiblePartyPreflight === true &&
  deployment.livenessRecovery?.boundedInitialDrawTimeout === true &&
  deployment.livenessRecovery?.unusedFeeRefund === true &&
  deployment.livenessRecovery?.immutableVotingDurations === true;
const identityMetadataReady =
  deployment.identityVerification?.protocolVersion === 4 &&
  deployment.identityVerification?.allowLegacyProofs === false &&
  getAddress(deployment.identityVerification?.verifier ?? ZERO_ADDRESS) === WORLD_ID_V4_PRODUCTION_VERIFIER &&
  typeof deployment.identityVerification?.rpId === 'string';

if (EXECUTE && (!replacementMetadataReady || !identityMetadataReady)) {
  throw new Error(
    'Broadcast disabled: the deployment record must attest the full recovery release and a v4-only World ID Production gate.',
  );
}

const COURT = getAddress(deployment.contracts.DisputeCourt);
const REGISTRY = getAddress(deployment.contracts.JurorRegistry);
const GATE = getAddress(deployment.contracts.WorldIDGate);
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
    name: 'LIVENESS_RECOVERY_VERSION',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'AUTOMATED_TIMING_VERSION',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'INITIAL_DRAW_WINDOW',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'initialDrawDeadline',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'uint256' }],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'redrawDeadline',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'uint256' }],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'eligibleJurorCount',
    stateMutability: 'view',
    inputs: [
      { name: 'party1', type: 'address' },
      { name: 'party2', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
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
  {
    type: 'event',
    name: 'InitialDrawTimedOut',
    inputs: [
      { name: 'caseId', type: 'uint256', indexed: true },
      { name: 'refundTo', type: 'address', indexed: true },
      { name: 'feeRefunded', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
];

const registryAbi = [
  {
    type: 'function',
    name: 'gate',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'LIVENESS_RECOVERY_VERSION',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
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

const worldIdGateAbi = [
  {
    type: 'function',
    name: 'WORLD_ID_PROTOCOL_VERSION',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'verifier',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'rpId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
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

async function readVersion(address, abi, functionName) {
  try {
    return await publicClient.readContract({
      address,
      abi,
      functionName,
    });
  } catch {
    // Legacy contracts do not expose this marker. Treat any failed probe as an
    // unsupported release so an RPC or ABI problem can never fail open.
    return BigInt(0);
  }
}

async function readAddress(address, abi, functionName) {
  try {
    return getAddress(await publicClient.readContract({ address, abi, functionName }));
  } catch {
    return ZERO_ADDRESS;
  }
}

const [courtRecoveryVersion, registryRecoveryVersion, automatedTimingVersion, configuredGate, gateProtocolVersion, gateVerifier, gateRpId] = await Promise.all([
  readVersion(COURT, courtAbi, 'LIVENESS_RECOVERY_VERSION'),
  readVersion(REGISTRY, registryAbi, 'LIVENESS_RECOVERY_VERSION'),
  readVersion(COURT, courtAbi, 'AUTOMATED_TIMING_VERSION'),
  readAddress(REGISTRY, registryAbi, 'gate'),
  readVersion(GATE, worldIdGateAbi, 'WORLD_ID_PROTOCOL_VERSION'),
  readAddress(GATE, worldIdGateAbi, 'verifier'),
  readVersion(GATE, worldIdGateAbi, 'rpId'),
]);
const identityDeploymentReady =
  identityMetadataReady &&
  configuredGate === GATE &&
  gateProtocolVersion === EXPECTED_WORLD_ID_PROTOCOL_VERSION &&
  gateVerifier === WORLD_ID_V4_PRODUCTION_VERIFIER &&
  gateRpId === BigInt(deployment.identityVerification.rpId);
const recoveryDeploymentReady =
  replacementMetadataReady &&
  identityDeploymentReady &&
  courtRecoveryVersion === BigInt(2) &&
  registryRecoveryVersion === BigInt(1) &&
  automatedTimingVersion === BigInt(1);

if (EXECUTE && !recoveryDeploymentReady) {
  throw new Error(
    `Broadcast disabled: expected court recovery=2, registry recovery=1, automated timing=1, and World ID protocol=4 at the configured gate; found ${courtRecoveryVersion}, ${registryRecoveryVersion}, ${automatedTimingVersion}, and ${gateProtocolVersion}.`,
  );
}

const initialDrawWindow = recoveryDeploymentReady
  ? await publicClient.readContract({ address: COURT, abi: courtAbi, functionName: 'INITIAL_DRAW_WINDOW' })
  : null;

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

async function eligibleJurors(party1, party2) {
  if (!recoveryDeploymentReady) return null;
  return publicClient.readContract({
    address: COURT,
    abi: courtAbi,
    functionName: 'eligibleJurorCount',
    args: [party1, party2],
  });
}

async function openCaseDeadline(caseId, redraws) {
  if (!recoveryDeploymentReady) return null;
  return publicClient.readContract({
    address: COURT,
    abi: courtAbi,
    functionName: redraws === 0 ? 'initialDrawDeadline' : 'redrawDeadline',
    args: [BigInt(caseId)],
  });
}

function formatTimestamp(timestamp) {
  return new Date(Number(timestamp) * 1000).toISOString();
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
  return receipt;
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

function requireMinimumJurorCount(nextAction, candidateCount, minimum, candidateLabel, reason) {
  if (candidateCount >= minimum) return;
  waitForJurors(
    `${nextAction} needs at least ${minimum} ${candidateLabel} ${reason}; found ${candidateCount}. ` +
      'Additional active jurors are allowed and improve the recovery reserve.',
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

if (panelSize !== EXPECTED_PANEL_SIZE) {
  throw new Error(`Keeper requires a three-seat panel; found panel size ${panelSize}.`);
}
if (minPool < panelSize) {
  throw new Error(`Invalid court configuration: minimum pool ${minPool} is smaller than panel size ${panelSize}.`);
}

console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'read-only dry run'}`);
console.log(
  recoveryDeploymentReady
    ? 'Deployment capability: eligible-party preflight plus bounded initial/redraw recovery enabled'
    : 'Deployment capability: LEGACY / complete liveness recovery not deployed; read-only inspection only',
);
console.log(
  `On-chain versions: court recovery ${courtRecoveryVersion}; registry recovery ${registryRecoveryVersion}; automated timing ${automatedTimingVersion} (required: 2 / 1 / 1)`,
);
console.log(
  `Identity gate: protocol ${gateProtocolVersion}; verifier ${gateVerifier}; RP ${gateRpId} (required: v4 Production, legacy proofs disabled in metadata)`,
);
if (initialDrawWindow !== null) {
  console.log(`Initial draw recovery window: ${initialDrawWindow}s; unused fees refund on timeout`);
}
console.log(`Operator: ${operator}${operatorIsJuror ? ' (ACTIVE JUROR - unsafe for opening)' : ' (non-juror)'}`);
console.log(`Official opener: ${officialOpener}`);
console.log(`Active jurors: ${jurorCount} (opening minimum ${minPool}; panel size ${panelSize}; no keeper-imposed maximum)`);
console.log(
  `${automatedTimingVersion === BigInt(1) ? 'Immutable' : 'Current legacy'} voting windows: ${commitDuration}s seal / ${revealDuration}s reveal (replacement minimum ${MIN_HUMAN_DURATION}s each)`,
);
console.log(`Official queue: ${officialCases.length}/${queue.length} filed`);
if (unresolvedNonOfficialCases.length === 0) {
  console.log('Unresolved nonofficial court cases: none');
} else {
  console.warn(
    `WARNING: ignoring unresolved nonofficial court case IDs ${unresolvedNonOfficialCases.map(({ id }) => id).join(', ')}. ` +
      'Only authenticated official queue cases participate in the one-active-at-a-time policy.',
  );
}

if (activeCases.length === 1) {
  const active = activeCases[0];
  const entry = queueByUri.get(active.data.uri);
  console.log(`Active: #${entry.sequence} case ${active.id}, ${entry.title} (${phaseNames[active.phase]})`);

  if (active.phase === 0) {
    const drawEligibleCount = await eligibleJurors(active.data.party1, active.data.party2);
    const drawCandidateCount = drawEligibleCount ?? jurorCount;
    const drawCandidateLabel =
      drawEligibleCount === null
        ? 'active jurors (legacy raw-count inspection)'
        : 'jurors eligible after excluding the case parties';
    if (drawEligibleCount !== null) {
      console.log(`Eligible for case ${active.id}: ${drawEligibleCount}/${jurorCount} active jurors`);
      const deadline = await openCaseDeadline(active.id, Number(active.data.redraws));
      if (deadline !== null && deadline > BigInt(0)) {
        console.log(
          `${Number(active.data.redraws) === 0 ? 'Initial draw' : 'Redraw recovery'} deadline: ${formatTimestamp(deadline)}`,
        );
      }
    }
    requireMinimumJurorCount(
      `draw official case ${active.id}`,
      drawCandidateCount,
      panelSize,
      drawCandidateLabel,
      `to fill its ${panelSize}-seat panel`,
    );
    if (commitDuration < MIN_HUMAN_DURATION || revealDuration < MIN_HUMAN_DURATION) {
      refuseExpectedAction(`Refusing to draw: this deployment has unsafe immutable voting windows below ${MIN_HUMAN_DURATION} seconds.`);
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
    const expiredOpenCase = Number(active.data.status) === 0;
    const expiredInitialDraw = expiredOpenCase && Number(active.data.redraws) === 0;
    const expiredRedraw = expiredOpenCase && Number(active.data.redraws) > 0;
    if (expiredInitialDraw || expiredRedraw) {
      const deadline = await openCaseDeadline(active.id, Number(active.data.redraws));
      console.log(
        expiredInitialDraw
          ? `Initial draw window expired for case ${active.id}${deadline === null ? '' : ` at ${formatTimestamp(deadline)}`}; finalization refunds the unused fee and does not require jurors.`
          : `Redraw recovery window expired for case ${active.id}${deadline === null ? '' : ` at ${formatTimestamp(deadline)}`}; finalization records status quo and does not require the juror pool to be replenished.`,
      );
    } else {
      await reportJurorProgress(active);
    }
    const resolveLabel = expiredInitialDraw
      ? 'finalize expired initial draw and refund the unused fee for'
      : expiredRedraw
        ? 'finalize expired redraw recovery for'
        : 'resolve';
    const resolveReceipt = await send(`${resolveLabel} case ${active.id}`, {
      address: COURT,
      abi: courtAbi,
      functionName: 'resolve',
      args: [BigInt(active.id)],
    });
    if (EXECUTE) {
      if (expiredInitialDraw) {
        const timeoutEvents = parseEventLogs({
          abi: courtAbi,
          logs: resolveReceipt.logs,
          eventName: 'InitialDrawTimedOut',
          strict: true,
        });
        if (timeoutEvents.length !== 1) {
          throw new Error(`Case ${active.id} resolved without exactly one InitialDrawTimedOut refund event.`);
        }
        const refunded = timeoutEvents[0].args;
        if (
          refunded.caseId !== BigInt(active.id) ||
          refunded.refundTo.toLowerCase() !== active.data.party1.toLowerCase() ||
          refunded.feeRefunded !== active.data.feePool
        ) {
          throw new Error(`Case ${active.id} emitted an unexpected initial-draw refund.`);
        }
        console.log(`Unused fee refunded to ${refunded.refundTo}: ${refunded.feeRefunded} token units.`);
      }
      const resultingPhase = await phaseOf(active.id);
      console.log(
        resultingPhase === 4
          ? `Case ${active.id} resolved. A later keeper run may open the next question.`
          : `Case ${active.id} did not reach quorum and entered its bounded redraw-recovery window; no next question was opened.`,
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
const openingEligibleCount = await eligibleJurors(officialOpener, ZERO_ADDRESS);
const openingCandidateCount = openingEligibleCount ?? jurorCount;
const openingCandidateLabel =
  openingEligibleCount === null
    ? 'active jurors (legacy raw-count inspection)'
    : 'jurors eligible after excluding the official opener';
if (openingEligibleCount !== null) {
  console.log(`Eligible for the next official question: ${openingEligibleCount}/${jurorCount} active jurors`);
}
requireMinimumJurorCount(
  `open question ${next.sequence}`,
  openingCandidateCount,
  minPool,
  openingCandidateLabel,
  `to meet the court's opening minimum`,
);
if (commitDuration < MIN_HUMAN_DURATION || revealDuration < MIN_HUMAN_DURATION) {
  refuseExpectedAction(
    `Refusing to open question ${next.sequence}: this deployment has unsafe immutable voting windows below ${MIN_HUMAN_DURATION} seconds.`,
  );
}
if (operator.toLowerCase() !== officialOpener.toLowerCase()) {
  refuseExpectedAction(`Refusing to open: this wallet is not the fixed official opener ${officialOpener}.`);
}
if (operatorIsJuror) {
  refuseExpectedAction(
    'Refusing to open: the fixed official opener must remain outside the juror pool so party exclusion cannot reduce the eligible reserve.',
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
  if (countAfter <= countBefore) throw new Error('openQuestion succeeded but caseCount did not advance.');
  const concurrentCases = await Promise.all(
    Array.from({ length: countAfter - countBefore }, (_, offset) => {
      const id = countBefore + offset;
      return publicClient
        .readContract({
          address: COURT,
          abi: courtAbi,
          functionName: 'getCase',
          args: [BigInt(id)],
        })
        .then((data) => ({ id, data }));
    }),
  );
  const openedMatches = concurrentCases.filter(
    ({ data }) =>
      Number(data.caseType) === 0 &&
      data.party1.toLowerCase() === officialOpener.toLowerCase() &&
      data.uri === next.uri &&
      data.criteriaHash.toLowerCase() === next.hash.toLowerCase(),
  );
  if (openedMatches.length !== 1) {
    throw new Error('Could not identify exactly one newly opened case matching the official queued URI/hash/opener.');
  }
  const openedCaseId = openedMatches[0].id;
  const ignoredConcurrent = concurrentCases.length - 1;
  console.log(
    `Opened official case ${openedCaseId}.` +
      (ignoredConcurrent === 0
        ? ''
        : ` Ignored ${ignoredConcurrent} concurrently opened nonofficial case${ignoredConcurrent === 1 ? '' : 's'}.`) +
      ' A later keeper run may draw its panel.',
  );
}
