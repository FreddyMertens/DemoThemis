import type { Metadata } from 'next';
import './sandbox.css';

export const metadata: Metadata = {
  title: 'DemoThemis sandbox: buy this verdict',
  description:
    'A client-side simulation comparing a token-weighted oracle with a court that draws one seat per verified human. Illustrative model using the published design parameters.',
};

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sbx">
      <div className="sbx-badge" role="note">
        <span className="sbx-badge-dot" aria-hidden />
        <span>
          <b>Simulation.</b> Illustrative model on the design&apos;s published parameters. The on-chain demo is
          available in the <a href="/home">live court</a>.
        </span>
      </div>
      <main className="sbx-wrap" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
