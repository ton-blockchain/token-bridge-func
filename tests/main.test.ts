import { randomAddress } from "./helpers/functions/address";
import anyTest, { TestFn } from "ava";
import { JettonBridge } from "./helpers/contracts/jetton-bridge";
import { Address, Cell, CellMessage, CommonMessageInfo, ExternalMessage, toNano } from "ton";
import { JettonMinter } from "./helpers/contracts/jetton-minter";
import { JettonWallet } from "./helpers/contracts/jetton-wallet";
import { TJettonBridgeNetworkConfig } from "./helpers/functions/jetton-bridge-network-config";
import {
  buildJettonBridgeInitialData,
  JETTON_BRIDGE_EMPTY_INITIAL_DATA,
  JETTON_BRIDGE_EXIT_CODES,
  TJettonBridgeMintMessageBody,
  JETTON_BRIDGE_OP_CODES,
  JETTON_BRIDGE_EXECUTE_VOTING_OP_CODES,
  ORACLES_ADDRESS,
  JETTON_BRIDGE_NETWORK_CONFIG,
  buildJettonBridgeMintMessageBody,
  buildJettonBridgeBurnMessageBody,
  buildJettonBridgeChangeCollectorBody,
  buildJettonBridgeGetRewardBody,
  TJettonBridgeBurnMessageBody,
  ORACLE_KEY,
  ORACLE_ADDRESS,
} from "./helpers/contracts/jetton-bridge.utils";
import TonWeb from "tonweb";
import { DEFAULT_WRAPPED_TOKEN_DATA, EMPTY_WRAPPED_TOKEN_DATA } from "./helpers/utils/wrapped-token-data";
import { buildJettonMinterInitialData, TJettonMinterInitialData } from "./helpers/contracts/jetton-minter.utils";

const test = anyTest as TestFn<{
  defaultJettonBridgeInitialData: {
    collectorAddress: Address;
    jettonMinterCode: Cell;
    jettonWalletCode: Cell;
    cell: Cell;
  };
  defaultJettonWalletCode: Cell;
  defaultJettonMinterCode: Cell;
  defaultJettonBridgeConfig: TJettonBridgeNetworkConfig;
  defaultJettonBridgeMessageBody: TJettonBridgeMintMessageBody;
  defaultJettonBridgeBurnMessageBody: TJettonBridgeBurnMessageBody;
  defaultJettonMinterInitialData: TJettonMinterInitialData;
}>;

test.before(async (t) => {
  const config = JETTON_BRIDGE_NETWORK_CONFIG;
  const jettonMinterCode = await JettonMinter.buildCodeCell(config);
  const jettonWalletCode = await JettonWallet.buildCodeCell(config);
  t.context.defaultJettonBridgeConfig = config;
  t.context.defaultJettonWalletCode = jettonWalletCode;
  t.context.defaultJettonMinterCode = jettonMinterCode;
  t.context.defaultJettonBridgeInitialData = {
    collectorAddress: randomAddress(),
    jettonMinterCode,
    jettonWalletCode,
    cell: buildJettonBridgeInitialData({
      jettonMinterCode,
      jettonWalletCode,
    }),
  };
  t.context.defaultJettonBridgeMessageBody = {
    op: JETTON_BRIDGE_OP_CODES.EXECUTE_VOTING,
    executeVotingOp: JETTON_BRIDGE_EXECUTE_VOTING_OP_CODES.SWAP,
    mintJettonAmount: toNano(0),
    wrappedTokenData: DEFAULT_WRAPPED_TOKEN_DATA,
    forwardCoinsAmounts: {
      minterCoinsAmount: toNano("3"),
      walletCoinsAmount: toNano("2"),
      forwardCoinsAmount: toNano("1"),
    },
  };
  t.context.defaultJettonBridgeBurnMessageBody = {
    wrappedTokenData: DEFAULT_WRAPPED_TOKEN_DATA,
    jettonBurnAmount: toNano(0),
    fromAddress: randomAddress(),
    responseAddress: randomAddress(),
    destinationAddress: new TonWeb.utils.BN(ORACLE_KEY, 16)
  };
  t.context.defaultJettonMinterInitialData = {
    totalSupply: 0,
    jettonWalletCode: jettonWalletCode,
    wrappedTokenData: EMPTY_WRAPPED_TOKEN_DATA
  };
});

test("JettonBridge should ignore external messages", async (t) => {
  let jettonBridge = await JettonBridge.init(buildJettonBridgeInitialData(), JETTON_BRIDGE_NETWORK_CONFIG);

  let res = await jettonBridge.contract.sendExternalMessage(
    new ExternalMessage({
      to: jettonBridge.address,
      from: ORACLES_ADDRESS,
      body: new CommonMessageInfo({
        body: new CellMessage(new Cell()),
      }),
    })
  );
  t.not(res.exit_code, 0);
});

test("JettonBridge should throw if msg body is empty", async (t) => {
  const jettonBridge = await JettonBridge.init(
    t.context.defaultJettonBridgeInitialData.cell,
    JETTON_BRIDGE_NETWORK_CONFIG
  );

  const res = await jettonBridge.sendInternalMessageWithEmptyBody(randomAddress(), toNano("1"));

  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.INBOUND_MESSAGE_HAS_EMPTY_BODY);
});

test("JettonBridge should throw 401 if the sender is not an oracles multisig", async (t) => {
  const initialDataCell = buildJettonBridgeInitialData();

  const jettonBridge = await JettonBridge.init(initialDataCell, JETTON_BRIDGE_NETWORK_CONFIG);

  await jettonBridge.getJettonBridgeData();

  const res = await jettonBridge.sendInternalMessage(
    randomAddress(),
    toNano("4"),
    buildJettonBridgeMintMessageBody(t.context.defaultJettonBridgeMessageBody)
  );

  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.ORACLES_NOT_SENDER);
});

test("JettonBridge should throw 310 if op not executeVoting or burnNotification", async (t) => {
  const initialDataCell = buildJettonBridgeInitialData();

  const jettonBridge = await JettonBridge.init(initialDataCell, JETTON_BRIDGE_NETWORK_CONFIG);

  await jettonBridge.getJettonBridgeData();

  const res = await jettonBridge.sendInternalMessage(
    ORACLES_ADDRESS,
    toNano("4"),
    buildJettonBridgeMintMessageBody({ ...t.context.defaultJettonBridgeMessageBody, op: 100 })
  );

  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.UNKNOWN_OP);
});

test("JettonBridge should throw 311 if op::executeVoting not mint, getReward or changeCollector", async (t) => {
  const initialDataCell = buildJettonBridgeInitialData();

  const jettonBridge = await JettonBridge.init(initialDataCell, JETTON_BRIDGE_NETWORK_CONFIG);

  await jettonBridge.getJettonBridgeData();

  const res = await jettonBridge.sendInternalMessage(
    ORACLES_ADDRESS,
    toNano("4"),
    buildJettonBridgeMintMessageBody({ ...t.context.defaultJettonBridgeMessageBody, executeVotingOp: 100 })
  );

  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.UNKNOWN_EXECUTE_VOTING_OP);
});

test("JettonBridge should throw if votingData is incorrect", async (t) => {
  const initialDataCell = buildJettonBridgeInitialData();

  const jettonBridge = await JettonBridge.init(initialDataCell, JETTON_BRIDGE_NETWORK_CONFIG);

  await jettonBridge.getJettonBridgeData();

  const res = await jettonBridge.sendInternalMessage(
    ORACLES_ADDRESS,
    toNano("4"),
    buildJettonBridgeMintMessageBody({ ...t.context.defaultJettonBridgeMessageBody }, { isIncorrectVotigData: true })
  );

  t.is(res.type, 'failed');
  t.assert(res.logs.includes('extra data remaining in deserialized cell'))
});

test("JettonBridge should throw 330 on mint if decimals > 99", async (t) => {
  const exampleData = buildJettonBridgeInitialData({
    jettonMinterCode: await JettonMinter.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG),
    jettonWalletCode: await JettonWallet.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG),
  });

  const jettonBridge = await JettonBridge.init(exampleData, JETTON_BRIDGE_NETWORK_CONFIG);

  await jettonBridge.getJettonBridgeData();

  const res = await jettonBridge.sendInternalMessage(
    ORACLES_ADDRESS,
    toNano("4"),
    buildJettonBridgeMintMessageBody({
      ...t.context.defaultJettonBridgeMessageBody,
      wrappedTokenData: {
        ...t.context.defaultJettonBridgeMessageBody.wrappedTokenData,
        tokenDecimals: 100,
      },
    })
  );

  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.DECIMALS_OUT_OF_RANGE);
});

test("JettonBridge should throw 330 on mint if decimals < 0", async (t) => {
  const exampleData = buildJettonBridgeInitialData({
    jettonMinterCode: await JettonMinter.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG),
    jettonWalletCode: await JettonWallet.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG),
  });

  const jettonBridge = await JettonBridge.init(exampleData, JETTON_BRIDGE_NETWORK_CONFIG);

  await jettonBridge.getJettonBridgeData();

  const res = await jettonBridge.sendInternalMessage(
    ORACLES_ADDRESS,
    toNano("4"),
    buildJettonBridgeMintMessageBody({
      ...t.context.defaultJettonBridgeMessageBody,
      wrappedTokenData: {
        ...t.context.defaultJettonBridgeMessageBody.wrappedTokenData,
        tokenDecimals: -1,
      },
    })
  );

  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.DECIMALS_OUT_OF_RANGE);
});

test("JettonBridge should mint with the default minting data", async (t) => {
  const exampleData = buildJettonBridgeInitialData();

  const jettonBridge = await JettonBridge.init(exampleData, JETTON_BRIDGE_NETWORK_CONFIG);

  await jettonBridge.getJettonBridgeData();

  const res = await jettonBridge.sendInternalMessage(
    ORACLES_ADDRESS,
    toNano("4"),
    buildJettonBridgeMintMessageBody(t.context.defaultJettonBridgeMessageBody)
  );

  t.is(res.type, "success");
  t.is(res.actionList[0].type, "send_msg");
  t.is(res.actionList.length, 1);

  // todo: check what the contract sent
});

test("JettonBridge should return data", async (t) => {
  const jettonBridge = await JettonBridge.init(
    t.context.defaultJettonBridgeInitialData.cell,
    JETTON_BRIDGE_NETWORK_CONFIG
  );

  const { collectorAddress, jettonMinterCode, jettonWalletCode } = await jettonBridge.getJettonBridgeData();

  t.is(collectorAddress.toString(), JETTON_BRIDGE_EMPTY_INITIAL_DATA.collectorAddress.toString());
  t.deepEqual(jettonMinterCode.hash(), t.context.defaultJettonBridgeInitialData.jettonMinterCode.hash());
  t.deepEqual(jettonWalletCode.hash(), t.context.defaultJettonBridgeInitialData.jettonWalletCode.hash());
});

// todo: how to parse external out when send internal.
test("JettonBridge should burn", async (t) => {
  const exampleData = buildJettonBridgeInitialData({
    jettonMinterCode: t.context.defaultJettonMinterCode,
    jettonWalletCode: t.context.defaultJettonWalletCode,
  });
  const jettonBridge = await JettonBridge.init(exampleData, t.context.defaultJettonBridgeConfig);

  const jettonMinter = await JettonMinter.init(
    buildJettonMinterInitialData({
      jettonWalletCode: t.context.defaultJettonWalletCode,
      wrappedTokenData: DEFAULT_WRAPPED_TOKEN_DATA
    }),
    t.context.defaultJettonBridgeConfig
  );

  const res = await jettonBridge.sendInternalMessage(
    jettonMinter.address,
    toNano("4"),
    buildJettonBridgeBurnMessageBody(
      t.context.defaultJettonBridgeBurnMessageBody
    )
  );

  t.is(res.type, "success");
  t.is(res.actionList[0].type, "send_msg");
  t.is(res.actionList.length, 1);
  // @ts-ignore
  t.is(res.actionList[0].message.info.type, "external-out")
});

test("JettonBridge should change collector address", async (t) => {
  const exampleData = buildJettonBridgeInitialData({
    jettonMinterCode: await JettonMinter.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG),
    jettonWalletCode: await JettonWallet.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG),
  });
  const jettonBridge = await JettonBridge.init(exampleData, JETTON_BRIDGE_NETWORK_CONFIG);

  const bridgeData = await jettonBridge.getJettonBridgeData();
  t.is(
    bridgeData.collectorAddress.toString(),
    JETTON_BRIDGE_EMPTY_INITIAL_DATA.collectorAddress.toString()
  );

  const newCollectorAddress = randomAddress();
  const res = await jettonBridge.sendInternalMessage(
    ORACLES_ADDRESS,
    toNano("4"),
    buildJettonBridgeChangeCollectorBody(newCollectorAddress)
  );
  t.is(res.type, "success");

  const newBridgeData = await jettonBridge.getJettonBridgeData();
  t.is(newBridgeData.collectorAddress.toString(), newCollectorAddress.toString());
});

test("JettonBridge should send reward", async (t) => {
  const exampleData = buildJettonBridgeInitialData({
    jettonMinterCode: await JettonMinter.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG),
    jettonWalletCode: await JettonWallet.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG),
  });
  const jettonBridge = await JettonBridge.init(exampleData, JETTON_BRIDGE_NETWORK_CONFIG);

  const res = await jettonBridge.sendInternalMessage(
    ORACLES_ADDRESS,
    toNano("4"),
    buildJettonBridgeGetRewardBody()
  );

  t.is(res.type, "success");
  t.is(res.actionList.length, 2);
  t.is(res.actionList[0].type, "reserve_currency");
  t.is(res.actionList[1].type, "send_msg");
});

test("JettonBridge should throw when burn notification not from correct minter", async (t) => {
  const exampleData = buildJettonBridgeInitialData({
    jettonMinterCode: t.context.defaultJettonMinterCode,
    jettonWalletCode: t.context.defaultJettonWalletCode,
  });
  const jettonBridge = await JettonBridge.init(exampleData, t.context.defaultJettonBridgeConfig);

  const wrongMinter = await JettonMinter.init(
    buildJettonMinterInitialData({
      jettonWalletCode: t.context.defaultJettonWalletCode,
      wrappedTokenData: EMPTY_WRAPPED_TOKEN_DATA
    }),
    t.context.defaultJettonBridgeConfig
  );

  const res = await jettonBridge.sendInternalMessage(
    wrongMinter.address,
    toNano("4"),
    buildJettonBridgeBurnMessageBody(
      t.context.defaultJettonBridgeBurnMessageBody
    )
  );
  t.is(res.type, "failed");
  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.MINTER_NOT_SENDER);
});

test("JettonBridge should return minter address", async (t) => {
  const exampleData = buildJettonBridgeInitialData({
    jettonMinterCode: t.context.defaultJettonMinterCode,
    jettonWalletCode: t.context.defaultJettonWalletCode,
  });
  const initialMinterDataCell = buildJettonMinterInitialData(
    t.context.defaultJettonMinterInitialData
  );
  const jettonMinter = await JettonMinter.init(
    initialMinterDataCell,
    t.context.defaultJettonBridgeConfig
  );
  const jettonBridge = await JettonBridge.init(exampleData, t.context.defaultJettonBridgeConfig);
  const expectedAddress = jettonMinter.address;

  const minterAddress = await jettonBridge.getMinterAddress(EMPTY_WRAPPED_TOKEN_DATA);

  t.is(minterAddress.toString(), expectedAddress.toString());

});
