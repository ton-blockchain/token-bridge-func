import { randomUUID } from "crypto";
import shellExec from "shell-exec";
import { Cell } from "ton";
import * as os from "os";
import path from "path";
import { path as rootPath } from "app-root-path";
import { readFile, writeFile, unlink } from "fs/promises";
import { readFileSync } from "fs";
import { compileFift, compileFunc } from "tonc";

export const JETTON_BRIDGE_SOURCE = "src/func/jetton-bridge/";

export async function createTempFile(ext: string) {
  let name = randomUUID();
  let fullPath = path.resolve(os.tmpdir(), name + ext);
  await writeFile(fullPath, Buffer.alloc(0));
  return {
    name: fullPath,
    destroy: async () => {
      await unlink(fullPath);
    },
  };
}

export const compile = async (files: { name?: string; raw?: string }[], sourcePath: string = JETTON_BRIDGE_SOURCE) => {
  const sourceCode = files
    .map((file) => {
      if (!file.raw) return readFileSync(`${path.resolve(rootPath, sourcePath)}/${file.name}`, "utf-8");
      return file.raw;
    })
    .join("\n");
  const fiftContent = await compileFunc(sourceCode);
  const code = Cell.fromBoc(await compileFift(fiftContent))[0];
  return code;
};

export const makeCodeHex = async (name: string) => {
  const res = await shellExec(`fift -s ./src/fift/${name}.fif`);
  if (res.stderr) {
    throw new Error(`Make code hex error! ${name} ${res.stderr}`);
  }
};
