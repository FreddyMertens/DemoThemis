'use client';
// Shared MiniKit write path for the capstone-ready mainnet instance. World App
// batches the transactions and should sponsor gas for verified humans; the capstone
// trace proves that path. We poll for the receipt to get the real transaction hash
// for an explorer link.
//
// NOTE: this path only runs inside World App on World Chain mainnet (480). It
// cannot be exercised in a desktop browser or this CI — it is verified on-device
// at the Step-5 human capstone (the honesty rule: we don't claim it works until a
// real phone tx proves it). The desktop/dev equivalent is the B5 page (viem).
import { MiniKit } from '@worldcoin/minikit-js';
import { useUserOperationReceipt } from '@worldcoin/minikit-react';
import { useCallback, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { LIVE } from './contracts';

const client = createPublicClient({ chain: worldchain, transport: http(LIVE.chain.rpcUrl) });

export type TxStep = 'idle' | 'submitting' | 'confirming' | 'success' | 'error';

export type CourtTx = {
  step: TxStep;
  error: string | null;
  txHash: string;
  submit: (transactions: { to: string; data: string }[]) => Promise<string | null>;
  reset: () => void;
};

export function useCourtTx(): CourtTx {
  const { poll } = useUserOperationReceipt({ client });
  const [step, setStep] = useState<TxStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState('');

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash('');
  }, []);

  const submit = useCallback(
    async (transactions: { to: string; data: string }[]) => {
      setError(null);
      setTxHash('');
      setStep('submitting');
      try {
        const res = await MiniKit.sendTransaction({ chainId: LIVE.chain.chainId, transactions });
        // Result shape is defensive: World App returns the userOpHash on success,
        // or an error payload on user-rejection / failure.
        const r = res as { data?: { userOpHash?: string }; finalPayload?: { status?: string; error_code?: string } };
        const userOpHash = r.data?.userOpHash;
        if (!userOpHash) {
          throw new Error(r.finalPayload?.error_code ?? 'Transaction was not submitted (rejected?)');
        }
        setStep('confirming');
        const { transactionHash } = await poll(userOpHash);
        setTxHash(transactionHash);
        setStep('success');
        return transactionHash;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStep('error');
        return null;
      }
    },
    [poll],
  );

  return { step, error, txHash, submit, reset };
}
