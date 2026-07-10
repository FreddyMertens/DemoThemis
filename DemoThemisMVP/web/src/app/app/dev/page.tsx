'use client';
// B5 — paste-a-proof dev page (/app/dev). Dev-only (NEXT_PUBLIC_SHOW_DEV). Paste a
// World ID Simulator completion JSON; the server abi.encodes the gate proof and
// runs faucet + approve + register from DEV_PRIVATE_KEY against the
// NEXT_PUBLIC_CHAIN_ID instance (MockSybilGate on the cohort, the real WorldIDGate
// on mainnet). The matching IDKit flow is /register-onchain; the encoding is the
// same one the World App onboard uses (lib/proof-encode.ts).
import { useEffect, useState } from 'react';

type Info = {
  enabled: boolean;
  devAddress: string | null;
  chainId: number;
  instance: string;
  gate: string;
  registry: string;
  explorer: string;
};

type Result = {
  ok?: boolean;
  status?: string;
  signal?: string;
  txs?: Record<string, string>;
  explorer?: string;
  error?: string;
};

export default function DevRegister() {
  const [info, setInfo] = useState<Info | null>(null);
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch('/api/dev-register')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ enabled: false } as Info));
  }, []);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/dev-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulatorJson: json }),
      });
      setResult(await res.json());
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  if (info && !info.enabled) {
    return (
      <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 720 }}>
        <h1>Dev register (/app/dev)</h1>
        <p>
          This page is disabled. Set <code>NEXT_PUBLIC_SHOW_DEV=true</code> and <code>DEV_PRIVATE_KEY</code>{' '}
          (a funded dev signing key) to enable it.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 860 }}>
      <h1>Dev register — paste a World ID proof (/app/dev)</h1>
      {info ? (
        <div style={{ background: '#f4f4f5', padding: 12, borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
          <div>
            instance: <b>{info.instance}</b> (chain {info.chainId}) · gate: <b>{info.gate}</b>
          </div>
          <div>
            dev signer (the <code>signal</code>): <b>{info.devAddress ?? '— DEV_PRIVATE_KEY not set —'}</b>
          </div>
          <div>registry: {info.registry}</div>
        </div>
      ) : (
        <p>loading…</p>
      )}

      <ol style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
        <li>
          Open <a href="/register-onchain">/register-onchain</a>, set the signal to the dev signer above,
          click <b>Generate proof</b>, and paste the <code>connectorURI</code> into{' '}
          <a href="https://simulator.worldcoin.org" target="_blank" rel="noreferrer">
            simulator.worldcoin.org
          </a>{' '}
          (pick a &ldquo;Verified (All)&rdquo; identity).
        </li>
        <li>
          Copy the <b>raw IDKit completion</b> JSON it prints (the <code>window.__result</code> block) and
          paste it below.
        </li>
        <li>
          {info?.gate === 'WorldIDGate'
            ? 'Register runs the real WorldIDVerifier.verify on-chain (mainnet).'
            : 'Register goes through the labeled MockSybilGate (cohort).'}
        </li>
      </ol>

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='{"success":true,"result":{"responses":[{"nullifier":"0x…","signal_hash":"0x…","proof":["0x…", …]}],"nonce":"0x…"}}'
        style={{ width: '100%', height: 200, fontFamily: 'monospace', fontSize: 12, padding: 8 }}
      />
      <p>
        <button
          onClick={submit}
          disabled={busy || !json.trim() || !info?.devAddress}
          style={{ padding: '8px 16px', fontSize: 15 }}
        >
          {busy ? 'Registering…' : 'Faucet + approve + register'}
        </button>
      </p>

      {result && (
        <div
          style={{
            background: result.error ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${result.error ? '#fecaca' : '#bbf7d0'}`,
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {result.error ? (
            <p style={{ color: '#b91c1c', wordBreak: 'break-all' }}>error: {result.error}</p>
          ) : (
            <p style={{ color: '#15803d' }}>
              {result.ok ? '✓ registered' : `register status: ${result.status}`} — signal {result.signal}
            </p>
          )}
          {result.txs &&
            Object.entries(result.txs).map(([k, h]) => (
              <div key={k}>
                {k}:{' '}
                <a href={`${result.explorer ?? info?.explorer}/tx/${h}`} target="_blank" rel="noreferrer">
                  {h.slice(0, 18)}… ↗
                </a>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
