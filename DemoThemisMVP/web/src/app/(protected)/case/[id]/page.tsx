'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { keccak256, encodeAbiParameters, type Address, type Hex } from 'viem';
import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
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

type SavedBallot = { vote: boolean; salt: Hex; wallet: Address };

function isBytes32(value: unknown): value is Hex {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isSavedBallot(value: unknown, wallet: Address): value is SavedBallot {
  if (!value || typeof value !== 'object') return false;
  const ballot = value as Partial<SavedBallot>;
  return (
    typeof ballot.vote === 'boolean' &&
    isBytes32(ballot.salt) &&
    typeof ballot.wallet === 'string' &&
    ballot.wallet.toLowerCase() === wallet.toLowerCase()
  );
}

const TIMELINE: { key: string; label: string }[] = [
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
  const readyToResolve = phase === 'Resolvable';
  return (
    <div
      className="flex items-center gap-1"
      role="list"
      aria-label={readyToResolve ? 'Case progress: reveal complete; ready to resolve' : `Case progress: ${phase}`}
    >
      {TIMELINE.map((step, i) => (
        <div key={step.key} className="flex flex-1 flex-col items-center gap-1" role="listitem">
          <div
            className={`h-1.5 w-full rounded-full ${i <= active ? 'bg-slate-800' : 'bg-slate-200'}`}
          />
          <span
            className={`text-center text-[9px] leading-tight ${
              i === active ? 'font-semibold text-slate-800' : 'text-slate-400'
            }`}
            aria-current={!readyToResolve && i === active ? 'step' : undefined}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CommitReveal({
  caseId,
  caseType,
  panel,
  phase,
  refresh,
}: {
  caseId: number;
  caseType: number;
  panel: readonly Address[];
  phase: Phase;
  refresh: () => void;
}) {
  const session = useSession();
  const { isInstalled } = useMiniKit();
  const wallet = session.data?.user?.walletAddress as Address | undefined;
  const tx = useCourtTx();

  const storeKey = wallet ? `ballot-${addr.court}-${caseId}-${wallet.toLowerCase()}` : null;
  const [vote, setVote] = useState<boolean | null>(null);
  const [salt, setSalt] = useState<Hex>('0x');
  // The ballot saved at commit time: reveal must replay the SAME vote + salt or it
  // reverts BadReveal. Persisted to localStorage (the "export your salt" step).
  const [saved, setSaved] = useState<SavedBallot | null>(null);

  useEffect(() => {
    setSaved(null);
    setVote(null);
    const raw = storeKey ? localStorage.getItem(storeKey) : null;
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (wallet && isSavedBallot(parsed, wallet)) {
          setSaved(parsed);
          setVote(parsed.vote);
          setSalt(parsed.salt);
          return;
        }
      } catch {
        /* Invalid local data is cleared below. */
      }
      if (storeKey) localStorage.removeItem(storeKey);
    }
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setSalt(('0x' + Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('')) as Hex);
  }, [storeKey, wallet]);

  // Commit hash = keccak256(abi.encode(vote, salt, caseId, juror)) — bound to the
  // voter's wallet, so the on-chain reveal (msg.sender = wallet) must match.
  const commitment = useMemo<Hex>(() => {
    if (salt === '0x' || vote === null) return '0x';
    return keccak256(
      encodeAbiParameters(
        [{ type: 'bool' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
        [vote, salt, BigInt(caseId), wallet ?? ZERO_ADDR],
      ),
    );
  }, [vote, salt, caseId, wallet]);

  const isPanelMember = !!wallet && panel.some((juror) => juror.toLowerCase() === wallet.toLowerCase());
  const canWrite = !IS_COHORT && isInstalled === true && !!wallet && isPanelMember;
  const busy = tx.step === 'submitting' || tx.step === 'confirming';
  const yesLabel = caseType === 1 ? 'Pay payee' : 'Yes';
  const noLabel = caseType === 1 ? 'Refund payer' : 'No';

  async function doCommit() {
    if (vote === null || salt === '0x' || !wallet || !storeKey || saved) return;
    const ballot: SavedBallot = { vote, salt, wallet };
    const hash = await tx.submit([courtTx.commit(BigInt(caseId), commitment)]);
    if (hash) {
      localStorage.setItem(storeKey, JSON.stringify(ballot));
      setSaved(ballot);
      refresh();
    }
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
          {phase === 'Commit' ? 'Choose and seal your vote' : 'Reveal your vote'}
        </h3>
        <GasBadge />
      </div>

      {phase === 'Commit' ? (
        <>
          <div className="mb-2 flex gap-2">
            <button
              onClick={() => setVote(true)}
              disabled={busy || !!saved}
              aria-pressed={vote === true}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${vote === true ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'}`}
            >
              {yesLabel}
            </button>
            <button
              onClick={() => setVote(false)}
              disabled={busy || !!saved}
              aria-pressed={vote === false}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${vote === false ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-500'}`}
            >
              {noLabel}
            </button>
          </div>
          {saved ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs leading-snug text-emerald-800">
              Vote sealed as <span className="font-semibold">{saved.vote ? yesLabel : noLabel}</span>. It cannot be
              changed. Return with this wallet on this device when reveal opens.
            </p>
          ) : (
            <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs leading-snug text-slate-600">
              Your choice is not preselected. After a successful commit, this device keeps the secret key needed for
              the later reveal. Return on this device.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-slate-500">
          {saved ? (
            <>
              You committed <span className="font-semibold">{saved.vote ? yesLabel : noLabel}</span>. Reveal it now so it
              counts toward the verdict.
            </>
          ) : (
            <span className="text-rose-600" role="alert">
              No ballot key was found on this device. Reveal from the device used to seal the vote.
            </span>
          )}
        </p>
      )}

      <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">Technical ballot data</summary>
        <div className="mt-2 space-y-1.5">
          <p>
            The commitment binds your vote, this secret key, the case, and your wallet. The vote stays sealed until
            reveal, but commit/reveal is not receipt-free.
          </p>
          {phase === 'Reveal' && !saved ? (
            <p>No saved ballot data is available on this device.</p>
          ) : vote === null ? (
            <p>Choose an outcome to generate the commitment hash.</p>
          ) : (
            <>
              <p className="break-all font-mono text-[10px] text-slate-500">
                keccak(vote, salt, caseId, your address): {commitment.slice(0, 22)}…
              </p>
              <p className="break-all font-mono text-[10px] text-slate-500">
                device secret: {salt.slice(0, 22)}…
              </p>
            </>
          )}
        </div>
      </details>

      {canWrite && phase === 'Commit' && saved ? (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-semibold text-emerald-800">
          Vote committed. Wait for the reveal phase.
        </div>
      ) : canWrite ? (
        <button
          onClick={phase === 'Commit' ? doCommit : doReveal}
          disabled={busy || (phase === 'Commit' && (vote === null || salt === '0x')) || (phase === 'Reveal' && !saved)}
          className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy
            ? phase === 'Commit'
              ? 'Committing…'
              : 'Revealing…'
            : phase === 'Commit'
              ? 'Seal vote'
              : 'Reveal vote'}
        </button>
      ) : IS_COHORT ? (
        <button
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
        >
          This read-only cohort cannot accept ballots. The live path runs in World App.
        </button>
      ) : wallet && !isPanelMember ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-600">
          Only a juror drawn for this case can submit a ballot. This wallet is not on the panel.
        </div>
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
        <p role="alert" className="mt-2 break-all rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
          {tx.error}
        </p>
      )}
    </div>
  );
}

const CASE_NOT_FOUND = 'CASE_NOT_FOUND';

function isCaseNotFoundError(error: string | null): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return (
    error === CASE_NOT_FOUND ||
    normalized.includes('nosuchcase') ||
    normalized.includes('panic(0x32)') ||
    normalized.includes('array index is out of bounds') ||
    normalized.includes('array out of bounds') ||
    normalized.includes('array out-of-bounds')
  );
}

function CaseNotFound({ technicalError }: { technicalError: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Case not found</h2>
      <p className="mt-1 text-sm text-slate-600">This case number does not exist in the selected court instance.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link href="/home" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
          Browse court cases
        </Link>
        <Link href="/sandbox" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
          Try the sandbox
        </Link>
      </div>
      {technicalError !== CASE_NOT_FOUND && (
        <details className="mt-4 text-left text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold">Technical error</summary>
          <p className="mt-2 break-all">{technicalError}</p>
        </details>
      )}
    </section>
  );
}

export default function CaseDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error(CASE_NOT_FOUND);
    try {
      return await getCase(id);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      if (isCaseNotFoundError(message)) throw new Error(CASE_NOT_FOUND);
      throw fetchError;
    }
  }, [id]);
  const stopOnMissing = useCallback((message: string) => isCaseNotFoundError(message), []);
  const { data: c, error, loading, refresh } = usePolledData(fetcher, 12000, stopOnMissing);
  const missing = isCaseNotFoundError(error);

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
      if (alive)
        setContent({
          content: r.content,
          matches: r.matches,
          error: r.error,
          loaded: true,
        });
    });
    return () => {
      alive = false;
    };
  }, [c]);

  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar
          title={`Case #${Number.isSafeInteger(id) && id >= 0 ? id : '?'}`}
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
        ) : missing && error && !c ? (
          <CaseNotFound technicalError={error} />
        ) : error && !c ? (
          <ErrorState error={error} />
        ) : c ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <PhaseBadge phase={c.phase} />
              <CaseTypeBadge caseType={c.caseType} />
              {c.phase === 'Resolved' && <OutcomeBadge caseType={c.caseType} outcome={c.outcome} />}
              {c.redraws > 0 && (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">redrawn once</span>
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
                      <span className="font-medium text-emerald-700">✓ On-chain content verified</span>
                    ) : (
                      <span role="alert" className="block rounded-lg bg-rose-50 px-2 py-1.5 font-medium text-rose-700">
                        ✗ Content does not match the on-chain hash. Do not rely on this case text.
                      </span>
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
                <p role="alert" className="text-sm text-rose-600">Could not load case content: {content.error}</p>
              )}
            </div>

            {/* commit / reveal while a panel is sitting (live on mainnet via World App) */}
            {(c.phase === 'Commit' || c.phase === 'Reveal') && (
              <CommitReveal
                caseId={c.id}
                caseType={c.caseType}
                panel={c.panel}
                phase={c.phase}
                refresh={refresh}
              />
            )}

            {/* resolved result */}
            {c.phase === 'Resolved' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">
                  Verdict:{' '}
                  {c.caseType === 1 ? (c.outcome ? 'payee paid' : 'payer refunded') : c.outcome ? 'YES' : 'NO'}
                </p>
                <p className="mt-1 text-xs">
                  {c.panel.length} {IS_COHORT ? 'simulated jurors' : 'verified jurors'} decided with one registry seat
                  and one vote each. Ballots stayed sealed until reveal.
                </p>
                <p className="mt-1 text-xs">
                  {fmtMusd(c.feePool)} MUSD split 70/20/10 between coherent jurors, the reward pool, and the protocol.
                </p>
              </div>
            )}

            {c.phase === 'Resolvable' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Ready to resolve</p>
                <p className="mt-1 text-xs">
                  Voting has ended. Anyone can submit the permissionless resolve transaction; no operator approval is
                  needed.
                </p>
              </div>
            )}

            {/* panel */}
            {c.panel.length === 0 ? (
              <p className="text-xs text-slate-400">Panel not drawn yet.</p>
            ) : (
              <details className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700">Panel ({c.panel.length})</summary>
                <p className="mt-2 leading-snug">
                  Juror addresses and revealed votes are public in this commit/reveal MVP. Privacy is funded roadmap
                  work.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
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
              </details>
            )}
          </>
        ) : null}
      </Page.Main>
    </>
  );
}
