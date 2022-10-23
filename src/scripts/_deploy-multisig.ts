import * as fs from "fs";
import shellExec from "shell-exec";
import TonWeb from "tonweb";
import { WalletV3ContractR1 } from "tonweb/dist/types/contract/wallet/v3/wallet-v3-contract-r1";
import { isDeployed } from "../utils/common";
import { transfer } from "../utils/wallet";
import { hexToBytes } from "../utils/convert";
import { keyPairFromSeed } from "../utils/crypto";
import { waitForDeploy } from "../utils/listeners";
import { MultisigContract } from "../contracts/multisig.contract";

export const deployMultisig = async (
  tonweb: TonWeb,
  walletContract: WalletV3ContractR1
) => {
  console.log("=== Deploy Multisig ===");

  await shellExec("fift -s ./src/fift/new-key.fif");
  const seed = fs.readFileSync(`./artifacts/multisig.seed`);
  const keyPair = keyPairFromSeed(seed);
  const publicKeyHex = Buffer.from(keyPair.publicKey).toString("hex");
  const publicKeyWithPrefixes = hexToBytes(`3ee6${publicKeyHex}`);
  const tonPublicKey = Buffer.from(
    `3ee6${publicKeyHex}${Buffer.from(
      TonWeb.utils.crc16(publicKeyWithPrefixes)
    ).toString("hex")}`,
    "hex"
  ).toString("base64");

  fs.writeFileSync("./artifacts/multisig.ton.public", tonPublicKey);

  await shellExec(
    "fift -s ./src/fift/jetton-bridge/new-multisig.fif -1 1 100 multisig 1 ./artifacts/multisig.ton.public"
  );

  const multisigContractAddress = new TonWeb.Address(
    `-1:${fs
      .readFileSync("./multisig.addr", {
        encoding: "hex",
      })
      .slice(0, -8)}`
  );
  const multisigContractInitMessageBoc = fs.readFileSync(
    "./multisig-create.boc",
    {
      encoding: "base64",
    }
  );

  console.log(`Multisig address ${multisigContractAddress.toString(true)}`);

  if (!(await isDeployed(tonweb, multisigContractAddress.toString()))) {
    await transfer(
      tonweb,
      walletContract,
      multisigContractAddress.toString(true),
      "5.1"
    );
    await tonweb.provider.sendBoc(multisigContractInitMessageBoc);
    await waitForDeploy(tonweb, multisigContractAddress);
    console.log("Multisig has been deployed");
  } else {
    console.log("Multisig already deployed");
  }

  fs.unlinkSync("./multisig-create.boc");
  fs.unlinkSync("./multisig.addr");

  const multisigContract = new MultisigContract(tonweb.provider, {
    address: multisigContractAddress,
  });

  multisigContract.keyPair = keyPair;

  return multisigContract;
};
