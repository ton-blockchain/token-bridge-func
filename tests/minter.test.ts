import { randomAddress } from "./helpers/functions/address";
import anyTest, { TestFn } from "ava";
import { JettonMinter } from "./helpers/contracts/jetton-minter";
import { Address, Cell, toNano } from "ton";
import { JettonWallet } from "./helpers/contracts/jetton-wallet";
import { TJettonBridgeNetworkConfig } from "./helpers/functions/jetton-bridge-network-config";
import {
  buildJettonBridgeInitialData,
  JETTON_BRIDGE_EXIT_CODES,
  JETTON_BRIDGE_NETWORK_CONFIG,
  ORACLES_ADDRESS,
  ORACLE_ADDRESS,
  ORACLE_KEY,
  TJettonBridgeMintMessageBody,
} from "./helpers/contracts/jetton-bridge.utils";
import {
  buildJettonMinterBurnBody,
  buildJettonMinterInitialData,
  buildJettonMinterMintMessageBody,
  TJettonMinterBurnMessageBody,
  TJettonMinterInitialData,
  TJettonMinterMintMessageBody,
} from "./helpers/contracts/jetton-minter.utils";
import { DEFAULT_WRAPPED_TOKEN_DATA } from "./helpers/utils/wrapped-token-data";
import { buildJettonWalletInitialData, TJettonWalletInitialData } from "./helpers/contracts/jetton-wallet.utils";

const test = anyTest as TestFn<{
  defaultJettonBridgeInitialData: {
    collectorAddress: Address;
    jettonMinterCode: Cell;
    jettonWalletCode: Cell;
    cell: Cell;
  };
  defaultJettonBridgeMessageBody: TJettonBridgeMintMessageBody;
  defaultJettonMinterInitialData: TJettonMinterInitialData;
  defaultJettonWalletInitialData: TJettonWalletInitialData;
  defaultJettonMinterBurnMessageBody: TJettonMinterBurnMessageBody;
  defaultJettonMinterMessageBody: TJettonMinterMintMessageBody;
}>;

test.before(async (t) => {
  const config = JETTON_BRIDGE_NETWORK_CONFIG;
  const jettonMinterCode = await JettonMinter.buildCodeCell(config);
  const jettonWalletCode = await JettonWallet.buildCodeCell(config);
  t.context.defaultJettonBridgeInitialData = {
    collectorAddress: ORACLES_ADDRESS,
    jettonMinterCode,
    jettonWalletCode,
    cell: buildJettonBridgeInitialData({
      jettonMinterCode,
      jettonWalletCode,
    }),
  };
  t.context.defaultJettonMinterInitialData = {
    totalSupply: 0,
    jettonWalletCode: jettonWalletCode,
    wrappedTokenData: DEFAULT_WRAPPED_TOKEN_DATA
  };
  t.context.defaultJettonWalletInitialData = {
    balance: 0,
    ownerAddress: randomAddress(),
    jettonMasterAddress: randomAddress(),
    jettonWalletCode: await JettonWallet.buildCodeCell(config),
    wrappedTokenData: DEFAULT_WRAPPED_TOKEN_DATA,
  };
  t.context.defaultJettonMinterBurnMessageBody = {
    jettonAmount: toNano("0"),
    fromAddress: randomAddress()
  }
  t.context.defaultJettonMinterMessageBody = {
    toAddress: randomAddress(),
    walletCoinsAmount: toNano("1"),
    mintJettonAmount: toNano("1"),
    multisigAddress: randomAddress(),
  };
});

test("JettonMinter should send mint message to JettonWallet", async (t) => {
  const bridgeAddress = randomAddress();
  const jettonBridgeNetworkConfig: TJettonBridgeNetworkConfig = {
    jettonBridgeAddressHash: bridgeAddress.hash.toString("hex"),
    oraclesAddressHash: ORACLES_ADDRESS.hash.toString("hex"),
    oracleAddressHash: ORACLE_ADDRESS.hash.toString("hex"),
    oracleKey: ORACLE_KEY,
    stateFlags: "0",
    burnBridgeFee: "0",
  };

  const initialMinterDataCell = buildJettonMinterInitialData();
  const jettonMinter = await JettonMinter.init(initialMinterDataCell, jettonBridgeNetworkConfig);

  const mintData: TJettonMinterMintMessageBody = {
    toAddress: randomAddress(-1),
    walletCoinsAmount: toNano("2"),
    mintJettonAmount: toNano("10"),
    multisigAddress: randomAddress(-1),
  };
  const mintBody = buildJettonMinterMintMessageBody(mintData);

  const res = await jettonMinter.sendInternalMessage(bridgeAddress, toNano("4"), mintBody);

  t.is(res.type, "success");
  t.is(res.actionList[0].type, "send_msg");
  t.is(res.actionList.length, 1);
});

test("JettonMinter should return wrapped token data", async (t) => {
  const initialMinterDataCell = buildJettonMinterInitialData(t.context.defaultJettonMinterInitialData);
  const jettonMinter = await JettonMinter.init(initialMinterDataCell, JETTON_BRIDGE_NETWORK_CONFIG);

  const wrappedTokenData = await jettonMinter.getWrappedTokenData();

  t.is(wrappedTokenData.chainId.toString(), DEFAULT_WRAPPED_TOKEN_DATA.chainId.toString());
  t.is(wrappedTokenData.tokenAddress.toString(), DEFAULT_WRAPPED_TOKEN_DATA.tokenAddress.toString());
  t.is(wrappedTokenData.tokenDecimals.toString(), DEFAULT_WRAPPED_TOKEN_DATA.tokenDecimals.toString());
  t.is(wrappedTokenData.tokenNameString, DEFAULT_WRAPPED_TOKEN_DATA.tokenName);
  t.is(wrappedTokenData.tokenSymbolString, DEFAULT_WRAPPED_TOKEN_DATA.tokenSymbol);

});

test('JettonMinter should return jetton data', async (t) => {
  const initialMinterDataCell = buildJettonMinterInitialData(t.context.defaultJettonMinterInitialData);
  const jettonMinter = await JettonMinter.init(initialMinterDataCell, JETTON_BRIDGE_NETWORK_CONFIG);

  const {
    totalSupply,
    workchain,
    jettonMinterAddress,
    content,
    jettonWalletCode
  } = await jettonMinter.getJettonData();

  const contentSlice = content.beginParse();
  const contentMap = contentSlice.readDict(256, (value): string => {
    const ref = Buffer.from(value.readRef().readRemaining().toFiftHex(), 'hex');
    return ref.toString().slice(1); // slice to remove \x00
  });
  const values = contentMap.values();

  t.is(totalSupply, 0);
  t.is(workchain, -1);
  t.is(jettonMinterAddress.toString(), jettonMinter.address.toString());
  t.is(
    values.next().value,
    `https://bridge.ton.org/token/${DEFAULT_WRAPPED_TOKEN_DATA.chainId.toString()}/${DEFAULT_WRAPPED_TOKEN_DATA.tokenAddress.toString(16)}`
  );
  t.is(values.next().value, DEFAULT_WRAPPED_TOKEN_DATA.tokenName);
  t.is(values.next().value, DEFAULT_WRAPPED_TOKEN_DATA.tokenSymbol);
  t.is(values.next().value, DEFAULT_WRAPPED_TOKEN_DATA.tokenDecimals.toString());
});

test("JettonMinter should return wallet address", async (t) => {
  const initialMinterDataCell = buildJettonMinterInitialData(t.context.defaultJettonMinterInitialData);
  const jettonMinter = await JettonMinter.init(initialMinterDataCell, JETTON_BRIDGE_NETWORK_CONFIG);
  const jettonMinterAddress = jettonMinter.address;

  const owner = randomAddress();
  const jettonWalletInitialData = buildJettonWalletInitialData({
    ...t.context.defaultJettonWalletInitialData,
    ownerAddress: owner,
    jettonMasterAddress: jettonMinterAddress
  });

  const jettonWallet = await JettonWallet.init(jettonWalletInitialData, JETTON_BRIDGE_NETWORK_CONFIG);

  const jettonWalletAddress = await jettonMinter.getWalletAddress(owner);

  t.is(jettonWalletAddress.toString(), jettonWallet.address.toString())
});

test('JettonMinter should send burn message', async (t) => {
  const initialMinterDataCell = buildJettonMinterInitialData(
    t.context.defaultJettonMinterInitialData
  );
  const jettonMinter = await JettonMinter.init(
    initialMinterDataCell,
    JETTON_BRIDGE_NETWORK_CONFIG
  );
  const ownerAddress = randomAddress();
  const jettonWalletCode = await JettonWallet.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG);
  const data: TJettonWalletInitialData = {
    balance: 0,
    ownerAddress: ownerAddress,
    jettonMasterAddress: jettonMinter.address,
    jettonWalletCode: jettonWalletCode,
    wrappedTokenData: DEFAULT_WRAPPED_TOKEN_DATA
  }
  const jettonWallet = await JettonWallet.init(
    buildJettonWalletInitialData(data),
    JETTON_BRIDGE_NETWORK_CONFIG
  );

  const res = await jettonMinter.sendInternalMessage(
    jettonWallet.address,
    toNano("1"),
    buildJettonMinterBurnBody({ jettonAmount: toNano("0"), fromAddress: ownerAddress })
  );

  t.is(res.type, "success");
  t.is(res.actionList[0].type, "reserve_currency");
  t.is(res.actionList[1].type, "send_msg");
  t.is(res.actionList.length, 2);
});


test("JettonMinter should ignore empty messages", async (t) => {
  const initialMinterDataCell = buildJettonMinterInitialData();
  const jettonMinter = await JettonMinter.init(initialMinterDataCell, JETTON_BRIDGE_NETWORK_CONFIG);

  const res = await jettonMinter.sendInternalMessageWithEmptyBody(randomAddress(), toNano("1"));

  t.is(res.exit_code, 0);
});

test('JettonMinter should throw when sender is not a bridge', async (t) => {
  const initialMinterDataCell = buildJettonMinterInitialData();
  const jettonMinter = await JettonMinter.init(initialMinterDataCell, JETTON_BRIDGE_NETWORK_CONFIG);

  const res = await jettonMinter.sendInternalMessage(
    randomAddress(),
    toNano("4"),
    buildJettonMinterMintMessageBody(t.context.defaultJettonMinterMessageBody)
  );

  t.is(res.type, "failed");
  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.BRIDGE_NOT_SENDER);
});

test('JettonMinter should throw when sender is not owner on burn', async (t) => {
  const initialMinterDataCell = buildJettonMinterInitialData(
    t.context.defaultJettonMinterInitialData
  );
  const jettonMinter = await JettonMinter.init(
    initialMinterDataCell,
    JETTON_BRIDGE_NETWORK_CONFIG
  );
  const ownerAddress = randomAddress();
  const jettonWalletCode = await JettonWallet.buildCodeCell(JETTON_BRIDGE_NETWORK_CONFIG);
  const data: TJettonWalletInitialData = {
    balance: 0,
    ownerAddress: ownerAddress,
    jettonMasterAddress: jettonMinter.address,
    jettonWalletCode: jettonWalletCode,
    wrappedTokenData: DEFAULT_WRAPPED_TOKEN_DATA
  }
  const jettonWallet = await JettonWallet.init(
    buildJettonWalletInitialData(data),
    JETTON_BRIDGE_NETWORK_CONFIG
  );

  const res = await jettonMinter.sendInternalMessage(
    randomAddress(),
    toNano("1"),
    buildJettonMinterBurnBody({ jettonAmount: toNano("0"), fromAddress: ownerAddress })
  );

  t.is(res.type, "failed");
  t.is(res.exit_code, JETTON_BRIDGE_EXIT_CODES.OWNER_NOT_SENDER);
});