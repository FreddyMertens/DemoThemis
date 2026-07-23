// Contract configuration for the current MVP. Mainnet addresses are supplied by
// the deployment environment after the updated contract set is verified. There
// is deliberately no fallback to an older mainnet instance.

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const addressOrZero = (value: string | undefined) =>
  value && /^0x[0-9a-fA-F]{40}$/.test(value) && value.toLowerCase() !== ZERO_ADDRESS
    ? value
    : ZERO_ADDRESS;

const currentMainnetAddresses = {
  MockUSD: addressOrZero(process.env.NEXT_PUBLIC_MUSD_ADDRESS),
  WorldIDGate: addressOrZero(process.env.NEXT_PUBLIC_WORLD_ID_GATE_ADDRESS),
  JurorRegistry: addressOrZero(process.env.NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS),
  RewardPool: addressOrZero(process.env.NEXT_PUBLIC_REWARD_POOL_ADDRESS),
  DisputeCourt: addressOrZero(process.env.NEXT_PUBLIC_DISPUTE_COURT_ADDRESS),
  DealEscrow: addressOrZero(process.env.NEXT_PUBLIC_DEAL_ESCROW_ADDRESS),
} as const;

export const CURRENT_MVP_CONFIGURED =
  process.env.NEXT_PUBLIC_MVP_RELEASE === 'current' &&
  Object.values(currentMainnetAddresses).every((address) => address !== ZERO_ADDRESS);

export const WORLDCHAIN_SEPOLIA = {
  chainId: 4801,
  name: 'World Chain Sepolia',
  rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
  explorer: 'https://worldchain-sepolia.explorer.alchemy.com',
} as const;

export const WORLDCHAIN_MAINNET = {
  chainId: 480,
  name: 'World Chain',
  rpcUrl: process.env.NEXT_PUBLIC_WORLDCHAIN_RPC_URL ?? 'https://worldchain-mainnet.gateway.tenderly.co',
  explorer: 'https://worldscan.org',
  worldIdV4ProductionVerifier: '0x00000000009E00F9FE82CfeeBB4556686da094d7',
} as const;

/// The Sepolia cohort instance (7/14, scripted jurors via the MockSybilGate
/// stand-in — labeled simulated everywhere; see docs/MECHANISM_DELTA.md).
/// Redeployed in Step 4 with the final economics (RewardPool + 70/20/10); the
/// step-2 deployment predated them. See contracts/deployments/worldchain-sepolia.json.
export const COHORT = {
  chain: WORLDCHAIN_SEPOLIA,
  // Existing address predates party-aware admission, both liveness timeouts, Permit2 re-bonding, and immutable clocks.
  supportsLivenessRecovery: false,
  supportsAutomatedTiming: false,
  supportsThreeStateRuling: false,
  MockUSD: '0xeA5241F1becCE7B3F72bf501bEa16eA976f1600F',
  MockSybilGate: '0x4E223cB71eD4E350Cf1A7f687206eA336d32807E',
  JurorRegistry: '0x7677ad08d0844e1Df2693242F2195F2b2fD9c622',
  RewardPool: '0x1509A82F35da8fCb9428449dCc9120C102c153A9',
  DisputeCourt: '0x1bAa18851E3E425278aFfe041b75004727F500AF',
  DealEscrow: '0x61110aDAca47eb0E82D5dE75F3de6F1f1b4fe596',
  params: { panelSize: 7, minPool: 14, commitDuration: 60, revealDuration: 60, questionFeeMusd: 2 },
} as const;

/// The updated World Chain MVP profile. Capability flags become active only when
/// all six verified addresses are explicitly selected as the current release.
export const CURRENT_MVP = {
  chain: WORLDCHAIN_MAINNET,
  supportsLivenessRecovery: CURRENT_MVP_CONFIGURED,
  supportsAutomatedTiming: CURRENT_MVP_CONFIGURED,
  supportsThreeStateRuling: CURRENT_MVP_CONFIGURED,
  ...currentMainnetAddresses,
  worldIdV4ProductionVerifier: WORLDCHAIN_MAINNET.worldIdV4ProductionVerifier,
  worldIdRpId: '0x1ddcf8ba2efe3f36',
  worldIdProtocolVersion: 4,
  allowLegacyWorldIdProofs: false,
  params: { panelSize: 3, minPool: 4, commitDuration: 300, revealDuration: 300, questionFeeMusd: 20 },
} as const;
