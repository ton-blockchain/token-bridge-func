import TonWeb from "tonweb";
import { waitForDeploy } from "../utils/listeners";
import { WalletV3ContractR1 } from "tonweb/dist/types/contract/wallet/v3/wallet-v3-contract-r1";
import { VotesCollectorContract } from "../contracts/votes-collector.contract";
import { isDeployed } from "../utils/common";
import { transfer } from "../utils/wallet";
import { MultisigContract } from "../contracts/multisig.contract";
import shellExec from "shell-exec";
import * as fs from "fs";

export const deployVotesCollectorDefaultConfig = async (
  tonweb: TonWeb,
  walletContract: WalletV3ContractR1,
  oracleWalletContract: WalletV3ContractR1,
  multisigContract: MultisigContract
) => {
  console.log("=== Deploy Votes Collector ===");

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
