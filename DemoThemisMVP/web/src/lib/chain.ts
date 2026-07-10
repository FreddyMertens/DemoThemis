// Active on-chain instance selection. NEXT_PUBLIC_CHAIN_ID picks which deployment
// the Mini App reads: the Sepolia cohort (4801, the labeled simulated scale demo,
// read-only) or the capstone-ready mainnet instance (480, real World ID verifier
// path — Step 5). Defaults to the cohort so a reviewer with no World App still
// sees the seeded history.
import { createPublicClient, http, type Address } from 'viem';
import { worldchain, worldchainSepolia } from 'viem/chains';
import { COHORT, LIVE } from './contracts';

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '4801');

/** True when reading the Sepolia cohort (simulated, read-only); false for mainnet. */
export const IS_COHORT = chainId !== 480;

export const INSTANCE = IS_COHORT ? COHORT : LIVE;
const viemChain = IS_COHORT ? worldchainSepolia : worldchain;

export const publicClient = createPublicClient({
  chain: viemChain,
  transport: http(INSTANCE.chain.rpcUrl),
});

export const CHAIN_META = INSTANCE.chain;
export const EXPLORER = INSTANCE.chain.explorer;

/// Uniswap's canonical Permit2 (same address on every chain; confirmed on WC
/// mainnet). The World App onboard approves the bond token to the registry through
/// it — see JurorRegistry.registerWithPermit2 and docs/MECHANISM_DELTA.md.
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address;

/// The $5 MUSD juror bond (6 decimals) = JurorRegistry.BOND.
export const BOND = BigInt(5_000_000);

export const addr = {
  musd: INSTANCE.MockUSD as Address,
  registry: INSTANCE.JurorRegistry as Address,
  rewardPool: INSTANCE.RewardPool as Address,
  court: INSTANCE.DisputeCourt as Address,
  escrow: INSTANCE.DealEscrow as Address,
};

export const explorerTx = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const explorerAddress = (a: string) => `${EXPLORER}/address/${a}`;
