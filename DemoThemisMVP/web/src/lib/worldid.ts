// Production World ID proof generation: request a World ID 4.0 proof bound to a
// wallet and emit the WorldIDGate `bytes proof`.
// The pure encoding lives in lib/proof-encode.ts (shared with the B5 dev route);
// the IDKit -> verify field mapping is documented in docs/MECHANISM_DELTA.md.
import { IDKit, proofOfHuman, type IDKitResult } from '@worldcoin/idkit';
import { isAddress, type Address } from 'viem';
import { ACTION, encodeWorldIdGateProof, parseRpId, parseWorldIdV4ProofJson, signalHashOf } from './proof-encode';

export { ACTION } from './proof-encode';

/// Real-human registration uses World ID production. Simulator/staging remains
/// available only on the separately labeled archived Staging probe.
export const WORLDID_ENV = 'production' as const;

export type RegistrationProof = {
  /// abi.encoded bytes proof for JurorRegistry.register / registerWithPermit2.
  bytesProof: `0x${string}`;
  nullifier: bigint;
  /// hashToField(signal) == response.signal_hash; the v4 verifier enforces it on-chain.
  signalBindingOk: boolean;
};

/// Generate a World ID 4.0 proof bound to `signal` and ABI-encode it for the
/// Production `WorldIDGate`. Legacy v3 proofs are deliberately disabled.
export async function generateRegistrationProof(opts: {
  appId: string;
  signal: Address;
  environment?: 'production';
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

  const parts = parseWorldIdV4ProofJson(result);
  const signalBindingOk = signalHashOf(signal) === parts.signalHash;

  return {
    bytesProof: encodeWorldIdGateProof(parts, parseRpId(rpSig.rp_id)),
    nullifier: parts.nullifier,
    signalBindingOk,
  };
}
