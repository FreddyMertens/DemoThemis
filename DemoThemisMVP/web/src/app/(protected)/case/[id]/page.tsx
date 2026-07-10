'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { keccak256, encodeAbiParameters, type Address, type Hex } from 'viem';
import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { CaseTypeBadge, ErrorState, OutcomeBadge, PhaseBadge, Skeleton } from '@/components/court-ui';
import { GasBadge, SimulatedBadge } from '@/components/Badges';
import { AuthButton } from '@/components/AuthButton';
import { InstanceBanner } from '@/components/InstanceBanner';
import { usePolledData } from '@/lib/hooks';
import { getCase, fetchCaseContent, type CaseContent, type Phase } from '@/lib/court';
import { explorerAddress, explorerTx, IS_COHORT, addr } from '@/lib/chain';
import { courtTx } from '@/lib/calldata';
import { useCourtTx } from '@/lib/tx';
import { fmtMusd, shortAddr } from '@/lib/format';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as Address;

// Phase timeline including the grayed-out optimistic-assertion step (not on-chain
// in the MVP — see docs/MECHANISM_DELTA.md), then the real on-chain phases.
const TIMELINE: { key: string; label: string; grayed?: boolean }[] = [
  { key: 'assertion', label: 'Assertion window', grayed: true },
  { key: 'Open', label: 'Open' },
  { key: 'Commit', label: 'Commit' },
  { key: 'Reveal', label: 'Reveal' },
  { key: 'Resolved', label: 'Resolved' },
];
function timelineIndex(phase: Phase): number {
  if (phase === 'Resolvable') return TIMELINE.findIndex((t) => t.key === 'Reveal');
  return TIMELINE.findIndex((t) => t.key === phase);
}

function PhaseTimeline({ phase }: { phase: Phase }) {
  const active = timelineIndex(phase);
  return (
    <div className="flex items-center gap-1">
      {TIMELINE.map((step, i) => (
        <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`h-1.5 w-full rounded-full ${
              step.grayed ? 'bg-slate-200' : i <= active ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          />
          <span
            className={`text-center text-[9px] leading-tight ${
              step.grayed ? 'text-slate-300' : i === active ? 'font-semibold text-slate-800' : 'text-slate-400'
            }`}
            title={step.grayed ? 'Skipped in the demo — see the full design' : undefined}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CommitReveal({ caseId, phase, refresh }: { caseId: number; phase: Phase; refresh: () => void }) {
  const session = useSession();
  const { isInstalled } = useMiniKit();
  const wallet = session.data?.user?.walletAddress as Address | undefined;
  const tx = useCourtTx();

  const storeKey = `ballot-${addr.court}-${caseId}`;
  const [vote, setVote] = useState(true);
  const [salt, setSalt] = useState<Hex>('0x');
  // The ballot saved at commit time: reveal must replay the SAME vote + salt or it
  // reverts BadReveal. Persisted to localStorage (the "export your salt" step).
  const [saved, setSaved] = useState<{ vote: boolean; salt: Hex } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(storeKey);
    if (raw) {
      try {
        const b = JSON.parse(raw) as { vote: boolean; salt: Hex };
        setSaved(b);
        setVote(b.vote);
        setSalt(b.salt);
        return;
      } catch {
        /* fall through to a fresh salt */
      }
    }
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setSalt(('0x' + Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('')) as Hex);
  }, [storeKey]);

  // Commit hash = keccak256(abi.encode(vote, salt, caseId, juror)) — bound to the
  // voter's wallet, so the on-chain reveal (msg.sender = wallet) must match.
  const commitment = useMemo<Hex>(() => {
    if (salt === '0x') return '0x';
    return keccak256(
      encodeAbiParameters(
        [{ type: 'bool' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
        [vote, salt, BigInt(caseId), wallet ?? ZERO_ADDR],
      ),
    );
  }, [vote, salt, caseId, wallet]);

  const canWrite = !IS_COHORT && isInstalled && !!wallet;
  const busy = tx.step === 'submitting' || tx.step === 'confirming';

  async function doCommit() {
    localStorage.setItem(storeKey, JSON.stringify({ vote, salt }));
    setSaved({ vote, salt });
    const hash = await tx.submit([courtTx.commit(BigInt(caseId), commitment)]);
    if (hash) refresh();
  }

  async function doReveal() {
    if (!saved) return;
    const hash = await tx.submit([courtTx.reveal(BigInt(caseId), saved.vote, saved.salt)]);
    if (hash) refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {phase === 'Commit' ? 'Commit your vote' : 'Reveal your vote'}
        </h3>
        <GasBadge />
      </div>

      {phase === 'Commit' ? (
        <>
          <div className="mb-2 flex gap-2">
            <button
              onClick={() => setVote(true)}
              disabled={busy}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${vote ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'}`}
            >
              YES
            </button>
            <button
              onClick={() => setVote(false)}
              disabled={busy}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${!vote ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-500'}`}
            >
              NO
            </button>
          </div>
          <p className="break-all text-[10px] text-slate-400">
            commitment keccak(vote, salt, caseId, your address) = {commitment.slice(0, 22)}…
          </p>
          <p className="mt-1 break-all text-[10px] text-slate-400">
            salt (saved on this device — keep it to reveal) = {salt.slice(0, 22)}…
          </p>
        </>
      ) : (
        <p className="text-xs text-slate-500">
          {saved ? (
            <>
              You committed <span className="font-semibold">{saved.vote ? 'YES' : 'NO'}</span>. Reveal it
              now so it counts toward the verdict.
            </>
          ) : (
            <span className="text-rose-600">
              No saved ballot found on this device — the salt is needed to reveal. If you committed on
              another device, reveal there.
            </span>
          )}
        </p>
      )}

      {canWrite ? (
        <button
          onClick={phase === 'Commit' ? doCommit : doReveal}
          disabled={busy || (phase === 'Reveal' && !saved)}
          className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy
            ? phase === 'Commit'
              ? 'Committing…'
              : 'Revealing…'
            : phase === 'Commit'
              ? 'Commit vote'
              : 'Reveal vote'}
        </button>
      ) : IS_COHORT ? (
        <button
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
        >
          Preview — the capstone ballot runs on mainnet via World App
        </button>
      ) : (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-center text-xs text-slate-600">
            Sign in with World App to submit this ballot from your verified wallet.
          </p>
          <AuthButton />
        </div>
      )}

      {tx.step === 'success' && tx.txHash && (
        <a
          href={explorerTx(tx.txHash)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-center text-[11px] font-medium text-emerald-700 underline"
        >
          {phase === 'Commit' ? 'Vote committed' : 'Vote revealed'} — view on worldscan ↗
        </a>
      )}
      {tx.step === 'error' && tx.error && (
        <p className="mt-2 break-all rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">{tx.error}</p>
      )}
    </div>
  );
}

export default function CaseDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const fetcher = useCallback(() => getCase(id), [id]);
  const { data: c, error, loading, refresh } = usePolledData(fetcher);

  const [content, setContent] = useState<{
    content?: CaseContent;
    matches?: boolean;
    error?: string;
    loaded: boolean;
  }>({ loaded: false });

  useEffect(() => {
    if (!c) return;
    let alive = true;
    fetchCaseContent(c.uri, c.criteriaHash).then((r) => {
      if (alive) setContent({ content: r.content, matches: r.matches, error: r.error, loaded: true });
    });
    return () => {
      alive = false;
    };
  }, [c]);

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title={`Case #${Number.isNaN(id) ? '?' : id}`}
          startAdornment={
            <Link href="/home" className="text-sm text-slate-500">
              ← Court
            </Link>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-20">
        <InstanceBanner />
        {loading && !c ? (
          <Skeleton rows={4} />
        ) : error && !c ? (
          <ErrorState error={error} />
        ) : c ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <PhaseBadge phase={c.phase} />
              <CaseTypeBadge caseType={c.caseType} />
              {c.phase === 'Resolved' && <OutcomeBadge caseType={c.caseType} outcome={c.outcome} />}
              {c.redraws > 0 && (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                  redrawn once
                </span>
              )}
              <SimulatedBadge />
            </div>

            <PhaseTimeline phase={c.phase} />

            {/* content + hash check */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              {!content.loaded ? (
                <p className="text-sm text-slate-400">Loading case content…</p>
              ) : content.content ? (
                <>
                  <h2 className="text-base font-semibold text-slate-900">{content.content.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{content.content.question}</p>
                  {content.content.terms && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                      <span className="font-semibold">Terms: </span>
                      {content.content.terms}
                    </p>
                  )}
                  <div className="mt-2 text-xs">
                    {content.matches ? (
                      <span className="font-medium text-emerald-700">
                        ✓ content matches the on-chain hash
                      </span>
                    ) : (
                      <span className="font-medium text-rose-700">✗ content does NOT match the on-chain hash</span>
                    )}
                  </div>
                  {content.content.evidence && content.content.evidence.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-500">Evidence</p>
                      <ul className="mt-1 space-y-0.5">
                        {content.content.evidence.map((e, i) => (
                          <li key={i}>
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              {e.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-rose-600">Could not load case content: {content.error}</p>
              )}
            </div>

            {/* commit / reveal while a panel is sitting (live on mainnet via World App) */}
            {(c.phase === 'Commit' || c.phase === 'Reveal') && (
              <CommitReveal caseId={c.id} phase={c.phase} refresh={refresh} />
            )}

            {/* resolved result */}
            {c.phase === 'Resolved' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">
                  {c.panel.length}{' '}
                  {IS_COHORT ? 'simulated unique humans' : 'verified humans'} decided this: one person,
                  one vote, no wallet voted twice.
                </p>
                <p className="mt-1 text-xs">
                  Each seat comes from the one-nullifier registry, and each ballot was sealed until
                  reveal by commit/reveal.
                </p>
                <p className="mt-1 text-xs">
                  Fee pool {fmtMusd(c.feePool)} MUSD split 70/20/10 (coherent jurors / reward pool /
                  protocol). Verdict:{' '}
                  <span className="font-semibold">
                    {c.caseType === 1 ? (c.outcome ? 'payee paid' : 'payer refunded') : c.outcome ? 'YES' : 'NO'}
                  </span>
                  .
                </p>
              </div>
            )}

            {c.phase === 'Resolvable' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Ready to resolve</p>
                <p className="mt-1 text-xs">
                  The reveal deadline has passed. Resolving is permissionless — the keeper (or anyone)
                  can advance this case; no operator required.
                </p>
              </div>
            )}

            {/* panel */}
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Panel ({c.panel.length})</p>
              {c.panel.length === 0 ? (
                <p className="text-xs text-slate-400">Not drawn yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {c.panel.map((p) => (
                    <a
                      key={p}
                      href={explorerAddress(p)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 hover:bg-slate-200"
                    >
                      {shortAddr(p)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </Page.Main>
    </>
  );
}
