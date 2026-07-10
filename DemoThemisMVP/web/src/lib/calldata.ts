// Encoded calldata for the mainnet write actions, shared by the World App onboard
// and the commit/reveal ballot. Each returns a {to, data} World App can batch.
import { encodeFunctionData, type Address, type Hex } from 'viem';
import { jurorRegistryAbi } from '@/abi/JurorRegistry';
import { disputeCourtAbi } from '@/abi/DisputeCourt';
import { mockUSDAbi } from '@/abi/MockUSD';
import { addr, PERMIT2_ADDRESS, BOND } from './chain';

// Permit2 AllowanceTransfer.approve(token, spender, uint160 amount, uint48 expiration).
const permit2ApproveAbi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [],
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
    ],
  },
] as const;

export const courtTx = {
  /** MockUSD.faucet() — mint 100 MUSD (once/day). */
  faucet: () => ({
    to: addr.musd,
    data: encodeFunctionData({ abi: mockUSDAbi, functionName: 'faucet', args: [] }),
  }),

  /** Permit2.approve(bondToken, registry, BOND, 0) — batch step 1 of the onboard. */
  permit2ApproveBond: () => ({
    to: PERMIT2_ADDRESS,
    data: encodeFunctionData({
      abi: permit2ApproveAbi,
      functionName: 'approve',
      args: [addr.musd, addr.registry, BOND, 0],
    }),
  }),

  /** JurorRegistry.registerWithPermit2(signal, proof) — batch step 2 of the onboard. */
  registerWithPermit2: (signal: Address, proof: Hex) => ({
    to: addr.registry,
    data: encodeFunctionData({ abi: jurorRegistryAbi, functionName: 'registerWithPermit2', args: [signal, proof] }),
  }),

  /** DisputeCourt.commit(caseId, h) — no token transfer, plain sendTransaction. */
  commit: (caseId: bigint, commitment: Hex) => ({
    to: addr.court,
    data: encodeFunctionData({ abi: disputeCourtAbi, functionName: 'commit', args: [caseId, commitment] }),
  }),

  /** DisputeCourt.reveal(caseId, vote, salt). */
  reveal: (caseId: bigint, vote: boolean, salt: Hex) => ({
    to: addr.court,
    data: encodeFunctionData({ abi: disputeCourtAbi, functionName: 'reveal', args: [caseId, vote, salt] }),
  }),
};
