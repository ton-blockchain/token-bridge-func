import BigNumber from "bignumber.js";
import { Hash } from "crypto";
import { Address, Cell, CommonMessageInfo, contractAddress, InternalMessage, Slice } from "ton";
import { SmartContract, TVMStackEntry, TVMStackEntryCell, TVMStackEntryCellSlice, TVMStackEntryInt, TVMStackEntryTuple } from "ton-contract-executor";
import { Entity } from ".";
import { compile } from "../functions/compile";
import { buildJettonBridgeNetworkConfigRawCode, TJettonBridgeNetworkConfig } from "../functions/jetton-bridge-network-config";
import { TJettonData } from "./jetton-minter.utils";

export class JettonMinter extends Entity {

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
    const codeCell = await compile([...files, { name: "jetton-minter.fc" }]);

    let contract = await SmartContract.fromCell(codeCell, initialDataCell);
    let address = contractAddress({
      workchain: -1,
      initialData: contract.dataCell,
      initialCode: contract.codeCell,
    });
    contract.setC7Config({
      myself: address,
    });

    return new JettonMinter(contract, address);
  }

  async getJettonData(): Promise<TJettonData> {
    let res = await this.contract.invokeGetMethod("get_jetton_data", []);
    if (res.exit_code !== 0) {
      throw new Error(`Unable to invoke get_jetton_data on contract`);
    }

    const [totalSupply, workchain, jettonMinterAddress, content, jettonWalletCode] = res.result as [
      BigNumber,
      BigNumber,
      Slice,
      Cell,
      Cell
    ];

    return {
      totalSupply: totalSupply.toNumber(),
      workchain: workchain.toNumber(),
      jettonMinterAddress: jettonMinterAddress.readAddress(),
      content,
      jettonWalletCode,
    };
  }

  async getWrappedTokenData() {
    let res = await this.contract.invokeGetMethod("get_wrapped_token_data", []);
    if (res.exit_code !== 0) {
      throw new Error(`Unable to invoke get_bridge_data on contract`);
    }
    const [
      chainId,
      tokenAddress,
      tokenDecimals,
      tokenName,
      tokenSymbol
    ] = res.result as [
      number,
      number,
      number,
      Slice,
      Slice
    ];

    const tokenNameString = Buffer.from(tokenName.readRemaining().toFiftHex(), 'hex').toString();
    const tokenSymbolString = Buffer.from(tokenSymbol.readRemaining().toFiftHex(), 'hex').toString();

    return { chainId, tokenAddress, tokenDecimals, tokenNameString, tokenSymbolString }
  }

  async getWalletAddress(owner: Address): Promise<Address> {
    const cellAddr = new Cell();
    cellAddr.bits.writeAddress(owner);
    const address: TVMStackEntryCellSlice = {
      type: "cell_slice",
      value: cellAddr.toBoc().toString('base64')
    }

    let res = await this.contract.invokeGetMethod("get_wallet_address", [address]);
    if (res.exit_code !== 0) {
      throw new Error(`Unable to invoke get_bridge_data on contract`);
    }
    const [jettonWalletAddress] = res.result as [Slice];

    return jettonWalletAddress.readAddress();

  }

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
    const codeCell = await compile([...files, { name: "jetton-minter.fc" }]);

    return codeCell;
  }
}
