'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Fingerprint,
  Group,
  Lock,
  Search,
  Send,
  ShieldCheck,
} from 'iconoir-react';
import { LiveBallot } from '@/components/LiveBallot';
import { usePolledData } from '@/lib/hooks';
import { explorerTx, MVP_CONFIGURED, SUPPORTS_LIVENESS_RECOVERY } from '@/lib/chain';
import {
  fetchCaseContent,
  getCaseActivity,
  type CaseActivity,
  type CaseContent,
  type CaseView,
  type Phase,
} from '@/lib/court';
import {
  loadOracleDashboard,
  type OracleDashboard,
  type QuestionQueueEntry,
} from '@/lib/question-queue';
import { fmtMusd } from '@/lib/format';

type ProductTab = 'live' | 'submit';
type ContentStatus = 'idle' | 'loading' | 'verified' | 'mismatch' | 'unavailable';
type OracleQuestion = CaseContent & {
  sequence?: number;
  yesRule?: string;
  judgedAsOf?: string;
};

const mvpRoadmapRows = [
  {
    capability: 'Identity & draw',
    liveTitle: 'Verified personhood, limited draw',
    liveBody: 'A World ID 4 proof checked by the Production verifier, a nullifier sybil gate, wallet binding, and a post-question draw for this three-seat demo.',
    milestone: 'M1',
    roadmapTitle: 'Verifiable production randomness',
    roadmapBody: 'VRF or drand replaces the current blockhash-based seed, with correctness and verifier hardening.',
  },
  {
    capability: 'Ballot privacy',
    liveTitle: 'Sealed commit/reveal ballots',
    liveBody: 'Votes stay hidden until reveal, then become public and receipt-ful so the ruling can execute on-chain.',
    milestone: 'M2',
    roadmapTitle: 'Receipt-free private ballots',
    roadmapBody: 'MACI-style encrypted voting hides juror identity and vote before and after the aggregate tally.',
  },
  {
    capability: 'Panel security',
    liveTitle: 'One three-seat panel',
    liveBody: 'Uniform selection proves the full mechanism without reputation weighting, appeals, or parallel panels.',
    milestone: 'M3b',
    roadmapTitle: 'Security that scales with stakes',
    roadmapBody: 'Private Wilson-gated reputation, 7→15→31 appeals, and independent parallel panels.',
  },
  {
    capability: 'Settlement & reach',
    liveTitle: 'Atomic settlement by rule',
    liveBody: 'The majority closes the case; the 70/20/10 split and slashes settle with no admin override.',
    milestone: 'M3a–M6',
    roadmapTitle: 'Demand-priced, reusable court',
    roadmapBody: 'Deterministic court fees, cyclic reward payout, a resolution SDK, first pilot, independent review, and moderated juror testing.',
  },
] as const;

const phaseLabels: Record<Phase, string> = {
  Open: 'Question filed',
  Commit: 'Answers being sealed',
  Reveal: 'Answers being revealed',
  Resolvable: 'Ready for the ruling',
  Resolved: 'Ruling recorded',
};

function formatMoment(value?: string) {
  if (!value) return 'A precise public time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date) + ' UTC';
}

function formatRecoveryDeadline(value: bigint) {
  if (value === BigInt(0)) return 'the fixed recovery deadline';
  return `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(Number(value) * 1000)} UTC`;
}

function formatExactMoment(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'medium',
    timeZone: 'UTC',
  }).format(date) + ' UTC';
}

function toLocalInputValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19);
}

function compactAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function phaseIndex(phase: Phase) {
  return { Open: 0, Commit: 1, Reveal: 2, Resolvable: 3, Resolved: 4 }[phase];
}

function ProductTabs({ tab, onChange }: { tab: ProductTab; onChange: (tab: ProductTab) => void }) {
  const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, current: ProductTab) => {
    let next: ProductTab | null = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = current === 'live' ? 'submit' : 'live';
    if (event.key === 'Home') next = 'live';
    if (event.key === 'End') next = 'submit';
    if (!next) return;
    event.preventDefault();
    onChange(next);
    window.requestAnimationFrame(() => document.getElementById(`oracle-${next}-tab`)?.focus());
  };

  return (
    <div className="oracle-tabs" role="tablist" aria-label="Demo views">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'live'}
        aria-controls="oracle-live-panel"
        id="oracle-live-tab"
        tabIndex={tab === 'live' ? 0 : -1}
        className={tab === 'live' ? 'is-active' : undefined}
        onClick={() => onChange('live')}
        onKeyDown={(event) => moveWithKeyboard(event, 'live')}
      >
        <span className="oracle-tab-icon"><ShieldCheck /></span>
        <span><strong>Live case</strong><small>Follow the real ruling</small></span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'submit'}
        aria-controls="oracle-submit-panel"
        id="oracle-submit-tab"
        tabIndex={tab === 'submit' ? 0 : -1}
        className={tab === 'submit' ? 'is-active' : undefined}
        onClick={() => onChange('submit')}
        onKeyDown={(event) => moveWithKeyboard(event, 'submit')}
      >
        <span className="oracle-tab-icon"><Send /></span>
        <span><strong>Submit a case</strong><small>See the filing screen</small></span>
      </button>
    </div>
  );
}

function MvpRoadmapComparison() {
  return (
    <section className="oracle-roadmap" aria-labelledby="oracle-roadmap-title">
      <header className="oracle-roadmap-intro">
        <div>
          <span className="oracle-roadmap-kicker">MVP versus funded roadmap</span>
          <h2 id="oracle-roadmap-title">Built now. Funded next.</h2>
        </div>
        <p>The current MVP proves the core mechanism. Each roadmap milestone removes a named production limit without presenting future work as active today.</p>
      </header>

      <div className="oracle-roadmap-shell">
        <div className="oracle-roadmap-grid" role="table" aria-label="Current DemoThemis MVP compared with the funded roadmap">
          <div className="oracle-roadmap-row oracle-roadmap-head" role="row">
            <span className="oracle-roadmap-axis" role="columnheader">Capability</span>
            <div className="is-live" role="columnheader">
              <span><i /> Current MVP</span>
              <small>{MVP_CONFIGURED ? 'World Chain · configured release' : 'World Chain release profile'}</small>
            </div>
            <div className="is-roadmap" role="columnheader">
              <span>Funded roadmap <ArrowRight /></span>
              <small>Milestone-gated upgrades</small>
            </div>
          </div>

          <div className="oracle-roadmap-table" role="rowgroup">
            {mvpRoadmapRows.map((row, index) => (
              <div className="oracle-roadmap-row" role="row" key={row.capability}>
                <div className="oracle-roadmap-label" role="rowheader"><span>0{index + 1}</span><strong>{row.capability}</strong></div>
                <div className="oracle-roadmap-cell is-live" role="cell">
                  <span className="oracle-roadmap-status">Current MVP</span>
                  <strong>{row.liveTitle}</strong>
                  <p>{row.liveBody}</p>
                </div>
                <div className="oracle-roadmap-cell is-roadmap" role="cell">
                  <span className="oracle-roadmap-status">{row.milestone}</span>
                  <strong>{row.roadmapTitle}</strong>
                  <p>{row.roadmapBody}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="oracle-roadmap-note">
          <ShieldCheck />
          <p><strong>Clear scope boundary.</strong> Roadmap capabilities are not active in this interface; they are the funded path from this three-person court to production-scale resolution.</p>
        </div>
      </div>
    </section>
  );
}

function SeatStrip({
  jurorCount,
  activeCase,
  activity,
}: {
  jurorCount: number;
  activeCase: CaseView | null;
  activity: CaseActivity | null;
}) {
  return (
    <div className="oracle-seats" aria-label="Three seats drawn from the active juror pool">
      {[0, 1, 2].map((index) => {
        const juror = activity?.jurors[index];
        const seated = !!activeCase?.panel[index];
        const poolCapacityReady = !activeCase && index < Math.min(3, jurorCount);
        const ready = seated || poolCapacityReady;
        const status = juror?.revealed
          ? 'Revealed'
          : juror?.committed
            ? 'Sealed'
            : seated
              ? 'Seated'
              : activeCase
                ? 'Awaiting panel draw'
                : poolCapacityReady
                  ? 'Pool capacity ready'
                  : 'Needs active juror';
        return (
          <div key={index} className={`oracle-seat${ready ? ' is-ready' : ''}${juror?.revealed ? ' is-revealed' : juror?.committed ? ' is-sealed' : ''}`}>
            <span className="oracle-seat-number">0{index + 1}</span>
            <div>
              <strong>{seated ? compactAddress(activeCase!.panel[index]) : `Panel seat ${index + 1}`}</strong>
              <small>{status}</small>
            </div>
            <i aria-hidden="true">{ready ? '✓' : ''}</i>
          </div>
        );
      })}
    </div>
  );
}

function CaseProgress({ courtCase, activity }: { courtCase: CaseView; activity: CaseActivity | null }) {
  const initialDrawUnwind = Boolean(activity?.events.initialDrawTimedOut)
    || (courtCase.status === 0 && courtCase.redraws === 0 && courtCase.panel.length === 0 && courtCase.phase === 'Resolvable');
  const rank = phaseIndex(courtCase.phase);
  const steps = initialDrawUnwind
    ? [
        { label: 'Filed', complete: true, current: false },
        { label: 'No panel', complete: false, current: false },
        { label: 'No seals', complete: false, current: false },
        { label: 'No reveals', complete: false, current: false },
        { label: 'Refund', complete: courtCase.phase === 'Resolved', current: courtCase.phase === 'Resolvable' },
      ]
    : [
        { label: 'Filed', complete: true, current: false },
        { label: 'Panel seated', complete: rank >= 1, current: rank === 0 },
        { label: 'Seal window', complete: rank >= 2, current: rank === 1 },
        { label: 'Reveal window', complete: rank >= 3, current: rank === 2 },
        { label: 'Ruling', complete: rank === 4, current: rank === 3 },
      ];

  return (
    <ol className="oracle-progress" aria-label={`Case progress: ${phaseLabels[courtCase.phase]}`}>
      {steps.map((step, index) => (
        <li key={step.label} className={`${step.complete ? 'is-complete' : ''}${step.current ? ' is-current' : ''}`}>
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

function ResearchNote() {
  return (
    <div className="oracle-research-note">
      <span><Search /></span>
      <div>
        <strong>Jurors research independently</strong>
        <p>No evidence pack or preferred source is supplied. Each juror checks public information before sealing an answer.</p>
      </div>
    </div>
  );
}

function ChainProof({ caseId, activity }: { caseId: number; activity: CaseActivity }) {
  const groups = [
    { label: 'Filed', hashes: activity.events.caseOpened ? [activity.events.caseOpened.transactionHash] : [] },
    { label: 'Panel', hashes: activity.events.panelDrawn.map((event) => event.transactionHash) },
    { label: 'Sealed', hashes: activity.events.committed.map((event) => event.transactionHash) },
    {
      label: 'Revealed',
      hashes: (activity.events.answerRevealed.length > 0
        ? activity.events.answerRevealed
        : activity.events.revealed
      ).map((event) => event.transactionHash),
    },
    { label: 'Initial draw unwind', hashes: activity.events.initialDrawTimedOut ? [activity.events.initialDrawTimedOut.transactionHash] : [] },
    {
      label: activity.events.initialDrawTimedOut ? 'Terminal record' : 'Ruling',
      hashes: activity.events.rulingResolved
        ? [activity.events.rulingResolved.transactionHash]
        : activity.events.resolved
          ? [activity.events.resolved.transactionHash]
          : [],
    },
    { label: 'Juror paid', hashes: activity.events.feePaid.map((event) => event.transactionHash) },
    { label: 'Fee split', hashes: activity.events.feeDistributed ? [activity.events.feeDistributed.transactionHash] : [] },
  ].filter((group) => group.hashes.length > 0);
  const transactionCount = groups.reduce((total, group) => total + group.hashes.length, 0);

  return (
    <details className="oracle-chain-proof">
      <summary><Fingerprint /><strong>On-chain proof</strong><span>{transactionCount} transaction{transactionCount === 1 ? '' : 's'}</span></summary>
      <div>
        {groups.map((group) => (
          <p key={group.label}>
            <strong>{group.label}</strong>
            <span>
              {group.hashes.map((hash, index) => (
                <a key={`${hash}-${index}`} href={explorerTx(hash)} target="_blank" rel="noreferrer" aria-label={`${group.label} transaction ${index + 1} on Worldscan`}>
                  {group.hashes.length === 1 ? 'Worldscan ↗' : `${index + 1} ↗`}
                </a>
              ))}
            </span>
          </p>
        ))}
        <Link href={`/case/${caseId}`}>Open the full case receipt <ArrowRight /></Link>
      </div>
    </details>
  );
}

function LiveCasePanel({
  dashboard,
  activity,
  activityLoading,
  activityError,
  activeQuestion,
  nextQuestion,
  contentStatus,
  refresh,
}: {
  dashboard: OracleDashboard | null;
  activity: CaseActivity | null;
  activityLoading: boolean;
  activityError: string | null;
  activeQuestion: OracleQuestion | null;
  nextQuestion: OracleQuestion | null;
  contentStatus: ContentStatus;
  refresh: () => void | Promise<unknown>;
}) {
  const courtCase = dashboard?.activeCase ?? null;
  const displayedQuestion = courtCase ? activeQuestion : nextQuestion;
  const jurorCount = dashboard?.stats.jurorCount ?? 0;
  const panelSize = dashboard?.stats.panelSize ?? 3;
  const openingMinimum = dashboard?.stats.minPool ?? panelSize;
  const questionUnavailable = courtCase && (contentStatus === 'mismatch' || contentStatus === 'unavailable');
  const awaitingInitialDraw = courtCase?.status === 0 && courtCase.redraws === 0 && courtCase.panel.length === 0;
  const boundedInitialDraw = SUPPORTS_LIVENESS_RECOVERY && awaitingInitialDraw;
  const initialDrawExpired = boundedInitialDraw && courtCase?.phase === 'Resolvable';
  const awaitingRetry = courtCase?.status === 0 && courtCase.redraws > 0;
  const recoveringPanel = SUPPORTS_LIVENESS_RECOVERY && awaitingRetry;
  const recoveryExpired = recoveringPanel && courtCase?.phase === 'Resolvable';
  const liveStateLabel = courtCase
    ? boundedInitialDraw
      ? initialDrawExpired ? 'Initial draw expired · refund ready' : 'Waiting for the first panel'
      : recoveringPanel
        ? recoveryExpired ? 'Recovery expired · status quo ready' : 'Restoring the retry panel'
        : phaseLabels[courtCase.phase]
    : !MVP_CONFIGURED
      ? 'Current MVP walkthrough'
      : (dashboard?.officialEligibleJurors ?? 0) >= openingMinimum
        ? 'Ready to file'
        : 'Building the active juror pool';

  return (
    <section id="oracle-live-panel" role="tabpanel" aria-labelledby="oracle-live-tab" className="oracle-panel" tabIndex={-1}>
      <div className="oracle-live-layout">
        <article className="oracle-case-card">
          <header className="oracle-case-head">
            <div>
              <span className="oracle-eyebrow">{courtCase ? `Live case · #${courtCase.id}` : 'Next public question'}</span>
              <div className="oracle-live-state">
                <i aria-hidden="true" />
                {liveStateLabel}
              </div>
            </div>
            <div className="oracle-chain-mark"><Fingerprint /><span>World Chain</span></div>
          </header>

          {displayedQuestion ? (
            <>
              <h2>{displayedQuestion.question}</h2>
              <QuestionFacts question={displayedQuestion} />
            </>
          ) : questionUnavailable ? (
            <div className="oracle-question-unavailable" role={contentStatus === 'mismatch' ? 'alert' : 'status'}>
              <ShieldCheck />
              <div>
                <strong>{contentStatus === 'mismatch' ? 'Question fingerprint check failed' : 'Question text is temporarily unavailable'}</strong>
                <p>{contentStatus === 'mismatch' ? 'The displayed text is hidden and new seals are paused.' : 'Reconnect before researching or sealing an answer.'}</p>
              </div>
            </div>
          ) : (
            <div className="oracle-question-loading">
              <span />
              <span />
              <span />
            </div>
          )}

          {courtCase && (contentStatus === 'verified' || contentStatus === 'mismatch' || contentStatus === 'unavailable') && (
            <div className={`oracle-integrity is-${contentStatus}`}>
              {contentStatus === 'verified' ? <CheckCircle /> : <ShieldCheck />}
              <span>
                {contentStatus === 'verified'
                  ? 'Question matches its on-chain fingerprint'
                  : contentStatus === 'mismatch'
                    ? 'Question fingerprint mismatch — new seals paused'
                    : 'Question fingerprint could not be checked yet'}
              </span>
            </div>
          )}

          <ResearchNote />

          {courtCase ? (
            <>
              <CaseProgress courtCase={courtCase} activity={activity} />
              {boundedInitialDraw && (
                <div className="oracle-ready-block" role="status">
                  <div>
                    <span>{initialDrawExpired ? 'Permissionless unwind available' : 'Bounded initial draw'}</span>
                    <strong>{initialDrawExpired ? 'No panel was seated' : 'Case parties are excluded from the draw'}</strong>
                    <p>
                      {initialDrawExpired
                        ? `The first-panel deadline passed. Anyone may unwind the case; ${fmtMusd(courtCase.feePool)} MUSD returns to the payer${courtCase.caseType === 1 ? ' together with the escrow principal' : ''}, without recording a merits ruling.`
                        : `The first panel must be seated by ${formatRecoveryDeadline(courtCase.initialDrawDeadline)}. If eligibility falls below the configured floor, the fixed deadline still guarantees a refund${courtCase.caseType === 1 ? ' and return of escrow principal' : ''}.`}
                    </p>
                  </div>
                  {!initialDrawExpired && <Link href="/onboard" className="oracle-primary-link">Join the pool <ArrowRight /></Link>}
                </div>
              )}
              {recoveringPanel && (
                <div className="oracle-ready-block" role="status">
                  <div>
                    <span>{recoveryExpired ? 'Permissionless finalization available' : 'Bounded panel recovery'}</span>
                    <strong>{jurorCount} active · {panelSize} eligible needed for the retry</strong>
                    <p>
                      {recoveryExpired
                        ? 'The fixed deadline passed. The keeper can now finalize this question as status quo without waiting for more jurors.'
                        : `Fully slashed jurors may restore a fresh bond without another World ID proof. The draw must succeed by ${formatRecoveryDeadline(courtCase.recoveryDeadline)}; this deadline cannot be extended.`}
                    </p>
                  </div>
                  {!recoveryExpired && <Link href="/onboard" className="oracle-primary-link">Restore or join <ArrowRight /></Link>}
                </div>
              )}
              <div className="oracle-counts" aria-label="Live ballot counts">
                <div><span>Panel</span><strong>{courtCase.panel.length}/3</strong><small>verified jurors seated</small></div>
                <div><span>Sealed</span><strong>{activity ? `${activity.committedCount}/3` : '—'}</strong><small>answers locked on-chain</small></div>
                <div><span>Revealed</span><strong>{activity ? `${activity.revealedCount}/3` : '—'}</strong><small>answers publicly verified</small></div>
              </div>
              {activity ? (
                <ChainProof caseId={courtCase.id} activity={activity} />
              ) : (
                <div className="oracle-chain-read-state" role={activityError ? 'alert' : 'status'}>
                  <Fingerprint />
                  <span>{activityLoading ? 'Reading ballot transactions from World Chain…' : activityError ? 'Ballot transaction details are temporarily unavailable.' : 'Waiting for the case receipt…'}</span>
                </div>
              )}
            </>
          ) : (
            <div className="oracle-ready-block">
              <div>
                <span>Active juror pool</span>
                <strong>{jurorCount} verified {jurorCount === 1 ? 'human' : 'humans'}</strong>
                <p>{!MVP_CONFIGURED ? 'Explore how a verified-human panel researches, seals, reveals, and records a ruling.' : (dashboard?.officialEligibleJurors ?? 0) >= openingMinimum ? `The ${openingMinimum}-juror admission floor is met after excluding the opener; ${panelSize} seats will be drawn.` : `${openingMinimum - (dashboard?.officialEligibleJurors ?? 0)} more eligible jurors are needed after excluding the opener.`}</p>
              </div>
              <Link href={MVP_CONFIGURED ? '/onboard' : '/demothemis-mvp.html'} className="oracle-primary-link">{MVP_CONFIGURED ? 'Join the pool' : 'Open the walkthrough'} <ArrowRight /></Link>
            </div>
          )}
        </article>

        <aside className="oracle-jury-card">
          <div className="oracle-jury-head">
            <span><Group /></span>
            <div><small>{courtCase ? 'The current panel' : 'Per-case panel'}</small><h3>{courtCase ? 'Three verified humans' : 'Three seats drawn from the pool'}</h3></div>
          </div>
          <SeatStrip jurorCount={jurorCount} activeCase={courtCase} activity={activity} />
          <div className="oracle-jury-rule">
            <Lock />
            <p>Each person gets one seat and one sealed answer. The contract—not an operator—counts the majority.</p>
          </div>
          {courtCase && activity?.events.caseOpened?.transactionHash && (
            <a href={explorerTx(activity.events.caseOpened.transactionHash)} target="_blank" rel="noreferrer" className="oracle-worldscan-link">
              Inspect this case on Worldscan <ArrowRight />
            </a>
          )}
        </aside>
      </div>

      {courtCase && (courtCase.phase === 'Commit' || courtCase.phase === 'Reveal') && (
        <LiveBallot
          caseId={courtCase.id}
          round={courtCase.redraws}
          panel={courtCase.panel}
          phase={courtCase.phase}
          contentVerified={contentStatus === 'verified'}
          refresh={refresh}
        />
      )}

      {courtCase?.phase === 'Resolved' && activity && <ResolvedReceipt courtCase={courtCase} activity={activity} />}

      {dashboard && dashboard.resolvedCases.length > 0 && (
        <section className="oracle-receipt-history" id="receipts" aria-labelledby="receipt-history-title">
          <div className="oracle-section-title">
            <div><span>Permanent record</span><h2 id="receipt-history-title">Previous rulings</h2></div>
            <small>Read directly from World Chain</small>
          </div>
          <div className="oracle-receipt-list">
            {dashboard.resolvedCases.map((receiptCase) => (
              <Link href={`/case/${receiptCase.id}`} key={receiptCase.id}>
                <span className="is-recorded">DONE</span>
                <div>
                  <strong>Case #{receiptCase.id}</strong>
                  <small>Recorded result · open receipt</small>
                </div>
                <ArrowRight />
              </Link>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function ResolvedReceipt({ courtCase, activity }: { courtCase: CaseView; activity: CaseActivity }) {
  const rulingTx = activity.events.rulingResolved?.transactionHash ?? activity.events.resolved?.transactionHash;
  const initialDrawTimedOut = activity.events.initialDrawTimedOut;
  const recoveryTimedOut = activity.events.recoveryTimedOut !== null;
  const firstRoundAnswers = activity.events.answerRevealed;
  const firstRoundYes = recoveryTimedOut
    ? firstRoundAnswers.length > 0
      ? firstRoundAnswers.filter((event) => event.ruling === 1).length
      : activity.events.revealed.filter((event) => event.vote).length
    : 0;
  const firstRoundNo = recoveryTimedOut
    ? firstRoundAnswers.length > 0
      ? firstRoundAnswers.filter((event) => event.ruling === 0).length
      : activity.events.revealed.filter((event) => !event.vote).length
    : 0;
  const firstRoundInsufficient = recoveryTimedOut
    ? firstRoundAnswers.filter((event) => event.ruling === 2).length
    : 0;
  const revealed = activity.yes + activity.no + activity.insufficient;
  const retryMissedQuorum = courtCase.redraws > 0 && revealed < 2;
  const insufficientRuling = courtCase.ruling === 2;
  return (
    <section className="oracle-final-receipt" aria-labelledby="ruling-title">
      <div className="oracle-ruling-mark"><CheckCircle /></div>
      <div className="oracle-ruling-copy">
        <span>{initialDrawTimedOut ? 'Unwind recorded on World Chain' : 'Ruling recorded on World Chain'}</span>
        <h2 id="ruling-title">
          {initialDrawTimedOut
            ? 'No panel was seated. The case was unwound.'
            : recoveryTimedOut
            ? 'Recovery expired. Status quo was applied.'
            : retryMissedQuorum
              ? 'The retry missed quorum. Status quo was applied.'
              : insufficientRuling
                ? 'The jury found insufficient information.'
                : `The jury answered ${courtCase.outcome ? 'YES' : 'NO'}.`}
        </h2>
        {initialDrawTimedOut ? (
          <p>
            {fmtMusd(initialDrawTimedOut.feeRefunded)} MUSD returned to {compactAddress(initialDrawTimedOut.refundTo)}
            {courtCase.caseType === 1 ? ' · escrow principal returned to the payer' : ''} · no merits ruling
          </p>
        ) : recoveryTimedOut ? (
          <p>First round: {firstRoundYes} YES · {firstRoundNo} NO · {firstRoundInsufficient} INSUFFICIENT · quorum not met · no retry panel formed</p>
        ) : (
          <p>
            {activity.yes} YES · {activity.no} NO · {activity.insufficient} INSUFFICIENT ·{' '}
            {retryMissedQuorum
              ? 'retry quorum not met'
              : insufficientRuling
                ? 'neither YES nor NO reached a strict majority'
                : `${activity.revealedCount}/3 answers revealed`}
          </p>
        )}
      </div>
      {rulingTx && <a href={explorerTx(rulingTx)} target="_blank" rel="noreferrer">Open receipt <ArrowRight /></a>}
    </section>
  );
}

function SubmitCasePanel({
  entry,
  seededQuestion,
  hasActiveCase,
}: {
  entry: QuestionQueueEntry | null;
  seededQuestion: OracleQuestion | null;
  hasActiveCase: boolean;
}) {
  const seededUri = useRef('');
  const [question, setQuestion] = useState('');
  const [yesRule, setYesRule] = useState('');
  const [judgedAsOf, setJudgedAsOf] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!entry || !seededQuestion || seededUri.current === entry.uri) return;
    seededUri.current = entry.uri;
    setQuestion(seededQuestion.question ?? '');
    setYesRule(seededQuestion.yesRule ?? seededQuestion.resolution ?? '');
    setJudgedAsOf(toLocalInputValue(seededQuestion.judgedAsOf));
    setReviewing(false);
  }, [entry, seededQuestion]);

  const valid = question.trim().length > 12 && yesRule.trim().length > 12 && judgedAsOf.length > 0;
  const judgedAsUtc = judgedAsOf && !Number.isNaN(new Date(judgedAsOf).getTime())
    ? formatExactMoment(new Date(judgedAsOf).toISOString())
    : '';

  return (
    <section id="oracle-submit-panel" role="tabpanel" aria-labelledby="oracle-submit-tab" className="oracle-panel" tabIndex={-1}>
      <div className="oracle-submit-intro">
        <div><span className="oracle-eyebrow">Prepared submission preview</span><h2>Ask one precise public question.</h2></div>
        <p>This editable preview shows the exact filing payload but sends nothing. Official demo questions activate only from the validated queue.</p>
      </div>

      <div className="oracle-submit-layout">
        <form className="oracle-submit-form" onSubmit={(event) => { event.preventDefault(); if (valid) setReviewing(true); }}>
          <div className="oracle-form-progress" aria-label="Submission steps"><span className={!reviewing ? 'is-active' : 'is-done'}>1 · Write</span><i /><span className={reviewing ? 'is-active' : ''}>2 · Review</span></div>

          {!reviewing ? (
            <>
              <div className="oracle-field">
                <span>
                  <b aria-hidden="true">1</b>
                  <label htmlFor="oracle-question-input">Yes/no question</label>
                  <small id="oracle-question-help">Ask about a real, publicly researchable fact.</small>
                </span>
                <textarea id="oracle-question-input" aria-describedby="oracle-question-help" value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} placeholder="Did the stated event occur by the specified time?" />
              </div>
              <div className="oracle-field">
                <span>
                  <b aria-hidden="true">2</b>
                  <label htmlFor="oracle-yes-rule-input">YES if</label>
                  <small id="oracle-yes-rule-help">Define one exact condition. NO means it was not met.</small>
                </span>
                <textarea id="oracle-yes-rule-input" aria-describedby="oracle-yes-rule-help" value={yesRule} onChange={(event) => setYesRule(event.target.value)} rows={3} placeholder="Vote YES only if…" />
              </div>
              <div className="oracle-field">
                <span>
                  <b aria-hidden="true">3</b>
                  <label htmlFor="oracle-judged-time-input">Judged as of</label>
                  <small id="oracle-judged-time-help">Enter your local date and time. It is stored in UTC.</small>
                </span>
                <div className="oracle-date-input">
                  <Clock />
                  <input id="oracle-judged-time-input" aria-describedby="oracle-judged-time-help oracle-judged-time-utc" type="datetime-local" step="1" value={judgedAsOf} onChange={(event) => setJudgedAsOf(event.target.value)} />
                </div>
                <small className="oracle-utc-preview" id="oracle-judged-time-utc">
                  {judgedAsUtc ? `Saved as ${judgedAsUtc}` : 'Choose a time to see its UTC value.'}
                </small>
              </div>

              <button type="submit" className="oracle-primary-action" disabled={!valid}>Preview submission <ArrowRight /></button>
            </>
          ) : (
            <div className="oracle-review-card">
              <div className="oracle-review-head"><span>Prepared question preview</span><i>20 MUSD</i></div>
              <h3>{question}</h3>
              <QuestionFacts question={{ question, yesRule, judgedAsOf: judgedAsOf ? new Date(judgedAsOf).toISOString() : '' }} />
              <ResearchNote />
              <div className="oracle-review-lock"><Fingerprint /><span>The official opener files only the next validated queue entry. Edits in this preview are not sent.</span></div>
              <button type="button" className="oracle-secondary-action" onClick={() => setReviewing(false)}>Edit question</button>
            </div>
          )}
        </form>

        <aside className="oracle-submit-side">
          <div className="oracle-fee-card">
            <span>Fixed question fee</span>
            <strong>20 <small>MUSD</small></strong>
            <p>Valueless demo tokens fund the ruling and make the distribution visible.</p>
            <dl><div><dt>Jurors</dt><dd>70%</dd></div><div><dt>Reward pool</dt><dd>20%</dd></div><div><dt>Protocol</dt><dd>10%</dd></div></dl>
          </div>
          <div className="oracle-one-at-time">
            <span><Lock /></span>
            <div><strong>One official question at a time</strong><p>{hasActiveCase ? 'The next question opens after the current ruling.' : 'The official opener can file the next prepared question.'}</p></div>
          </div>
          <div className="oracle-submit-steps">
            <div><span>01</span><p><strong>Question filed</strong><small>Its exact fingerprint and fee go on-chain.</small></p></div>
            <div><span>02</span><p><strong>Jurors research</strong><small>No selected sources or evidence pack.</small></p></div>
            <div><span>03</span><p><strong>Majority recorded</strong><small>The contract counts and pays by rule.</small></p></div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="oracle-page-loading" role="status"><span /><p>Opening the Demo MVP…</p></div>}>
      <OracleHome />
    </Suspense>
  );
}

function OracleHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: ProductTab = searchParams.get('tab') === 'submit' ? 'submit' : 'live';
  const dashboard = usePolledData(loadOracleDashboard, 6000);
  const activeCase = dashboard.data?.activeCase ?? null;
  const panelKey = activeCase?.panel.join(',') ?? '';
  const [activeQuestion, setActiveQuestion] = useState<OracleQuestion | null>(null);
  const [nextQuestion, setNextQuestion] = useState<OracleQuestion | null>(null);
  const [contentStatus, setContentStatus] = useState<ContentStatus>('idle');

  const changeTab = useCallback((next: ProductTab) => {
    const url = next === 'submit' ? '/app?tab=submit' : '/app';
    router.replace(url, { scroll: false });
  }, [router]);

  const openLivePanel = useCallback(() => {
    changeTab('live');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const panel = document.getElementById('oracle-live-panel');
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    }));
  }, [changeTab]);

  const activityFetcher = useCallback(async () => {
    if (!activeCase) return null;
    return getCaseActivity(activeCase.id, activeCase.panel);
    // panelKey intentionally captures a changed panel after a redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase?.id, panelKey]);
  const activity = usePolledData(activityFetcher, 4000);

  const activeCaseUri = activeCase?.uri;
  const activeCaseCriteriaHash = activeCase?.criteriaHash;

  useEffect(() => {
    let alive = true;
    if (!activeCaseUri || !activeCaseCriteriaHash) {
      setActiveQuestion(null);
      setContentStatus('idle');
      return;
    }
    setActiveQuestion(null);
    setContentStatus('loading');
    const checkFingerprint = async () => {
      const result = await fetchCaseContent(activeCaseUri, activeCaseCriteriaHash);
      if (!alive) return;
      if (result.ok && result.content && result.matches === true) {
        setActiveQuestion(result.content as OracleQuestion);
        setContentStatus('verified');
      } else {
        setActiveQuestion(null);
        setContentStatus(result.ok && result.matches === false ? 'mismatch' : 'unavailable');
      }
    };
    void checkFingerprint();
    const timer = window.setInterval(() => void checkFingerprint(), 10_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [activeCaseCriteriaHash, activeCaseUri]);

  const nextEntry = dashboard.data?.nextQuestion ?? null;
  const nextEntryUri = nextEntry?.uri;
  const nextEntryHash = nextEntry?.criteriaHash;
  useEffect(() => {
    let alive = true;
    if (!nextEntryUri || !nextEntryHash) {
      setNextQuestion(null);
      return;
    }
    void fetchCaseContent(nextEntryUri, nextEntryHash).then((result) => {
      if (!alive) return;
      setNextQuestion(result.ok && result.matches === true ? (result.content as OracleQuestion) : null);
    });
    return () => { alive = false; };
  }, [nextEntryHash, nextEntryUri]);

  const proofItems = useMemo(() => [
    { icon: Fingerprint, label: 'Verified jurors', body: 'One World ID-verified person per seat' },
    { icon: Lock, label: 'Sealed answers', body: 'Choices lock before anyone reveals' },
    { icon: CheckCircle, label: 'Contract ruling', body: 'The majority and rewards execute by rule' },
  ], []);

  return (
    <main className="oracle-app" id="main-content" tabIndex={-1}>
      <section className="oracle-hero" aria-labelledby="oracle-title">
        <div className="oracle-hero-copy">
          <div className="oracle-brand-lockup" aria-hidden="true">
            <Image
              src="/assets/brand/demothemis/wordmark.png"
              width={1766}
              height={216}
              alt=""
              priority
            />
          </div>
          <span className="oracle-kicker"><i /> Demo MVP · World Chain</span>
          <h1 id="oracle-title">
            <span>One public question.</span>
            <span><em>Three verified humans.</em></span>
            <span>One on-chain answer.</span>
          </h1>
          <p>Follow one public question through independent research, sealed ballots, an on-chain majority ruling, and visible rewards.</p>
          <div className="oracle-hero-actions">
            <button type="button" onClick={openLivePanel}>Explore the case <ArrowRight /></button>
            <Link href={MVP_CONFIGURED ? '/onboard' : '/demothemis-mvp.html'}>{MVP_CONFIGURED ? 'Join the juror pool' : 'Try the juror walkthrough'}</Link>
          </div>
        </div>
        <div className="oracle-proof-stack" aria-label="What this demo proves">
          {proofItems.map(({ icon: Icon, label, body }, index) => (
            <div key={label} className={`oracle-proof-card is-${index + 1}`}>
              <span><Icon /></span><div><strong>{label}</strong><small>{body}</small></div><b>0{index + 1}</b>
            </div>
          ))}
        </div>
      </section>

      <ProductTabs tab={tab} onChange={changeTab} />

      {dashboard.data && dashboard.data.unofficialActiveCaseIds.length > 0 && (
        <div className="oracle-queue-alert" role="alert">
          <ShieldCheck />
          <div>
            <strong>The official queue is paused for operator review.</strong>
            <p>
              {dashboard.data.unofficialActiveCaseIds.length === 1 ? 'Another unresolved case is' : 'Other unresolved cases are'} active outside the validated question series. The current official case remains visible, but no next question will open.
            </p>
            <span>
              {dashboard.data.unofficialActiveCaseIds.map((caseId) => (
                <Link href={`/case/${caseId}`} key={caseId}>Review case #{caseId}</Link>
              ))}
            </span>
          </div>
        </div>
      )}

      <section
        id={tab === 'live' ? 'oracle-submit-panel' : 'oracle-live-panel'}
        role="tabpanel"
        aria-labelledby={tab === 'live' ? 'oracle-submit-tab' : 'oracle-live-tab'}
        hidden
      />

      {dashboard.loading && !dashboard.data ? (
        <section id={tab === 'live' ? 'oracle-live-panel' : 'oracle-submit-panel'} className="oracle-panel" role="tabpanel" aria-labelledby={tab === 'live' ? 'oracle-live-tab' : 'oracle-submit-tab'} tabIndex={-1}>
          <div className="oracle-page-loading" role="status"><span /><p>Reading the court from World Chain…</p></div>
        </section>
      ) : dashboard.error && !dashboard.data ? (
        <section id={tab === 'live' ? 'oracle-live-panel' : 'oracle-submit-panel'} className="oracle-panel" role="tabpanel" aria-labelledby={tab === 'live' ? 'oracle-live-tab' : 'oracle-submit-tab'} tabIndex={-1}>
          <div className="oracle-page-error" role="alert"><strong>The court could not be read.</strong><p>Please refresh to reconnect to World Chain.</p></div>
        </section>
      ) : dashboard.data && dashboard.data.overlappingActiveCases > 0 ? (
        <section id={tab === 'live' ? 'oracle-live-panel' : 'oracle-submit-panel'} className="oracle-panel" role="tabpanel" aria-labelledby={tab === 'live' ? 'oracle-live-tab' : 'oracle-submit-tab'} tabIndex={-1}>
          <div className="oracle-page-error" role="alert">
            <strong>The official queue is paused.</strong>
            <p>More than one validated official question is unresolved. Voting and filing stay locked until the one-at-a-time sequence is restored.</p>
          </div>
        </section>
      ) : tab === 'live' ? (
        <LiveCasePanel
          dashboard={dashboard.data}
          activity={activity.data}
          activityLoading={activity.loading}
          activityError={activity.error}
          activeQuestion={activeQuestion}
          nextQuestion={nextQuestion}
          contentStatus={contentStatus}
          refresh={async () => { await Promise.all([dashboard.refresh(), activity.refresh()]); }}
        />
      ) : (
        <SubmitCasePanel
          entry={nextEntry}
          seededQuestion={nextQuestion}
          hasActiveCase={!!activeCase || (dashboard.data?.unofficialActiveCaseIds.length ?? 0) > 0}
        />
      )}

      <MvpRoadmapComparison />

      <footer className="oracle-footer-note">
        <span>Built for clarity</span>
        <p>All court actions, the ruling, and reward distribution are on-chain. Question text is fingerprinted on-chain; juror research happens independently off-chain.</p>
      </footer>
    </main>
  );
}
