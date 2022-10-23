import TonWeb from "tonweb";
import { hexToBytes } from "./utils/convert";
import { readSeedHex } from "./utils/fs";
import * as fs from "fs";

require("dotenv").config();

export const tonweb = new TonWeb(
  new TonWeb.HttpProvider(process.env.HTTP_PROVIDER_API_ROOT, {
    apiKey: process.env.HTTP_PROVIDER_API_KEY,
  })
);

export const Cell = tonweb.boc.Cell;
export const Address = tonweb.utils.Address;
export const Contract = tonweb.Contract;
