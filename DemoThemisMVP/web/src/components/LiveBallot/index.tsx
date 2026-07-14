'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { encodeAbiParameters, keccak256, type Address, type Hex } from 'viem';
import { AuthButton } from '@/components/AuthButton';
import { GasBadge } from '@/components/Badges';
import { disputeCourtAbi } from '@/abi/DisputeCourt';
import { usePolledData } from '@/lib/hooks';
import { addr, explorerTx, publicClient } from '@/lib/chain';
import { courtTx } from '@/lib/calldata';
import { useCourtTx } from '@/lib/tx';
import type { Phase } from '@/lib/court';

const ZERO_COMMITMENT = `0x${'0'.repeat(64)}` as Hex;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

type SavedBallot = { vote: boolean; salt: Hex; wallet: Address };

function isSavedBallot(value: unknown, wallet: Address): value is SavedBallot {
  if (!value || typeof value !== 'object') return false;
  const ballot = value as Partial<SavedBallot>;
  return (
    typeof ballot.vote === 'boolean' &&
    typeof ballot.salt === 'string' &&
    /^0x[0-9a-fA-F]{64}$/.test(ballot.salt) &&
    typeof ballot.wallet === 'string' &&
    ballot.wallet.toLowerCase() === wallet.toLowerCase()
  );
}

export function LiveBallot({
  caseId,
  panel,
  phase,
  contentVerified,
  refresh,
}: {
  caseId: number;
  panel: readonly Address[];
  phase: Phase;
  contentVerified: boolean;
  refresh: () => void | Promise<unknown>;
}) {
  const session = useSession();
  const { isInstalled } = useMiniKit();
  const wallet = session.data?.user?.walletAddress as Address | undefined;
  const tx = useCourtTx();
  const [vote, setVote] = useState<boolean | null>(null);
  const [salt, setSalt] = useState<Hex>('0x');
  const [saved, setSaved] = useState<SavedBallot | null>(null);
  const storeKey = wallet ? `ballot-${addr.court}-${caseId}-${wallet.toLowerCase()}` : null;

  const readWalletBallot = useCallback(async () => {
    if (!wallet) return { commitment: ZERO_COMMITMENT, revealed: false };
    const [commitment, revealed] = await Promise.all([
      publicClient.readContract({
        address: addr.court,
        abi: disputeCourtAbi,
        functionName: 'commitmentOf',
        args: [BigInt(caseId), wallet],
      }),
      publicClient.readContract({
        address: addr.court,
        abi: disputeCourtAbi,
        functionName: 'hasRevealed',
        args: [BigInt(caseId), wallet],
      }),
    ]);
    return { commitment, revealed };
  }, [caseId, wallet]);
  const walletBallot = usePolledData(readWalletBallot, 4000);

  useEffect(() => {
    setSaved(null);
    setVote(null);
    const raw = storeKey ? localStorage.getItem(storeKey) : null;
    if (raw && wallet) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isSavedBallot(parsed, wallet)) {
          setSaved(parsed);
          setVote(parsed.vote);
          setSalt(parsed.salt);
          return;
        }
      } catch {
        // Invalid local ballot data is replaced with a fresh secret below.
      }
      if (storeKey) localStorage.removeItem(storeKey);
    }
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setSalt(`0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}` as Hex);
  }, [storeKey, wallet]);

  const commitment = useMemo<Hex>(() => {
    if (vote === null || salt === '0x') return ZERO_COMMITMENT;
    return keccak256(
      encodeAbiParameters(
        [{ type: 'bool' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
        [vote, salt, BigInt(caseId), wallet ?? ZERO_ADDRESS],
      ),
    );
  }, [caseId, salt, vote, wallet]);

  const isPanelMember = !!wallet && panel.some((juror) => juror.toLowerCase() === wallet.toLowerCase());
  const hasCommitted = !!walletBallot.data && walletBallot.data.commitment !== ZERO_COMMITMENT;
  const hasRevealed = walletBallot.data?.revealed === true;
  const busy = tx.step === 'submitting' || tx.step === 'confirming';

  async function sealVote() {
    if (!contentVerified || !wallet || !storeKey || vote === null || salt === '0x' || hasCommitted) return;
    const ballot: SavedBallot = { vote, salt, wallet };
    // Persist before asking World App to submit. If the transaction succeeds but
    // receipt polling or the page connection drops, the juror still has the
    // exact secret needed for reveal.
    localStorage.setItem(storeKey, JSON.stringify(ballot));
    setSaved(ballot);
    const hash = await tx.submit([courtTx.commit(BigInt(caseId), commitment)]);
    if (!hash) return;
    await walletBallot.refresh();
    await refresh();
  }

  async function revealVote() {
    if (!saved || hasRevealed) return;
    const hash = await tx.submit([courtTx.reveal(BigInt(caseId), saved.vote, saved.salt)]);
    if (!hash) return;
    await walletBallot.refresh();
    await refresh();
  }

  if (phase !== 'Commit' && phase !== 'Reveal') return null;

  return (
    <section className="oracle-ballot" aria-labelledby="your-ballot-title">
      <div className="oracle-ballot-head">
        <div>
          <span>Your juror action</span>
          <h3 id="your-ballot-title">{phase === 'Commit' ? 'Choose, then seal your answer' : 'Reveal your sealed answer'}</h3>
        </div>
        <GasBadge />
      </div>

      {phase === 'Commit' && !contentVerified ? (
        <div className="oracle-ballot-message">
          <strong>Sealing is paused</strong>
          <p>The exact question text must match its on-chain fingerprint before a new answer can be sealed.</p>
        </div>
      ) : !wallet ? (
        <div className="oracle-ballot-message">
          <p>Panel jurors can sign in to submit their ballot.</p>
          <AuthButton />
        </div>
      ) : !isPanelMember ? (
        <div className="oracle-ballot-message is-neutral">
          <strong>Watch this case live</strong>
          <p>This wallet is not one of the three jurors seated for this question.</p>
        </div>
      ) : !isInstalled ? (
        <div className="oracle-ballot-message">
          <strong>Continue in World App</strong>
          <p>Open the Mini App with this juror wallet to submit the on-chain ballot.</p>
        </div>
      ) : phase === 'Commit' ? (
        hasCommitted ? (
          <div className="oracle-ballot-success">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Answer sealed on World Chain</strong>
              <p>Your choice is locked and remains hidden until the reveal phase.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="oracle-vote-options" role="group" aria-label="Choose your answer">
              <button type="button" className={vote === true ? 'is-selected is-yes' : ''} aria-pressed={vote === true} onClick={() => setVote(true)} disabled={busy}>
                <span>YES</span>
                <small>The YES rule is satisfied</small>
              </button>
              <button type="button" className={vote === false ? 'is-selected is-no' : ''} aria-pressed={vote === false} onClick={() => setVote(false)} disabled={busy}>
                <span>NO</span>
                <small>The YES rule is not satisfied</small>
              </button>
            </div>
            <button type="button" className="oracle-primary-action" onClick={sealVote} disabled={busy || vote === null || salt === '0x'}>
              {busy ? (tx.step === 'confirming' ? 'Recording on World Chain…' : 'Confirm in World App…') : 'Seal my answer on-chain'}
            </button>
          </>
        )
      ) : hasRevealed ? (
        <div className="oracle-ballot-success">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Answer revealed and verified</strong>
            <p>The contract matched it to your sealed commitment.</p>
          </div>
        </div>
      ) : saved ? (
        <>
          <div className="oracle-reveal-summary">
            <span>Your sealed answer</span>
            <strong>{saved.vote ? 'YES' : 'NO'}</strong>
          </div>
          <button type="button" className="oracle-primary-action" onClick={revealVote} disabled={busy}>
            {busy ? (tx.step === 'confirming' ? 'Recording on World Chain…' : 'Confirm in World App…') : 'Reveal my answer'}
          </button>
        </>
      ) : (
        <div className="oracle-ballot-message">
          <strong>Return on the device used to seal</strong>
          <p>The saved ballot secret is needed to reveal this answer.</p>
        </div>
      )}

      {tx.step === 'success' && tx.txHash && (
        <a className="oracle-tx-link" href={explorerTx(tx.txHash)} target="_blank" rel="noreferrer">
          View transaction on Worldscan ↗
        </a>
      )}
      {tx.step === 'error' && tx.error && <p className="oracle-inline-error" role="alert">{tx.error}</p>}
    </section>
  );
}
