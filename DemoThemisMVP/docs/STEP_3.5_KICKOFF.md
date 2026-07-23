# Step 3.5 kickoff — real on-chain World ID 4.0 + the sybil-rejection demo

> **Archived Staging/Simulator experiment — do not use as the deployment runbook.**
> Its v4 adapter and traces remain useful historical evidence. `Deploy.s.sol` and the
> live onboard now use `WorldIDGate` with the official Production proxy, require v4,
> and disable legacy proofs. Follow `CAPSTONE_RUNBOOK.md` for current deployment.

You are continuing the DemoThemis MVP. Step 3 (the sandbox + comparative attack
demo) is complete, tested, and on `main`. You are on branch **`step-3.5-worldid`**
(off `main`). Goal: prove the court's one-human-one-seat claim **on-chain** —
deploy a real `WorldIDGate` to World Chain mainnet, register a verified human
through `WorldIDVerifier.verify`, and show a forged/duplicate proof revert.

**Read first:** `IMPLEMENTATION_PLAN.md` — the governing block
("On-chain World ID verification — the settled approach") and the **Step 3.5**
section — then `docs/SPIKE.md`. The plan is reconciled to the actual code as of
commit `8d3e78f`; it is authoritative and outranks generic public docs.

---

## Preconditions — status (updated 2026-06-18)

1. **Fund the mainnet deployer — DONE.** Deployer
   `0xe8E539aa5c3E74453892DAd479Bf9feB51CF516c` now holds **0.0028 ETH on WC
   mainnet (480)**, bridged from L1 this session (~$9). WC mainnet gas is cents, so
   this covers the Step-3.5 deploy + registrations and the Step-5 cases (World App
   sponsors the humans' gas). Top up if needed with
   `bash scripts/bridge-l1-to-wc-mainnet.sh <amount_ether>` — it uses the explicit
   `bridgeETHTo` entrypoint (the bare `receive()` reverts on the v2.8.0 bridge) and
   reads `PRIVATE_KEY` from `.env`.
2. **Simulator → Staging-verifier path — CONFIRMED ✅ (2026-06-18).** Proven
   end-to-end this session: a World ID **Simulator** `proof_of_human` **v4 staging**
   proof (action `juror-registration`, signal `''`) **verifies on-chain** against
   the Staging verifier `0x703a6316c975DEabF30b637c155edD53e24657DB` via `cast call`
   `WorldIDVerifier.verify(...)` — returns `0x` (no revert) for a valid proof, and a
   **forged** proof (one Groth16 limb flipped) **reverts** (`0x7fcdd1f4`). The
   grant's headline on-chain-World-ID claim is real. The exact verified arg recipe
   is in "World ID frontend: legacy → v4" below — follow it, it has three non-obvious
   gotchas the docs get wrong.
3. **Developer Portal app live + `RP_ID` set everywhere.** App
   `app_7bdfda4db4e2f59dd4a2427cd2bd860d`, RP `rp_1ddcf8ba2efe3f36` (World ID 4.0
   Managed, actions `juror-registration` / `juror-registration-backup`). The
   `/api/rp-signature` and `/api/verify-proof` routes now fail closed when `RP_ID` is
   missing or malformed. Set `RP_ID=rp_1ddcf8ba2efe3f36` in every environment and confirm
   the signature response returns that exact value before inviting jurors.
4. **Verifier addresses — both CONFIRMED deployed on WC mainnet this session**
   (Staging `0x703a…DB` and Production `0x00000000009E00F9FE82CfeeBB4556686da094d7`
   both return real bytecode). They appear in no repo config yet; still re-confirm
   the `verify(...)` ABI shape against docs.world.org before wiring the gate.
5. **RPC** — `foundry.toml [rpc_endpoints]` uses the public Alchemy WC endpoints,
   which can rate-limit during a live deploy+verify. Have a fallback RPC ready.

---

## Build order

1. Re-confirm the locked facts (verify ABI, both verifier addresses, chain 480
   mainnet / no v4 on Sepolia 4801) against docs.world.org/world-id/idkit/onchain-verification.
2. **Resolve preconditions 1–2 first.** No gate code until a simulator proof is
   shown to verify against the Staging verifier on mainnet.
3. Write the IDKit→`verify` mapping table (already resolved in the plan, O2) into
   `docs/MECHANISM_DELTA.md`: `action = uint256(keccak256(action))`,
   `credentialGenesisIssuedAtMin` defaults to 0, `signalHash` from the response,
   `proof = uint256[5]`. This table is the build contract for the gate + frontend.
4. Build `contracts/src/sybil/WorldIDGate.sol` **from scratch** (no v4 verifier
   interface exists in the repo — add one; only the v3 `spike/SpikeVerifier.sol`
   is present). Constructor `(address worldIdVerifier, uint256 action, uint64 rpId)`;
   `abi.decode` the v4 9-tuple; assert `signalHash == keccak256(abi.encodePacked(signal)) >> 8`
   (reuse `ByteHasher.hashToField` from `spike/SpikeVerifier.sol`) and the action;
   call `WorldIDVerifier.verify(...)`; return the nullifier. `MockSybilGate` stays
   the cohort/test gate.
5. Add a mainnet branch to `Deploy.s.sol` that reads `WORLD_ID_VERIFIER` and
   constructs `WorldIDGate` in the same gate constructor slot
   (`new JurorRegistry(musd, gate)`). Keep the existing `PRIVATE_KEY` +
   `foundry.toml` rpc_endpoints conventions — do NOT invent `RPC_MAINNET` /
   `DEPLOYER_PRIVATE_KEY`. Add `WORLD_ID_VERIFIER` to `.env.example`.
6. Deploy to WC mainnet 480 against the Staging verifier
   (`WORLD_ID_VERIFIER=0x703a…`); register one juror with the staging proof
   (cents of gas, no Orb).
7. Demonstrate **both reverts**: (a) resubmit the valid proof → reverts in
   `JurorRegistry`'s nullifier mapping (duplicate); (b) corrupt one limb of the
   `uint256[5]` (`proof[0] ^= 1`) → reverts inside `WorldIDVerifier.verify`
   (Groth16). Capture both mainnet traces.
8. Add Foundry tests against a mock verifier: valid register, reused-nullifier
   revert, corrupted-limb (forged) revert, signal-mismatch revert.
9. Capture self-evidencing evidence in `docs/DEMO.md`: the worldscan trace showing
   `WorldIDVerifier.verify` called in-transaction + the forged-proof revert trace.
10. **Gate:** a mainnet registration verifies a v4 proof on-chain (visible in the
    tx, traceable on worldscan) AND a forged/duplicate attempt reverts on-chain.
    Confirm the same `WorldIDGate` is ready for the Step-5 Production swap (env-only).

---

## Code facts you must not get wrong (reconciled to the shipped contracts)

- **Two distinct `bytes proof` encodings.** `MockSybilGate` (cohort + tests +
  B5-on-cohort): `abi.encode(uint256 nullifier, address boundSignal)` — a 2-tuple;
  it decodes both, reverts `SignalMismatch()` if `boundSignal != signal`, returns
  the decoded nullifier. `WorldIDGate` (mainnet): the v4 9-tuple. Do not conflate.
- **`JurorRegistry`** has `register(address signal, bytes proof)` (requires
  `signal == msg.sender`), `postBond()`, `withdraw()` — **no `registerWithPermit2`**
  (Permit2 is a step-5 deliverable). `slash(address juror, uint256 amount, address to)`.
- **`DisputeCourt`** stored `Status` enum is `{Open, Drawn, Resolved}`; Commit/Reveal
  are time-derived UI phases via `phaseOf()`, not stored statuses. Commit hash =
  `keccak256(abi.encode(bool vote, bytes32 salt, uint256 caseId, address juror))`
  (abi.encode, NOT packed — wrong encoding bricks reveal). The historical Step-3.5
  court exposed `setDurations(uint64,uint64)` and deployed at 60s/60s; the replacement
  removes that function and enforces immutable durations of at least 300s/300s.
- **`RewardPool`** is a transfer-only sink: funds arrive by plain ERC-20 transfer;
  only view is `balance()` (no `deposit`/`receive`).
- **Env:** Foundry reads `PRIVATE_KEY` (+ `vm.envOr` `PANEL_SIZE`/`MIN_POOL`/
  `COMMIT_DURATION`/`REVEAL_DURATION`, current defaults 7/14/300/300). RPC is selected via
  `--rpc-url worldchain_mainnet` (a `foundry.toml` alias), not an env var.
- **Web:** the Mini App is at `web/src/app/(protected)/home`, NOT `/app`. The
  onboard flow today is **cloud-verify only** (`components/Verify/index.tsx` →
  `/api/verify-proof`, returns `{success:true}`, `signal: ''`); it does no on-chain
  extraction. Step 3.5/4 must build the on-chain path and set `signal` to the wallet.

## World ID frontend: the historical legacy → v4 rebuild

At the time of this experiment, the template verify flow was useful only as an
RP-signature + IDKit reference because it requested a legacy proof for cloud
verification. The current component is v4-only; the old behavior was:
- `/api/rp-signature` (server, signs with `RP_SIGNING_KEY`) returns the RP context — REUSE.
- a legacy IDKit request produced a v3-style proof bound to an empty signal.
- `completion.result` → `/api/verify-proof` → cloud verify at
  `developer.world.org/api/v4/verify/{rp_id}`. No on-chain proof, no contract call.

Step 3.5 must instead produce a **v4 on-chain proof tuple**. CONFIRMED working
recipe (probed this session with the Simulator, see `web/src/app/verify-onchain/`):
- Use `IDKit.request({ app_id, action, rp_context, allow_legacy_proofs: false,`
  **`environment: 'staging'`** `}).preset(proofOfHuman({ signal }))` — IDKit 4.1.8.
  The `proofOfHuman` preset returns the v4 tuple whose `responses[i].proof` is the
  `uint256[5]` "Compatible with WorldIDVerifier.sol" (4 Groth16 limbs + Merkle root).
- **`environment: 'staging'` is REQUIRED and easy to miss** — it defaults to
  `'production'`, and the World ID Simulator rejects production requests with
  "This simulator only accepts staging requests." (Confirmed: without it the
  Simulator connects but refuses; with it, it proceeds.) Step 5 uses real **Orb-verified**
  humans in the production environment. Device-level verification is not an eligibility
  alternative; a later per-draw device/face continuity check is post-Orb anti-rental defense.
- Generate the proof by pasting the request `connectorURI` into the Simulator
  (`simulator.worldcoin.org` → pick a "Verified (All)" identity → Paste Code).
- Set `signal` to the registering **wallet address** (not `''`) — the gate binds to it.
- For the precondition-2 probe you can keep `signal: ''` and just `cast call` the
  Staging verifier to confirm acceptance before building the full wallet-bound path.

**VERIFIED on-chain arg mapping** (`WorldIDVerifier.verify(uint256 nullifier, uint256
action, uint64 rpId, uint256 nonce, uint256 signalHash, uint64 expiresAtMin, uint64
issuerSchemaId, uint256 credentialGenesisIssuedAtMin, uint256[5] proof)`) — confirmed
by a live `cast call` that returned `0x`:
- `nullifier`, `nonce`, `signalHash` ← `responses[0].nullifier`, top-level `nonce`,
  `responses[0].signal_hash` (already field-fitted, leading `0x00`). Pass verbatim.
- **`action = uint256(keccak256(actionString)) >> 8`** — GOTCHA: the docs say
  `uint256(keccak256(action))` with NO shift, but the full keccak exceeds the BN254
  field and the verifier reverts `PublicInputNotInField()` (`0xa54f8e27`). It must be
  the same `>> 8` hashToField shift used for the signal. (For `juror-registration`:
  `0x00d6f0d2ac0113e07a903cc011df10d5da49fbd368c0ecc3c8257c9bce73e3ed`.)
- **`rpId = uint64` from the rp_id string with the `rp_` prefix stripped** — e.g.
  `rp_1ddcf8ba2efe3f36` → `0x1ddcf8ba2efe3f36`.
- `expiresAtMin`, `issuerSchemaId` ← `responses[0].expires_at_min`, `.issuer_schema_id`
  (`1` = proof_of_human). `credentialGenesisIssuedAtMin = 0` (absent in the response).
- **`proof = responses[0].proof` (`uint256[5]`): first 4 are the Groth16 limbs, the
  5th is the Merkle root** — corrupting the 5th reverts `InvalidMerkleRoot()`
  (`0x9dd854d3`); corrupting limbs 0-3 reverts `0x7fcdd1f4`. Useful selectors for the
  WorldIDGate's forged-proof revert test.
- A working reference request lives at `web/src/app/verify-onchain/page.tsx` (probe).

## Running the contracts here

`forge` is in WSL (1.7.1), not on the Windows/git-bash PATH. Invoke as:
`wsl -e bash -lc 'cd /mnt/c/dev/DemoThemisMVP/contracts && ~/.foundry/bin/forge test'`.
CI (`.github/workflows/ci.yml`, ubuntu) is the arbiter and is currently green.
