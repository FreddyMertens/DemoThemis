// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {ISybilGate} from "../src/sybil/ISybilGate.sol";
import {MockSybilGate} from "../src/sybil/MockSybilGate.sol";
import {WorldIDGate} from "../src/sybil/WorldIDGate.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {RewardPool} from "../src/RewardPool.sol";
import {DisputeCourt} from "../src/DisputeCourt.sol";
import {DealEscrow} from "../src/DealEscrow.sol";
import {IDisputeCourt} from "../src/interfaces/IDisputeCourt.sol";

/// @notice Deploys + wires a full DemoThemis instance.
///   Sepolia cohort:   PANEL_SIZE=7  MIN_POOL=14 (the 2x rule), MockSybilGate.
///   Mainnet recovery: PANEL_SIZE=3  MIN_POOL=4, WorldIDGate over the official
///                     World ID 4.0 Production verifier proxy.
///                     One spare tolerates one pre-draw withdrawal; MIN_POOL is
///                     an opening floor, not a pool-size cap.
///
/// The sybil gate is chosen by the WORLD_ID_VERIFIER env var:
///   - unset (cohort):  MockSybilGate (labeled stand-in, docs/MECHANISM_DELTA.md).
///   - set   (mainnet): WorldIDGate pointed at the official v4 Production proxy,
///                      in the SAME gate constructor slot. WORLD_ID_RP_ID is
///                      required. World Chain mainnet rejects every other verifier
///                      address, including Staging and the legacy v3 Router.
///
///   Cohort:  forge script script/Deploy.s.sol --rpc-url worldchain_sepolia --broadcast
///   Mainnet: WORLD_ID_VERIFIER=0x00000000009E00F9FE82CfeeBB4556686da094d7 \
///              WORLD_ID_RP_ID=0x1ddcf8ba2efe3f36 PANEL_SIZE=3 MIN_POOL=4 \
///              forge script script/Deploy.s.sol --rpc-url worldchain_mainnet --broadcast
contract Deploy is Script {
    /// @dev The World ID action this app gates registration on.
    string internal constant ACTION = "juror-registration";
    address internal constant WORLD_ID_V4_PRODUCTION_VERIFIER = 0x00000000009E00F9FE82CfeeBB4556686da094d7;
    uint256 internal constant WORLD_CHAIN_MAINNET = 480;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        bool isWorldChainMainnet = block.chainid == WORLD_CHAIN_MAINNET;
        uint256 panelSize = vm.envOr("PANEL_SIZE", isWorldChainMainnet ? uint256(3) : uint256(7));
        uint256 minPool = vm.envOr("MIN_POOL", isWorldChainMainnet ? uint256(4) : uint256(14));
        // Immutable, human-safe voting windows. The court rejects values below
        // five minutes and exposes no post-deployment duration setter.
        uint64 commitDur = uint64(vm.envOr("COMMIT_DURATION", uint256(300)));
        uint64 revealDur = uint64(vm.envOr("REVEAL_DURATION", uint256(300)));
        // Mainnet must use the official World ID 4.0 Production verifier. Other
        // chains default to the labeled cohort stand-in unless a verifier is
        // explicitly supplied for an integration test.
        address worldIdVerifier = vm.envOr("WORLD_ID_VERIFIER", address(0));
        if (isWorldChainMainnet) {
            require(
                worldIdVerifier == WORLD_ID_V4_PRODUCTION_VERIFIER,
                "mainnet requires the World ID v4 Production verifier"
            );
        }

        // protocol treasury is the deployer for the cohort (the reward pool is a
        // passive sink with no governor)
        address treasury = vm.addr(pk);

        vm.startBroadcast(pk);
        MockUSD musd = new MockUSD();

        ISybilGate gate;
        if (worldIdVerifier == address(0)) {
            gate = new MockSybilGate();
            console.log("gate=MockSybilGate (cohort stand-in)");
        } else {
            uint256 rpIdRaw = vm.envUint("WORLD_ID_RP_ID");
            require(rpIdRaw != 0 && rpIdRaw <= type(uint64).max, "WORLD_ID_RP_ID must fit uint64");
            uint256 actionField = uint256(keccak256(bytes(ACTION))) >> 8;
            gate = new WorldIDGate(worldIdVerifier, actionField, uint64(rpIdRaw));
            console.log("gate=WorldIDGate (World ID 4.0 Production)");
            console.log("  worldIdVerifier=%s", worldIdVerifier);
            console.log("  rpId=%s", rpIdRaw);
            console.log("  action=%s", ACTION);
        }

        JurorRegistry registry = new JurorRegistry(musd, gate);
        RewardPool rewardPool = new RewardPool(musd);
        DisputeCourt court =
            new DisputeCourt(musd, registry, address(rewardPool), treasury, panelSize, minPool, commitDur, revealDur);
        DealEscrow escrow = new DealEscrow(musd, IDisputeCourt(address(court)));
        registry.setCourt(address(court));
        court.setEscrow(address(escrow));
        vm.stopBroadcast();

        console.log("MockUSD=%s", address(musd));
        console.log("SybilGate=%s", address(gate));
        console.log("JurorRegistry=%s", address(registry));
        console.log("RewardPool=%s", address(rewardPool));
        console.log("DisputeCourt=%s", address(court));
        console.log("DealEscrow=%s", address(escrow));
    }
}
