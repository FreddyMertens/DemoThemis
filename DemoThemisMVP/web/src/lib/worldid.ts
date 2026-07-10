// World ID 4.0 on-chain proof generation for the World App onboard: drive IDKit's
// proofOfHuman bound to a wallet `signal` and emit the WorldIDGate `bytes proof`.
// The pure encoding lives in lib/proof-encode.ts (shared with the B5 dev route);
// the IDKit -> verify field mapping is documented in docs/MECHANISM_DELTA.md.
import { IDKit, proofOfHuman, type IDKitResult } from '@worldcoin/idkit';
import { isAddress, type Address } from 'viem';
import { LIVE } from './contracts';
import { ACTION, encodeWorldIdGateProof, parseSimulatorJson, signalHashOf, type V4ProofParts } from './proof-encode';

export { ACTION } from './proof-encode';

const PRODUCTION_VERIFIER = '0x00000000009e00f9fe82cfeebb4556686da094d7';

/// The World ID environment the selected verifier expects. The Production verifier
/// for the Step-5 capstone needs `'production'`; the Staging verifier (Simulator
/// proofs, Step 3.5) needs `'staging'`. Derived from the deployed verifier so the
/// onboard auto-matches whatever LIVE points at.
export const WORLDID_ENV: 'production' | 'staging' =
  LIVE.worldIdVerifier.toLowerCase() === PRODUCTION_VERIFIER ? 'production' : 'staging';

export type RegistrationProof = {
  /// abi.encoded bytes proof for JurorRegistry.register / registerWithPermit2.
  bytesProof: `0x${string}`;
  nullifier: bigint;
  /// hashToField(signal) == response.signal_hash — the gate's wallet binding.
  signalBindingOk: boolean;
};

/// Generate a v4 on-chain World ID proof bound to `signal` and abi.encode it into
/// the WorldIDGate `bytes proof`. Works in World App (native proof) and on desktop
/// (IDKit emits a connectorURI to paste into the World ID Simulator — surfaced via
/// `onConnectorURI`). Throws with a human-readable message on any failure.
export async function generateRegistrationProof(opts: {
  appId: string;
  signal: Address;
  environment?: 'production' | 'staging';
  onConnectorURI?: (uri: string) => void;
}): Promise<RegistrationProof> {
  const { appId, signal, environment = WORLDID_ENV, onConnectorURI } = opts;
  if (!isAddress(signal)) throw new Error('signal must be a 0x wallet address');

  const rpRes = await fetch('/api/rp-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: ACTION }),
  });
  if (!rpRes.ok) throw new Error(`rp-signature ${rpRes.status}: ${await rpRes.text()}`);
  const rpSig = await rpRes.json();

  const request = await IDKit.request({
    app_id: appId as `app_${string}`,
    action: ACTION,
    rp_context: {
      rp_id: rpSig.rp_id,
      nonce: rpSig.nonce,
      created_at: rpSig.created_at,
      expires_at: rpSig.expires_at,
      signature: rpSig.sig,
    },
    allow_legacy_proofs: false,
    environment,
  }).preset(proofOfHuman({ signal }));

  if (request.connectorURI && onConnectorURI) onConnectorURI(request.connectorURI);

  const completion = await request.pollUntilCompletion();
  if (!completion.success) throw new Error(`World ID verification failed: ${completion.error}`);

  const result: IDKitResult = completion.result;
  if (result.protocol_version !== '4.0') throw new Error(`unexpected protocol_version ${result.protocol_version}`);
  if ('session_id' in result) throw new Error('got a session proof, expected a v4 uniqueness proof');

  const res = result.responses[0];
  if (!res || !res.signal_hash) throw new Error('response missing signal_hash (was a signal provided?)');
  if (res.proof.length !== 5) throw new Error(`proof has ${res.proof.length} elements, expected 5`);

  const parts: V4ProofParts = parseSimulatorJson(result);
  // The gate recomputes keccak256(addr) >> 8 on-chain and asserts it equals
  // signal_hash; confirm the binding here before spending a transaction.
  const signalBindingOk = signalHashOf(signal) === parts.signalHash;

  return { bytesProof: encodeWorldIdGateProof(parts), nullifier: parts.nullifier, signalBindingOk };
}
