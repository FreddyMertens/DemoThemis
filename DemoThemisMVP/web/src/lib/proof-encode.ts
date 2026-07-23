// Pure (viem-only, no IDKit) encoders for the ISybilGate `bytes proof`. Usable on
// both client (the World App onboard, via lib/worldid.ts) and server (the B5 dev
// page's /api/dev-register route). Three DISTINCT encodings — see
// docs/MECHANISM_DELTA.md (Step 3.5):
//   - WorldIDGate (production): the World ID 4.0 9-tuple.
//   - WorldIDRouterGate (legacy compatibility): the v3 Router tuple.
//   - MockSybilGate (cohort/tests): the 2-tuple (nullifier, signal).
import { decodeAbiParameters, encodeAbiParameters, keccak256, stringToBytes, type Address, type Hex } from 'viem';

export const ACTION = 'juror-registration';
// hashToField("juror-registration") = keccak256(action) >> 8 (the un-shifted
// keccak exceeds the BN254 field and reverts PublicInputNotInField).
export const ACTION_FIELD = BigInt(keccak256(stringToBytes(ACTION))) >> BigInt(8);
const UINT64_MAX = BigInt('0xffffffffffffffff');

/** Convert an IDKit `rp_...` identifier into the uint64 used by WorldIDGate. */
export function parseRpId(rpId: unknown): bigint {
  if (typeof rpId !== 'string' || !/^rp_[0-9a-f]+$/i.test(rpId)) {
    throw new Error('RP signature returned an invalid rp_id');
  }
  const value = BigInt(`0x${rpId.slice(3)}`);
  if (value === BigInt(0) || value > UINT64_MAX) {
    throw new Error('rp_id must be a non-zero uint64');
  }
  return value;
}

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

const WORLDID_ROUTER_TUPLE = [
  { type: 'uint256' }, // Merkle root
  { type: 'uint256' }, // nullifier hash
  { type: 'uint256[8]' }, // Groth16 proof
] as const;

export type RouterProofParts = {
  root: bigint;
  nullifier: bigint;
  signalHash: bigint;
  proof8: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

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
export function encodeWorldIdGateProof(p: V4ProofParts, rpId: bigint): Hex {
  if (rpId === BigInt(0) || rpId > UINT64_MAX) throw new Error('rpId must be a non-zero uint64');
  return encodeAbiParameters(WORLDID_TUPLE, [
    p.nullifier,
    ACTION_FIELD,
    rpId,
    p.nonce,
    p.signalHash,
    p.expiresAtMin,
    p.issuerSchemaId,
    BigInt(0), // no minimum credential-issuance time requested
    p.proof5,
  ]);
}

/** abi.encode the legacy WorldIDRouterGate tuple. */
export function encodeWorldIdRouterGateProof(p: RouterProofParts): Hex {
  return encodeAbiParameters(WORLDID_ROUTER_TUPLE, [p.root, p.nullifier, p.proof8]);
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
export function parseWorldIdV4ProofJson(raw: unknown): V4ProofParts {
  const obj = raw as Record<string, unknown>;
  const result = (obj.result ?? obj) as Record<string, unknown>;
  if (result.protocol_version !== '4.0') {
    throw new Error(`expected a World ID 4.0 proof, got ${String(result.protocol_version ?? 'no version')}`);
  }
  const responses = result.responses as Array<Record<string, unknown>> | undefined;
  const res = responses?.[0];
  if (!res) throw new Error('no responses[0] in the pasted JSON (paste the IDKit completion / result)');
  const proof = res.proof as unknown[] | undefined;
  if (!Array.isArray(proof) || proof.length !== 5) {
    throw new Error(`responses[0].proof must be a uint256[5], got ${Array.isArray(proof) ? proof.length : typeof proof}`);
  }
  if (result.nonce === undefined) throw new Error('missing top-level nonce in the pasted JSON');
  if (res.signal_hash === undefined) throw new Error('missing responses[0].signal_hash (was a signal provided?)');
  const issuerSchemaId = BigInt(res.issuer_schema_id as string);
  if (issuerSchemaId !== BigInt(1)) {
    throw new Error(`expected proof_of_human issuer schema 1, got ${issuerSchemaId}`);
  }
  return {
    nullifier: BigInt(res.nullifier as string),
    nonce: BigInt(result.nonce as string),
    signalHash: BigInt(res.signal_hash as string),
    expiresAtMin: BigInt(res.expires_at_min as string),
    issuerSchemaId,
    proof5: proof.map((p) => BigInt(p as string)) as [bigint, bigint, bigint, bigint, bigint],
  };
}

/** Historical name retained for the labeled Staging/Simulator cohort helper. */
export const parseSimulatorJson = parseWorldIdV4ProofJson;

/** Parse an IDKit v3 compatibility result for `WorldIDRouterGate`. */
export function parseRouterProofJson(raw: unknown): RouterProofParts {
  const obj = raw as Record<string, unknown>;
  const result = (obj.result ?? obj) as Record<string, unknown>;
  if (result.protocol_version !== '3.0') {
    throw new Error(`expected a World ID 3.0 Router proof, got ${String(result.protocol_version ?? 'no version')}`);
  }
  const responses = result.responses as Array<Record<string, unknown>> | undefined;
  const res = responses?.[0];
  if (!res) throw new Error('no responses[0] in the IDKit result');
  if (res.merkle_root === undefined) throw new Error('response missing merkle_root');
  if (res.nullifier === undefined) throw new Error('response missing nullifier');
  if (res.signal_hash === undefined) throw new Error('response missing signal_hash (was the wallet signal provided?)');
  if (typeof res.proof !== 'string' || !res.proof.startsWith('0x')) {
    throw new Error('response proof must be an ABI-encoded hex string');
  }

  let proof8: readonly bigint[];
  try {
    [proof8] = decodeAbiParameters([{ type: 'uint256[8]' }], res.proof as Hex);
  } catch {
    throw new Error('response proof is not a valid ABI-encoded uint256[8]');
  }

  return {
    root: BigInt(res.merkle_root as string),
    nullifier: BigInt(res.nullifier as string),
    signalHash: BigInt(res.signal_hash as string),
    proof8: [...proof8] as RouterProofParts['proof8'],
  };
}
