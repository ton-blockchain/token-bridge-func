import { Address } from "ton";
import { pseudoRandomBytes } from "crypto";

export function randomAddress(wc: number = 0) {
  return new Address(wc, pseudoRandomBytes(32));
}
