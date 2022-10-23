import nacl from "tweetnacl";
import { bytesToHex, hexToBytes } from "./convert";
import { readFileHex, readSeedHex, writeFileHex } from "./fs";

export const generateSeed = () => {
  return nacl.sign.keyPair().secretKey.slice(0, 32);
};

export const recoverSeed = (name: string) => {
  let seed: Uint8Array;
  try {
    seed = hexToBytes(readSeedHex(`./artifacts/${name}.seed`));
  } catch (err) {
    seed = generateSeed();
    writeFileHex(`./artifacts/${name}.seed`, bytesToHex(seed));
  }
  return seed;
};

export const keyPairFromSeed = (seed: Uint8Array) => {
  return nacl.sign.keyPair.fromSeed(seed);
};
