import BigNumber from "bignumber.js";
import { Address, Cell, CommonMessageInfo, contractAddress, InternalMessage, Slice } from "ton";
import { SmartContract, TVMStackEntryCell, TVMStackEntryCellSlice } from "ton-contract-executor";
import { Entity } from ".";
import { compile } from "../functions/compile";
import {
  buildJettonBridgeNetworkConfigRawCode,
  TJettonBridgeNetworkConfig,
} from "../functions/jetton-bridge-network-config";
import { buildWrappedTokenData, TWrappedTokenData } from "../utils/wrapped-token-data";
import { TJettonBridgeInitialData } from "./jetton-bridge.utils";

export class JettonBridge extends Entity {
  async getJettonBridgeData(): Promise<TJettonBridgeInitialData> {
    let res = await this.contract.invokeGetMethod("get_bridge_data", []);
    if (res.exit_code !== 0) {
      throw new Error(`Unable to invoke get_bridge_data on contract`);
    }
    const [collectorWc, collectorAddressHash, jettonMinterCode, jettonWalletCode] = res.result as [
      BigNumber,
      BigNumber,
      Cell,
      Cell
    ];

    return {
      collectorAddress: new Address(collectorWc.toNumber(), Buffer.from(collectorAddressHash.toString(16), "hex")),
      jettonMinterCode,
      jettonWalletCode,
    };
  }

  async getMinterAddress(wrappedTokenData: TWrappedTokenData): Promise<Address> {
    const cellWrappedTokenData = buildWrappedTokenData(wrappedTokenData);
    const wrappedTokenDataEntryCell: TVMStackEntryCellSlice = {
      type: "cell_slice",
      value: cellWrappedTokenData.toBoc().toString('base64')
    }

    let res = await this.contract.invokeGetMethod("get_minter_address", [wrappedTokenDataEntryCell]);

    if (res.exit_code !== 0) {
      throw new Error(`Unable to invoke get_minter_address on contract`);
    }
    const [jettonMinterAddress] = res.result as [Slice];

    return jettonMinterAddress.readAddress();

  }

  static async init(initialDataCell: Cell, networkConfig: TJettonBridgeNetworkConfig) {
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
    const codeCell = await compile([...files, { name: "jetton-bridge.fc" }]);

    let contract = await SmartContract.fromCell(codeCell, initialDataCell);

    let address = contractAddress({
      workchain: -1,
      initialData: contract.dataCell,
      initialCode: contract.codeCell,
    });

    contract.setC7Config({
      myself: address,
    });

    return new JettonBridge(contract, address);
  }
}
