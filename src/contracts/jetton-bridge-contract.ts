import { Contract, Cell, Address } from "..";
import TonWeb, { ContractOptions } from "tonweb";
import nacl from "tweetnacl";
import { readFileHex } from "../utils/fs";

// @ts-ignore
export class JettonBridgeContract extends TonWeb.Contract<
  {
    code: any;
    wc: number;
    collectorAddress: any;
    minterCodeHex: string;
    walletCodeHex: string;
    publicKey: Uint8Array;
  },
  {
    get_bridge_data: () => { call: () => Promise<any> };
    get_minter_address: () => { call: () => Promise<any> };
  }
> {
  constructor(provider, options) {
    options.wc = -1;
    options.code = Cell.oneFromBoc(
      readFileHex("./artifacts/jetton-bridge/jetton-bridge.code.hex")
    );
    options.minterCodeHex = readFileHex(
      "./artifacts/jetton-bridge/jetton-minter.code.hex"
    );
    options.walletCodeHex = readFileHex(
      "./artifacts/jetton-bridge/jetton-wallet.code.hex"
    );

    super(provider, options);

    this.methods = {
      get_bridge_data: () => {
        return {
          call: async () => {
            const address = await this.getAddress();
            try {
              return await provider.call2(
                address.toString(),
                "get_bridge_data"
              );
            } catch (err) {
              console.log(JSON.stringify(err));
            }
          },
        };
      },
      get_minter_address: () => {
        return {
          call: async () => {
            const address = await this.getAddress();
            try {
              return await provider.call2(
                address.toString(),
                "get_minter_address"
              );
            } catch (err) {
              console.log(JSON.stringify(err));
            }
          },
        };
      },
    };
  }
  keyPair: nacl.SignKeyPair;

  deploy(secretKey) {
    return Contract.createMethod(
      this.provider,
      this.createInitExternalMessage(secretKey)
    );
  }

  async createStateInit() {
    const codeCell = new Cell();
    codeCell.bits.writeUint(0xff00f800, 32);
    codeCell.bits.writeUint(0x88fb04, 32);
    codeCell.refs[0] = this.options.code;
    const dataCell = this.createDataCell();
    const stateInit = Contract.createStateInit(codeCell, dataCell);
    const stateInitHash = await stateInit.hash();
    const address = new Address(
      this.options.wc + ":" + TonWeb.utils.bytesToHex(stateInitHash)
    );
    return {
      stateInit: stateInit,
      address: address,
      code: codeCell,
      data: dataCell,
    };
  }

  createDataCell() {
    const cell = new Cell();
    cell.bits.writeAddress(this.options.collectorAddress);
    cell.refs[0] = Cell.oneFromBoc(this.options.minterCodeHex);
    cell.refs[1] = Cell.oneFromBoc(this.options.walletCodeHex);
    cell.bits.writeBytes(this.options.publicKey);
    return cell;
  }

  async createInitExternalMessage(secretKey: Uint8Array) {
    if (!this.options.publicKey) {
      const keyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
      this.options.publicKey = keyPair.publicKey;
    }

    const { stateInit, address, code, data } = await this.createStateInit();

    const header = Contract.createExternalMessageHeader(address);
    const externalMessage = Contract.createCommonMsgInfo(header, stateInit);

    return {
      address: address,
      message: externalMessage,
      stateInit,
      code,
      data,
      body: new Cell(),
    };
  }
}
