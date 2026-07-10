'use client';

import { useMemo, useState } from 'react';
import {
  bribePriceFloor,
  colludersFor,
  courtMoney,
  flipCurve,
  hyperTail,
  monteCarloCaptures,
  mulberry32,
  parallelOdds,
  pctText,
  PARALLEL,
  pCaptureAll,
  pCaptureOne,
  tokenCourt,
} from '@/lib/sim';
import { Seg, Slider, Verdict, Widget } from './primitives';

// Fixed parameters for the headline comparison.
const TOTAL_STAKE_TOKENS = 800_000; // tokens backing the token-weighted oracle
const CURVE_MAX_BUDGET = 1_000_000; // x-axis ceiling for the P(flip) curve
const PANEL_OPTIONS = [
  { label: '3 seats', value: 3 },
  { label: '7 seats', value: 7 },
  { label: '15 seats', value: 15 },
];

/** Draw `panel` distinct seats from a pool of `N`, counting how many are among the
 *  first `K` (the colluders). Rejection sampling, so a huge N stays cheap. */
function drawPanelColluders(rng: () => number, N: number, panel: number, K: number): boolean[] {
  const seen = new Set<number>();
  const seats: boolean[] = [];
  let guard = 0;
  while (seats.length < panel && guard < panel * 50) {
    guard++;
    const idx = Math.floor(rng() * N);
    if (seen.has(idx)) continue;
    seen.add(idx);
    seats.push(idx < K);
  }
  return seats;
}

export function AttackDemo({ seed }: { seed: number }) {
  const [budget, setBudget] = useState(250_000);
  const [tokenPrice, setTokenPrice] = useState(0.5);
  const [poolWidthK, setPoolWidthK] = useState(200); // thousands of verified humans
  const [bribePrice, setBribePrice] = useState(bribePriceFloor());
  const [panelSize, setPanelSize] = useState(7);
  const [parallelN, setParallelN] = useState(1);
  const [sharePct, setSharePct] = useState(43);

  // a draw nonce so "draw a panel" re-rolls without changing the global seed
  const [drawNonce, setDrawNonce] = useState(0);

  const N = poolWidthK * 1000;
  const maj = Math.floor(panelSize / 2) + 1;

  const token = useMemo(
    () => tokenCourt({ totalStakeTokens: TOTAL_STAKE_TOKENS, tokenPrice }, budget),
    [tokenPrice, budget],
  );

  const human = useMemo(() => {
    const K = Math.min(N, Math.floor(budget / bribePrice));
    const pFlip = hyperTail(N, K, panelSize, maj);
    return { K, frac: K / N, pFlip };
  }, [N, budget, bribePrice, panelSize, maj]);

  const curve = useMemo(
    () =>
      flipCurve(
        { totalStakeTokens: TOTAL_STAKE_TOKENS, tokenPrice },
        { poolSize: N, panelSize },
        CURVE_MAX_BUDGET,
      ),
    [tokenPrice, N, panelSize],
  );

  // headline panel draw (animated by the draw button)
  const drawnSeats = useMemo(() => {
    const rng = mulberry32(seed ^ (drawNonce * 0x9e3779b1));
    return drawPanelColluders(rng, N, panelSize, human.K);
  }, [seed, drawNonce, N, panelSize, human.K]);
  const drawnColluders = drawnSeats.filter(Boolean).length;
  const drawnCaptured = drawnColluders >= maj;

  // parallel-panels readout (above the ceiling)
  const K_pp = colludersFor(sharePct);
  const ppRows = useMemo(() => parallelOdds(K_pp), [K_pp]);
  const ppOne = pCaptureOne(K_pp);
  const ppAll = pCaptureAll(K_pp, parallelN);

  // monte-carlo honesty check for the headline panel
  const mc = useMemo(() => {
    const rng = mulberry32((seed ^ 0x5bd1e995) >>> 0);
    return monteCarloCaptures(rng, N, human.K, panelSize, 1000);
  }, [seed, N, human.K, panelSize]);

  const tokenSharePct = Math.min(100, (budget / token.totalStakeUsd) * 100);

  return (
    <Widget title="The comparative attack: buy this verdict">
      <p className="sbx-prose">
        Two oracles answer the same question under the same attacker budget. One sells the verdict
        to whoever stakes the most. The other gives one verified human one vote and draws a random panel only after the question — so the attacker can never know or pick who will sit, and never reuses an answer. To touch a specific verdict you cannot bribe the panel; you must pre-corrupt a near-majority of the whole human pool and hope the draw seats them, paying it again every case. This is the sandbox/design model;
        the live MVP is a single 3-seat demo panel, and security scales with pool width. Move the
        budget and watch.
      </p>

      <div className="sbx-controls">
        <Slider
          label="Attacker budget"
          value={budget}
          min={0}
          max={1_000_000}
          step={5000}
          onChange={setBudget}
          display={courtMoney(budget)}
        />
        <Slider
          label="Token price (drives the token court's stake)"
          value={tokenPrice}
          min={0.05}
          max={2}
          step={0.05}
          onChange={setTokenPrice}
          display={`$${tokenPrice.toFixed(2)} / token`}
        />
        <Slider
          label="Human pool width (verified humans)"
          value={poolWidthK}
          min={10}
          max={1000}
          step={10}
          onChange={setPoolWidthK}
          display={`${(N).toLocaleString('en-US')}`}
        />
        <Slider
          label="Bribe price per juror (floor = fee $1.50 + bond $5 + reputation $0)"
          value={bribePrice}
          min={1}
          max={50}
          step={0.5}
          onChange={setBribePrice}
          display={courtMoney(bribePrice)}
        />
        <div className="sbx-row">
          <label>Panel size</label>
          <Seg options={PANEL_OPTIONS} value={panelSize} onChange={setPanelSize} label="Panel size" />
        </div>
      </div>

      {/* ---- the money shot: two verdicts side by side ---- */}
      <div className="sbx-compare">
        <div className="sbx-col bad">
          <h4>
            <span>Stake-weighted oracle</span>
            <span className="sbx-sans" style={{ fontSize: '.72rem', color: 'var(--faint)' }}>
              naive stake vote
            </span>
          </h4>
          <div className="sbx-fillbar" aria-label="attacker share of stake">
            <div
              className="fill bad"
              style={{ width: `${Math.max(tokenSharePct, 8)}%` }}
            >
              {tokenSharePct >= 8 ? `${tokenSharePct.toFixed(0)}% of stake` : ''}
            </div>
            <div className="mid" />
          </div>
          <div style={{ marginTop: '.7rem' }}>
            {token.flipped ? (
              <Verdict level="high">Verdict bought</Verdict>
            ) : (
              <Verdict level="good">Holds for now</Verdict>
            )}
          </div>
          <p className="sbx-sans" style={{ fontSize: '.86rem', margin: '.6rem 0 0', color: 'var(--muted)' }}>
            Costs <b>{courtMoney(token.costToFlip)}</b> to control a voting majority (half the staked
            value). {token.flipped ? 'The budget clears it.' : 'The budget falls short.'}
          </p>
          {token.flipped && (
            <p className="sbx-note warn" style={{ marginTop: '.6rem' }}>
              In a pure stake vote, a bought majority stays bought &mdash; the next verdict is free.
              Real oracles like UMA &amp; Kleros add slashing and escalating appeals, but influence
              still tracks capital.
            </p>
          )}
        </div>

        <div className="sbx-col good">
          <h4>
            <span>DemoThemis human court</span>
            <span className="sbx-sans" style={{ fontSize: '.72rem', color: 'var(--faint)' }}>
              one human, one vote
            </span>
          </h4>
          <div className="sbx-pdots" style={{ gridTemplateColumns: `repeat(${panelSize}, 1fr)` }}>
            {drawnSeats.map((c, i) => (
              <div
                key={i}
                className={`sbx-dot draw ${c ? 'win' : 'hold'}`}
                title={c ? 'bribed' : 'honest'}
              />
            ))}
          </div>
          <div style={{ marginTop: '.7rem', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {drawnCaptured ? (
              <Verdict level="high">This panel fell</Verdict>
            ) : (
              <Verdict level="good">Verdict holds</Verdict>
            )}
            <span className="sbx-sans" style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
              {drawnColluders}/{panelSize} bribed on this draw
            </span>
            <button className="sbx-btn sbx-btn-ghost" onClick={() => setDrawNonce((n) => n + 1)}>
              Draw a panel
            </button>
          </div>
          <p className="sbx-sans" style={{ fontSize: '.86rem', margin: '.6rem 0 0', color: 'var(--muted)' }}>
            Because the panel is drawn at random after the question, the attacker cannot buy the panel — only the pool. This budget bribes <b>{human.K.toLocaleString('en-US')}</b> of {N.toLocaleString('en-US')}{' '}humans ({pctText(human.frac)} of the pool), and a fresh random draw still seats a captured majority only <b>{pctText(human.pFlip)}</b> of the time — a chance, not a verdict.
          </p>
          <p className="sbx-note good" style={{ marginTop: '.6rem' }}>
            And you start over next case: a fresh panel, fresh bribes, and any panel you do capture is
            appealed into a bigger one. Nothing here is reusable.
          </p>
        </div>
      </div>

      {/* ---- the P(flip) vs budget curve ---- */}
      <h3 style={{ marginTop: '1.6rem' }}>Probability of flipping the verdict, by budget</h3>
      <FlipChart curve={curve} budget={budget} />
      <div className="sbx-legend">
        <span>
          <i style={{ background: 'var(--bad)' }} /> Stake vote (a step: bought, then permanent)
        </span>
        <span>
          <i style={{ background: 'var(--good)' }} /> Human court (pool-corruption odds, re-paid per case)
        </span>
        <span>
          <i style={{ background: 'var(--accent)', width: 3, height: 12 }} /> your budget
        </span>
      </div>
      <p className="sbx-note">
        Widen the human pool and the green curve collapses to the right: security is pool{' '}
        <b>width</b>. The stake vote does not move, because its price is half the stake no matter how
        many honest stakers exist. The live MVP proves the mechanism with a deliberately small
        3-seat panel; larger pools and panels are funded-milestone scaling, not new research.
        Honesty check at this budget: a 1,000-draw simulation captured{' '}
        <b>{mc.toLocaleString('en-US')} / 1,000</b> panels (the model says {pctText(human.pFlip)}).
      </p>

      {/* ---- above the ceiling: parallel panels ---- */}
      <h3 style={{ marginTop: '1.6rem' }}>Above the ceiling: parallel panels</h3>
      <p className="sbx-prose">
        Past the 31-seat panel, the design sends a high-value case to several independent panels at
        once that must all agree. Capture odds do not add, they multiply: p becomes p
        <sup>N</sup>. This is sandbox/roadmap scaling; the live MVP is a single 3-seat panel. Pool{' '}
        {PARALLEL.POOL}, {PARALLEL.SEATS} seats, majority {PARALLEL.MAJ}.
      </p>
      <div className="sbx-controls">
        <Slider
          label="Share of the pool corrupted"
          value={sharePct}
          min={1}
          max={100}
          step={1}
          onChange={setSharePct}
          display={`${sharePct}% (${K_pp} of ${PARALLEL.POOL})`}
        />
        <div className="sbx-row">
          <label>Case value (parallel panels)</label>
          <Seg
            options={[
              { label: '1 panel', value: 1 },
              { label: '3 panels', value: 3 },
              { label: '5 panels', value: 5 },
            ]}
            value={parallelN}
            onChange={setParallelN}
            label="parallel panels"
          />
        </div>
      </div>
      <div className="sbx-readout">
        {ppRows.map((r) => (
          <div className="sbx-stat" key={r.panels}>
            <div className="k">
              {r.panels} panel{r.panels > 1 ? 's' : ''} must agree
            </div>
            <div className={`v ${r.panels === parallelN ? 'accent' : ''}`}>
              {r.oneIn === Infinity ? 'never' : `1 in ${Math.round(r.oneIn).toLocaleString('en-US')}`}
            </div>
          </div>
        ))}
      </div>
      <p className="sbx-note">
        One panel falls {pctText(ppOne)} of the time. Demanding all {parallelN} agree drops that to{' '}
        <b>{pctText(ppAll)}</b>. The same bloc that is a coin flip against one panel is a rounding
        error against five.
      </p>
    </Widget>
  );
}

// ---- the SVG curve ----------------------------------------------------------

function FlipChart({
  curve,
  budget,
}: {
  curve: ReturnType<typeof flipCurve>;
  budget: number;
}) {
  const W = 560;
  const H = 200;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const x = (b: number) => padL + (b / curve.maxBudget) * plotW;
  const y = (p: number) => padT + (1 - p) * plotH;

  const humanPath = curve.points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${x(pt.budget).toFixed(1)} ${y(pt.pHuman).toFixed(1)}`)
    .join(' ');

  // token step: 0 until costToFlip, then 1
  const tx = x(curve.tokenCostToFlip);
  const tokenPath = `M ${padL} ${y(0)} L ${tx.toFixed(1)} ${y(0)} L ${tx.toFixed(1)} ${y(1)} L ${(W - padR).toFixed(1)} ${y(1)}`;

  const bx = x(Math.min(budget, curve.maxBudget));

  return (
    <svg className="sbx-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="probability of flip versus budget">
      {/* gridlines */}
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line x1={padL} y1={y(p)} x2={W - padR} y2={y(p)} stroke="var(--line)" strokeWidth={1} />
          <text x={4} y={y(p) + 4} fontSize={10} fill="var(--faint)" fontFamily="var(--sans)">
            {p * 100}%
          </text>
        </g>
      ))}
      {/* x ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <text
          key={f}
          x={x(f * curve.maxBudget)}
          y={H - 8}
          fontSize={10}
          fill="var(--faint)"
          fontFamily="var(--sans)"
          textAnchor="middle"
        >
          {courtMoney(f * curve.maxBudget)}
        </text>
      ))}
      {/* budget marker */}
      <line x1={bx} y1={padT} x2={bx} y2={padT + plotH} stroke="var(--accent)" strokeWidth={2} strokeDasharray="3 3" />
      {/* token step */}
      <path d={tokenPath} fill="none" stroke="var(--bad)" strokeWidth={2.5} />
      {/* human curve */}
      <path d={humanPath} fill="none" stroke="var(--good)" strokeWidth={2.5} />
    </svg>
  );
}
