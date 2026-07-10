'use client';

import { Component, ReactNode, useEffect, useState } from 'react';

/** A pitch-site widget card: uppercase head, live dot, and a "simulated" tag. */
export function Widget({
  title,
  simulated = true,
  children,
}: {
  title: string;
  simulated?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="sbx-widget">
      <div className="sbx-widget-head">
        <span className="sbx-live" aria-hidden />
        {title}
        {simulated && (
          <span className="sbx-simtag" title="This widget is a simulation, not live data.">
            Simulated
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="sbx-row">
        <label>{label}</label>
        <b>{display}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="sbx-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Verdict({ level, children }: { level: 'good' | 'mid' | 'high'; children: ReactNode }) {
  const cls = level === 'good' ? 'sbx-v-good' : level === 'mid' ? 'sbx-v-mid' : 'sbx-v-high';
  return <span className={`sbx-verdict ${cls}`}>{children}</span>;
}

export function Stat({
  k,
  v,
  tone,
}: {
  k: string;
  v: ReactNode;
  tone?: 'accent' | 'good' | 'bad';
}) {
  return (
    <div className="sbx-stat">
      <div className="k">{k}</div>
      <div className={`v${tone ? ' ' + tone : ''}`}>{v}</div>
    </div>
  );
}

/** True only after the first client render. Gates PRNG-driven UI to avoid a
 *  hydration mismatch, and lets us show a skeleton on the very first paint. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number | string; width?: number | string }) {
  return <div className="sbx-skel" style={{ height, width }} aria-hidden />;
}

/** Widget-level error boundary: a broken widget shows an honest error state and
 *  never a blank or hung screen (the §6.5 "never look broken" rule). */
export class WidgetBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode; name: string }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="sbx-state error" role="alert">
          The {this.props.name} could not render. Re-roll the seed or reload the page to retry.
        </div>
      );
    }
    return this.props.children;
  }
}
