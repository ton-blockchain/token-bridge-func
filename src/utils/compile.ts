import shellExec from "shell-exec";

export const JETTON_BRIDGE_SOURCE = "src/func/jetton-bridge/";
export const JETTON_BRIDGE_BUILD = "build/jetton-bridge/";

export const compile = async (
  name: string,
  files: string[],
  buildPath: string = JETTON_BRIDGE_BUILD,
  sourcePath: string = JETTON_BRIDGE_SOURCE
) => {
  const res = await shellExec(
    `func -SPA -o ${buildPath}${name}.fif ${files
      .map((file) => `${sourcePath}${file}`)
      .join(" ")}`
  );
  if (res.stderr) {
    throw new Error(`Compile error! ${name} ${res.stderr}`);
  }
};

export const makeCodeHex = async (name: string) => {
  const res = await shellExec(`fift -s ./src/fift/${name}.fif`);
  if (res.stderr) {
    throw new Error(`Make code hex error! ${name} ${res.stderr}`);
  }
};
