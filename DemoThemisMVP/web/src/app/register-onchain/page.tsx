'use client';
// Dev proof probe for the production WorldIDGate. It requests a World ID 4.0
// proof and emits the exact bytes accepted by the gate.
import { IDKit, proofOfHuman, type IDKitResult } from '@worldcoin/idkit';
import { isAddress, type Hex } from 'viem';
import { useState } from 'react';
import {
  ACTION,
  encodeWorldIdGateProof,
  parseRpId,
  parseWorldIdV4ProofJson,
  signalHashOf,
} from '@/lib/proof-encode';

const hex = (v: bigint) => ('0x' + v.toString(16)) as Hex;

export default function RegisterOnchain() {
  const [signal, setSignal] = useState(
    '0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c',
  );
  const [connectorURI, setConnectorURI] = useState('');
  const [status, setStatus] = useState('idle');
  const [raw, setRaw] = useState('');
  const [fields, setFields] = useState('');
  const [bytesProof, setBytesProof] = useState('');

  const run = async () => {
    setRaw('');
    setFields('');
    setBytesProof('');
    setConnectorURI('');
    if (!isAddress(signal)) {
      setStatus('signal must be a 0x wallet address (the registering wallet)');
      return;
    }
    setStatus('requesting RP signature...');
    try {
      const rpRes = await fetch('/api/rp-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: ACTION }),
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

      setStatus('creating World ID 4.0 Production request...');
      const request = await IDKit.request({
        app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
        action: ACTION,
        rp_context,
        allow_legacy_proofs: false,
        environment: 'production',
      }).preset(proofOfHuman({ signal }));

      setConnectorURI(request.connectorURI || '(empty — running inside World App)');
      setStatus('waiting for an Orb proof...');
      const completion = await request.pollUntilCompletion();
      (window as Window & typeof globalThis & { __result?: unknown }).__result =
        completion;
      setRaw(JSON.stringify(completion, null, 2));
      if (!completion.success) {
        setStatus(`completion failed: ${completion.error}`);
        return;
      }

      const result: IDKitResult = completion.result;
      if (result.protocol_version !== '4.0') {
        setStatus(`unexpected protocol_version ${result.protocol_version}`);
        return;
      }
      const parts = parseWorldIdV4ProofJson(result);
      const recomputed = signalHashOf(signal);
      const matches = recomputed === parts.signalHash;
      const encoded = encodeWorldIdGateProof(parts, parseRpId(rpSig.rp_id));
      setBytesProof(encoded);
      setFields(
        JSON.stringify(
          {
            signal,
            nullifier: hex(parts.nullifier),
            nonce: hex(parts.nonce),
            signalHash: hex(parts.signalHash),
            signalHash_recomputed_onchain: hex(recomputed),
            signalHash_binding_ok: matches,
            expiresAtMin: parts.expiresAtMin.toString(),
            issuerSchemaId: parts.issuerSchemaId.toString(),
            proof5: parts.proof5.map(hex),
          },
          null,
          2,
        ),
      );
      setStatus(
        matches
          ? 'DONE — bytes proof ready, signal binding verified'
          : 'WARNING — signalHash does not match hashToField(signal); set signal to the registering wallet',
      );
    } catch (e) {
      setStatus('error');
      const err = e as { message?: string; stack?: string };
      setRaw(`ERROR: ${err?.message ?? String(e)}\n${err?.stack ?? ''}`);
    }
  };

  return (
    <main id="main-content" tabIndex={-1} style={{ padding: 24, fontFamily: 'monospace', maxWidth: 960 }}>
      <h1>World ID 4 Production registration proof</h1>
      <p>
        Generates a World ID 4 proof-of-human bound to the wallet below and emits the
        <code> bytes proof </code> for
        <code> JurorRegistry.register(signal, proof)</code>. Set the signal to the
        wallet that will send the register transaction.
      </p>
      <label>
        signal (registering wallet address):
        <br />
        <input
          value={signal}
          onChange={(e) => setSignal(e.target.value.trim())}
          style={{ width: '100%', fontFamily: 'monospace', padding: 6 }}
        />
      </label>
      <p>
        <button onClick={run} style={{ padding: '8px 16px', fontSize: 16 }}>
          Generate proof
        </button>
      </p>
      <p>status: {status}</p>
      <h3>connectorURI (scan/open with World App):</h3>
      <textarea readOnly value={connectorURI} style={{ width: '100%', height: 80 }} />
      <h3>bytes proof (for JurorRegistry.register):</h3>
      <textarea
        readOnly
        value={bytesProof}
        style={{ width: '100%', height: 120, wordBreak: 'break-all' }}
      />
      <h3>parsed fields (signalHash_binding_ok must be true):</h3>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f0f0f0', padding: 12 }}>
        {fields}
      </pre>
      <h3>raw IDKit completion (window.__result):</h3>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f0f0f0', padding: 12 }}>
        {raw}
      </pre>
    </main>
  );
}
