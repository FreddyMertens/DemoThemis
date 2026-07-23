'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { encodeAbiParameters, keccak256, toBytes, type Address, type Hex } from 'viem';
import { AuthButton } from '@/components/AuthButton';
import { GasBadge } from '@/components/Badges';
import { disputeCourtAbi } from '@/abi/DisputeCourt';
import { usePolledData } from '@/lib/hooks';
import { addr, CHAIN_META, explorerTx, publicClient, SUPPORTS_THREE_STATE_RULING } from '@/lib/chain';
import { courtTx } from '@/lib/calldata';
import { useCourtTx } from '@/lib/tx';
import type { Phase } from '@/lib/court';

const ZERO_COMMITMENT = `0x${'0'.repeat(64)}` as Hex;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

type BallotAnswer = 0 | 1 | 2;
type LegacySavedBallot = { vote: boolean; salt: Hex; wallet: Address; round?: number };
type SavedBallotV2 = {
  version: 2;
  answer: BallotAnswer;
  salt: Hex;
  wallet: Address;
  round: number;
  courtAddress: Address;
  chainId: number;
};
type SavedBallot = LegacySavedBallot | SavedBallotV2;

const NO: BallotAnswer = 0;
const YES: BallotAnswer = 1;
const INSUFFICIENT_INFORMATION: BallotAnswer = 2;
const BALLOT_V2_DOMAIN = keccak256(toBytes('DEMOTHEMIS_BALLOT_V2'));

function answerLabel(answer: BallotAnswer): string {
  if (answer === YES) return 'YES';
  if (answer === NO) return 'NO';
  return 'INSUFFICIENT INFORMATION';
}

function isLegacySavedBallot(value: unknown, wallet: Address, round?: number): value is LegacySavedBallot {
  if (!value || typeof value !== 'object') return false;
  const ballot = value as Partial<LegacySavedBallot>;
  return (
    typeof ballot.vote === 'boolean' &&
    typeof ballot.salt === 'string' &&
    /^0x[0-9a-fA-F]{64}$/.test(ballot.salt) &&
    typeof ballot.wallet === 'string' &&
    ballot.wallet.toLowerCase() === wallet.toLowerCase() &&
    (round === undefined || ballot.round === undefined || ballot.round === round)
  );
}

function isSavedBallotV2(value: unknown, wallet: Address, round: number): value is SavedBallotV2 {
  if (!value || typeof value !== 'object') return false;
  const ballot = value as Partial<SavedBallotV2>;
  return (
    ballot.version === 2 &&
    (ballot.answer === NO || ballot.answer === YES || ballot.answer === INSUFFICIENT_INFORMATION) &&
    typeof ballot.salt === 'string' &&
    /^0x[0-9a-fA-F]{64}$/.test(ballot.salt) &&
    typeof ballot.wallet === 'string' &&
    ballot.wallet.toLowerCase() === wallet.toLowerCase() &&
    ballot.round === round &&
    ballot.courtAddress?.toLowerCase() === addr.court.toLowerCase() &&
    ballot.chainId === CHAIN_META.chainId
  );
}

export function LiveBallot({
  caseId,
  round,
  panel,
  phase,
  contentVerified,
  refresh,
}: {
  caseId: number;
  /** Zero for the first panel, one for the single recovery redraw. */
  round: number;
  panel: readonly Address[];
  phase: Phase;
  contentVerified: boolean;
  refresh: () => void | Promise<unknown>;
}) {
  const session = useSession();
  const { isInstalled } = useMiniKit();
  const wallet = session.data?.user?.walletAddress as Address | undefined;
  const tx = useCourtTx();
  const [answer, setAnswer] = useState<BallotAnswer | null>(null);
  const [salt, setSalt] = useState<Hex>('0x');
  const [saved, setSaved] = useState<SavedBallot | null>(null);
  const storeKey = wallet
    ? `ballot-${addr.court}-${caseId}-round-${round}-${wallet.toLowerCase()}`
    : null;
  const legacyStoreKey = wallet ? `ballot-${addr.court}-${caseId}-${wallet.toLowerCase()}` : null;

  const readWalletBallot = useCallback(async () => {
    if (!wallet) return { commitment: ZERO_COMMITMENT, revealed: false, round };
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
    return { commitment, revealed, round };
  }, [caseId, round, wallet]);
  const walletBallot = usePolledData(readWalletBallot, 4000);

  useEffect(() => {
    setSaved(null);
    setAnswer(null);
    let raw = storeKey ? localStorage.getItem(storeKey) : null;
    if (raw && wallet) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (SUPPORTS_THREE_STATE_RULING && isSavedBallotV2(parsed, wallet, round)) {
          setSaved(parsed);
          setAnswer(parsed.answer);
          setSalt(parsed.salt);
          return;
        }
        if (!SUPPORTS_THREE_STATE_RULING && isLegacySavedBallot(parsed, wallet, round)) {
          setSaved(parsed);
          setAnswer(parsed.vote ? YES : NO);
          setSalt(parsed.salt);
          return;
        }
      } catch {
        // Invalid local ballot data is replaced with a fresh secret below.
      }
      if (storeKey) localStorage.removeItem(storeKey);
      raw = null;
    }

    // Before redraws were round-keyed, first-panel secrets used the legacy key.
    // Migrate only round zero: carrying that disclosed salt into a retry would
    // defeat the reason for separating ballot storage by round.
    if (!SUPPORTS_THREE_STATE_RULING && !raw && round === 0 && storeKey && legacyStoreKey && wallet) {
      const legacyRaw = localStorage.getItem(legacyStoreKey);
      if (legacyRaw) {
        try {
          const parsed: unknown = JSON.parse(legacyRaw);
          if (isLegacySavedBallot(parsed, wallet)) {
            const migrated: LegacySavedBallot = { ...parsed, round: 0 };
            localStorage.setItem(storeKey, JSON.stringify(migrated));
            localStorage.removeItem(legacyStoreKey);
            setSaved(migrated);
            setAnswer(migrated.vote ? YES : NO);
            setSalt(migrated.salt);
            return;
          }
        } catch {
          // Invalid legacy data is discarded and replaced with a fresh secret.
        }
        localStorage.removeItem(legacyStoreKey);
      }
    }

    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setSalt(`0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}` as Hex);
  }, [legacyStoreKey, round, storeKey, wallet]);

  const commitment = useMemo<Hex>(() => {
    if (answer === null || salt === '0x') return ZERO_COMMITMENT;
    if (SUPPORTS_THREE_STATE_RULING) {
      return keccak256(
        encodeAbiParameters(
          [
            { type: 'bytes32' },
            { type: 'uint256' },
            { type: 'address' },
            { type: 'uint256' },
            { type: 'uint8' },
            { type: 'address' },
            { type: 'uint8' },
            { type: 'bytes32' },
          ],
          [BALLOT_V2_DOMAIN, BigInt(CHAIN_META.chainId), addr.court, BigInt(caseId), round, wallet ?? ZERO_ADDRESS, answer, salt],
        ),
      );
    }
    return keccak256(
      encodeAbiParameters(
        [{ type: 'bool' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
        [answer === YES, salt, BigInt(caseId), wallet ?? ZERO_ADDRESS],
      ),
    );
  }, [answer, caseId, round, salt, wallet]);

  const isPanelMember = !!wallet && panel.some((juror) => juror.toLowerCase() === wallet.toLowerCase());
  const hasCommitted = !!walletBallot.data && walletBallot.data.commitment !== ZERO_COMMITMENT;
  const hasRevealed = walletBallot.data?.revealed === true;
  const busy = tx.step === 'submitting' || tx.step === 'confirming';

  async function sealVote() {
    if (!contentVerified || !wallet || !storeKey || answer === null || salt === '0x' || hasCommitted) return;
    if (!SUPPORTS_THREE_STATE_RULING && answer === INSUFFICIENT_INFORMATION) return;
    const ballot: SavedBallot = SUPPORTS_THREE_STATE_RULING
      ? { version: 2, answer, salt, wallet, round, courtAddress: addr.court, chainId: CHAIN_META.chainId }
      : { vote: answer === YES, salt, wallet, round };
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
    const hash = await tx.submit([
      'version' in saved
        ? courtTx.revealAnswer(BigInt(caseId), saved.answer, saved.salt)
        : courtTx.reveal(BigInt(caseId), saved.vote, saved.salt),
    ]);
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
              <button type="button" className={`is-yes-option${answer === YES ? ' is-selected is-yes' : ''}`} aria-pressed={answer === YES} onClick={() => setAnswer(YES)} disabled={busy}>
                <span>YES</span>
                <small>The YES rule is satisfied</small>
              </button>
              <button type="button" className={`is-no-option${answer === NO ? ' is-selected is-no' : ''}`} aria-pressed={answer === NO} onClick={() => setAnswer(NO)} disabled={busy}>
                <span>NO</span>
                <small>The YES rule is not satisfied</small>
              </button>
              <button
                type="button"
                className={`is-insufficient-option${answer === INSUFFICIENT_INFORMATION ? ' is-selected is-insufficient' : ''}`}
                aria-pressed={answer === INSUFFICIENT_INFORMATION}
                onClick={() => setAnswer(INSUFFICIENT_INFORMATION)}
                disabled={busy || !SUPPORTS_THREE_STATE_RULING}
                title={SUPPORTS_THREE_STATE_RULING ? undefined : 'Not available for this contract version'}
              >
                <span>INSUFFICIENT INFORMATION</span>
                <small>The permitted evidence cannot reliably establish YES or NO</small>
              </button>
            </div>
            {!SUPPORTS_THREE_STATE_RULING && (
              <p className="oracle-ballot-capability-note">This selected case exposes a two-answer ballot.</p>
            )}
            <button type="button" className="oracle-primary-action" onClick={sealVote} disabled={busy || answer === null || salt === '0x'}>
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
            <strong>{'version' in saved ? answerLabel(saved.answer) : saved.vote ? 'YES' : 'NO'}</strong>
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
