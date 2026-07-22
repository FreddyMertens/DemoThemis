// Deployed contract addresses. Generated in step 2 (see
// contracts/deployments/). ABIs are wired in step 3 when the Mini App calls
// these contracts.

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
  worldIdRouter: '0x17B354dD2595411ff79041f930e491A4Df39A278',
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
  MockUSD: '0xeA5241F1becCE7B3F72bf501bEa16eA976f1600F',
  MockSybilGate: '0x4E223cB71eD4E350Cf1A7f687206eA336d32807E',
  JurorRegistry: '0x7677ad08d0844e1Df2693242F2195F2b2fD9c622',
  RewardPool: '0x1509A82F35da8fCb9428449dCc9120C102c153A9',
  DisputeCourt: '0x1bAa18851E3E425278aFfe041b75004727F500AF',
  DealEscrow: '0x61110aDAca47eb0E82D5dE75F3de6F1f1b4fe596',
  params: { panelSize: 7, minPool: 14, commitDuration: 60, revealDuration: 60, questionFeeMusd: 2 },
  replacementParams: { panelSize: 7, minPool: 14, commitDuration: 300, revealDuration: 300, questionFeeMusd: 20 },
} as const;

/// The currently deployed mainnet instance (3/3, historical v4 preview adapter).
/// It is retained as evidence, not as the production dependency. It carries the
/// original Permit2 registration path but predates
/// party-aware admission, bounded initial/redraw recovery, Permit2 re-bonding, and immutable voting windows. Keep both capability flags false
/// until replacement addresses with the upgraded bytecode are deployed and
/// recorded here. The Step-3.5 Staging-verifier instance (0xbf7E…) remains the
/// human-free de-risk trace. See contracts/deployments/worldchain-mainnet.json.
export const LIVE = {
  chain: WORLDCHAIN_MAINNET,
  supportsLivenessRecovery: false,
  supportsAutomatedTiming: false,
  MockUSD: '0x70ECE5DcAA68741BF41F6A4Aa0af3a8D44e4497a',
  WorldIDGate: '0x0540f47842a31C681dce76E856b4b76fcCc53Fbe',
  JurorRegistry: '0x226974149087b36769a54B998acfe4087eEb7F84',
  RewardPool: '0xAF96A65A6b9643451E33cAf96717d071eDae04A0',
  DisputeCourt: '0xCDF427D18da8C2e8CCf9a95310bC38857EEf795A',
  DealEscrow: '0xefc898F9C4FC805111041676b720CB478BE67c47',
  legacyPreviewWorldIdVerifier: '0x00000000009E00F9FE82CfeeBB4556686da094d7',
  replacementWorldIdRouter: WORLDCHAIN_MAINNET.worldIdRouter,
  worldIdAppId: 'app_7bdfda4db4e2f59dd4a2427cd2bd860d',
  params: { panelSize: 3, minPool: 3, questionFeeMusd: 2 },
  replacementParams: { panelSize: 3, minPool: 4, commitDuration: 300, revealDuration: 300, questionFeeMusd: 20 },
} as const;
