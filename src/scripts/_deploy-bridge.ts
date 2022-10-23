import TonWeb from "tonweb";
import { BridgeContract } from "../contracts/bridge-contract";
import { waitForDeploy } from "../utils/listeners";
import { WalletV3ContractR1 } from "tonweb/dist/types/contract/wallet/v3/wallet-v3-contract-r1";
import { isDeployed } from "../utils/common";
import { transfer } from "../utils/wallet";
import shellExec from "shell-exec";

export const deployBridge = async (
  tonweb: TonWeb,
  walletContract: WalletV3ContractR1
) => {
  console.log("=== Deploy Bridge ===");

  await shellExec(
    "func -SPA -o ./build/bridge.fif ./src/func/bridge/stdlib.fc ./src/func/bridge/text_utils.fc src/func/bridge/message_utils.fc artifacts/func/bridge-config.fc src/func/bridge/bridge_code.fc"
  );
  await shellExec("fift -s ./src/fift/print-hex.fif");

  const bridgeContract = new BridgeContract(tonweb.provider, {
    wc: -1,
    publicKey: (walletContract as any).keyPair.publicKey,
    stateFlags: 0,
    totalLocked: tonweb.utils.toNano("0"),
    collectorAddress: new TonWeb.Address(
      "-1:178057b141138abf835217357e282d1f6ffa4566a90f0e01571c5df6584ba78a"
    ),
    flatReward: tonweb.utils.toNano("0.1"),
    networkFee: tonweb.utils.toNano("0.1"),
    factor: 0,
  });

  await bridgeContract.getAddress();
  console.log(`Bridge address ${bridgeContract.address.toString(true)}`);

  if (!(await isDeployed(tonweb, bridgeContract.address.toString()))) {
    await transfer(
      tonweb,
      walletContract,
      bridgeContract.address.toString(true),
      "5.1"
    );
    const deploy = bridgeContract.deploy((walletContract as any).secretKey);
    await deploy.send();
    await waitForDeploy(tonweb, bridgeContract.address);
    console.log("Bridge has been deployed");
  } else {
    console.log("Bridge already deployed");
  }

  bridgeContract.keyPair = (walletContract as any).keyPair;

  return bridgeContract;
};
