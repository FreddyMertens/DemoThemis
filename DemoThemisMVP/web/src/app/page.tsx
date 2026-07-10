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
    label: 'On-chain slice',
    detail: 'Contracts and World ID verifier wiring are live.',
    tone: 'live',
  },
  {
    label: 'Browser simulation',
    detail: 'The complete journey is seeded, safe, and replayable.',
    tone: 'simulated',
  },
  {
    label: 'Human capstone',
    detail: 'The final three-human mainnet trace is still pending.',
    tone: 'pending',
  },
] as const;

const mechanismSteps = [
  ['World ID proves one human', 'A spent nullifier blocks a second wallet.'],
  ['A small panel is drawn', 'Jurors are chosen after the case exists.'],
  ['Votes stay sealed', 'Commit first; reveal only after voting closes.'],
  ['The ruling settles escrow', 'Verdict, payout, and fees move together.'],
] as const;

const personhoodSteps = [
  {
    title: 'Prove personhood',
    body: 'WorldIDVerifier.verify runs on World Chain mainnet during juror registration.',
  },
  {
    title: 'Spend one nullifier',
    body: 'The identity-derived nullifier means a new wallet does not create another seat.',
  },
  {
    title: 'Cast a private ballot',
    body: 'Jurors commit a sealed vote before anyone can reveal and influence the panel.',
  },
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
    label: 'Duplicate human',
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
    label: 'Three-human capstone',
    status: 'pending',
    detail: 'The contracts are ready; three independent humans must still complete the final trace.',
    href: explorerAddress(LIVE.chain.explorer, LIVE.JurorRegistry),
  },
] as const;

function EvidenceCard({ item, index }: { item: (typeof evidence)[number]; index: number }) {
  const tone =
    item.status === 'reverted'
      ? 'is-reverted'
      : item.status === 'simulated'
        ? 'is-simulated'
        : item.status === 'pending'
          ? 'is-pending'
          : '';

  return (
    <a className="app-evidence-card" href={item.href} target="_blank" rel="noreferrer">
      <span className="app-evidence-top">
        <span className="app-evidence-icon">{String(index + 1).padStart(2, '0')}</span>
        <span className={`app-status ${tone}`}>{item.status}</span>
      </span>
      <h3>{item.label}</h3>
      <p>{item.detail}</p>
      <span className="app-evidence-open">Inspect on explorer ↗</span>
    </a>
  );
}

export default function Home() {
  return (
    <main className="app-overview" id="main-content" tabIndex={-1}>
      <section className="app-hero" aria-labelledby="app-hero-title">
        <div>
          <p className="app-kicker">Live MVP · World Chain</p>
          <h1 id="app-hero-title">A court of verified humans.</h1>
          <p className="app-hero-dek">
            One human, one juror seat. A random panel. Sealed votes. One ruling that settles the money—without letting
            the richest wallet buy the court.
          </p>
          <p className="app-hero-note">
            This MVP proves the core on-chain path with a deliberately small three-seat panel. The sandbox lets you
            safely try the wider product design without a wallet.
          </p>
          <div className="app-actions" aria-label="MVP actions">
            <Link className="app-button is-primary" href="/sandbox">
              Try the attack sandbox <span aria-hidden="true">→</span>
            </Link>
            <Link className="app-button" href="/home">
              Inspect the court
            </Link>
            <a className="app-button is-quiet" href={worldAppLink} target="_blank" rel="noreferrer">
              Open in World App <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <aside className="app-mechanism-card" aria-label="How a case moves through DemoThemis">
          <div className="app-mechanism-top">
            <span>One case · four locks</span>
            <span className="app-mechanism-live">Mainnet ready</span>
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
            <span>Capture does not carry from case to case.</span>
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

      <section className="app-section" aria-labelledby="switch-title">
        <div className="app-section-heading">
          <div>
            <p className="app-section-kicker">The switch</p>
            <h2 id="switch-title">Replace purchased influence with drawn humans.</h2>
          </div>
          <p>
            Token-weighted courts let wealth become reusable control. DemoThemis makes a verified human—not a token
            balance—the scarce unit, then draws a fresh panel only after the question is fixed.
          </p>
        </div>

        <div className="app-concept-grid">
          <article className="app-concept-card">
            <span className="app-card-number">01 · TODAY</span>
            <h3>The problem</h3>
            <p>
              Buy enough voting weight once, then reuse that influence across disputes. The panel is predictable,
              targetable, and richest-first.
            </p>
          </article>
          <article className="app-concept-card is-inversion">
            <span className="app-card-number">02 · DEMOTHEMIS</span>
            <h3>The inversion</h3>
            <p>
              Verify one person per seat and draw the panel late. A briber cannot know the jury in advance or bring a
              captured stake position into the next case.
            </p>
          </article>
        </div>

        <div className="app-scope-grid">
          <article className="app-scope-card">
            <strong>Real today</strong>
            <p>
              Verified mainnet contracts, World ID 4.0 wiring, nullifier-reuse rejection, commit/reveal, fee routing,
              and escrow settlement.
            </p>
          </article>
          <article className="app-scope-card">
            <strong>What the grant hardens</strong>
            <p>
              Production randomness, receipt-free ballots, appeals, reputation, independent review, juror UX, and a
              reusable resolution SDK.
            </p>
          </article>
        </div>
      </section>

      <section className="app-section" aria-labelledby="personhood-title">
        <div className="app-personhood">
          <div className="app-personhood-head">
            <div>
              <p className="app-section-kicker">Why World ID matters</p>
              <h2 id="personhood-title">One human stays one juror.</h2>
            </div>
            <p>
              DemoThemis turns personhood from an account check into the court’s scarce resource: a seat. Ten thousand
              wallets still represent one human—and still get one chance to be drawn.
            </p>
          </div>
          <div className="app-personhood-steps">
            {personhoodSteps.map((step, index) => (
              <article className="app-personhood-step" key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="app-section" aria-labelledby="proof-title">
        <div className="app-proof-head">
          <div>
            <p className="app-section-kicker">Evidence, not theatre</p>
            <h2 id="proof-title">Verify the claims yourself.</h2>
          </div>
          <Link className="app-text-link" href="/about">
            Read scope notes →
          </Link>
        </div>
        <div className="app-evidence-grid">
          {evidence.map((item, index) => (
            <EvidenceCard item={item} index={index} key={item.label} />
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="resolver-title">
        <div className="app-resolver">
          <div>
            <p className="app-section-kicker">A neutral resolver</p>
            <h2 id="resolver-title">A court, not a market.</h2>
          </div>
          <p>
            DemoThemis takes no bet, sets no odds, and holds no stake. Escrow disputes, marketplace conflicts, and
            objective yes/no outcomes can all use the same personhood-gated court and resolution SDK. A pilot is a
            customer of the court—not the grant-funded product itself.
          </p>
        </div>
      </section>

      <section className="app-section" aria-labelledby="next-title">
        <div className="app-proof-head">
          <div>
            <p className="app-section-kicker">Keep exploring</p>
            <h2 id="next-title">Choose your depth.</h2>
          </div>
        </div>
        <div className="app-next-grid">
          <a className="app-next-card" href="/demothemis.html">
            <span>Read · chapter 01</span>
            <strong>Understand the design</strong>
            <small>The clearest explanation of the court and the problem it solves.</small>
          </a>
          <Link className="app-next-card" href="/sandbox">
            <span>Play · no wallet</span>
            <strong>Try to buy the verdict</strong>
            <small>Change the attacker’s budget and compare two kinds of court.</small>
          </Link>
          <Link className="app-next-card" href="/home">
            <span>Inspect · on-chain</span>
            <strong>Open the live court</strong>
            <small>Read public court data and follow the supported World App path.</small>
          </Link>
        </div>
      </section>

      <footer className="app-overview-footer">
        Test tokens are valueless on every network. The sandbox is a simulation; the mainnet contracts and World ID
        verifier path are the non-simulated on-chain slice.
      </footer>
    </main>
  );
}
