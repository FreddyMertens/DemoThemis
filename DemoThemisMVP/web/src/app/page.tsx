import Link from 'next/link';
import { COHORT, LIVE } from '@/lib/contracts';

const explorerAddress = (base: string, address: string) => `${base}/address/${address}`;
const explorerTransaction = (hash: string) => `${LIVE.chain.explorer}/tx/${hash}`;

const appId = process.env.NEXT_PUBLIC_APP_ID ?? '';
const worldAppLink = appId
  ? `https://worldcoin.org/mini-app?app_id=${appId}&path=/onboard`
  : 'https://worldcoin.org/mini-app';

const truthItems = [
  {
    label: 'Live',
    detail: 'Core contracts and the World ID verifier path.',
    tone: 'live',
  },
  {
    label: 'Simulated',
    detail: 'The full browser journey and roadmap features.',
    tone: 'simulated',
  },
  {
    label: 'Pending',
    detail: 'The final three-person mainnet test.',
    tone: 'pending',
  },
] as const;

const mechanismSteps = [
  ['One human, one seat', 'World ID stops another wallet adding another seat.'],
  ['Panel drawn after opening', 'The case exists before its jurors are selected.'],
  ['Votes sealed until reveal', 'Early votes cannot steer the rest of the panel.'],
  ['Ruling settles funds', 'The verdict moves escrow and fees together.'],
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
    <main className="app-overview" id="main-content" tabIndex={-1}>
      <section className="app-hero" aria-labelledby="app-hero-title">
        <div>
          <p className="app-kicker">Live Demo MVP · World Chain</p>
          <h1 id="app-hero-title">A court of verified humans.</h1>
          <p className="app-hero-dek">
            Verified humans are drawn after a case opens, cast votes sealed until reveal, and settle escrow—so wealth
            cannot buy extra jury power.
          </p>
          <p className="app-hero-note">
            The core contracts are live. The wallet-free sandbox demonstrates the wider flow; the final three-person
            test is still pending.
          </p>
          <div className="app-actions" aria-label="MVP actions">
            <Link className="app-button is-primary" href="/sandbox">
              Try without a wallet <span aria-hidden="true">→</span>
            </Link>
            <Link className="app-button" href="/home">
              View live court status
            </Link>
            <a className="app-button is-quiet" href={worldAppLink} target="_blank" rel="noreferrer">
              Open in World App <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <aside className="app-mechanism-card" aria-label="How a case moves through DemoThemis">
          <div className="app-mechanism-top">
            <span>One case · four steps</span>
            <span className="app-mechanism-live">Contracts live</span>
          </div>
          <div className="app-mechanism-flow">
            {mechanismSteps.map(([title, body], index) => (
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
            <span>A new panel is drawn for each case.</span>
            <strong>Settled</strong>
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

      <section className="app-section app-compare-section" aria-labelledby="switch-title">
        <div className="app-section-heading">
          <div>
            <p className="app-section-kicker">The difference</p>
            <h2 id="switch-title">Change what money can buy.</h2>
          </div>
          <p>World ID makes a human—not a wallet or token balance—the unit of jury power.</p>
        </div>

        <div className="app-concept-grid">
          <article className="app-concept-card">
            <span className="app-card-number">TOKEN COURT</span>
            <h3>Buy influence once.</h3>
            <p>Keep reusing the same purchased voting weight across disputes.</p>
          </article>
          <article className="app-concept-card is-inversion">
            <span className="app-card-number">DEMOTHEMIS</span>
            <h3>Draw people each time.</h3>
            <p>One verified person per seat, with a new panel after each case opens.</p>
          </article>
        </div>

        <details className="app-enforcement">
          <summary>How one human stays one seat</summary>
          <p>
            Registration spends an identity-derived nullifier on-chain. The same person cannot return through another
            wallet; a forged World ID proof fails inside the production verifier.
          </p>
          <a href="/demothemis.html">Read the full security design →</a>
        </details>
      </section>

      <section className="app-section" aria-labelledby="proof-title">
        <div className="app-proof-head">
          <div>
            <p className="app-section-kicker">Evidence, grouped by claim</p>
            <h2 id="proof-title">Verify it yourself.</h2>
          </div>
          <Link className="app-text-link" href="/about">
            What is real in this build? →
          </Link>
        </div>
        <div className="app-evidence-groups">
          {evidenceGroups.map((group) => (
            <EvidenceGroup group={group} key={group.title} />
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="next-title">
        <div className="app-proof-head">
          <div>
            <p className="app-section-kicker">Choose one next step</p>
            <h2 id="next-title">Read, try, or inspect.</h2>
          </div>
        </div>
        <div className="app-next-grid">
          <a className="app-next-card" href="/demothemis.html">
            <span>Read · chapter 01</span>
            <strong>Understand the design</strong>
            <small>The plain-language explanation of the court and the problem it solves.</small>
          </a>
          <Link className="app-next-card" href="/sandbox">
            <span>Try · no wallet</span>
            <strong>Attempt to buy a verdict</strong>
            <small>Change the attacker’s budget and compare both courts.</small>
          </Link>
          <Link className="app-next-card" href="/home">
            <span>Inspect · on-chain</span>
            <strong>View live court status</strong>
            <small>Read public court data and continue through World App.</small>
          </Link>
        </div>
      </section>

      <footer className="app-overview-footer">All MUSD shown here is a valueless demo token. No real money is used.</footer>
    </main>
  );
}
