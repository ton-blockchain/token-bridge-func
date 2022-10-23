import TonWeb from "tonweb";
import { JettonBridgeContract } from "../contracts/jetton-bridge-contract";
import { waitForDeploy } from "../utils/listeners";
import { WalletV3ContractR1 } from "tonweb/dist/types/contract/wallet/v3/wallet-v3-contract-r1";
import { MultisigContract } from "../contracts/multisig.contract";
import { isDeployed } from "../utils/common";
import { transfer } from "../utils/wallet";

export const deployJettonBridgeDefaultConfig = async (
  tonweb: TonWeb,
  walletContract: WalletV3ContractR1,
  multisigContract: MultisigContract
) => {
  console.log("=== Deploy JettonBridgeContract ===");

  const jettonBridgeContract = new JettonBridgeContract(tonweb.provider, {
    wc: -1,
    publicKey: (walletContract as any).keyPair.publicKey,
    collectorAddress: multisigContract.address,
  });

  await jettonBridgeContract.getAddress();
  console.log(`Jetton Bridge address ${jettonBridgeContract.address.toString(true)}`);

  if (!(await isDeployed(tonweb, jettonBridgeContract.address.toString()))) {
    await transfer(tonweb, walletContract, jettonBridgeContract.address.toString(true), "5.1");
    const deploy = jettonBridgeContract.deploy((walletContract as any).keyPair.secretKey);
    await deploy.send();
    await waitForDeploy(tonweb, jettonBridgeContract.address);
    console.log("Jetton Bridge has been deployed");
  } else {
    console.log("Jetton Bridge already deployed");
  }

  jettonBridgeContract.keyPair = (walletContract as any).keyPair;

  return jettonBridgeContract;
};
