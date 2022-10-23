import TonWeb from "tonweb";
import { tonweb } from ".";

const getWrappedTokenData = async () => {
  const result = await tonweb.provider.call2(jettonWalletAddress.toString(), "get_wrapped_token_data");
  console.log({ result });
};

const getJettonWalletAddress = async () => {
  const result = await tonweb.provider.call2(jettonWalletAddress.toString(), "get_wallet_data");
  const parsedAddress = parseAddress(result[2]).toString(true, true, true);
  console.log({ parsedAddress });
};

const readIntFromBitString = (bs, cursor, bits) => {
  let n = BigInt(0);
  for (let i = 0; i < bits; i++) {
    n *= BigInt(2);
    n += BigInt(bs.get(cursor + i));
  }
  return n;
};

export const parseAddress = (cell) => {
  let n = readIntFromBitString(cell.bits, 3, 8);
  if (n > BigInt(127)) {
    n = n - BigInt(256);
  }
  const hashPart = readIntFromBitString(cell.bits, 3 + 8, 256);
  if (n.toString(10) + ":" + hashPart.toString(16) === "0:0") return null;
  const s = n.toString(10) + ":" + hashPart.toString(16).padStart(64, "0");
  return new TonWeb.Address(s);
};

const jettonWalletAddress = "EQBOSHGNgxh8ZtytDcnGwI7CuWP3tIIBBVXQAYP0ACJvNk_1";
(async () => {
  // await getWrappedTokenData();
})();
