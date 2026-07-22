// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {ISybilGate} from "../src/sybil/ISybilGate.sol";
import {MockSybilGate} from "../src/sybil/MockSybilGate.sol";
import {WorldIDRouterGate} from "../src/sybil/WorldIDRouterGate.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {RewardPool} from "../src/RewardPool.sol";
import {DisputeCourt} from "../src/DisputeCourt.sol";
import {DealEscrow} from "../src/DealEscrow.sol";
import {IDisputeCourt} from "../src/interfaces/IDisputeCourt.sol";

/// @notice Deploys + wires a full DemoThemis instance.
///   Sepolia cohort:   PANEL_SIZE=7  MIN_POOL=14 (the 2x rule), MockSybilGate.
///   Mainnet recovery: PANEL_SIZE=3  MIN_POOL=4, WorldIDRouterGate over the
///                     documented World Chain mainnet Router.
///                     One spare tolerates one pre-draw withdrawal; MIN_POOL is
///                     an opening floor, not a pool-size cap.
///
/// The sybil gate is chosen by the WORLD_ID_ROUTER env var:
///   - unset (cohort):  MockSybilGate (labeled stand-in, docs/MECHANISM_DELTA.md).
///   - set   (mainnet): WorldIDRouterGate pointed at the supported Router, in the
///                      SAME gate constructor slot. WORLD_ID_APP_ID is required.
///                      The preview v4 verifier is intentionally not a deploy
///                      option here. Historical addresses remain in deployment
///                      records and must never be overwritten.
///
///   Cohort:  forge script script/Deploy.s.sol --rpc-url worldchain_sepolia --broadcast
///   Mainnet: WORLD_ID_ROUTER=0x17B354dD2595411ff79041f930e491A4Df39A278 \
///              WORLD_ID_APP_ID=app_7bdfda4db4e2f59dd4a2427cd2bd860d PANEL_SIZE=3 MIN_POOL=4 \
///              forge script script/Deploy.s.sol --rpc-url worldchain_mainnet --broadcast
contract Deploy is Script {
    /// @dev The World ID action this app gates registration on.
    string internal constant ACTION = "juror-registration";

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        uint256 panelSize = vm.envOr("PANEL_SIZE", uint256(7));
        uint256 minPool = vm.envOr("MIN_POOL", uint256(14));
        // Immutable, human-safe voting windows. The court rejects values below
        // five minutes and exposes no post-deployment duration setter.
        uint64 commitDur = uint64(vm.envOr("COMMIT_DURATION", uint256(300)));
        uint64 revealDur = uint64(vm.envOr("REVEAL_DURATION", uint256(300)));
        // When set, deploy the supported Router gate (mainnet); otherwise the
        // cohort MockSybilGate. The v4 preview verifier is not accepted here.
        address worldIdRouter = vm.envOr("WORLD_ID_ROUTER", address(0));

        // protocol treasury is the deployer for the cohort (the reward pool is a
        // passive sink with no governor)
        address treasury = vm.addr(pk);

        vm.startBroadcast(pk);
        MockUSD musd = new MockUSD();

        ISybilGate gate;
        if (worldIdRouter == address(0)) {
            gate = new MockSybilGate();
            console.log("gate=MockSybilGate (cohort stand-in)");
        } else {
            string memory appId = vm.envString("WORLD_ID_APP_ID");
            gate = new WorldIDRouterGate(worldIdRouter, appId, ACTION);
            console.log("gate=WorldIDRouterGate (documented mainnet Router)");
            console.log("  worldIdRouter=%s", worldIdRouter);
            console.log("  appId=%s", appId);
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
