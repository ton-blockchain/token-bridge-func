import BigNumber from "bn.js";
import { Address, Cell, CellMessage, CommonMessageInfo } from "ton";
import { randomAddress } from "../functions/address";
import { TJettonBridgeNetworkConfig } from "../functions/jetton-bridge-network-config";
import { buildWrappedTokenData, TWrappedTokenData } from "../utils/wrapped-token-data";

export enum JETTON_BRIDGE_OP_CODES {
  EXECUTE_VOTING = 4,
  BURN_NOTIFICATION = 0x7bdd97de,
};
export const ORACLES_ADDRESS = randomAddress(-1);
export const ORACLE_ADDRESS = randomAddress(-1);
export const ORACLE_KEY = "C6EE4A4A0E106963A841b94e56D18eD3474BEa16";

export const JETTON_BRIDGE_NETWORK_CONFIG: TJettonBridgeNetworkConfig = {
  jettonBridgeAddressHash: randomAddress().hash.toString("hex"),
  oraclesAddressHash: ORACLES_ADDRESS.hash.toString("hex"),
  oracleAddressHash: ORACLE_ADDRESS.hash.toString("hex"),
  oracleKey: ORACLE_KEY,
  stateFlags: "0",
  burnBridgeFee: "0",
};

export enum JETTON_BRIDGE_EXECUTE_VOTING_OP_CODES {
  SWAP = 0,
  GET_REWARD = 5,
  CHANGE_COLLECTOR = 7,
};

export enum JETTON_BRIDGE_EXIT_CODES {
  INBOUND_MESSAGE_HAS_EMPTY_BODY = 200,
  UNKNOWN_OP = 210,
  UNKNOWN_EXECUTE_VOTING_OP = 211,
  INCORRECT_VOTING_DATA = 320,
  ORACLES_NOT_SENDER = 401,
  DECIMALS_OUT_OF_RANGE = 330,
  MINTER_NOT_SENDER = 402,
  BRIDGE_NOT_SENDER = 403,
  OWNER_NOT_SENDER = 404
};

export type TJettonBridgeInitialData = {
  collectorAddress: Address;
  jettonMinterCode: Cell;
  jettonWalletCode: Cell;
};

export const JETTON_BRIDGE_EMPTY_INITIAL_DATA: TJettonBridgeInitialData = {
  collectorAddress: randomAddress(),
  jettonMinterCode: new Cell(),
  jettonWalletCode: new Cell(),
};

export type TJettonBridgeMintMessageBody = {
  op: JETTON_BRIDGE_OP_CODES;
  executeVotingOp: JETTON_BRIDGE_EXECUTE_VOTING_OP_CODES;
  mintJettonAmount: BigNumber;
  wrappedTokenData: TWrappedTokenData;
  forwardCoinsAmounts: {
    minterCoinsAmount: BigNumber;
    walletCoinsAmount: BigNumber;
    forwardCoinsAmount: BigNumber;
  };
};

export type TJettonBridgeBurnMessageBody = {
  wrappedTokenData: TWrappedTokenData,
  jettonBurnAmount: BigNumber,
  fromAddress: any,
  responseAddress: any,
  destinationAddress: BigNumber,
};

export const buildJettonBridgeInitialData = (data: Partial<TJettonBridgeInitialData> = {}) => {
  const _data = {
    ...JETTON_BRIDGE_EMPTY_INITIAL_DATA,
    ...data,
  };

  const dataCell = new Cell();

  dataCell.bits.writeAddress(_data.collectorAddress);

  dataCell.refs.push(_data.jettonMinterCode);
  dataCell.refs.push(_data.jettonWalletCode);

  return dataCell;
};

export const buildJettonBridgeMintMessageBody = (
  data: TJettonBridgeMintMessageBody,
  options: {
    isIncorrectVotigData?: boolean;
    isIncorrectMintJettonAmount?: boolean;
  } = {}
) => {
  let msgBody = new Cell();

  msgBody.bits.writeUint(data.op, 32); // op execute voting
  msgBody.bits.writeUint(0, 64); // query_id
  msgBody.bits.writeUint(data.executeVotingOp, 32); // op swap
  msgBody.bits.writeUint(0, 256); // ext_chain_hash
  msgBody.bits.writeUint(0, 16); // internal_index
  msgBody.bits.writeUint(0, 8); // workchain
  msgBody.bits.writeUint(0, 256); // addr_hash
  msgBody.bits.writeCoins(data.mintJettonAmount);

  if (options.isIncorrectVotigData) {
    msgBody.bits.writeUint(1, 256);
  }

  const wrappedTokenDataCell = buildWrappedTokenData(data.wrappedTokenData);

  msgBody.refs.push(wrappedTokenDataCell); // wrapped_token_data

  const forwardCoinsAmountsCell = new Cell();
  forwardCoinsAmountsCell.bits.writeCoins(data.forwardCoinsAmounts.minterCoinsAmount); // forward_coins_amounts.minter_coins_amount
  forwardCoinsAmountsCell.bits.writeCoins(data.forwardCoinsAmounts.walletCoinsAmount); // forward_coins_amounts.wallet_coins_amount
  forwardCoinsAmountsCell.bits.writeCoins(data.forwardCoinsAmounts.forwardCoinsAmount); // forward_coins_amounts.forward_coins_amount

  msgBody.refs.push(forwardCoinsAmountsCell); // forward_coins_amounts

  return new CommonMessageInfo({
    body: new CellMessage(msgBody),
  });
};

export const buildJettonBridgeBurnMessageBody = (data: TJettonBridgeBurnMessageBody) => {
  let msgBody = new Cell();
  msgBody.bits.writeUint(JETTON_BRIDGE_OP_CODES.BURN_NOTIFICATION, 32);
  msgBody.bits.writeUint(0, 64); // query_id

  let body = new Cell();
  body.bits.writeUint(0, 32);
  body.bits.writeUint(0, 64);
  body.bits.writeUint(data.jettonBurnAmount, 64);
  body.bits.writeAddress(data.fromAddress);
  body.bits.writeAddress(data.responseAddress);
  body.bits.writeUint(data.destinationAddress, 160);

  msgBody.refs.push(body);

  let wrappedTokenData = buildWrappedTokenData(data.wrappedTokenData);
  msgBody.refs.push(wrappedTokenData);

  return new CommonMessageInfo({
    body: new CellMessage(msgBody),
  });
};

export const buildJettonBridgeGetRewardBody = () => {
  let msgBody = new Cell();

  msgBody.bits.writeUint(JETTON_BRIDGE_OP_CODES.EXECUTE_VOTING, 32);
  msgBody.bits.writeUint(0, 64); // query_id
  msgBody.bits.writeUint(JETTON_BRIDGE_EXECUTE_VOTING_OP_CODES.GET_REWARD, 32);

  return new CommonMessageInfo({
    body: new CellMessage(msgBody),
  });
};

export const buildJettonBridgeChangeCollectorBody = (collectorAddress: Address) => {
  let msgBody = new Cell();

  msgBody.bits.writeUint(JETTON_BRIDGE_OP_CODES.EXECUTE_VOTING, 32);
  msgBody.bits.writeUint(0, 64); // query_id
  msgBody.bits.writeUint(JETTON_BRIDGE_EXECUTE_VOTING_OP_CODES.CHANGE_COLLECTOR, 32);
  msgBody.bits.writeAddress(collectorAddress);

  return new CommonMessageInfo({
    body: new CellMessage(msgBody),
  });

};
