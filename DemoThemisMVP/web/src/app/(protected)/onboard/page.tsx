'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { type Address } from 'viem';
import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { GasBadge } from '@/components/Badges';
import { AuthButton } from '@/components/AuthButton';
import { InstanceBanner } from '@/components/InstanceBanner';
import { SybilDemo } from '@/components/SybilDemo';
import { usePolledData } from '@/lib/hooks';
import { registryStats, musdBalanceOf } from '@/lib/court';
import { IS_COHORT, explorerTx, BOND } from '@/lib/chain';
import { generateRegistrationProof } from '@/lib/worldid';
import { courtTx } from '@/lib/calldata';
import { useCourtTx } from '@/lib/tx';

const STEPS = [
  { n: 1, title: 'Verify a unique human', body: 'A World ID 4.0 proof is checked on-chain and bound to your wallet. One person, one juror seat — no wallet can do it twice.' },
  { n: 2, title: 'Post a $5 bond through Permit2', body: 'World App, MiniKit, and Permit2 batch the valueless MUSD bond path so the court can pull the bond in one onboard.' },
  { n: 3, title: 'Join the drawable pool', body: 'You become eligible to be drawn onto random panels. Withdraw the bond any time you are not empaneled.' },
];

type Phase = 'idle' | 'verifying' | 'submitting' | 'done' | 'error';

export default function Onboard() {
  const stats = usePolledData(registryStats);
  const session = useSession();
  const { isInstalled } = useMiniKit();
  const tx = useCourtTx();
  const wallet = session.data?.user?.walletAddress as Address | undefined;

  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState('');
  const [verifiedIndex, setVerifiedIndex] = useState<number | null>(null);

  // The single-tap onboard: verify human -> (faucet if short) + Permit2 approve +
  // registerWithPermit2, batched through World App's sponsored-gas path. This write
  // path runs only inside World App on mainnet and is verified on-device at the capstone.
  async function onboard() {
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
      setNote('Posting your $5 bond and joining the court…');
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
        stats.refresh();
      } else {
        setPhase('error');
        setNote(tx.error ?? 'The transaction did not go through.');
      }
    } catch (e) {
      setPhase('error');
      setNote(e instanceof Error ? e.message : String(e));
    }
  }

  const busy = phase === 'verifying' || phase === 'submitting';
  const verifiedHumanLabel = verifiedIndex == null ? 'Verified human' : `Verified human #${verifiedIndex}`;

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title="Become a juror"
          startAdornment={
            <Link href="/home" className="text-sm text-slate-500">
              ← Court
            </Link>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-20">
        <InstanceBanner />

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-sm font-semibold text-slate-900">
            The World stack handles the hard parts: one person, one vote, wallet-bound proof, Permit2 bond,
            and sponsored mainnet transaction path.
          </p>
          <div className="mt-2 flex justify-center">
            <GasBadge />
          </div>
        </div>

        <div className="space-y-2">
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

        <SybilDemo />

        {IS_COHORT ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-snug text-amber-900">
            <p>
              This cohort&apos;s ~20 jurors register through a labeled stand-in (MockSybilGate), so you
              can&apos;t join it from here. The <span className="font-semibold">real</span> on-chain
              World ID 4.0 gate runs on World Chain mainnet — the reverts above show it rejecting a forged
              proof and a duplicate human. A real human registration is the on-device capstone step.
            </p>
            <Link
              href="/juror-preview"
              className="mt-3 block rounded-lg bg-amber-900 px-3 py-2 text-center text-xs font-semibold text-white"
            >
              Test juror UX locally
            </Link>
          </div>
        ) : phase === 'done' ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
            <p className="text-base font-bold text-emerald-900">🎉 You are a juror.</p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              {verifiedHumanLabel}: one person, one vote.
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              No wallet can do this twice.
            </p>
            <p className="mt-1 text-xs leading-snug text-emerald-700">
              Your identity nullifier is now spent in this registry; a second wallet for the same
              human would revert instead of creating another seat.
            </p>
            {tx.txHash && (
              <a
                href={explorerTx(tx.txHash)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-medium text-emerald-700 underline"
              >
                View your registration on worldscan ↗
              </a>
            )}
            <Link
              href="/home"
              className="mt-3 block w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Go to the court
            </Link>
          </div>
        ) : !wallet ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-sm font-semibold text-slate-800">Sign in before joining the court</p>
            <p className="mb-3 mt-1 text-xs text-slate-500">
              World App signs a one-time wallet message, then returns you here to verify personhood
              and post the valueless MockUSD bond.
            </p>
            <AuthButton />
          </div>
        ) : !isInstalled ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-sm font-semibold text-slate-800">Joining happens in World App</p>
            <p className="mt-1 text-xs text-slate-500">
              Open this Mini App inside World App on your phone: walletAuth signs you in, World ID verifies
              personhood, and Permit2 posts the bond. On desktop this screen is read-only.
            </p>
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
            {/* two-step progress */}
            {busy && (
              <div className="flex gap-2 text-[11px] text-slate-500">
                <span className={phase === 'verifying' ? 'font-semibold text-slate-800' : ''}>
                  1. Verify human
                </span>
                <span>→</span>
                <span className={phase === 'submitting' ? 'font-semibold text-slate-800' : ''}>
                  2. Bond & register
                </span>
              </div>
            )}
            {note && (
              <p
                className={`rounded-lg px-3 py-2 text-xs ${
                  phase === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'
                }`}
              >
                {note}
              </p>
            )}
            <p className="text-[11px] leading-snug text-slate-400">
              World App will sponsor gas for verified humans at the capstone trace. The bond is valueless
              MockUSD; the 3/3 panel is a labeled demo parameter.
            </p>
          </div>
        )}
      </Page.Main>
    </>
  );
}
