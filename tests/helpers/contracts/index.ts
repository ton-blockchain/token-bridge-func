import BigNumber from "bn.js";
import { Address, Cell, CellMessage, CommonMessageInfo, InternalMessage } from "ton";
import { SmartContract } from "ton-contract-executor";

export class Entity {
  constructor(public readonly contract: SmartContract, public readonly address: Address) { }

  async sendInternalMessageWithEmptyBody(from: Address, value: BigNumber) {
    return await this.contract.sendInternalMessage(
      new InternalMessage({
        to: this.address,
        from: from,
        value,
        bounce: false,
        body: new CommonMessageInfo({
          body: new CellMessage(new Cell()),
        }),
      })
    );
  }

  async sendInternalMessageEmmitingLog(from: Address, value: BigNumber, body: CommonMessageInfo) {
    // todo: how to process a message with a log

  }

  async sendInternalMessage(from: Address, value: BigNumber, body: CommonMessageInfo) {
    return await this.contract.sendInternalMessage(
      new InternalMessage({
        to: this.address,
        from: from,
        value,
        bounce: false,
        body,
      })
    );
  }
}
