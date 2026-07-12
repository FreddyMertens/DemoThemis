import type { Metadata } from 'next';
import './sandbox.css';

export const metadata: Metadata = {
  title: 'DemoThemis sandbox: stress-test the verdict',
  description:
    'A client-side simulation comparing a token-weighted oracle with a court that draws one seat per verified human. Illustrative model using the published design parameters.',
};

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sbx">
      <div className="sbx-badge" role="note">
        <span className="sbx-badge-dot" aria-hidden />
        <span>
          <b>Practice</b> · no wallet · no real money
        </span>
      </div>
      <main className="sbx-wrap" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
