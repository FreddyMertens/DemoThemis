// Reviewer front door: answer "what is this, what can I verify, what is funded"
// before asking the grant reviewer to read the deeper docs or open World App.
import Link from 'next/link';
import { LIVE, COHORT } from '@/lib/contracts';

const ex = (base: string, addr: string) => `${base}/address/${addr}`;
const tx = (hash: string) => `${LIVE.chain.explorer}/tx/${hash}`;

const appId = process.env.NEXT_PUBLIC_APP_ID ?? '';
// World App mini-app deep link (opens the Mini App straight to juror onboarding).
const worldAppLink = appId
  ? `https://worldcoin.org/mini-app?app_id=${appId}&path=/onboard`
  : 'https://worldcoin.org/mini-app';

const evidence = [
  {
    label: 'Production verifier instance',
    status: 'deployed',
    detail: 'WorldIDGate points at the World ID 4.0 Production verifier on World Chain mainnet.',
    href: ex(LIVE.chain.explorer, LIVE.WorldIDGate),
  },
  {
    label: 'Valid World ID proof',
    status: 'passed',
    detail: 'A v4 proof ran through WorldIDVerifier.verify inside a registration transaction.',
    href: tx('0xe1ad43e86e500b3475da73de10829412126ec7a885654fb1003dfcca9b984c70'),
  },
  {
    label: 'Forged proof',
    status: 'reverted',
    detail: 'A corrupted Groth16 limb reverted inside the verifier on-chain.',
    href: tx('0xd955739e1f78ec9c46c83343ff87998c0ca6f3089ac9eecf9567158afe0becf5'),
  },
  {
    label: 'Duplicate human',
    status: 'reverted',
    detail: 'The same identity on a second wallet hit NullifierAlreadyUsed.',
    href: tx('0x9f9946f658d16f431922f58f052e1aaab095828d14aed57a2709c5e88b24187d'),
  },
  {
    label: 'Scale cohort',
    status: 'simulated',
    detail: 'A labeled Sepolia cohort shows multi-case history without claiming real World ID users.',
    href: ex(COHORT.chain.explorer, COHORT.DisputeCourt),
  },
  {
    label: '3-human capstone',
    status: 'pending',
    detail: 'The mainnet contracts are wired; the live human run fills the final trace table.',
    href: ex(LIVE.chain.explorer, LIVE.JurorRegistry),
  },
];

const personhoodSteps = [
  {
    title: 'Personhood proof',
    body: 'WorldIDVerifier.verify runs on World Chain mainnet inside juror registration.',
  },
  {
    title: 'One spent nullifier',
    body: 'The nullifier is identity-derived, not wallet-derived, so a second wallet buys zero seats.',
  },
  {
    title: 'Private ballot phase',
    body: 'Jurors commit a sealed vote first, then reveal later; no visible vote exists during commit.',
  },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function EvidenceRow({ item }: { item: (typeof evidence)[number] }) {
  const statusClass =
    item.status === 'pending'
      ? 'bg-amber-50 text-amber-700'
      : item.status === 'simulated'
        ? 'bg-sky-50 text-sky-700'
        : item.status === 'reverted'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-emerald-50 text-emerald-700';

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-slate-900">{item.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>
          {item.status}
        </span>
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-500">{item.detail}</p>
    </a>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-7">
      <section className="rounded-2xl bg-slate-950 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">DemoThemis</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">
          Human arbitration for World App.
        </h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-100">
          A dispute court where every juror seat is gated by on-chain World ID: one verified
          human, one vote, random panel, commit/reveal ballot, atomic settlement.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          The live MVP proves the chain slice with a deliberately small 3-seat mainnet panel.
          The funded work hardens randomness, ballots, appeals, reputation, and UX so the same
          mechanism can scale beyond the demo.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            href="/sandbox"
            className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-950"
          >
            Watch attack demo
          </Link>
          <Link
            href="/home"
            className="rounded-xl border border-white/30 px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            Open court
          </Link>
          <a
            href={worldAppLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-300 px-4 py-2.5 text-center text-sm font-semibold text-emerald-100"
          >
            Open in World App
          </a>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="The problem">
          Token-weighted courts make influence targetable and reusable: buy enough stake once, then
          use that position case after case.
        </Card>
        <Card title="The inversion">
          DemoThemis draws verified humans after the question is fixed. A briber cannot know the
          panel in advance and cannot carry capture from one case to the next.
        </Card>
        <Card title="What is real today">
          Source-verified mainnet contracts, real World ID 4.0 verifier wiring, nullifier reuse
          rejection, commit/reveal, 70/20/10 fee routing, and escrow settlement.
        </Card>
        <Card title="What the grant funds">
          VRF/drand randomness, independent review, receipt-free ballots, appeal/reputation layers,
          juror UX testing, and a neutral resolution SDK for any yes/no consumer.
        </Card>
      </div>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
          Why World ID matters
        </p>
        <h2 className="mt-1 text-lg font-bold text-emerald-950">
          One human stays one juror, across every wallet.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900">
          DemoThemis turns World ID from an account check into the scarce resource of the court:
          a seat. Ten thousand wallets do not become ten thousand jurors, and a captured stake
          position does not carry from case to case.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {personhoodSteps.map((step, i) => (
            <div key={step.title} className="rounded-lg border border-emerald-200 bg-white p-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-emerald-950">{step.title}</h3>
              <p className="mt-1 text-xs leading-snug text-emerald-800">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Evidence dashboard</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">What a reviewer can verify now</h2>
          </div>
          <Link href="/about" className="text-xs font-semibold text-slate-600 underline">
            Scope notes
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {evidence.map((item) => (
            <EvidenceRow key={item.label} item={item} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="text-sm font-semibold text-blue-950">Neutral resolver, not a market</h2>
        <p className="mt-2 text-sm leading-relaxed text-blue-900">
          The product funded here is the court and resolution SDK: escrow disputes, marketplace
          conflicts, and objective yes/no outcomes can all route through the same neutral
          personhood-gated resolver. Any high-volume pilot is a consumer of the court, not the
          grant-funded deliverable itself; DemoThemis takes no bet, sets no odds, and holds no stake.
        </p>
      </section>

      <footer className="px-1 pt-2 text-center text-[11px] leading-relaxed text-slate-400">
        Test tokens are valueless on every network. The sandbox is a simulation; the mainnet
        contracts and World ID verifier path are the non-simulated on-chain slice.{' '}
        <a href="/demothemis.html" className="font-semibold underline">
          Read the full design
        </a>
        .
      </footer>
    </main>
  );
}
