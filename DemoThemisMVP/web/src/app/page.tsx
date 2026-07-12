import Link from 'next/link';

const appId = process.env.NEXT_PUBLIC_APP_ID ?? '';
const worldAppLink = appId
  ? `https://worldcoin.org/mini-app?app_id=${appId}&path=/onboard`
  : 'https://worldcoin.org/mini-app';

const missionSteps = [
  ['Test fresh panels', 'A captured panel does not automatically control the next case.'],
  ['Cast a sealed vote', 'One verified human, one vote bound until reveal.'],
  ['Audit the ruling', 'Follow the case from panel draw to payout.'],
] as const;

export default function Home() {
  return (
    <main className="app-overview app-play-home" id="main-content" tabIndex={-1}>
      <section className="app-hero" aria-labelledby="app-hero-title">
        <div>
          <p className="app-kicker">Interactive robustness demo · no wallet</p>
          <h1 id="app-hero-title">See why this verdict is hard to buy.</h1>
          <p className="app-hero-dek">
            Stress-test a fresh human jury, cast a sealed vote, then audit the ruling.
          </p>
          <p className="app-hero-note">
            Nothing here uses real money. The guided path is local, safe, and resets whenever you want.
          </p>
          <div className="app-actions" aria-label="MVP actions">
            <Link className="app-button is-primary" href="/sandbox">
              Test the three defenses <span aria-hidden="true">→</span>
            </Link>
            <Link className="app-button" href="/home">
              Open the court
            </Link>
            <a className="app-button is-quiet" href={worldAppLink} target="_blank" rel="noreferrer">
              Open in World App <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <aside className="app-mechanism-card app-quest-card" aria-label="Your guided demo missions">
          <div className="app-mechanism-top">
            <span>Three defenses · three missions</span>
            <span className="app-mechanism-live">Ready</span>
          </div>
          <div className="app-mechanism-flow">
            {missionSteps.map(([title, body], index) => (
              <div className="app-mechanism-step" key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{title}</strong>
                  <small>{body}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="app-mechanism-result">
            <span>One clear action at a time.</span>
            <strong>~3 min</strong>
          </div>
        </aside>
      </section>

      <section className="app-home-drawers" aria-label="Optional explanation">
        <details className="app-home-drawer">
          <summary>
            <span>
              <strong>What makes this court robust?</strong>
              <small>The short explanation</small>
            </span>
          </summary>
          <div className="app-home-drawer-body">
            <div className="app-concept-grid">
              <article className="app-concept-card">
                <span className="app-card-number">TOKEN COURT</span>
                <h3>Buy influence once.</h3>
                <p>Purchased voting weight can be reused across disputes.</p>
              </article>
              <article className="app-concept-card is-inversion">
                <span className="app-card-number">DEMOTHEMIS</span>
                <h3>Draw people each time.</h3>
                <p>One verified person per seat, with a fresh panel for every case.</p>
              </article>
            </div>
            <div className="app-drawer-links">
              <a href="/demothemis.html">Read the full security design →</a>
              <Link href="/dispute">See the supported case types →</Link>
            </div>
          </div>
        </details>
      </section>

      <footer className="app-overview-footer">MUSD is a valueless demo token. No real money is used.</footer>
    </main>
  );
}
