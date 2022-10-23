import TonWeb from "tonweb";
import { WalletV3ContractR1 } from "tonweb/dist/types/contract/wallet/v3/wallet-v3-contract-r1";
import { MultisigContract } from "../contracts/multisig.contract";
import { isDeployed } from "../utils/common";
import { waitForDeploy } from "../utils/listeners";
import { transfer } from "../utils/wallet";

export const deployOracleWallet = async (
  tonweb: TonWeb,
  walletContract: WalletV3ContractR1,
  multisigContract: MultisigContract
) => {
  console.log("=== Deploy Oracle Wallet ===");

  const oracleWalletContract = tonweb.wallet.create({
    publicKey: multisigContract.keyPair.publicKey,
    wc: -1,
  });

  await oracleWalletContract.getAddress();
  console.log(
    `Oracle Wallet address ${oracleWalletContract.address.toString(true)}`
  );

  if (!(await isDeployed(tonweb, oracleWalletContract.address.toString()))) {
    await transfer(
      tonweb,
      walletContract,
      oracleWalletContract.address.toString(),
      "5.1"
    );
    const deploy = oracleWalletContract.deploy(
      multisigContract.keyPair.secretKey
    );
    await deploy.send();
    await waitForDeploy(tonweb, oracleWalletContract.address);
    console.log("Oracle Wallet has been deployed");
  } else {
    console.log("Oracle Wallet already deployed");
  }

  (oracleWalletContract as any).keyPair = multisigContract.keyPair;

  return oracleWalletContract;
};
