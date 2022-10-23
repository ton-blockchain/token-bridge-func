export type TJettonBridgeNetworkConfig = {
  jettonBridgeAddressHash: string;
  oraclesAddressHash: string;
  oracleAddressHash: string;
  oracleKey: string;
  stateFlags: string;
  burnBridgeFee: string;
};

export const buildJettonBridgeNetworkConfigRawCode = ({
  jettonBridgeAddressHash,
  oraclesAddressHash,
  oracleAddressHash,
  oracleKey,
  stateFlags,
  burnBridgeFee,
}: {
  jettonBridgeAddressHash: string;
  oraclesAddressHash: string;
  oracleAddressHash: string;
  oracleKey: string;
  stateFlags: string;
  burnBridgeFee: string;
}) => {
  return `
  (int, int, cell, int, int) get_jetton_bridge_config() impure inline_ref {

    int bridge_address_hash = 0x${jettonBridgeAddressHash};

    int oracles_address_hash = 0x${oraclesAddressHash};

    cell oracles = new_dict();
    int oracle0_address = 0x${oracleAddressHash};
    int oracle0_secp_key = 0x${oracleKey};

    oracles~udict_set(256, oracle0_address, begin_cell()
        .store_uint(oracle0_secp_key, 256)
        .end_cell()
        .begin_parse());

    int state_flags = ${stateFlags};
    
    int burn_bridge_fee = ${burnBridgeFee};

    return (bridge_address_hash, oracles_address_hash, oracles, state_flags, burn_bridge_fee);
  }
  `;
};
