// B5 dev-only registration: take a World ID Simulator proof JSON, abi.encode the
// gate `bytes proof` for the active instance, and run faucet + classic approve +
// JurorRegistry.register signed by DEV_PRIVATE_KEY. Server-side so the key never
// reaches the browser. Gated by NEXT_PUBLIC_SHOW_DEV (checked here too, not just
// in the page). On the cohort this drives MockSybilGate; on a replacement
// mainnet instance it emits the World ID 4.0 Production-gate proof.
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { worldchain, worldchainSepolia } from 'viem/chains';
import { jurorRegistryAbi } from '@/abi/JurorRegistry';
import { mockUSDAbi } from '@/abi/MockUSD';
import { IS_COHORT, INSTANCE, addr, BOND } from '@/lib/chain';
import {
  encodeMockGateProof,
  encodeWorldIdGateProof,
  parseRpId,
  parseRouterProofJson,
  parseSimulatorJson,
  parseWorldIdV4ProofJson,
  signalHashOf,
} from '@/lib/proof-encode';

export const runtime = 'nodejs';

const enabled = () => process.env.NEXT_PUBLIC_SHOW_DEV === 'true';
const devKey = (): Hex | null => {
  const pk = process.env.DEV_PRIVATE_KEY;
  if (!pk) return null;
  return (pk.startsWith('0x') ? pk : `0x${pk}`) as Hex;
};
const viemChain = IS_COHORT ? worldchainSepolia : worldchain;

export async function GET() {
  const pk = devKey();
  let devAddress: string | null = null;
  if (enabled() && pk) {
    try {
      devAddress = privateKeyToAccount(pk).address;
    } catch {
      /* malformed key */
    }
  }
  return Response.json({
    enabled: enabled(),
    devAddress,
    chainId: INSTANCE.chain.chainId,
    instance: INSTANCE.chain.name,
    gate: IS_COHORT ? 'MockSybilGate' : 'WorldIDGate (World ID 4.0 Production)',
    registry: addr.registry,
    explorer: INSTANCE.chain.explorer,
  });
}

export async function POST(req: Request) {
  if (!enabled()) return Response.json({ error: 'dev page disabled (set NEXT_PUBLIC_SHOW_DEV=true)' }, { status: 403 });
  const pk = devKey();
  if (!pk) return Response.json({ error: 'DEV_PRIVATE_KEY is not set' }, { status: 500 });

  let body: { simulatorJson?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid request JSON' }, { status: 400 });
  }

  const account = privateKeyToAccount(pk);
  const signal = account.address;

  // Build the gate proof for the active instance.
  let proof: Hex;
  try {
    const raw = typeof body.simulatorJson === 'string' ? JSON.parse(body.simulatorJson) : body.simulatorJson;
    if (IS_COHORT) {
      const result = ((raw as { result?: unknown })?.result ?? raw) as { protocol_version?: string };
      const parts = result?.protocol_version === '3.0' ? parseRouterProofJson(raw) : parseSimulatorJson(raw);
      // MockSybilGate only checks (nullifier, signal); signalHash is unused.
      proof = encodeMockGateProof(parts.nullifier, signal);
    } else {
      const parts = parseWorldIdV4ProofJson(raw);
      // The v4 verifier checks this wallet binding as a public input. Confirm it
      // locally as well so a mismatched proof does not spend a transaction.
      if (signalHashOf(signal) !== parts.signalHash) {
        return Response.json(
          { error: `proof signal_hash is not bound to the dev signer ${signal}. Regenerate it with signal=${signal}.` },
          { status: 400 },
        );
      }
      proof = encodeWorldIdGateProof(parts, parseRpId(process.env.RP_ID));
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }

  const transport = http(INSTANCE.chain.rpcUrl);
  const pub = createPublicClient({ chain: viemChain, transport });
  const wallet = createWalletClient({ account, chain: viemChain, transport });
  const txs: Record<string, string> = {};

  try {
    // Faucet if short of the bond (100 MUSD/day; a cooldown revert is non-fatal
    // as long as the balance already covers the bond).
    let balance = (await pub.readContract({
      address: addr.musd,
      abi: mockUSDAbi,
      functionName: 'balanceOf',
      args: [signal],
    })) as bigint;
    if (balance < BOND) {
      try {
        const h = await wallet.writeContract({ address: addr.musd, abi: mockUSDAbi, functionName: 'faucet', args: [] });
        await pub.waitForTransactionReceipt({ hash: h });
        txs.faucet = h;
        balance = (await pub.readContract({
          address: addr.musd,
          abi: mockUSDAbi,
          functionName: 'balanceOf',
          args: [signal],
        })) as bigint;
      } catch {
        /* faucet cooldown — fall through to the balance check */
      }
      if (balance < BOND) {
        return Response.json({ error: 'dev signer has < 5 MUSD and the faucet is on cooldown', txs }, { status: 400 });
      }
    }

    // Classic allowance path (this is the desktop dev signer, not World App).
    const ha = await wallet.writeContract({
      address: addr.musd,
      abi: mockUSDAbi,
      functionName: 'approve',
      args: [addr.registry, BOND],
    });
    await pub.waitForTransactionReceipt({ hash: ha });
    txs.approve = ha;

    const hr = await wallet.writeContract({
      address: addr.registry,
      abi: jurorRegistryAbi,
      functionName: 'register',
      args: [signal, proof],
    });
    const rcpt = await pub.waitForTransactionReceipt({ hash: hr });
    txs.register = hr;

    return Response.json({
      ok: rcpt.status === 'success',
      status: rcpt.status,
      signal,
      proof,
      txs,
      explorer: INSTANCE.chain.explorer,
    });
  } catch (e) {
    // viem estimates gas before sending, so a would-be revert (SignalHashMismatch,
    // NullifierAlreadyUsed, AlreadyRegistered, ...) surfaces here with its reason.
    return Response.json({ error: e instanceof Error ? e.message : String(e), txs }, { status: 400 });
  }
}
