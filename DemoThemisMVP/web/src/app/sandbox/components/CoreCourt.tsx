'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BOND,
  CASE_FEE,
  CaseOutcome,
  CourtSim,
  courtMoney,
  MUSD,
  mulberry32,
  runSweep,
  SweepSummary,
} from '@/lib/sim';
import { Seg, Slider, Stat, Verdict, Widget } from './primitives';

const usd = (micro: number) => courtMoney(micro / MUSD);

export function CoreCourt({ seed }: { seed: number }) {
  const [population, setPopulation] = useState(200);
  const [panelSize, setPanelSize] = useState(7);
  const [revealPct, setRevealPct] = useState(92);

  const simKey = `${seed}:${population}`;
  const simRef = useRef<CourtSim | null>(null);
  const [, force] = useState(0);
  const [last, setLast] = useState<CaseOutcome | null>(null);
  const [sweep, setSweep] = useState<SweepSummary | null>(null);
  const [count, setCount] = useState(0);

  // (re)build the sim when the seed or population changes
  const sim = useMemo(() => {
    const s = new CourtSim(mulberry32((seed ^ 0x1234567) >>> 0), population);
    simRef.current = s;
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simKey]);

  useEffect(() => {
    setLast(null);
    setSweep(null);
    setCount(0);
  }, [simKey]);

  const opts = { panelSize, revealRate: revealPct / 100 };

  const runOne = () => {
    if (!sim.canSeatPanel(panelSize)) return;
    const r = sim.runCase(opts);
    setLast(r);
    setSweep(null);
    setCount((c) => c + 1);
    force((n) => n + 1);
  };
  const runHundred = () => {
    if (!sim.canSeatPanel(panelSize)) return;
    const s = runSweep(sim, 100, opts);
    setSweep(s);
    setLast(null);
    setCount((c) => c + s.cases);
    force((n) => n + 1);
  };

  const activeJurors = sim.activeIds().length;
  const canRun = activeJurors >= panelSize;
  const slashesThisCase = last ? last.noShows.length * BOND : 0;

  return (
    <Widget title="The core court: draw, commit, reveal, verdict, payout">
      <p className="sbx-prose">
        This is the machine the attack demo rests on, and it mirrors the deployed contract exactly: a
        random panel is drawn, jurors commit a hashed vote then reveal it, the majority wins, and the
        $2 case fee splits 70/20/10 between coherent jurors, the reward pool, and the protocol. No-show
        bonds and the rounding dust go to the reward pool, never to the other jurors. In this sandbox,
        each simulated juror represents one World ID nullifier: one human, one seat, no duplicate wallet.
      </p>

      <div className="sbx-controls">
        <Slider
          label="Juror population"
          value={population}
          min={20}
          max={500}
          step={10}
          onChange={setPopulation}
          display={`${population} humans`}
        />
        <Slider
          label="Reveal rate (the rest are slashed no-shows)"
          value={revealPct}
          min={50}
          max={100}
          step={1}
          onChange={setRevealPct}
          display={`${revealPct}%`}
        />
        <div className="sbx-row">
          <label>Panel size</label>
          <Seg
            options={[
              { label: '3', value: 3 },
              { label: '7', value: 7 },
              { label: '15', value: 15 },
            ]}
            value={panelSize}
            onChange={setPanelSize}
            label="panel size"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          className="sbx-btn"
          onClick={runOne}
          disabled={!canRun}
          style={!canRun ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          Run a case
        </button>
        <button
          className="sbx-btn sbx-btn-ghost"
          onClick={runHundred}
          disabled={!canRun}
          style={!canRun ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          Run 100 cases
        </button>
      </div>

      {!canRun && (
        <div className="sbx-state error" role="status" style={{ marginBottom: '1rem' }}>
          The juror pool is too thin to seat a {panelSize}-seat panel: only {activeJurors} of{' '}
          {population} jurors are still bonded after slashed no-shows. Raise the population, lower the
          panel size, or re-roll the seed to reset the pool. (Slashed jurors stay out until they post a
          fresh bond, exactly as on-chain.)
        </div>
      )}

      {/* persistent state: the reward pool accrues across cases */}
      <div className="sbx-readout" style={{ marginBottom: '1rem' }}>
        <Stat k="Reward pool (accrued)" v={usd(sim.rewardPool)} tone="accent" />
        <Stat k="Protocol (accrued)" v={usd(sim.protocol)} />
        <Stat k="Cases resolved" v={count} />
        <Stat k="Active jurors" v={`${activeJurors} / ${population}`} />
      </div>

      {!last && !sweep && (
        <div className="sbx-state">
          No cases yet. Run a case to draw a panel and watch the payout, or run 100 to see the pool
          accrue.
        </div>
      )}

      {last && <CaseDetail outcome={last} panelSize={panelSize} slashes={slashesThisCase} />}

      {sweep && (
        <div>
          <div className="sbx-readout">
            <Stat k="Verdicts matching the truth" v={`${sweep.correct} / ${sweep.cases}`} tone="good" />
            <Stat k="Court accuracy" v={`${(sweep.accuracy * 100).toFixed(1)}%`} tone="good" />
            <Stat k="Quorum redraws" v={sweep.redraws} />
            <Stat k="Reward pool now" v={usd(sweep.rewardPool)} tone="accent" />
          </div>
          <p className="sbx-note">
            Across {sweep.cases} simulated cases the majority matched the hidden truth{' '}
            {(sweep.accuracy * 100).toFixed(1)}% of the time, and the reward pool grew to{' '}
            <b>{usd(sweep.rewardPool)}</b> from fee cuts, slashes, and dust.
            {sweep.stoppedEarly && (
              <>
                {' '}
                The sweep stopped at {sweep.cases} of {sweep.requested}: too many slashed no-shows left
                the pool unable to seat a panel. Raise the reveal rate or the population.
              </>
            )}
          </p>
        </div>
      )}
    </Widget>
  );
}

function CaseDetail({
  outcome,
  panelSize,
  slashes,
}: {
  outcome: CaseOutcome;
  panelSize: number;
  slashes: number;
}) {
  const { payout } = outcome;
  const jurorsPct = (payout.toJurorsTotal / CASE_FEE) * 100;
  const rewardPct = (payout.toReward / CASE_FEE) * 100;
  const protoPct = (payout.toProtocol / CASE_FEE) * 100;
  const decided = outcome.votes.filter((v) => v.revealed).length;

  return (
    <div>
      {/* the drawn panel */}
      <div className="sbx-pdots" style={{ gridTemplateColumns: `repeat(${panelSize}, 1fr)`, marginBottom: '.6rem' }}>
        {outcome.votes.map((v, i) => (
          <div
            key={i}
            className={`sbx-dot draw ${!v.revealed ? '' : v.vote === outcome.outcome ? 'hold' : 'win'}`}
            title={!v.revealed ? 'no-show (slashed)' : v.vote ? 'voted YES' : 'voted NO'}
            style={!v.revealed ? { background: 'var(--line-strong)', opacity: 0.5 } : undefined}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.8rem' }}>
        <Verdict level={outcome.outcome ? 'good' : 'mid'}>
          Verdict: {outcome.outcome ? 'YES' : 'NO'}
        </Verdict>
        {outcome.redrew && <Verdict level="mid">redrew once (quorum miss)</Verdict>}
        <span className="sbx-sans" style={{ fontSize: '.84rem', color: 'var(--muted)' }}>
          {outcome.yes} yes &middot; {outcome.no} no &middot; {outcome.noShows.length} no-show
          {outcome.noShows.length === 1 ? '' : 's'} &middot; {decided}/{panelSize} revealed
        </span>
      </div>

      {/* the 70/20/10 split */}
      <div className="sbx-budgetbar" aria-label="fee split">
        <div className="sbx-bb-j" style={{ width: `${jurorsPct}%` }}>
          {jurorsPct > 12 ? `jurors ${jurorsPct.toFixed(0)}%` : ''}
        </div>
        <div className="sbx-bb-i" style={{ width: `${rewardPct}%` }}>
          {rewardPct > 12 ? `reward ${rewardPct.toFixed(0)}%` : ''}
        </div>
        <div className="sbx-bb-p" style={{ width: `${protoPct}%` }}>
          {protoPct > 10 ? `protocol ${protoPct.toFixed(0)}%` : ''}
        </div>
      </div>

      <div className="sbx-readout" style={{ marginTop: '1rem' }}>
        <Stat k="Per coherent juror" v={usd(payout.perWinnerShare)} tone="good" />
        <Stat k="Coherent jurors paid" v={payout.winners.length} />
        <Stat k="Fee to reward pool" v={usd(payout.toReward)} tone="accent" />
        <Stat k="Slashed bonds to pool" v={usd(slashes)} tone={slashes > 0 ? 'bad' : undefined} />
      </div>

      {payout.dust > 0 && (
        <p className="sbx-note">
          The 70% juror pot did not divide evenly, so the {usd(payout.dust)} of dust routed to the
          reward pool. Integer-cent math, conserved to the unit, exactly as on-chain.
        </p>
      )}

      <p className="sbx-note good">
        {decided} unique {decided === 1 ? 'human' : 'humans'} decided this. None could vote twice: one
        identity-derived nullifier gives one seat across every wallet. The panel was drawn at random only
        after the question, and each vote was sealed until reveal.
      </p>
    </div>
  );
}
