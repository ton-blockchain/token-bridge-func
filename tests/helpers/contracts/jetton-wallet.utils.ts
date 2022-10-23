import BigNumber from "bignumber.js";
import { Address, Cell } from "ton";
import { randomAddress } from "../functions/address";
import { buildWrappedTokenData, EMPTY_WRAPPED_TOKEN_DATA, TWrappedTokenData } from "../utils/wrapped-token-data";

export type TJettonWalletInitialData = {
  balance: number;
  ownerAddress: Address;
  jettonMasterAddress: Address;
  jettonWalletCode: Cell;
  wrappedTokenData: TWrappedTokenData;
};

export const JETTON_WALLET_EMPTY_INITIAL_DATA: TJettonWalletInitialData = {
  balance: 0,
  ownerAddress: randomAddress(),
  jettonMasterAddress: randomAddress(),
  jettonWalletCode: new Cell(),
  wrappedTokenData: EMPTY_WRAPPED_TOKEN_DATA,
};

export const buildJettonWalletInitialData = (data?: Partial<TJettonWalletInitialData>) => {
  const _data = {
    ...JETTON_WALLET_EMPTY_INITIAL_DATA,
    ...data,
  };

  const dataCell = new Cell();

  dataCell.bits.writeCoins(_data.balance);
  dataCell.bits.writeAddress(_data.ownerAddress);
  dataCell.bits.writeAddress(_data.jettonMasterAddress);

  dataCell.refs.push(_data.jettonWalletCode);
  dataCell.refs.push(buildWrappedTokenData(_data.wrappedTokenData));

  return dataCell;
};
