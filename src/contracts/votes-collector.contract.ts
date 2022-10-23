import { Contract, Cell, Address } from "..";
import TonWeb from "tonweb";
import nacl from "tweetnacl";
import { readFileHex } from "../utils/fs";

// @ts-ignore
export class VotesCollectorContract extends TonWeb.Contract<
  {
    code: any;
    wc: number;
    publicKey: Uint8Array;
  },
  {
    get_external_voting_data: () => { call: () => Promise<any> };
    get_test: () => { call: () => Promise<any> };
  }
> {
  constructor(provider, options) {
    options.wc = -1;
    options.code = Cell.oneFromBoc(
      readFileHex("./artifacts/jetton-bridge/votes-collector.code.hex")
    );

    super(provider, options);

    this.methods = {
      get_external_voting_data: () => {
        return {
          call: async () => {
            const address = await this.getAddress();
            return await provider.call2(
              address.toString(),
              "get_external_voting_data"
            );
          },
        };
      },
      get_test: () => {
        return {
          call: async () => {
            const address = await this.getAddress();
            return await provider.call2(address.toString(), "get_test");
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
    cell.bits.writeBit(false);
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
