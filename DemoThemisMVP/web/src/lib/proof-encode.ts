// Pure (viem-only, no IDKit) encoders for the ISybilGate `bytes proof`. Usable on
// both client (the World App onboard, via lib/worldid.ts) and server (the B5 dev
// page's /api/dev-register route). Two DISTINCT encodings — see
// docs/MECHANISM_DELTA.md (Step 3.5):
//   - WorldIDGate (mainnet): the v4 9-tuple, decoded + verified on-chain.
//   - MockSybilGate (cohort/tests): the 2-tuple (nullifier, signal).
import { encodeAbiParameters, keccak256, stringToBytes, type Address, type Hex } from 'viem';

export const ACTION = 'juror-registration';
// hashToField("juror-registration") = keccak256(action) >> 8 (the un-shifted
// keccak exceeds the BN254 field and reverts PublicInputNotInField).
export const ACTION_FIELD = BigInt(keccak256(stringToBytes(ACTION))) >> BigInt(8);
// rp_1ddcf8ba2efe3f36 with the "rp_" prefix stripped, as uint64.
export const RP_ID = BigInt('0x1ddcf8ba2efe3f36');

// The v4 9-tuple WorldIDGate.verify abi.decodes (contracts/src/sybil/WorldIDGate.sol).
const WORLDID_TUPLE = [
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

export type V4ProofParts = {
  nullifier: bigint;
  nonce: bigint;
  signalHash: bigint;
  expiresAtMin: bigint;
  issuerSchemaId: bigint;
  proof5: [bigint, bigint, bigint, bigint, bigint];
};

/** hashToField(signal) — the on-chain WorldIDGate binding for an address signal. */
export function signalHashOf(signal: Address): bigint {
  return BigInt(keccak256(signal)) >> BigInt(8);
}

/** abi.encode the WorldIDGate v4 9-tuple. */
export function encodeWorldIdGateProof(p: V4ProofParts): Hex {
  return encodeAbiParameters(WORLDID_TUPLE, [
    p.nullifier,
    ACTION_FIELD,
    RP_ID,
    p.nonce,
    p.signalHash,
    p.expiresAtMin,
    p.issuerSchemaId,
    BigInt(0), // credentialGenesisIssuedAtMin — absent in the response
    p.proof5,
  ]);
}

/** abi.encode the MockSybilGate 2-tuple (cohort/tests). */
export function encodeMockGateProof(nullifier: bigint, signal: Address): Hex {
  return encodeAbiParameters([{ type: 'uint256' }, { type: 'address' }], [nullifier, signal]);
}

/**
 * Parse the IDKit / World ID Simulator completion JSON into v4 proof parts. Accepts
 * either the full completion object (`{ success, result: {...} }`) or the inner
 * `result` (`{ responses: [...], nonce }`). Throws a human-readable error on a
 * malformed payload.
 */
export function parseSimulatorJson(raw: unknown): V4ProofParts {
  const obj = raw as Record<string, unknown>;
  const result = (obj.result ?? obj) as Record<string, unknown>;
  const responses = result.responses as Array<Record<string, unknown>> | undefined;
  const res = responses?.[0];
  if (!res) throw new Error('no responses[0] in the pasted JSON (paste the IDKit completion / result)');
  const proof = res.proof as unknown[] | undefined;
  if (!Array.isArray(proof) || proof.length !== 5) {
    throw new Error(`responses[0].proof must be a uint256[5], got ${Array.isArray(proof) ? proof.length : typeof proof}`);
  }
  if (result.nonce === undefined) throw new Error('missing top-level nonce in the pasted JSON');
  if (res.signal_hash === undefined) throw new Error('missing responses[0].signal_hash (was a signal provided?)');
  return {
    nullifier: BigInt(res.nullifier as string),
    nonce: BigInt(result.nonce as string),
    signalHash: BigInt(res.signal_hash as string),
    expiresAtMin: BigInt(res.expires_at_min as string),
    issuerSchemaId: BigInt(res.issuer_schema_id as string),
    proof5: proof.map((p) => BigInt(p as string)) as [bigint, bigint, bigint, bigint, bigint],
  };
}
