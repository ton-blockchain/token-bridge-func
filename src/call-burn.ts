import { recoverOrDeployWallet } from "./utils/wallet";
import TonWeb from "tonweb";
import { tonweb } from ".";
import * as fs from "fs";
import { keyPairFromSeed } from "./utils/crypto";

const seed = fs.readFileSync(`./artifacts/multisig.seed`);
const keyPair = keyPairFromSeed(seed);

const oracleWalletContract = tonweb.wallet.create({
  publicKey: keyPair.publicKey,
  wc: -1,
});

const jettonWalletAddress = "EQAzGhp5da8zaQRUAp6deCRvfaL1cdwaAFpQWud2PfN9l-3C";
const burnOP = 0x595f07bc;

const destinationAddress = new TonWeb.utils.BN('a846bc19E8ab8Bb0e0bf386853D8C5e199F0Af9b', 16);
const queryId = new TonWeb.utils.BN(0);
const jettonAmount = TonWeb.utils.toNano("1");

(async () => {
  const responseAddress = await oracleWalletContract.getAddress();

  console.log("=== Call Burn ===");

  //wallet
  const burnPayload = new TonWeb.boc.Cell();
  burnPayload.bits.writeUint(burnOP, 32);
  const customPayload = new TonWeb.boc.Cell();
  customPayload.bits.writeUint(destinationAddress, 160);
  burnPayload.refs.push(customPayload);

  //minter
  burnPayload.bits.writeUint(queryId, 64);
  burnPayload.bits.writeCoins(jettonAmount);
  burnPayload.bits.writeAddress(responseAddress);

  try {
    oracleWalletContract.methods
      .transfer({
        secretKey: keyPair.secretKey,
        toAddress: jettonWalletAddress,
        amount: TonWeb.utils.toNano("0.2"),
        seqno: (await oracleWalletContract.methods.seqno().call()) as number,
        payload: burnPayload,
        sendMode: 3,
      })
      .send();
  } catch (error) {
    console.error(error);
  }
})();
