import TonWeb from "tonweb";
import { waitForDeploy } from "../utils/listeners";
import { WalletV3ContractR1 } from "tonweb/dist/types/contract/wallet/v3/wallet-v3-contract-r1";
import { VotesCollectorContract } from "../contracts/votes-collector.contract";
import { isDeployed } from "../utils/common";
import { transfer } from "../utils/wallet";
import { MultisigContract } from "../contracts/multisig.contract";
import shellExec from "shell-exec";
import * as fs from "fs";

const getBridgeConfig = ({
  bridgeAddressHash,
  multisigAddressHash,
  oracleAddressHash,
  oraclePublic,
}) => `
(int, int, cell) get_bridge_config() impure inline_ref {
  int bridge_address = 0x${bridgeAddressHash};

  int oracles_address = 0x${multisigAddressHash};

  cell oracles = new_dict();
  int oracle0_address = 0x${oracleAddressHash};
  int oracle0_secp_key = ${oraclePublic};

  oracles~udict_set(256, oracle0_address, begin_cell()
      .store_uint(oracle0_secp_key, 256)
      .end_cell()
      .begin_parse());

  return (bridge_address, oracles_address, oracles);
}`;

export const deployVotesCollector = async (
  tonweb: TonWeb,
  walletContract: WalletV3ContractR1,
  oracleWalletContract: WalletV3ContractR1,
  multisigContract: MultisigContract
) => {
  console.log("=== Deploy Votes Collector ===");

  fs.writeFileSync(
    "./artifacts/func/bridge-config.fc",
    getBridgeConfig({
      bridgeAddressHash: multisigContract.address.toString().split(":")[1],
      multisigAddressHash: multisigContract.address.toString().split(":")[1],
      oracleAddressHash: oracleWalletContract.address.toString().split(":")[1],
      oraclePublic:'0x89D12eBB0cDcb3Fe00045c9D97D8AbFC5F6c497e',
    })
  );

  await shellExec(
    "func -SPA -o ./build/votes-collector.fif ./src/func/bridge/stdlib.fc ./src/func/bridge/message_utils.fc ./artifacts/func/bridge-config.fc src/func/bridge/votes-collector.fc"
  );
  await shellExec("fift -s ./src/fift/print-hex.fif");

  const votesCollectorContract = new VotesCollectorContract(tonweb.provider, {
    wc: -1,
    publicKey: (walletContract as any).keyPair.publicKey,
  });

  await votesCollectorContract.getAddress();
  console.log(
    `Votes Collector address ${votesCollectorContract.address.toString(true)}`
  );

  if (!(await isDeployed(tonweb, votesCollectorContract.address.toString()))) {
    await transfer(
      tonweb,
      walletContract,
      votesCollectorContract.address.toString(true),
      "5.1"
    );
    const deploy = votesCollectorContract.deploy(
      (walletContract as any).secretKey
    );
    await deploy.send();
    await waitForDeploy(tonweb, votesCollectorContract.address);
    console.log("Votes Collector has been deployed");
  } else {
    console.log("Votes Collector already deployed");
  }

  votesCollectorContract.keyPair = (walletContract as any).keyPair;

  return votesCollectorContract;
};
