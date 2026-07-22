'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Fingerprint, Group, Lock, Search } from 'iconoir-react';
import { Page } from '@/components/PageLayout';
import { CourtTopBar } from '@/components/CourtTopBar';
import { ErrorState, Skeleton } from '@/components/court-ui';
import { InstanceBanner } from '@/components/InstanceBanner';
import { LiveBallot } from '@/components/LiveBallot';
import { explorerAddress, explorerTx, SUPPORTS_LIVENESS_RECOVERY } from '@/lib/chain';
import {
  fetchCaseContent,
  getCase,
  getCaseReceipt,
  type CaseContent,
  type CaseReceipt,
  type Phase,
} from '@/lib/court';
import { loadQuestionManifest, officialQueueEntryForCase } from '@/lib/question-queue';
import { fmtMusd, shortAddr } from '@/lib/format';
import { usePolledData } from '@/lib/hooks';
import { useParams } from 'next/navigation';
import type { Hex } from 'viem';

const CASE_NOT_FOUND = 'CASE_NOT_FOUND';

type OracleQuestion = CaseContent & {
  yesRule?: string;
  judgedAsOf?: string;
};

const phaseLabels: Record<Phase, string> = {
  Open: 'Question filed',
  Commit: 'Answers being sealed',
  Reveal: 'Answers being revealed',
  Resolvable: 'Ready for the ruling',
  Resolved: 'Ruling recorded',
};

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

function formatMoment(value?: string) {
  if (!value) return 'The time stated in the question';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return (
    new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date) + ' UTC'
  );
}

function formatRecoveryDeadline(value: bigint) {
  if (value === BigInt(0)) return 'the fixed recovery deadline';
  return `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(Number(value) * 1000)} UTC`;
}

function compactHash(hash: Hex) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function phaseIndex(phase: Phase) {
  return { Open: 0, Commit: 1, Reveal: 2, Resolvable: 3, Resolved: 4 }[phase];
}

function CaseProgress({ receipt }: { receipt: CaseReceipt }) {
  const initialDrawUnwind = Boolean(receipt.events.initialDrawTimedOut)
    || (receipt.case.status === 0 && receipt.case.redraws === 0 && receipt.case.panel.length === 0 && receipt.case.phase === 'Resolvable');
  const rank = phaseIndex(receipt.case.phase);
  const steps = initialDrawUnwind
    ? [
        { label: 'Filed', complete: true, current: false },
        { label: 'No panel', complete: false, current: false },
        { label: 'No seals', complete: false, current: false },
        { label: 'No reveals', complete: false, current: false },
        { label: 'Refund', complete: receipt.case.phase === 'Resolved', current: receipt.case.phase === 'Resolvable' },
      ]
    : [
        { label: 'Filed', complete: true, current: false },
        { label: 'Panel seated', complete: rank >= 1, current: rank === 0 },
        { label: 'Seal window', complete: rank >= 2, current: rank === 1 },
        { label: 'Reveal window', complete: rank >= 3, current: rank === 2 },
        { label: 'Ruling', complete: rank === 4, current: rank === 3 },
      ];

  return (
    <ol className="oracle-progress" aria-label={`Case progress: ${phaseLabels[receipt.case.phase]}`}>
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={`${step.complete ? 'is-complete' : ''}${step.current ? ' is-current' : ''}`}
        >
          <span>{step.complete ? '✓' : index + 1}</span>
          <small>{step.label}</small>
        </li>
      ))}
    </ol>
  );
}

function QuestionFacts({ question }: { question: OracleQuestion }) {
  return (
    <div className="oracle-question-facts">
      <div className="oracle-fact is-rule">
        <span>YES if</span>
        <p>{question.yesRule ?? question.resolution ?? 'The stated condition is satisfied.'}</p>
      </div>
      <div className="oracle-fact is-time">
        <span>Judged as of</span>
        <p>{formatMoment(question.judgedAsOf)}</p>
      </div>
    </div>
  );
}

function SeatStrip({ receipt }: { receipt: CaseReceipt }) {
  return (
    <div className="oracle-seats" aria-label="Three verified jury seats">
      {[0, 1, 2].map((index) => {
        const juror = receipt.activity.panel[index];
        const status = juror?.revealed ? 'Revealed' : juror?.committed ? 'Sealed' : juror ? 'Seated' : 'Awaiting draw';
        return (
          <div
            key={index}
            className={`oracle-seat${juror ? ' is-ready' : ''}${juror?.revealed ? ' is-revealed' : juror?.committed ? ' is-sealed' : ''}`}
          >
            <span className="oracle-seat-number">0{index + 1}</span>
            <div>
              {juror ? (
                <a href={explorerAddress(juror.juror)} target="_blank" rel="noreferrer">
                  <strong>{shortAddr(juror.juror)}</strong>
                </a>
              ) : (
                <strong>Juror {index + 1}</strong>
              )}
              <small>{status}</small>
            </div>
            <i aria-hidden="true">{juror ? '✓' : ''}</i>
          </div>
        );
      })}
    </div>
  );
}

function FinalRuling({ receipt }: { receipt: CaseReceipt }) {
  const rulingTx = receipt.transactionHashes.Resolved;
  if (receipt.case.phase !== 'Resolved') return null;
  const initialDrawTimedOut = receipt.events.initialDrawTimedOut;
  const recoveryTimedOut = receipt.events.recoveryTimedOut !== null;
  const firstRoundYes = recoveryTimedOut ? receipt.events.revealed.filter((event) => event.vote).length : 0;
  const firstRoundNo = recoveryTimedOut ? receipt.events.revealed.filter((event) => !event.vote).length : 0;
  const yes = receipt.tally ? Number(receipt.tally.yes) : 0;
  const no = receipt.tally ? Number(receipt.tally.no) : 0;
  const revealed = yes + no;
  const retryMissedQuorum = receipt.case.redraws > 0 && revealed < 2;
  const tied = revealed >= 2 && yes === no;

  return (
    <section className="oracle-final-receipt" aria-labelledby="ruling-title">
      <div className="oracle-ruling-mark">
        <CheckCircle />
      </div>
      <div className="oracle-ruling-copy">
        <span>{initialDrawTimedOut ? 'Unwind recorded on World Chain' : 'Ruling recorded on World Chain'}</span>
        <h2 id="ruling-title">
          {initialDrawTimedOut
            ? 'No panel was seated. The case was unwound.'
            : recoveryTimedOut
            ? 'Recovery expired. Status quo was applied.'
            : retryMissedQuorum
              ? 'The retry missed quorum. Status quo was applied.'
              : tied
                ? 'The panel tied. Status quo was applied.'
                : `The jury answered ${receipt.case.outcome ? 'YES' : 'NO'}.`}
        </h2>
        {initialDrawTimedOut ? (
          <p>
            {fmtMusd(initialDrawTimedOut.feeRefunded)} MUSD returned to {shortAddr(initialDrawTimedOut.refundTo)}
            {receipt.case.caseType === 1 ? ' · escrow principal returned to the payer' : ''} · no merits ruling
          </p>
        ) : recoveryTimedOut ? (
          <p>First round: {firstRoundYes} YES · {firstRoundNo} NO · quorum not met · no retry panel formed</p>
        ) : retryMissedQuorum ? (
          <p>Retry: {yes} YES · {no} NO · quorum not met</p>
        ) : tied ? (
          <p>{yes} YES · {no} NO · quorum met, votes tied</p>
        ) : (
          <p>
            {yes} YES · {no} NO ·{' '}
            {receipt.activity.revealCount}/3 answers revealed
          </p>
        )}
      </div>
      {rulingTx && (
        <a href={explorerTx(rulingTx)} target="_blank" rel="noreferrer">
          Open ruling <ArrowRight />
        </a>
      )}
    </section>
  );
}

function TransactionLinks({ hashes }: { hashes: readonly Hex[] }) {
  if (hashes.length === 0) return <small className="text-slate-400">Waiting to be recorded</small>;
  return (
    <div className="flex min-w-0 flex-wrap justify-start gap-1.5 sm:justify-end">
      {hashes.map((hash, index) => (
        <a
          key={`${hash}-${index}`}
          href={explorerTx(hash)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] font-semibold text-slate-600 hover:bg-slate-200"
        >
          {compactHash(hash)} ↗
        </a>
      ))}
    </div>
  );
}

function ChainReceipt({ receipt }: { receipt: CaseReceipt }) {
  const tx = receipt.transactionHashes;
  const initialDrawTimedOut = receipt.events.initialDrawTimedOut;
  const rows: { label: string; count: string; hashes: readonly Hex[] }[] = [
    { label: 'Case filed', count: tx.CaseOpened ? 'Recorded' : 'Waiting', hashes: tx.CaseOpened ? [tx.CaseOpened] : [] },
    { label: 'Panel seated', count: `${tx.PanelDrawn.length} draw`, hashes: tx.PanelDrawn },
    { label: 'Answers sealed', count: `${receipt.activity.commitmentCount}/3 current · ${tx.Committed.length} event${tx.Committed.length === 1 ? '' : 's'} overall`, hashes: tx.Committed },
    { label: 'Answers revealed', count: `${receipt.activity.revealCount}/3 current · ${tx.Revealed.length} event${tx.Revealed.length === 1 ? '' : 's'} overall`, hashes: tx.Revealed },
    ...(tx.RedrawRecoveryStarted
      ? [{
          label: 'Quorum recovery',
          count: tx.RedrawRecoveryTimedOut ? 'Deadline expired' : 'Retry opened',
          hashes: [tx.RedrawRecoveryStarted, ...(tx.RedrawRecoveryTimedOut ? [tx.RedrawRecoveryTimedOut] : [])],
        }]
      : []),
    ...(tx.InitialDrawTimedOut && initialDrawTimedOut
      ? [{
          label: 'Initial draw unwind',
          count: `${fmtMusd(initialDrawTimedOut.feeRefunded)} MUSD refunded`,
          hashes: [tx.InitialDrawTimedOut],
        }]
      : []),
    {
      label: initialDrawTimedOut ? 'Terminal record' : 'Ruling',
      count: tx.Resolved ? (initialDrawTimedOut ? 'Unwind recorded' : 'Recorded') : 'Waiting',
      hashes: tx.Resolved ? [tx.Resolved] : [],
    },
    { label: 'Juror payouts', count: `${tx.FeePaid.length} paid`, hashes: tx.FeePaid },
    {
      label: 'Fee distribution',
      count: initialDrawTimedOut ? 'Not applicable · fee refunded' : tx.FeeDistributed ? 'Recorded' : 'Waiting',
      hashes: tx.FeeDistributed ? [tx.FeeDistributed] : [],
    },
  ];

  return (
    <section className="oracle-receipt-history" aria-labelledby="chain-receipt-title">
      <div className="oracle-section-title">
        <div>
          <span>Permanent record</span>
          <h2 id="chain-receipt-title">World Chain receipt</h2>
        </div>
        <small>Every link opens the mined transaction</small>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid min-h-16 grid-cols-1 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(7rem,1fr)_minmax(0,2fr)]"
          >
            <div>
              <strong className="block text-xs text-slate-800">{row.label}</strong>
              <small className="mt-0.5 block text-[11px] text-slate-400">{row.count}</small>
            </div>
            <TransactionLinks hashes={row.hashes} />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Juror payouts</span>
          {receipt.payments.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {receipt.payments.map((payment, index) => (
                <li key={`${payment.transactionHash}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                  <a
                    href={explorerAddress(payment.juror)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-semibold text-emerald-900"
                  >
                    {shortAddr(payment.juror)}
                  </a>
                  <a
                    href={explorerTx(payment.transactionHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-800"
                  >
                    {fmtMusd(payment.amount)} MUSD ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-emerald-800">
              {initialDrawTimedOut ? 'No panel was seated, so no juror payout was due.' : 'Payments appear here after the ruling.'}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">Fee split</span>
          {initialDrawTimedOut ? (
            <p className="mt-2 text-xs leading-relaxed text-violet-800">
              {fmtMusd(initialDrawTimedOut.feeRefunded)} MUSD was returned to {shortAddr(initialDrawTimedOut.refundTo)} because no panel was seated. Nothing was distributed.
            </p>
          ) : receipt.feeDistribution ? (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-[10px] text-violet-600">Jurors</dt><dd className="mt-1 text-xs font-bold text-violet-950">{fmtMusd(receipt.feeDistribution.toJurors)}</dd></div>
              <div><dt className="text-[10px] text-violet-600">Rewards</dt><dd className="mt-1 text-xs font-bold text-violet-950">{fmtMusd(receipt.feeDistribution.toReward)}</dd></div>
              <div><dt className="text-[10px] text-violet-600">Protocol</dt><dd className="mt-1 text-xs font-bold text-violet-950">{fmtMusd(receipt.feeDistribution.toProtocol)}</dd></div>
            </dl>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-violet-800">
              The {fmtMusd(receipt.case.feePool)} MUSD case fee is distributed by the contract after resolution.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CaseNotFound() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Case not found</h2>
      <p className="mt-1 text-sm text-slate-600">That case number is not part of this World Chain court.</p>
      <Link href="/app" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        Return to the live case
      </Link>
    </section>
  );
}

function NonOfficialCase() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center" role="status">
      <h2 className="text-lg font-semibold text-amber-950">Not part of the official demo queue</h2>
      <p className="mt-1 text-sm text-amber-800">
        This on-chain case does not match the official question type, opener, URI, and fingerprint. Its hosted content
        and ballot are not loaded here.
      </p>
      <Link href="/app" className="mt-4 inline-flex rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white">
        Return to the live case
      </Link>
    </section>
  );
}

type CaseDetailData =
  | { kind: 'official'; receipt: CaseReceipt }
  | { kind: 'nonofficial' };

export default function CaseDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error(CASE_NOT_FOUND);
    try {
      const [courtCase, manifest] = await Promise.all([getCase(id), loadQuestionManifest()]);
      if (!officialQueueEntryForCase(manifest, courtCase)) {
        return { kind: 'nonofficial' } as const;
      }
      return { kind: 'official', receipt: await getCaseReceipt(id) } as const;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      if (isCaseNotFoundError(message)) throw new Error(CASE_NOT_FOUND);
      throw fetchError;
    }
  }, [id]);
  const stopOnMissing = useCallback((message: string) => isCaseNotFoundError(message), []);
  const { data, error, loading, refresh } = usePolledData<CaseDetailData>(fetcher, 8000, stopOnMissing);
  const receipt = data?.kind === 'official' ? data.receipt : null;
  const nonofficial = data?.kind === 'nonofficial';
  const missing = isCaseNotFoundError(error);
  const [question, setQuestion] = useState<{
    content?: OracleQuestion;
    matches?: boolean;
    loaded: boolean;
  }>({ loaded: false });
  const caseUri = receipt?.case.uri;
  const criteriaHash = receipt?.case.criteriaHash;
  const awaitingInitialDraw = receipt?.case.status === 0 && receipt.case.redraws === 0 && receipt.case.panel.length === 0;
  const boundedInitialDraw = SUPPORTS_LIVENESS_RECOVERY && awaitingInitialDraw;
  const legacyInitialDraw = !SUPPORTS_LIVENESS_RECOVERY && awaitingInitialDraw;
  const initialDrawExpired = boundedInitialDraw && receipt?.case.phase === 'Resolvable';
  const awaitingRetry = receipt?.case.status === 0 && receipt.case.redraws > 0;
  const boundedRecovery = SUPPORTS_LIVENESS_RECOVERY && awaitingRetry;
  const legacyStalledPanel = !SUPPORTS_LIVENESS_RECOVERY && awaitingRetry;
  const liveStateLabel = receipt
    ? boundedInitialDraw
      ? initialDrawExpired ? 'Initial draw expired · refund ready' : 'Waiting for the first panel'
      : legacyInitialDraw
        ? 'Legacy initial draw · no timeout protection'
        : awaitingRetry
          ? boundedRecovery
            ? receipt.case.phase === 'Resolvable'
              ? 'Recovery expired · status quo ready'
              : 'Restoring the retry panel'
            : 'Legacy redraw · no timeout protection'
          : phaseLabels[receipt.case.phase]
    : '';

  useEffect(() => {
    if (!caseUri || !criteriaHash) {
      setQuestion({ loaded: false });
      return;
    }
    let alive = true;
    setQuestion({ loaded: false });
    const checkFingerprint = async () => {
      const result = await fetchCaseContent(caseUri, criteriaHash);
      if (!alive) return;
      setQuestion({
        content: result.ok && result.matches === true ? (result.content as OracleQuestion | undefined) : undefined,
        matches: result.matches,
        loaded: true,
      });
    };
    void checkFingerprint();
    const timer = window.setInterval(() => void checkFingerprint(), 10_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [caseUri, criteriaHash]);

  return (
    <>
      <Page.Header className="p-0">
        <CourtTopBar
          title={`Case #${Number.isSafeInteger(id) && id >= 0 ? id : '?'}`}
          startAdornment={
            <Link href="/app" className="text-sm text-slate-500">
              ← Live case
            </Link>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-20">
        <InstanceBanner />
        {loading && !receipt ? (
          <Skeleton rows={4} />
        ) : missing && !receipt ? (
          <CaseNotFound />
        ) : error && !receipt ? (
          <ErrorState error={error} />
        ) : nonofficial ? (
          <NonOfficialCase />
        ) : receipt ? (
          <>
            <div className="oracle-live-layout">
              <article className="oracle-case-card">
                <header className="oracle-case-head">
                  <div>
                    <span className="oracle-eyebrow">On-chain question · Case #{receipt.case.id}</span>
                    <div className="oracle-live-state">
                      <i aria-hidden="true" />
                      {liveStateLabel}
                    </div>
                  </div>
                  <div className="oracle-chain-mark">
                    <Fingerprint />
                    <span>World Chain</span>
                  </div>
                </header>

                {!question.loaded ? (
                  <div className="oracle-question-loading" aria-label="Loading question">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : question.content && question.matches === true ? (
                  <>
                    <h2>{question.content.question ?? question.content.title}</h2>
                    <QuestionFacts question={question.content} />
                    <div className="oracle-integrity is-verified">
                      <CheckCircle />
                      <span>Question matches its on-chain fingerprint</span>
                    </div>
                  </>
                ) : question.matches === false ? (
                  <div className="oracle-question-unavailable" role="alert">
                    <Fingerprint />
                    <div>
                      <strong>Question fingerprint check failed</strong>
                      <p>The unverified text is hidden and new seals are paused.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    The question text is temporarily unavailable. Its permanent chain receipt remains below.
                  </div>
                )}

                <div className="oracle-research-note">
                  <span><Search /></span>
                  <div>
                    <strong>Jurors research independently</strong>
                    <p>No evidence pack or preferred source is supplied. Each juror checks public information before sealing an answer.</p>
                  </div>
                </div>

                <CaseProgress receipt={receipt} />
                {boundedInitialDraw && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
                    <strong>{initialDrawExpired ? 'No panel was seated before the fixed deadline.' : 'Case parties are excluded from the draw.'}</strong>
                    <p className="mt-1 text-xs leading-relaxed">
                      {initialDrawExpired
                        ? `Anyone may now unwind this case. The ${fmtMusd(receipt.case.feePool)} MUSD unused fee returns to the payer${receipt.case.caseType === 1 ? ', together with the escrow principal' : ''}; no merits ruling is recorded.`
                        : `A first panel must be seated by ${formatRecoveryDeadline(receipt.case.initialDrawDeadline)}. If the eligible pool shrinks, this deadline cannot move and the unused fee${receipt.case.caseType === 1 ? ' and escrow principal' : ''} can be recovered.`}
                    </p>
                    {!initialDrawExpired && (
                      <Link href="/onboard" className="mt-3 inline-flex items-center gap-1 font-semibold text-amber-950 underline">
                        Join the pool <ArrowRight />
                      </Link>
                    )}
                  </div>
                )}
                {legacyInitialDraw && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950" role="alert">
                    <strong>This immutable case has no initial-draw deadline.</strong>
                    <p className="mt-1 text-xs leading-relaxed">
                      Party exclusions or a withdrawal can leave fewer than three eligible jurors and strand the case.
                      The replacement court preflights eligibility and adds a refund-and-unwind deadline, but cannot protect this legacy case retroactively.
                    </p>
                  </div>
                )}
                {boundedRecovery && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
                    <strong>
                      {receipt.case.phase === 'Resolvable'
                        ? 'The fixed recovery deadline has passed.'
                        : 'The first panel missed quorum.'}
                    </strong>
                    <p className="mt-1 text-xs leading-relaxed">
                      {receipt.case.phase === 'Resolvable'
                        ? 'Anyone may now finalize status quo; the case no longer waits for the juror pool to recover.'
                        : `Fully slashed jurors can restore a fresh bond without another World ID proof. A new three-seat panel must be drawn by ${formatRecoveryDeadline(receipt.case.recoveryDeadline)}; this deadline cannot be extended.`}
                    </p>
                    {receipt.case.phase !== 'Resolvable' && (
                      <Link href="/onboard" className="mt-3 inline-flex items-center gap-1 font-semibold text-amber-950 underline">
                        Restore or join <ArrowRight />
                      </Link>
                    )}
                  </div>
                )}
                {legacyStalledPanel && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950" role="alert">
                    <strong>This immutable case has no recovery deadline.</strong>
                    <p className="mt-1 text-xs leading-relaxed">
                      It needs additional eligible humans to fill the redraw. The bounded timeout protects future cases
                      only after the replacement court is deployed; it cannot be applied retroactively to this case.
                    </p>
                  </div>
                )}
                <div className="oracle-counts" aria-label="Live ballot counts">
                  <div><span>Panel</span><strong>{receipt.case.panel.length}/3</strong><small>verified jurors seated</small></div>
                  <div><span>Sealed</span><strong>{receipt.activity.commitmentCount}/3</strong><small>answers locked on-chain</small></div>
                  <div><span>Revealed</span><strong>{receipt.activity.revealCount}/3</strong><small>answers publicly verified</small></div>
                </div>
              </article>

              <aside className="oracle-jury-card">
                <div className="oracle-jury-head">
                  <span><Group /></span>
                  <div><small>The panel</small><h3>Three verified humans</h3></div>
                </div>
                <SeatStrip receipt={receipt} />
                <div className="oracle-jury-rule">
                  <Lock />
                  <p>Each person gets one seat and one sealed answer. The contract counts the majority.</p>
                </div>
                {receipt.transactionHashes.CaseOpened && (
                  <a
                    href={explorerTx(receipt.transactionHashes.CaseOpened)}
                    target="_blank"
                    rel="noreferrer"
                    className="oracle-worldscan-link"
                  >
                    Inspect this case on Worldscan <ArrowRight />
                  </a>
                )}
              </aside>
            </div>

            {(receipt.case.phase === 'Commit' || receipt.case.phase === 'Reveal') && (
              <LiveBallot
                caseId={receipt.case.id}
                round={receipt.case.redraws}
                panel={receipt.case.panel}
                phase={receipt.case.phase}
                contentVerified={question.matches === true}
                refresh={refresh}
              />
            )}

            {receipt.case.phase === 'Resolvable' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>
                  {receipt.case.status === 0
                    ? receipt.case.redraws === 0
                      ? 'The initial draw timed out.'
                      : 'Recovery timed out.'
                    : 'All available answers are in.'}
                </strong>
                <p className="mt-1 text-xs leading-relaxed">
                  {receipt.case.status === 0
                    ? receipt.case.redraws === 0
                      ? `The unused fee${receipt.case.caseType === 1 ? ' and escrow principal are' : ' is'} ready to be returned without a merits ruling.`
                      : 'The on-chain status-quo ruling is ready to be recorded without a replacement panel.'
                    : 'The on-chain ruling is ready to be recorded.'}
                </p>
              </div>
            )}

            <FinalRuling receipt={receipt} />
            <ChainReceipt receipt={receipt} />
          </>
        ) : null}
      </Page.Main>
    </>
  );
}
