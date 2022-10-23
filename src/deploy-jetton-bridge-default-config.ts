require("dotenv").config();

import TonWeb from "tonweb";
import * as fs from "fs";
import { deployJettonBridge } from "./scripts/_deploy-jetton-bridge";
import { deployMultisig } from "./scripts/_deploy-multisig";
import { deployOracleWallet } from "./scripts/_deploy-oracle-wallet";
import { deployVotesCollectorDefaultConfig } from "./scripts/_deploy-votes-collector-default-config";
import { compile, makeCodeHex } from "./utils/compile";
import { recoverOrDeployWallet } from "./utils/wallet";
import { deployJettonBridgeDefaultConfig } from "./scripts/_deploy-jetton-bridge-default-config";

export const tonweb = new TonWeb(
  new TonWeb.HttpProvider(process.env.HTTP_PROVIDER_API_ROOT, {
    apiKey: process.env.HTTP_PROVIDER_API_KEY,
  })
);

(async () => {
  const files = ["stdlib.fc", "params.fc", "op-codes.fc", "errors.fc", "utils.fc", "config.fc"];

  await compile("jetton-wallet", [...files, "jetton-wallet.fc"]);
  await compile("jetton-minter", [...files, "jetton-minter.fc"]);
  await compile("jetton-bridge", [...files, "jetton-bridge.fc"]);
  await compile("multisig", [...files, "multisig.fc"]);
  await compile("votes-collector", [...files, "votes-collector.fc"]);

  await makeCodeHex("print-jetton-bridge");

  const { walletContract } = await recoverOrDeployWallet(tonweb);

  console.log(`Wallet address ${walletContract.address.toString(true)}`);

  const multisigContract = await deployMultisig(tonweb, walletContract);
  const oracleWalletContract = await deployOracleWallet(tonweb, walletContract, multisigContract);
  const votesCollectorContract = await deployVotesCollectorDefaultConfig(
    tonweb,
    walletContract,
    oracleWalletContract,
    multisigContract
  );
  const jettonBridgeContract = await deployJettonBridgeDefaultConfig(tonweb, walletContract, multisigContract);

  const jettonBridgeDefaultConfig = {
    wallet: {
      address: walletContract.address.toString(true, true, true),
      publicKey: Buffer.from((walletContract as any).keyPair.publicKey).toString("hex"),
    },
    oracleWallet: {
      address: oracleWalletContract.address.toString(true, true, true),
      publicKey: Buffer.from((oracleWalletContract as any).keyPair.publicKey).toString("hex"),
    },
    multisig: {
      address: multisigContract.address.toString(true, true, true),
      publicKey: Buffer.from(multisigContract.keyPair.publicKey).toString("hex"),
    },
    votesCollector: {
      address: votesCollectorContract.address.toString(true, true, true),
      publicKey: Buffer.from(votesCollectorContract.keyPair.publicKey).toString("hex"),
    },
    jettonBridge: {
      address: jettonBridgeContract.address.toString(true, true, true),
      publicKey: Buffer.from(jettonBridgeContract.keyPair.publicKey).toString("hex"),
    },
  };

  fs.writeFileSync("./artifacts/hr/jetton-bridge-default-config.json", JSON.stringify(jettonBridgeDefaultConfig));

  console.log(jettonBridgeDefaultConfig);
})();
