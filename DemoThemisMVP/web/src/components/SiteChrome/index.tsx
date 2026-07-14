'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const CHAPTERS = [
  { label: 'Proposal home', href: '/' },
  { number: '01', label: 'DemoThemis', href: '/demothemis.html' },
  { number: '02', label: 'Break the court', href: '/game-theory.html' },
  { number: '03', label: 'PredictionMoMo', href: '/prediction-market.html' },
  { number: '04', label: 'Run-through', href: '/the-design.html' },
  {
    number: '05',
    label: 'Bootstrap loop',
    href: '/hybrid-juror-prediction-market-integration.html',
  },
  { number: '06', label: 'Governance', href: '/governance.html' },
] as const;

const MVP_ROUTES = [
  {
    label: 'Live case',
    shortLabel: 'Live case',
    href: '/app#oracle-live-panel',
    match: (path: string, tab: string | null) =>
      tab !== 'submit' && (path === '/' || path.startsWith('/app') || path.startsWith('/home') || path.startsWith('/case')),
  },
  {
    label: 'Submit a case',
    shortLabel: 'Submit',
    href: '/app?tab=submit#oracle-submit-panel',
    match: (path: string, tab: string | null) => path.startsWith('/app') && tab === 'submit',
  },
  {
    label: 'Join as juror',
    shortLabel: 'Join jury',
    href: '/onboard',
    match: (path: string) => path.startsWith('/onboard'),
  },
] as const;

export function SiteChrome() {
  const pathname = usePathname() || '/app';
  const productTab = useSearchParams().get('tab');
  const [open, setOpen] = useState(false);
  const primaryRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const contextNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpen(false);
    const frame = window.requestAnimationFrame(() => {
      const nav = contextNavRef.current;
      const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
      const navRect = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      nav.scrollTo({
        left: nav.scrollLeft + activeRect.left - navRect.left - (navRect.width - activeRect.width) / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, productTab]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (open && primaryRef.current && !primaryRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <header className="site-chrome">
      <div className="site-primary" ref={primaryRef}>
        {/* This must reload the document: Netlify serves the static proposal at `/`,
            while Next's own root is published at `/app` in the unified deployment. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="site-brand" href="/" aria-label="DemoThemis proposal home">
          DemoThemis<span>.</span>
        </a>
        <button
          ref={menuButtonRef}
          className="site-menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="site-chapters"
          onClick={() => setOpen((value) => !value)}
        >
          <span>Proposal</span>
          <i aria-hidden="true">
            <b />
            <b />
            <b />
          </i>
        </button>
        <nav className={`site-chapters${open ? ' is-open' : ''}`} id="site-chapters" aria-label="Proposal chapters">
          {CHAPTERS.map((item) => (
            <a key={item.href} href={item.href}>
              {'number' in item && <span>{item.number}</span>}
              {item.label}
            </a>
          ))}
          <Link className="is-active" href="/app" aria-current="page">
            Live Demo MVP
          </Link>
        </nav>
      </div>

      <nav ref={contextNavRef} className="mvp-context-nav" aria-label="MVP sections">
        <span className="mvp-context-label">MVP</span>
        <div className="mvp-context-links">
          {MVP_ROUTES.map((item) => {
            const active = item.match(pathname, productTab);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'is-active' : undefined}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className="mvp-route-long" aria-hidden="true">{item.label}</span>
                <span className="mvp-route-short" aria-hidden="true">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
