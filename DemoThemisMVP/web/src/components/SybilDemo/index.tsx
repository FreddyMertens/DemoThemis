import { explorerTx } from '@/lib/chain';

// The sybil-rejection demo (§6.5): the one-human-one-seat guarantee proven by the
// NEGATIVE path — duplicate and forged registrations reverting on-chain. The
// cohort revert is on Sepolia (reused nullifier rejected even behind the labeled
// MockSybilGate); the mainnet reverts are historical v4 preview evidence (Step 3.5).
const COHORT_DUP_TX = '0x930212e9fa1281ab664f9f1a88dcb95d06d4d399f10d33682a4ab0749540afcf';
const MAINNET_FORGED_TX = '0xd955739e1f78ec9c46c83343ff87998c0ca6f3089ac9eecf9567158afe0becf5';
const MAINNET_DUP_TX = '0x9f9946f658d16f431922f58f052e1aaab095828d14aed57a2709c5e88b24187d';
const ws = (h: string) => `https://worldscan.org/tx/${h}`;

function Row({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-200 bg-white p-2.5 hover:border-slate-300">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800">{label}</span>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">reverted ↗</span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </a>
  );
}

export function SybilDemo() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">Three rejection tests</h3>
      <p className="mt-1 text-xs text-slate-500">
        The registry rejects a forged proof and the same human returning through another wallet.
      </p>
      <div className="mt-2 space-y-1.5">
        <Row
          href={explorerTx(COHORT_DUP_TX)}
          label="Cohort · duplicate human → NullifierAlreadyUsed"
          detail="A fresh wallet re-presents an already-used nullifier; the registry rejects it (0xcad2ae02) even behind the labeled MockSybilGate."
        />
        <Row
          href={ws(MAINNET_FORGED_TX)}
          label="Mainnet · forged World ID proof → verifier revert"
          detail="Historical preview evidence: a corrupted Groth16 limb fails inside WorldIDVerifier.verify on World Chain mainnet (0x7fcdd1f4). The replacement uses the Router."
        />
        <Row
          href={ws(MAINNET_DUP_TX)}
          label="Mainnet · same human, second wallet → NullifierAlreadyUsed"
          detail="A real World ID identity on a different wallet is rejected by the registry (0xcad2ae02)."
        />
      </div>
    </div>
  );
}
