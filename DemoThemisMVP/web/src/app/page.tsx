import Link from 'next/link';
import { COHORT, LIVE } from '@/lib/contracts';

const explorerAddress = (base: string, address: string) => `${base}/address/${address}`;
const explorerTransaction = (hash: string) => `${LIVE.chain.explorer}/tx/${hash}`;

const appId = process.env.NEXT_PUBLIC_APP_ID ?? '';
const worldAppLink = appId
  ? `https://worldcoin.org/mini-app?app_id=${appId}&path=/onboard`
  : 'https://worldcoin.org/mini-app';

const truthItems = [
  { label: 'Live', detail: 'Core contracts and World ID verifier.', tone: 'live' },
  { label: 'Simulated', detail: 'The guided browser journey.', tone: 'simulated' },
  { label: 'Pending', detail: 'The final three-person test.', tone: 'pending' },
] as const;

const missionSteps = [
  ['Set the attack', 'Give the verdict buyer a budget.'],
  ['Take a juror seat', 'Choose, seal, and reveal one vote.'],
  ['Check court evidence', 'See what is deployed and what is pending.'],
] as const;

const evidence = [
  {
    label: 'Production verifier',
    status: 'deployed',
    detail: 'WorldIDGate points to the World ID 4.0 Production verifier on World Chain mainnet.',
    href: explorerAddress(LIVE.chain.explorer, LIVE.WorldIDGate),
  },
  {
    label: 'Valid World ID proof',
    status: 'passed',
    detail: 'A v4 proof passed WorldIDVerifier.verify inside a real registration transaction.',
    href: explorerTransaction('0xe1ad43e86e500b3475da73de10829412126ec7a885654fb1003dfcca9b984c70'),
  },
  {
    label: 'Forged proof',
    status: 'reverted',
    detail: 'A corrupted Groth16 limb reverted inside the verifier on-chain.',
    href: explorerTransaction('0xd955739e1f78ec9c46c83343ff87998c0ca6f3089ac9eecf9567158afe0becf5'),
  },
  {
    label: 'Same person, second wallet',
    status: 'reverted',
    detail: 'The same identity using a second wallet hit NullifierAlreadyUsed.',
    href: explorerTransaction('0x9f9946f658d16f431922f58f052e1aaab095828d14aed57a2709c5e88b24187d'),
  },
  {
    label: 'Scale cohort',
    status: 'simulated',
    detail: 'A labeled Sepolia cohort demonstrates multi-case history without claiming real users.',
    href: explorerAddress(COHORT.chain.explorer, COHORT.DisputeCourt),
  },
  {
    label: 'Three-person test',
    status: 'pending',
    detail: 'The contracts are live; three independent humans must still complete the final trace.',
    href: explorerAddress(LIVE.chain.explorer, LIVE.JurorRegistry),
  },
] as const;

const evidenceGroups = [
  {
    number: '01',
    title: 'World ID works',
    summary: 'Production verifier deployed; a valid registration passed.',
    items: [evidence[0], evidence[1]],
  },
  {
    number: '02',
    title: 'Attacks fail',
    summary: 'A forged proof and the same person’s second wallet were rejected.',
    items: [evidence[2], evidence[3]],
  },
  {
    number: '03',
    title: 'Scope stays honest',
    summary: 'The scale cohort is simulated; the final human test is pending.',
    items: [evidence[4], evidence[5]],
  },
] as const;

function statusTone(status: string) {
  if (status === 'reverted') return 'is-reverted';
  if (status === 'simulated') return 'is-simulated';
  if (status === 'pending') return 'is-pending';
  return '';
}

function EvidenceGroup({ group }: { group: (typeof evidenceGroups)[number] }) {
  return (
    <article className="app-evidence-group">
      <span className="app-evidence-icon">{group.number}</span>
      <h3>{group.title}</h3>
      <p>{group.summary}</p>
      <div className="app-evidence-links">
        {group.items.map((item) => (
          <a href={item.href} target="_blank" rel="noreferrer" key={item.label}>
            <span>{item.label}</span>
            <span className={`app-status ${statusTone(item.status)}`}>{item.status} ↗</span>
          </a>
        ))}
      </div>
      <details className="app-technical-disclosure">
        <summary>Technical evidence</summary>
        <ul>
          {group.items.map((item) => (
            <li key={item.label}>
              <strong>{item.label}:</strong> {item.detail}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export default function Home() {
  return (
    <main className="app-overview app-play-home" id="main-content" tabIndex={-1}>
      <section className="app-hero" aria-labelledby="app-hero-title">
        <div>
          <p className="app-kicker">3-minute guided demo · no wallet</p>
          <h1 id="app-hero-title">Can money buy this verdict?</h1>
          <p className="app-hero-dek">
            Play the attacker, serve as a juror, then compare the simulation with the live court.
          </p>
          <p className="app-hero-note">
            Nothing here uses real money. The guided path is local, safe, and resets whenever you want.
          </p>
          <div className="app-actions" aria-label="MVP actions">
            <Link className="app-button is-primary" href="/sandbox">
              Start mission 1 <span aria-hidden="true">→</span>
            </Link>
            <Link className="app-button" href="/home">
              Skip to court evidence
            </Link>
          </div>
        </div>

        <aside className="app-mechanism-card app-quest-card" aria-label="Your guided demo missions">
          <div className="app-mechanism-top">
            <span>Your quest · three missions</span>
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

      <section className="app-truth-strip" aria-label="MVP status summary">
        {truthItems.map((item) => (
          <div className="app-truth-item" key={item.label}>
            <span className={`app-truth-signal${item.tone === 'live' ? '' : ` is-${item.tone}`}`} aria-hidden="true" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          </div>
        ))}
      </section>

      <section className="app-home-drawers" aria-label="Optional background and proof">
        <details className="app-home-drawer">
          <summary>
            <span>
              <strong>Why is this court harder to buy?</strong>
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

        <details className="app-home-drawer">
          <summary>
            <span>
              <strong>What is actually live?</strong>
              <small>Six public proof links</small>
            </span>
          </summary>
          <div className="app-home-drawer-body">
            <div className="app-evidence-groups">
              {evidenceGroups.map((group) => (
                <EvidenceGroup group={group} key={group.title} />
              ))}
            </div>
            <div className="app-drawer-links">
              <Link href="/about">Open the full build status →</Link>
              <a href={worldAppLink} target="_blank" rel="noreferrer">
                Open in World App ↗
              </a>
            </div>
          </div>
        </details>
      </section>

      <footer className="app-overview-footer">MUSD is a valueless demo token. No real money is used.</footer>
    </main>
  );
}
