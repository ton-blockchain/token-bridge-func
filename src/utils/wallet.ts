import { keyPairFromSeed, recoverSeed } from "./crypto";
import BigNumber from "bignumber.js";
import TonWeb from "tonweb";
import { WalletV3ContractR1 } from "tonweb/dist/types/contract/wallet/v3/wallet-v3-contract-r1";
import { waitForDeposit } from "./listeners";

export const recoverOrDeployWallet = async (tonweb: TonWeb, wc = 0) => {
  const seed = recoverSeed("wallet");
  const keyPair = keyPairFromSeed(seed);

  const walletContract = tonweb.wallet.create({
    publicKey: keyPair.publicKey,
    wc,
  });

  const address = await walletContract.getAddress();
  const addressStr = address.toString(true, true, false, false);

  const info = await tonweb.provider.getAddressInfo(addressStr);

  if (info.state !== "active") {
    if (new BigNumber(await tonweb.getBalance(address)).gt("10000000")) {
      try {
        const deploy = walletContract.deploy(keyPair.secretKey);
        await deploy.send();
      } catch (err) {
        console.log({ err });
      }
    } else {
      throw new Error(
        `To deploy wallet you need to deposit more than 0.1 TON to ${addressStr}`
      );
    }
  }

  (walletContract as any).keyPair = keyPair;

  return {
    seed,
    keyPair,
    walletContractAddress: addressStr,
    walletContract,
  };
};

export const transfer = async (
  tonweb,
  walletContract: WalletV3ContractR1,
  toAddress: string,
  amount: string
) => {
  walletContract.methods
    .transfer({
      secretKey: (walletContract as any).keyPair.secretKey,
      toAddress,
      amount: TonWeb.utils.toNano(amount),
      seqno: (await walletContract.methods.seqno().call()) as number,
      payload: "",
      sendMode: 3,
    })
    .send();

  await waitForDeposit(tonweb, toAddress);
};
