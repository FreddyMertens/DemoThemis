import type { Metadata } from 'next';
import { Inter, Newsreader, JetBrains_Mono } from 'next/font/google';
import './sandbox.css';

// The pitch-site type stack, wired to the variables sandbox.css expects.
const sans = Inter({ subsets: ['latin'], variable: '--font-sbx-sans', display: 'swap' });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-sbx-serif', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-sbx-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'DemoThemis sandbox: buy this verdict',
  description:
    'A client-side simulation of the DemoThemis arbitration court. Watch a token-weighted oracle get bought and a one-human-one-vote court hold. Illustrative model on the published parameters.',
};

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`sbx ${sans.variable} ${serif.variable} ${mono.variable}`}>
      <div className="sbx-badge" role="note">
        <span className="sbx-badge-dot" aria-hidden />
        <span>
          <b>Simulation.</b> Illustrative model on the design&apos;s published parameters. The
          on-chain demo lives at <a href="/home">/home</a>.
        </span>
      </div>
      <div className="sbx-wrap">{children}</div>
    </div>
  );
}
