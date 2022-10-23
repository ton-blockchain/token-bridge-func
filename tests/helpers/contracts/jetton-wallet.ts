import { Address, Cell, contractAddress, Slice } from "ton";
import { SmartContract } from "ton-contract-executor";
import { Entity } from ".";
import { compile } from "../functions/compile";
import { buildJettonBridgeNetworkConfigRawCode, TJettonBridgeNetworkConfig } from "../functions/jetton-bridge-network-config";

export class JettonWallet extends Entity {

  static async buildCodeCell(networkConfig: TJettonBridgeNetworkConfig) {
    const files = [
      { name: "stdlib.fc" },
      { name: "params.fc" },
      { name: "op-codes.fc" },
      { name: "errors.fc" },
      { name: "utils.fc" },
      {
        raw: buildJettonBridgeNetworkConfigRawCode(networkConfig),
      },
    ];

    const codeCell = await compile([...files, { name: "jetton-wallet.fc" }]);

    return codeCell;
  }

  static async init(initialDataCell: Cell, networkConfig: TJettonBridgeNetworkConfig) {
    const codeCell = await JettonWallet.buildCodeCell(networkConfig);

    let contract = await SmartContract.fromCell(codeCell, initialDataCell);

    let address = contractAddress({
      workchain: 0,
      initialData: contract.dataCell,
      initialCode: contract.codeCell,
    });

    contract.setC7Config({
      myself: address,
    });

    return new JettonWallet(contract, address);
  }
}
