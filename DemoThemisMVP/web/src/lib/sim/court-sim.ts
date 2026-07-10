// The core court simulation — the honest machine the attack demo rests on.
//
// This mirrors the DEPLOYED DisputeCourt economics exactly so the sandbox and the
// on-chain demo tell one story: a panel is drawn, jurors commit then reveal, the
// majority wins, and the case fee splits 70/20/10 (jurors / reward pool / protocol)
// in integer micro-USD with the rounding dust and every slash routed to the reward
// pool — the same conservation the on-chain invariant enforces. Everything here is
// SIMULATED (seeded juror population, hidden accuracies); it is labeled as such in
// the UI. See contracts/src/DisputeCourt.sol and docs/MECHANISM_DELTA.md.

import type { Rng } from './prng';
import { sampleIndices } from './prng';

// All money is integer micro-USD (6 decimals), matching MockUSD and the contract,
// so the split and dust routing reproduce the on-chain numbers to the unit.
export const MUSD = 1_000_000;
export const BOND = 5 * MUSD; // $5 juror bond
export const CASE_FEE = 2 * MUSD; // $2 question-case fee
export const BPS_REWARD = 2000; // 20% reward cut
export const BPS_PROTOCOL = 1000; // 10% protocol cut

export interface Juror {
  id: number;
  /** Hidden per-juror probability of voting with the truth. Never shown as a number. */
  accuracy: number;
  /** Bond at stake, micro-USD. Zero => deactivated until re-bonded. */
  bond: number;
  active: boolean;
  /** Lifetime tallies, for the reputation layer (sandbox-only). */
  cases: number;
  coherent: number;
}

export interface PayoutBreakdown {
  feePool: number;
  /** Equal share paid to each coherent revealer (floor division). */
  perWinnerShare: number;
  winners: number[];
  toJurorsTotal: number;
  /** 20% cut + dust + (the whole juror pot if there was no coherent juror). */
  toReward: number;
  toProtocol: number;
  /** No-show bonds forfeited to the reward pool this case. */
  slashesToReward: number;
  /** Rounding remainder routed to the reward pool. */
  dust: number;
}

export interface CaseOutcome {
  caseId: number;
  panel: number[];
  truth: boolean;
  votes: { juror: number; vote: boolean; revealed: boolean }[];
  noShows: number[];
  yes: number;
  no: number;
  quorum: number;
  quorumMet: boolean;
  redrew: boolean;
  /** true = YES / payee wins; tie or second-miss => false (status quo). */
  outcome: boolean;
  /** Did the majority match the ground truth? (honesty metric, not on-chain.) */
  correct: boolean;
  payout: PayoutBreakdown;
}

export interface CaseOptions {
  panelSize: number;
  /** Probability a drawn juror actually reveals (else a slashed no-show). */
  revealRate?: number;
  /** Force the ground truth, else random. */
  truth?: boolean;
}

/**
 * A seeded population of jurors plus a running reward-pool balance. Runs whole
 * cases through the deployed lifecycle and accrues the reward pool so the demo can
 * show it growing (slashes + the 20% cut + dust), exactly as the on-chain sink does.
 */
export class CourtSim {
  readonly jurors: Juror[];
  rewardPool = 0;
  protocol = 0;
  private rng: Rng;
  private nextCase = 0;

  constructor(rng: Rng, population: number) {
    this.rng = rng;
    this.jurors = Array.from({ length: population }, (_, id) => ({
      id,
      accuracy: this.drawAccuracy(),
      bond: BOND,
      active: true,
      cases: 0,
      coherent: 0,
    }));
  }

  /** Hidden accuracy: most jurors are reliable (0.75-0.97), a tail are weak. */
  private drawAccuracy(): number {
    const r = this.rng();
    if (r < 0.12) return 0.5 + this.rng() * 0.2; // weak tail: 0.50-0.70
    return 0.75 + this.rng() * 0.22; // reliable: 0.75-0.97
  }

  activeIds(): number[] {
    return this.jurors.filter((j) => j.active && j.bond > 0).map((j) => j.id);
  }

  /** Whether enough jurors are still bonded to seat a panel of `panelSize`. Once
   *  too many no-shows are slashed (and never re-bonded, mirroring the contract),
   *  the pool can no longer seat a panel and the court is honestly out of jurors. */
  canSeatPanel(panelSize: number): boolean {
    return this.activeIds().length >= panelSize;
  }

  /** Run one full case: draw -> commit/reveal -> tally -> 70/20/10 payout. */
  runCase(opts: CaseOptions): CaseOutcome {
    const caseId = this.nextCase++;
    const revealRate = opts.revealRate ?? 0.92;
    const truth = opts.truth ?? this.rng() < 0.5;
    const quorum = Math.floor(opts.panelSize / 2) + 1;

    const draw = (): number[] => {
      const pool = this.activeIds();
      const picks = sampleIndices(this.rng, pool.length, opts.panelSize);
      return picks.map((i) => pool[i]);
    };

    let panel = draw();
    let redrew = false;

    // First panel; on a quorum miss we redraw once (mirrors the contract).
    let tally = this.tallyPanel(panel, truth, revealRate);
    if (tally.revealed < quorum) {
      this.slashNoShows(tally.noShows);
      redrew = true;
      panel = draw();
      tally = this.tallyPanel(panel, truth, revealRate);
    }

    this.slashNoShows(tally.noShows);

    const quorumMet = tally.revealed >= quorum;
    // majority of revealed votes; tie or sub-quorum => status quo (false)
    const outcome = quorumMet && tally.yes > tally.no;
    const payout = this.distributeFee(panel, tally, outcome);

    // bookkeeping for the reputation layer (sandbox-only)
    for (const v of tally.votes) {
      if (!v.revealed) continue;
      const j = this.jurors[v.juror];
      j.cases++;
      if (v.vote === outcome) j.coherent++;
    }

    return {
      caseId,
      panel,
      truth,
      votes: tally.votes,
      noShows: tally.noShows,
      yes: tally.yes,
      no: tally.no,
      quorum,
      quorumMet,
      redrew,
      outcome,
      correct: outcome === truth,
      payout,
    };
  }

  private tallyPanel(panel: number[], truth: boolean, revealRate: number) {
    const votes: { juror: number; vote: boolean; revealed: boolean }[] = [];
    const noShows: number[] = [];
    let yes = 0;
    let no = 0;
    for (const id of panel) {
      const j = this.jurors[id];
      const revealed = this.rng() < revealRate;
      if (!revealed) {
        noShows.push(id);
        votes.push({ juror: id, vote: false, revealed: false });
        continue;
      }
      // Vote with the truth with probability = hidden accuracy.
      const correct = this.rng() < j.accuracy;
      const vote = correct ? truth : !truth;
      votes.push({ juror: id, vote, revealed: true });
      if (vote) yes++;
      else no++;
    }
    return { votes, noShows, yes, no, revealed: yes + no };
  }

  /** No-show bond -> reward pool, juror deactivated (mirrors registry.slash). */
  private slashNoShows(noShows: number[]): void {
    for (const id of noShows) {
      const j = this.jurors[id];
      if (j.bond > 0) {
        this.rewardPool += j.bond;
        j.bond = 0;
        j.active = false;
      }
    }
  }

  /**
   * Split the fee 70/20/10 in integer micro-USD. Coherent revealers split the 70%
   * equally; the floor-division remainder (dust), the 20% cut, and the whole juror
   * pot when there is no coherent juror all back the reward pool. Conserves exactly.
   */
  private distributeFee(
    panel: number[],
    tally: ReturnType<CourtSim['tallyPanel']>,
    outcome: boolean,
  ): PayoutBreakdown {
    const feePool = CASE_FEE;
    let toReward = Math.floor((feePool * BPS_REWARD) / 10_000);
    const toProtocol = Math.floor((feePool * BPS_PROTOCOL) / 10_000);
    const jurorPot = feePool - toReward - toProtocol;

    const winners = tally.votes
      .filter((v) => v.revealed && v.vote === outcome)
      .map((v) => v.juror);

    let perWinnerShare = 0;
    let paidToJurors = 0;
    if (winners.length > 0) {
      perWinnerShare = Math.floor(jurorPot / winners.length);
      paidToJurors = perWinnerShare * winners.length;
    }
    const dust = jurorPot - paidToJurors; // dust, or the whole pot if no winner
    toReward += dust;

    this.rewardPool += toReward;
    this.protocol += toProtocol;

    return {
      feePool,
      perWinnerShare,
      winners,
      toJurorsTotal: paidToJurors,
      toReward,
      toProtocol,
      slashesToReward: 0, // slashes are accrued in slashNoShows; surfaced separately
      dust,
    };
  }
}

/** Run `count` cases and summarize, for the "run 100 cases" sweep (Nice tier). */
export interface SweepSummary {
  /** Cases actually run (may be fewer than requested if the pool ran out). */
  cases: number;
  requested: number;
  correct: number;
  accuracy: number;
  redraws: number;
  rewardPool: number;
  protocol: number;
  /** True if the sweep stopped early because the pool could no longer seat a panel. */
  stoppedEarly: boolean;
}

export function runSweep(sim: CourtSim, count: number, opts: CaseOptions): SweepSummary {
  let correct = 0;
  let redraws = 0;
  let ran = 0;
  for (let i = 0; i < count; i++) {
    // Never fabricate a verdict over an empty panel: stop when the pool is exhausted.
    if (!sim.canSeatPanel(opts.panelSize)) break;
    const r = sim.runCase(opts);
    ran++;
    if (r.correct) correct++;
    if (r.redrew) redraws++;
  }
  return {
    cases: ran,
    requested: count,
    correct,
    accuracy: ran > 0 ? correct / ran : 0,
    redraws,
    rewardPool: sim.rewardPool,
    protocol: sim.protocol,
    stoppedEarly: ran < count,
  };
}
