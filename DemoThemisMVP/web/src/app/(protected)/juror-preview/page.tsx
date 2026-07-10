'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { encodeAbiParameters, keccak256, type Address, type Hex } from 'viem';
import { CourtTopBar } from '@/components/CourtTopBar';
import { Page } from '@/components/PageLayout';
import { CaseTypeBadge, OutcomeBadge, PhaseBadge } from '@/components/court-ui';
import type { Phase } from '@/lib/court';
import { fmtMusd, shortAddr } from '@/lib/format';

const PREVIEW_JUROR = '0x7a8b4c2d8f3e9a01b6c5d4e3f2a1908765432101' as Address;
const PANEL = [
  PREVIEW_JUROR,
  '0x13b4a8f2c1d0e9f8675432101234567890abcdef',
  '0x44f2c01ab7d83291cce098765432101234567890',
] as const;
const STORE_KEY = 'demothemis-local-juror-preview';

type Stage = 'join' | 'commit' | 'reveal' | 'resolved';
type JoinPhase = 'idle' | 'verifying' | 'bonding' | 'done';
type SavedBallot = { vote: boolean; salt: Hex };

function phaseFor(stage: Stage): Phase {
  if (stage === 'commit') return 'Commit';
  if (stage === 'reveal') return 'Reveal';
  if (stage === 'resolved') return 'Resolved';
  return 'Open';
}

function randomSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('')}` as Hex;
}

function StepPill({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
        active ? 'bg-slate-900 text-white' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {label}
    </span>
  );
}

export default function JurorPreview() {
  const [stage, setStage] = useState<Stage>('join');
  const [joinPhase, setJoinPhase] = useState<JoinPhase>('idle');
  const [vote, setVote] = useState(true);
  const [salt, setSalt] = useState<Hex>('0x');
  const [saved, setSaved] = useState<SavedBallot | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SavedBallot;
        setSaved(parsed);
        setVote(parsed.vote);
        setSalt(parsed.salt);
        setStage('reveal');
        setJoinPhase('done');
        return;
      } catch {
        localStorage.removeItem(STORE_KEY);
      }
    }
    setSalt(randomSalt());
  }, []);

  const commitment = useMemo<Hex>(() => {
    if (salt === '0x') return '0x';
    return keccak256(
      encodeAbiParameters(
        [{ type: 'bool' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
        [vote, salt, BigInt(777), PREVIEW_JUROR],
      ),
    );
  }, [salt, vote]);

  function startJoinPreview() {
    setJoinPhase('verifying');
    window.setTimeout(() => setJoinPhase('bonding'), 450);
    window.setTimeout(() => {
      setJoinPhase('done');
      setStage('commit');
    }, 900);
  }

  function commitLocalVote() {
    const ballot = { vote, salt };
    localStorage.setItem(STORE_KEY, JSON.stringify(ballot));
    setSaved(ballot);
    setStage('reveal');
  }

  function revealLocalVote() {
    if (!saved) return;
    setStage('resolved');
  }

  function resetPreview() {
    localStorage.removeItem(STORE_KEY);
    setStage('join');
    setJoinPhase('idle');
    setSaved(null);
    setVote(true);
    setSalt(randomSalt());
  }

  const phase = phaseFor(stage);
  const joined = joinPhase === 'done';

  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar
          title="Juror UX preview"
          startAdornment={
            <Link href="/onboard" className="text-sm text-slate-500">
              Back
            </Link>
          }
        />
      </Page.Header>
      <Page.Main className="mb-20 flex flex-col items-stretch gap-4">
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-snug text-amber-900">
          Local QA only. No World ID prompt, no wallet signature, no transaction, and no chain state is changed. This
          page previews the juror screens that are otherwise gated by World App.
        </section>

        <div className="flex flex-wrap gap-1.5">
          <StepPill label="Join" active={stage === 'join'} done={joined} />
          <StepPill label="Commit" active={stage === 'commit'} done={stage === 'reveal' || stage === 'resolved'} />
          <StepPill label="Reveal" active={stage === 'reveal'} done={stage === 'resolved'} />
          <StepPill label="Resolved" active={stage === 'resolved'} done={stage === 'resolved'} />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Local juror</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                {joined ? 'Verified human #21' : 'Become a juror'}
              </h2>
            </div>
            <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase text-sky-700">
              preview
            </span>
          </div>

          {!joined ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                The preview compresses the World ID proof, Permit2 approval, MockUSD faucet, and registry join into one
                local sequence.
              </p>
              <button
                onClick={startJoinPreview}
                disabled={joinPhase !== 'idle'}
                className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {joinPhase === 'verifying'
                  ? 'Verifying unique human...'
                  : joinPhase === 'bonding'
                    ? 'Posting local bond...'
                    : 'Start local join preview'}
              </button>
              {joinPhase !== 'idle' && (
                <div className="mt-2 flex gap-2 text-[11px] text-slate-500">
                  <span className={joinPhase === 'verifying' ? 'font-semibold text-slate-800' : ''}>
                    1. Verify human
                  </span>
                  <span>-&gt;</span>
                  <span className={joinPhase === 'bonding' ? 'font-semibold text-slate-800' : ''}>
                    2. Bond and register
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">Verified human #21: one person, one vote.</p>
              <p className="mt-1 text-xs leading-snug text-emerald-700">
                In the real path, the identity nullifier is spent in the registry; a second wallet for the same human
                would revert instead of creating another seat.
              </p>
            </div>
          )}
        </section>

        {joined && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <PhaseBadge phase={phase} />
              <CaseTypeBadge caseType={1} />
              {stage === 'resolved' && <OutcomeBadge caseType={1} outcome />}
            </div>

            <h2 className="mt-3 text-base font-semibold text-slate-950">Case #LOCAL-777</h2>
            <p className="mt-1 text-sm text-slate-600">
              Should the payee be paid for the completed logo brief under the linked terms?
            </p>
            <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
              Terms: payee delivered the final mark, source file, and usage sheet before the deadline.
            </p>

            {stage === 'commit' && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Commit your vote</h3>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setVote(true)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                      vote ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setVote(false)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                      !vote ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    NO
                  </button>
                </div>
                <p className="mt-2 break-all text-[10px] text-slate-400">
                  commitment keccak(vote, salt, caseId, your address) = {commitment.slice(0, 22)}...
                </p>
                <p className="mt-1 break-all text-[10px] text-slate-400">
                  salt saved on this device = {salt.slice(0, 22)}...
                </p>
                <button
                  onClick={commitLocalVote}
                  className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Commit vote locally
                </button>
              </div>
            )}

            {stage === 'reveal' && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Reveal your vote</h3>
                {saved ? (
                  <p className="mt-1 text-xs text-slate-500">
                    You committed <span className="font-semibold">{saved.vote ? 'YES' : 'NO'}</span>. Reveal it now so
                    it counts toward the verdict.
                  </p>
                ) : (
                  <p className="mt-1 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
                    No saved ballot found on this device. The salt is needed to reveal.
                  </p>
                )}
                <button
                  onClick={revealLocalVote}
                  disabled={!saved}
                  className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Reveal vote locally
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem(STORE_KEY);
                    setSaved(null);
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Preview missing-salt state
                </button>
              </div>
            )}

            {stage === 'resolved' && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">
                  3 local preview humans decided this: one person, one vote, no wallet voted twice.
                </p>
                <p className="mt-1 text-xs">
                  Fee pool {fmtMusd(BigInt(2_000_000))} MUSD split 70/20/10. Verdict:{' '}
                  <span className="font-semibold">payee paid</span>.
                </p>
              </div>
            )}

            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-slate-500">Panel ({PANEL.length})</p>
              <div className="flex flex-wrap gap-1">
                {PANEL.map((p) => (
                  <span key={p} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    {shortAddr(p)}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setJoinPhase('done');
              setStage('commit');
              if (salt === '0x') setSalt(randomSalt());
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Jump to commit
          </button>
          <button
            onClick={resetPreview}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Reset preview
          </button>
        </div>
      </Page.Main>
    </>
  );
}
