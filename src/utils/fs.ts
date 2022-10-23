import * as fs from "fs";

export const readFileHex = (path: string) => {
  return Buffer.from(fs.readFileSync(path)).toString("hex");
};

export const readSeedHex = (path: string) => {
  return fs.readFileSync(path, {
    encoding: "utf8",
    flag: "r",
  });
};

export const writeFileHex = (path: string, hex: string) => {
  fs.writeFileSync(path, hex);
};
