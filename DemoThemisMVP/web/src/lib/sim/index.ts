// Sandbox simulation engine — pure TypeScript, no chain.
//
// The flagship comparative attack demo and the core court walkthrough rest on this
// engine. Math in court-math.ts is ported verbatim from the pitch site so the
// numbers match; the token-court model in attack.ts is the one piece authored
// fresh. Everything here is a SIMULATION and is labeled as such in the UI.

export * from './prng';
export * from './court-math';
export * from './attack';
export * from './court-sim';
export * from './funnel';
export * from './ladder';
export * from './reputation';
export * from './cases';
