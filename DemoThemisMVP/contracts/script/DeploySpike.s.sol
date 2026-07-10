// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpikeVerifier, IWorldID} from "../src/spike/SpikeVerifier.sol";
import {Ping} from "../src/spike/Ping.sol";

// Deploys the step-1 spike contracts.
//
// Sepolia (SpikeVerifier + Ping):
//   forge script script/DeploySpike.s.sol --rpc-url worldchain_sepolia --broadcast
// Mainnet (Ping only, for the sponsored-tx test):
//   DEPLOY_VERIFIER=false forge script script/DeploySpike.s.sol --rpc-url worldchain_mainnet --broadcast
//
// Required env (.env at repo root, see .env.example):
//   PRIVATE_KEY, WORLD_ID_ROUTER, WORLD_APP_ID_STAGING
contract DeploySpike is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        bool deployVerifier = vm.envOr("DEPLOY_VERIFIER", true);

        vm.startBroadcast(pk);
        if (deployVerifier) {
            address router = vm.envAddress("WORLD_ID_ROUTER");
            string memory appId = vm.envString("WORLD_APP_ID_STAGING");
            SpikeVerifier verifier = new SpikeVerifier(IWorldID(router), appId, "juror-registration");
            console.log("SpikeVerifier:", address(verifier));
        }
        Ping ping = new Ping();
        console.log("Ping:", address(ping));
        vm.stopBroadcast();
    }
}
