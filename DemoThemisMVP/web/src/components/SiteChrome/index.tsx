'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  { label: 'Glossary', href: '/glossary.html' },
] as const;

const MVP_ROUTES = [
  {
    label: 'Start',
    href: '/app',
    match: (path: string) => path === '/' || path.startsWith('/app'),
  },
  {
    label: 'Sandbox',
    href: '/sandbox',
    match: (path: string) => path.startsWith('/sandbox'),
  },
  {
    label: 'Court',
    href: '/home',
    match: (path: string) =>
      ['/home', '/case', '/onboard', '/juror-preview', '/register-onchain', '/verify-onchain'].some((route) =>
        path.startsWith(route),
      ),
  },
  {
    label: 'Case preview',
    href: '/dispute',
    match: (path: string) => path.startsWith('/dispute'),
  },
  {
    label: 'About',
    href: '/about',
    match: (path: string) => path.startsWith('/about'),
  },
] as const;

export function SiteChrome() {
  const pathname = usePathname() || '/app';
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
  }, [pathname]);

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
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'is-active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
