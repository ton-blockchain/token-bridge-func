require("dotenv").config();
import TonWeb from "tonweb";
import { JettonBridgeContract } from "../contracts/jetton-bridge-contract";
import { waitForDeploy } from "../utils/listeners";
import { WalletV3ContractR1 } from "tonweb/dist/types/contract/wallet/v3/wallet-v3-contract-r1";
import { MultisigContract } from "../contracts/multisig.contract";
import { isDeployed } from "../utils/common";
import { transfer } from "../utils/wallet";
import * as fs from "fs";
import shellExec from "shell-exec";

const getJettonUtils = ({ jettonBridgeAddressHash, multisigAddressHash }) => `
cell pack_jetton_wallet_data(int balance, slice owner_address, slice jetton_master_address, cell jetton_wallet_code, cell wrapped_token_data) inline {
  return  begin_cell()
           .store_coins(balance)
           .store_slice(owner_address)
           .store_slice(jetton_master_address)
           .store_ref(jetton_wallet_code)
           .store_ref(wrapped_token_data)
          .end_cell();
}

cell calculate_jetton_wallet_state_init(slice owner_address, slice jetton_master_address, cell jetton_wallet_code, cell wrapped_token_data) inline {
 return begin_cell()
         .store_uint(0, 2)
         .store_dict(jetton_wallet_code)
         .store_dict(pack_jetton_wallet_data(0, owner_address, jetton_master_address, jetton_wallet_code, wrapped_token_data))
         .store_uint(0, 1)
        .end_cell();
}

slice calculate_jetton_wallet_address(cell state_init) inline {
 return begin_cell().store_uint(4, 3)
                    .store_int(workchain(), 8)
                    .store_uint(cell_hash(state_init), 256)
                    .end_cell()
                    .begin_parse();
}

slice calculate_user_jetton_wallet_address(slice owner_address, slice jetton_master_address, cell jetton_wallet_code, cell wrapped_token_data) inline {
 return calculate_jetton_wallet_address(calculate_jetton_wallet_state_init(owner_address, jetton_master_address, jetton_wallet_code, wrapped_token_data));
}

;; chainId: uint32 token_id_in_other_network: uint256
(int, int, int, slice, slice) unpack_wrapped_token_data(cell data) inline {
  slice slice_data = data.begin_parse();
  (int chain_id, int token_address, int token_decimals, cell token_name, cell token_symbol) = (
      slice_data~load_uint(32),
      slice_data~load_uint(256),
      slice_data~load_uint(8),
      slice_data~load_ref(),
      slice_data~load_ref()
  );
   
   return (chain_id, token_address, token_decimals, token_name.begin_parse(), token_symbol.begin_parse());
}

;; bridge_address: MsgAdrr, oracles_address: MsgAddr, state_flags: uint8, burn_bridge_fee: Coins
(slice, slice, int, int) get_jetton_bridge_config() impure inline_ref {
 slice bridge_address = begin_cell()
         .store_uint(4, 3)
         .store_int(-1, 8) ;; wc of address
         .store_uint(0x${jettonBridgeAddressHash}, 256) ;; hex part of address
         .end_cell()
         .begin_parse();

 slice oracles_address = begin_cell()
         .store_uint(4, 3)
         .store_int(-1, 8) ;; wc of address
         .store_uint(0x${multisigAddressHash}, 256) ;; hex part of address
         .end_cell()
         .begin_parse();

   return (bridge_address, oracles_address, 0, 0);
}`;

export const deployJettonBridge = async (
  tonweb: TonWeb,
  walletContract: WalletV3ContractR1,
  multisigContract: MultisigContract
) => {
  console.log("=== Deploy JettonBridgeContract ===");

  fs.writeFileSync(
    "./artifacts/func/jetton-utils.fc",
    getJettonUtils({
      jettonBridgeAddressHash: multisigContract.address
        .toString()
        .split(":")[1],
      multisigAddressHash: multisigContract.address.toString().split(":")[1],
    })
  );

  console.log(await shellExec(
    "func -SPA -o ./build/jetton-bridge.fif ./src/func/stdlib.fc ./src/func/params.fc ./src/func/op-codes.fc ./artifacts/func/jetton-utils.fc ./src/func/jetton-bridge.fc"
  ));
  console.log(await shellExec(
    "func -SPA -o ./build/jetton-wallet.fif ./src/func/stdlib.fc ./src/func/params.fc ./src/func/op-codes.fc ./artifacts/func/jetton-utils.fc ./src/func/jetton-wallet.fc"
  ));

  console.log(await shellExec(
    "func -SPA -o ./build/jetton-minter.fif ./src/func/stdlib.fc ./src/func/params.fc ./src/func/op-codes.fc ./artifacts/func/jetton-utils.fc ./src/func/jetton-minter.fc"
  ));

  const fiftOit = await shellExec("fift -s ./src/fift/print-hex.fif");



  const jettonBridgeContract = new JettonBridgeContract(tonweb.provider, {
    wc: -1,
    publicKey: (walletContract as any).keyPair.publicKey,
    collectorAddress: multisigContract.address,
  });

  await jettonBridgeContract.getAddress();
  console.log(
    `Jetton Bridge address ${jettonBridgeContract.address.toString(true)}`
  );

  if (!(await isDeployed(tonweb, jettonBridgeContract.address.toString()))) {
    await transfer(
      tonweb,
      walletContract,
      jettonBridgeContract.address.toString(true),
      "5.1"
    );
    const deploy = jettonBridgeContract.deploy(
      (walletContract as any).keyPair.secretKey
    );
    await deploy.send();
    await waitForDeploy(tonweb, jettonBridgeContract.address);
    console.log("Jetton Bridge has been deployed");
  } else {
    console.log("Jetton Bridge already deployed");
  }

  jettonBridgeContract.keyPair = (walletContract as any).keyPair;

  return jettonBridgeContract;
};
