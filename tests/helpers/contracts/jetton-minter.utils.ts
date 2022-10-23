import BigNumber from "bn.js";
import { Address, Cell, CellMessage, CommonMessageInfo } from "ton";
import { randomAddress } from "../functions/address";
import { buildWrappedTokenData, EMPTY_WRAPPED_TOKEN_DATA, TWrappedTokenData } from "../utils/wrapped-token-data";

export type TJettonMinterInitialData = {
  totalSupply: number;
  jettonWalletCode: Cell;
  wrappedTokenData: TWrappedTokenData;
};

export type TJettonData = {
  totalSupply: number;
  workchain: number;
  jettonMinterAddress: Address;
  content: Cell;
  jettonWalletCode: Cell;
}

export const JETTON_MINTER_EMPTY_INITIAL_DATA: TJettonMinterInitialData = {
  totalSupply: 0,
  jettonWalletCode: new Cell(),
  wrappedTokenData: EMPTY_WRAPPED_TOKEN_DATA,
};

export const buildJettonMinterInitialData = (data: Partial<TJettonMinterInitialData> = {}) => {
  const _data = {
    ...JETTON_MINTER_EMPTY_INITIAL_DATA,
    ...data,
  };

  const dataCell = new Cell();

  dataCell.bits.writeCoins(_data.totalSupply);
  dataCell.refs.push(_data.jettonWalletCode);
  dataCell.refs.push(buildWrappedTokenData(_data.wrappedTokenData));

  return dataCell;
};

export enum JETTON_MINTER_OP_CODES {
  MINT = 21,
  BURN_NOTIFICATION = 0x7bdd97de,
}

export type TJettonMinterMintMessageBody = {
  toAddress: Address;
  walletCoinsAmount: BigNumber;
  mintJettonAmount: BigNumber;
  multisigAddress: Address;
};

export type TJettonMinterBurnMessageBody = {
  jettonAmount: BigNumber;
  fromAddress: Address;
}

export const buildJettonMinterMintMessageBody = (data: TJettonMinterMintMessageBody) => {
  let msgBody = new Cell();

  msgBody.bits.writeUint(JETTON_MINTER_OP_CODES.MINT, 32); // op execute voting
  msgBody.bits.writeUint(0, 64); // query_id
  msgBody.bits.writeAddress(data.toAddress);
  msgBody.bits.writeCoins(data.walletCoinsAmount);
  msgBody.bits.writeCoins(data.mintJettonAmount);
  msgBody.bits.writeAddress(data.multisigAddress);

  return new CommonMessageInfo({
    body: new CellMessage(msgBody),
  });
};

export const buildJettonMinterBurnBody = (data: TJettonMinterBurnMessageBody) => {
  let msgBody = new Cell();

  msgBody.bits.writeUint(JETTON_MINTER_OP_CODES.BURN_NOTIFICATION, 32); // op execute voting
  msgBody.bits.writeUint(0, 64); // query_id
  msgBody.bits.writeCoins(data.jettonAmount);
  msgBody.bits.writeAddress(data.fromAddress);

  return new CommonMessageInfo({
    body: new CellMessage(msgBody)
  })
}
