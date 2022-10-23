import { recoverOrDeployWallet } from "./utils/wallet";
import TonWeb from "tonweb";
import { tonweb } from ".";
import * as fs from "fs";
import { keyPairFromSeed } from "./utils/crypto";

const seed = fs.readFileSync(`./artifacts/multisig.seed`);
const keyPair = keyPairFromSeed(seed);

const minterAddress = 'EQC-y9VDuiLFefGF50gvxyw2gd2MPfIIgyyoYys1yEkFC22i';

const oracleWalletContract = tonweb.wallet.create({
    publicKey: keyPair.publicKey,
    wc: -1,
});
const bridgeConfig =fs.readFileSync(`./artifacts/hr/system.json`, {encoding: 'utf8'});


const setAddressOP = 22;
const queryId = new TonWeb.utils.BN(0);
const bridgeAddress = JSON.parse(bridgeConfig).jettonBridge.address;

console.log({bridgeAddress});

(async () => {
    const setAddressPayload = new tonweb.boc.Cell();
    setAddressPayload.bits.writeUint(setAddressOP, 32); 
    setAddressPayload.bits.writeUint(queryId, 64);
    setAddressPayload.bits.writeAddress(new TonWeb.Address(bridgeAddress));

    try {
        oracleWalletContract.methods
        .transfer({
          secretKey: keyPair.secretKey,
          toAddress: minterAddress,
          amount: TonWeb.utils.toNano("0.2"),
          seqno: (await oracleWalletContract.methods.seqno().call()) as number,
          payload: setAddressPayload,
          sendMode: 3,
        })
        .send(); 
      } catch (error) {
        console.error(error)
      }
})();