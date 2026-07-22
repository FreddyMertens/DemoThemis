'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { type Address } from 'viem';
import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
import { GasBadge } from '@/components/Badges';
import { AuthButton } from '@/components/AuthButton';
import { InstanceBanner } from '@/components/InstanceBanner';
import { SybilDemo } from '@/components/SybilDemo';
import { usePolledData } from '@/lib/hooks';
import { getJurorMembership, registryStats, musdBalanceOf } from '@/lib/court';
import { IS_COHORT, SUPPORTS_LIVENESS_RECOVERY, explorerTx, BOND } from '@/lib/chain';
import { generateRegistrationProof } from '@/lib/worldid';
import { courtTx } from '@/lib/calldata';
import { useCourtTx } from '@/lib/tx';

const STEPS = [
  {
    n: 1,
    title: 'Verify with World ID',
    body: 'Proves one unique person and binds that seat to your wallet.',
  },
  {
    n: 2,
    title: 'Post a 5 MUSD demo bond',
    body: 'The token is valueless; World App submits the bond and registration together.',
  },
  {
    n: 3,
    title: 'Join the juror pool',
    body: 'You can be drawn for cases and withdraw when you are not serving.',
  },
];

type Phase = 'idle' | 'verifying' | 'submitting' | 'rejoining' | 'leaving' | 'done' | 'rejoined' | 'left' | 'error';

export default function Onboard() {
  const stats = usePolledData(registryStats);
  const session = useSession();
  const { isInstalled } = useMiniKit();
  const tx = useCourtTx();
  const wallet = session.data?.user?.walletAddress as Address | undefined;
  const membershipFetcher = useCallback(
    async () => (wallet ? getJurorMembership(wallet) : null),
    [wallet],
  );
  const membership = usePolledData(membershipFetcher, 6000);

  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState('');
  const [verifiedIndex, setVerifiedIndex] = useState<number | null>(null);

  // The single-tap onboard: verify human -> (faucet if short) + Permit2 approve +
  // registerWithPermit2, batched through World App's sponsored-gas path. This write
  // path runs only inside World App on mainnet and is verified on-device at the capstone.
  async function onboard() {
    if (!IS_COHORT && !SUPPORTS_LIVENESS_RECOVERY) {
      setPhase('error');
      setNote('Capstone onboarding is paused until replacement contracts with party-aware admission and both bounded recovery paths are deployed.');
      return;
    }
    if (!wallet) {
      setPhase('error');
      setNote('Connect your World App wallet first.');
      return;
    }
    try {
      setPhase('verifying');
      setNote('Verifying you are a unique human…');
      const appId = process.env.NEXT_PUBLIC_APP_ID as string;
      const proof = await generateRegistrationProof({ appId, signal: wallet });
      if (!proof.signalBindingOk) {
        setPhase('error');
        setNote('The proof did not bind to your wallet. Please try again.');
        return;
      }

      setPhase('submitting');
      setNote('Posting your 5 MUSD demo bond and joining the court…');
      const balance = await musdBalanceOf(wallet);
      const batch = [
        ...(balance < BOND ? [courtTx.faucet()] : []), // top up if short (100 MUSD/day)
        courtTx.permit2ApproveBond(),
        courtTx.registerWithPermit2(wallet, proof.bytesProof),
      ];
      const hash = await tx.submit(batch);
      if (hash) {
        setVerifiedIndex(stats.data?.jurorCount == null ? null : stats.data.jurorCount + 1);
        setPhase('done');
        setNote('');
        await Promise.all([stats.refresh(), membership.refresh()]);
      } else {
        setPhase('error');
        setNote(tx.error ?? 'The transaction did not go through.');
      }
    } catch (e) {
      setPhase('error');
      setNote(e instanceof Error ? e.message : String(e));
    }
  }

  async function leaveJury() {
    try {
      setPhase('leaving');
      setNote('Leaving the jury and returning your demo bond…');
      const hash = await tx.submit([courtTx.withdrawJuror()]);
      if (!hash) {
        setPhase('error');
        setNote(tx.error ?? 'The transaction did not go through.');
        return;
      }
      await Promise.all([stats.refresh(), membership.refresh()]);
      setPhase('left');
      setNote('You left the active jury and your demo bond was returned.');
    } catch (e) {
      setPhase('error');
      setNote(e instanceof Error ? e.message : String(e));
    }
  }

  // A previously verified human only needs to restore the full bond. The durable
  // World ID registration/nullifier remains in the registry, so asking for a new
  // proof here would be both unnecessary and rejected by the contract.
  async function rejoinJury() {
    if (!SUPPORTS_LIVENESS_RECOVERY) {
      setPhase('error');
      setNote('This deployed registry predates safe Permit2 rejoining. A replacement deployment is required.');
      return;
    }
    if (!wallet) {
      setPhase('error');
      setNote('Connect your World App wallet first.');
      return;
    }
    try {
      setPhase('rejoining');
      setNote('Restoring your 5 MUSD demo bond and rejoining the juror pool…');
      const balance = await musdBalanceOf(wallet);
      const batch = [
        ...(balance < BOND ? [courtTx.faucet()] : []),
        courtTx.permit2ApproveBond(),
        courtTx.postBondWithPermit2(),
      ];
      const hash = await tx.submit(batch);
      if (!hash) {
        setPhase('error');
        setNote(tx.error ?? 'The transaction did not go through.');
        return;
      }
      await Promise.all([stats.refresh(), membership.refresh()]);
      setPhase('rejoined');
      setNote('Your bond is restored. You are available for future panel draws again.');
    } catch (e) {
      setPhase('error');
      setNote(e instanceof Error ? e.message : String(e));
    }
  }

  const busy = phase === 'verifying' || phase === 'submitting' || phase === 'rejoining' || phase === 'leaving';
  const verifiedHumanLabel = verifiedIndex == null ? 'Verified human' : `Verified human #${verifiedIndex}`;
  const activePoolSize = stats.data?.jurorCount ?? 0;
  const isActiveJuror = membership.data?.active === true;
  const isInactiveJuror = membership.data?.registered === true && !isActiveJuror;
  const isServing = (membership.data?.activePanels ?? 0) > 0;

  const actionPanel = IS_COHORT ? (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-amber-900">
      <p className="text-sm font-semibold">This simulated cohort is read-only.</p>
      <p className="mt-1 text-xs">Try the complete juror journey locally without a proof, wallet signature, or funds.</p>
      <Link
        href="/juror-preview"
        className="mt-3 block rounded-lg bg-amber-900 px-3 py-2.5 text-center text-sm font-semibold text-white"
      >
        Try a sample juror case →
      </Link>
    </div>
  ) : isActiveJuror ? (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
      <p className="text-base font-bold text-emerald-950">You are active in the juror pool.</p>
      <p className="mt-1 text-sm text-emerald-800">
        {isServing
          ? 'Finish your current panel before leaving the jury.'
          : `The pool has ${activePoolSize} active ${activePoolSize === 1 ? 'human' : 'humans'}; each case draws a three-seat panel.`}
      </p>
      {isInstalled ? (
        <button
          type="button"
          onClick={leaveJury}
          disabled={busy || isServing}
          className="mt-3 w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {phase === 'leaving' ? 'Leaving jury…' : 'Leave jury'}
        </button>
      ) : (
        <div className="mt-3"><AuthButton /></div>
      )}
      {note && phase === 'error' && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
          {note}
        </p>
      )}
    </div>
  ) : isInactiveJuror ? (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
      <p className="text-base font-bold text-emerald-950">Your verified seat is inactive.</p>
      <p className="mt-1 text-sm text-emerald-800">
        {phase === 'left' || phase === 'rejoined'
          ? note
          : SUPPORTS_LIVENESS_RECOVERY
            ? 'Your World ID registration remains valid. Restore the demo bond to become available for panel draws again—no new identity proof is needed.'
            : 'Your World ID registration remains valid, but these deployed addresses predate safe Permit2 rejoining. A replacement deployment is required before this wallet can restore its bond.'}
      </p>
      {SUPPORTS_LIVENESS_RECOVERY && isInstalled && phase !== 'rejoined' ? (
        <button
          type="button"
          onClick={rejoinJury}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {phase === 'rejoining' ? 'Restoring bond…' : 'Restore bond & rejoin pool'}
        </button>
      ) : SUPPORTS_LIVENESS_RECOVERY && !isInstalled && phase !== 'rejoined' ? (
        <div className="mt-3"><AuthButton /></div>
      ) : null}
      {tx.txHash && (phase === 'left' || phase === 'rejoined') && (
        <a href={explorerTx(tx.txHash)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-emerald-700 underline">
          View transaction on Worldscan ↗
        </a>
      )}
      {note && phase === 'error' && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{note}</p>
      )}
      <Link href="/app" className="mt-3 block rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white">
        View the live case
      </Link>
    </div>
  ) : !SUPPORTS_LIVENESS_RECOVERY ? (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center">
      <p className="text-base font-bold text-amber-950">Capstone onboarding is paused.</p>
      <p className="mt-1 text-sm text-amber-800">
        The selected mainnet addresses predate party-aware admission and both bounded recovery paths. No new jurors should register until the replacement deployment is configured here.
      </p>
      <Link href="/app" className="mt-3 block rounded-xl bg-amber-900 px-4 py-3 text-sm font-semibold text-white">
        Review deployment status
      </Link>
    </div>
  ) : phase === 'done' ? (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
      <p className="text-base font-bold text-emerald-900">You&apos;re in the juror pool.</p>
      <p className="mt-1 text-sm text-emerald-800">
        {verifiedHumanLabel}. This World ID now has one pool entry; each case randomly draws three active humans.
      </p>
      {tx.txHash && (
        <a
          href={explorerTx(tx.txHash)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-medium text-emerald-700 underline"
        >
          View registration on worldscan ↗
        </a>
      )}
      <Link
        href="/app"
        className="mt-3 block w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
      >
        View the live case
      </Link>
    </div>
  ) : !wallet ? (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-sm font-semibold text-slate-800">Sign in with World App to join</p>
      <p className="mb-3 mt-1 text-xs text-slate-500">Verify with World ID and post the valueless 5 MUSD demo bond.</p>
      <AuthButton />
    </div>
  ) : !isInstalled ? (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-sm font-semibold text-slate-800">Open this Mini App in World App to join</p>
      <div className="mt-3">
        <AuthButton />
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      <button
        onClick={onboard}
        disabled={busy}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {phase === 'verifying'
          ? 'Verifying with World ID…'
          : phase === 'submitting'
            ? 'Posting bond & joining…'
            : 'Verify with World ID & join'}
      </button>
      {busy && (
        <div className="flex gap-2 text-[11px] text-slate-500" aria-live="polite">
          <span className={phase === 'verifying' ? 'font-semibold text-slate-800' : ''}>1. Verify human</span>
          <span>→</span>
          <span className={phase === 'submitting' ? 'font-semibold text-slate-800' : ''}>2. Bond & register</span>
        </div>
      )}
      {note && (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${
            phase === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'
          }`}
          role={phase === 'error' ? 'alert' : 'status'}
        >
          {note}
        </p>
      )}
    </div>
  );

  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar
          title="Join the juror pool"
          startAdornment={
            <Link href="/app" className="text-sm text-slate-500">
              ← Live case
            </Link>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-20">
        <InstanceBanner />
        {actionPanel}
        {!IS_COHORT && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-violet-950">
              Active pool: {activePoolSize} verified {activePoolSize === 1 ? 'human' : 'humans'}
            </p>
            <p className="mt-1 text-xs text-violet-700">The pool can grow beyond three; each question draws exactly three panel seats.</p>
          </div>
        )}
        {!IS_COHORT && (
          <div className="flex justify-center">
            <GasBadge />
          </div>
        )}

        <details className="court-disclosure">
          <summary>
            How joining works <span>3 steps</span>
          </summary>
          <div className="court-disclosure-content space-y-2">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {s.n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </details>

        <details className="court-disclosure">
          <summary>
            Why one human can only join once <span>on-chain evidence</span>
          </summary>
          <div className="court-disclosure-content">
            <SybilDemo />
          </div>
        </details>
      </Page.Main>
    </>
  );
}
