'use client';
// THROWAWAY PROBE (Step 3.5 de-risk): request a World ID 4.0 *on-chain* proof
// (proofOfHuman, allow_legacy_proofs:false) and dump the result so we can cast
// call the Staging verifier with it. Distinct from components/Verify (orbLegacy
// cloud path). Safe to delete after the assumption is proven.
import { IDKit, proofOfHuman } from '@worldcoin/idkit';
import { useState } from 'react';

export default function VerifyOnchainProbe() {
  const [connectorURI, setConnectorURI] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('idle');

  const run = async () => {
    setStatus('requesting RP signature...');
    setResult('');
    setConnectorURI('');
    try {
      const action = 'juror-registration';
      const rpRes = await fetch('/api/rp-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!rpRes.ok) {
        throw new Error(`rp-signature ${rpRes.status}: ${await rpRes.text()}`);
      }
      const rpSig = await rpRes.json();
      const rp_context = {
        rp_id: rpSig.rp_id,
        nonce: rpSig.nonce,
        created_at: rpSig.created_at,
        expires_at: rpSig.expires_at,
        signature: rpSig.sig,
      };
      setStatus('creating IDKit v4 request (proofOfHuman, allow_legacy_proofs:false)...');
      const request = await IDKit.request({
        app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
        action,
        rp_context,
        allow_legacy_proofs: false,
        environment: 'staging',
      }).preset(proofOfHuman({ signal: '' }));
      (window as Window & typeof globalThis & { __probe?: unknown }).__probe = {
        rpSig,
        connectorURI: request.connectorURI,
      };
      setConnectorURI(request.connectorURI || '(empty — running inside World App)');
      setStatus('waiting for proof — open the Simulator and connect with the URI above...');
      const completion = await request.pollUntilCompletion();
      (window as Window & typeof globalThis & { __result?: unknown }).__result = completion;
      setResult(JSON.stringify(completion, null, 2));
      setStatus(completion.success ? 'DONE — proof received' : 'completion returned success=false');
    } catch (e) {
      setStatus('error');
      const err = e as { message?: string; stack?: string };
      setResult(`ERROR: ${err?.message ?? String(e)}\n${err?.stack ?? ''}`);
    }
  };

  return (
    <main id="main-content" tabIndex={-1} style={{ padding: 24, fontFamily: 'monospace', maxWidth: 920 }}>
      <h1>v4 on-chain proof probe (proofOfHuman)</h1>
      <button onClick={run} style={{ padding: '8px 16px', fontSize: 16 }}>
        Start v4 request
      </button>
      <p>status: {status}</p>
      <h3>connectorURI (paste into the Simulator):</h3>
      <textarea readOnly value={connectorURI} style={{ width: '100%', height: 90 }} />
      <h3>result (IDKit completion — window.__result):</h3>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f0f0f0', padding: 12 }}>
        {result}
      </pre>
    </main>
  );
}
