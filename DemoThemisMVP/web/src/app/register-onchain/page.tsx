'use client';
// Step 3.5: generate a World ID 4.0 *on-chain* proof bound to a wallet, and emit
// the exact `bytes proof` that WorldIDGate.verify decodes — so the proof can be
// submitted to JurorRegistry.register on WC mainnet (via cast, or the Step-4/5
// MiniKit onboard path, which reuses this same abi.encode). Distinct from
// components/Verify (the legacy cloud path). The IDKit->verify field mapping this
// page implements is documented in docs/MECHANISM_DELTA.md.
import { IDKit, proofOfHuman, type IDKitResult } from '@worldcoin/idkit';
import { encodeAbiParameters, isAddress, keccak256, stringToBytes, type Hex } from 'viem';
import { useState } from 'react';

const ACTION = 'juror-registration';
// hashToField("juror-registration"): the field-fitted action WorldIDGate asserts.
const ACTION_FIELD = BigInt(keccak256(stringToBytes(ACTION))) >> BigInt(8);

// The v4 9-tuple WorldIDGate.verify abi.decodes (src/sybil/WorldIDGate.sol).
const PROOF_TUPLE = [
  { type: 'uint256' }, // nullifier
  { type: 'uint256' }, // action (field-fitted)
  { type: 'uint64' }, // rpId
  { type: 'uint256' }, // nonce
  { type: 'uint256' }, // signalHash
  { type: 'uint64' }, // expiresAtMin
  { type: 'uint64' }, // issuerSchemaId
  { type: 'uint256' }, // credentialGenesisIssuedAtMin
  { type: 'uint256[5]' }, // proof: 4 Groth16 limbs + Merkle root
] as const;

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
      // rp_1ddcf8ba2efe3f36 -> 0x1ddcf8ba2efe3f36 as uint64.
      const rpId64 = BigInt('0x' + String(rpSig.rp_id).replace(/^rp_/, ''));
      const rp_context = {
        rp_id: rpSig.rp_id,
        nonce: rpSig.nonce,
        created_at: rpSig.created_at,
        expires_at: rpSig.expires_at,
        signature: rpSig.sig,
      };

      setStatus('creating IDKit v4 request (proofOfHuman, staging)...');
      const request = await IDKit.request({
        app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
        action: ACTION,
        rp_context,
        allow_legacy_proofs: false,
        environment: 'staging',
      }).preset(proofOfHuman({ signal }));

      setConnectorURI(request.connectorURI || '(empty — running inside World App)');
      setStatus('waiting for proof — paste the URI into simulator.worldcoin.org...');
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
      if ('session_id' in result) {
        setStatus('got a session proof, expected a v4 uniqueness proof');
        return;
      }
      const res = result.responses[0];
      if (!res || !res.signal_hash) {
        setStatus('response missing signal_hash (was a signal provided?)');
        return;
      }
      if (res.proof.length !== 5) {
        setStatus(`proof has ${res.proof.length} elements, expected 5`);
        return;
      }

      const nullifier = BigInt(res.nullifier);
      const nonce = BigInt(result.nonce);
      const signalHash = BigInt(res.signal_hash);
      const expiresAtMin = BigInt(res.expires_at_min);
      const issuerSchemaId = BigInt(res.issuer_schema_id);
      const proof5 = res.proof.map((p) => BigInt(p)) as [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
      ];

      // Binding sanity check: the gate recomputes keccak256(addr) >> 8 on-chain
      // and asserts it equals signal_hash. Confirm it here BEFORE spending a tx.
      const recomputed = BigInt(keccak256(signal)) >> BigInt(8);
      const matches = recomputed === signalHash;

      const encoded = encodeAbiParameters(PROOF_TUPLE, [
        nullifier,
        ACTION_FIELD,
        rpId64,
        nonce,
        signalHash,
        expiresAtMin,
        issuerSchemaId,
        BigInt(0),
        proof5,
      ]);
      setBytesProof(encoded);
      setFields(
        JSON.stringify(
          {
            signal,
            nullifier: hex(nullifier),
            action_field: hex(ACTION_FIELD),
            rpId: hex(rpId64),
            nonce: hex(nonce),
            signalHash: hex(signalHash),
            signalHash_recomputed_onchain: hex(recomputed),
            signalHash_binding_ok: matches,
            expiresAtMin: expiresAtMin.toString(),
            issuerSchemaId: issuerSchemaId.toString(),
            proof5: proof5.map(hex),
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
      <h1>WorldIDGate registration proof (v4 on-chain)</h1>
      <p>
        Generates a World ID 4.0 proof bound to the wallet below and emits the
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
      <h3>connectorURI (paste into simulator.worldcoin.org):</h3>
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
