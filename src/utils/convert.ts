import TonWeb from "tonweb";

export const hexToBytes = (hex: string) => {
  return TonWeb.utils.hexToBytes(hex);
};

export const bytesToHex = (bytes: Uint8Array) => {
  return TonWeb.utils.bytesToHex(bytes);
};

export const base64ToBytes = (base64: string) => {
  return TonWeb.utils.base64ToBytes(base64);
};
