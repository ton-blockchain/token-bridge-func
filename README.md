# token-bridge-func

TON-EVM token bridge - FunC smart contracts.

Developed by [RSquad](https://rsquad.io/) by order of TON Foundation.

## Limits

Bridge supports all ERC-20-compatible tokens with:

1. 0 <= Total supply <= (2^120 - 1)

    `uint256` is used for amounts in Ethereum, TON jettons [uses](https://github.com/ton-blockchain/ton/blob/ba8f700e26620707f8ff14e46cc9a040a1b3f97c/crypto/block/block.tlb#L116) `VarUInteger 16 = Coins` for amounts, maximum is `2^120 - 1` (124 bit in serialized form). 

    Since in practice all useful tokens fit into this limit, we decided not to change the jettons.


2. 0 <= Decimals <= 255 

    ERC-20 [has](https://eips.ethereum.org/EIPS/eip-20) `uint8` decimals so all valid ERC-20 tokens are supported. 

## Architecture

Token bridge based on code of [Toncoin Bridge](https://github.com/ton-blockchain/bridge-func/tree/81e4e0d53b288b0f07855e9d779d227e3dc1c94a) and [Standard Jetton](https://github.com/ton-blockchain/token-contract/tree/2d411595a4f25fba43997a2e140a203c140c728a).

Jettons:

* `dicovery-params.fc`, `op-codes.fc`, `params.fc`, `stdlib.fc`, `utils.fc` - changes do not affect functionality.

* `jetton-wallet.fc` - same, but `uint160 destination_address` (destination address in EVM network) added in `custom_payload` of `burn` message and to `burn_notification` message.

   `min_tons_for_storage` and `gas_consumption` constants moved to config. 

   3 additional `burn` checks:

   `throw_if( error::operation_suspended, state_flags & 1);`
  
   `throw_unless(error::burn_fee_not_matched, msg_value == bridge_burn_fee);` - `bridge_burn_fee` must include network fees ;

   `throw_unless(error::not_enough_funds, jetton_amount > 0);` - forbid zero burns;

* `jetton-minter.fc` - same with `jetton-minter-discoverable.fc` but:

    * no `admin_address` in data - admin is `bridge_address` from network config

    * mint - different mint message structure, sending fees deducted from message

    * `burn_notification` with `content` is forwarded to the jetton-bridge, no burn response message is sent

    * no `change_admin`, `change_content`

    * `get_jetton_data` constructs semi-chain data in runtime
  
    * `provide_address_gas_consumption` and `min_tons_for_storage` constants moved to config

Bridge:

* `config.fc` - similar, but additional fields added.

* `multisig.fc` - same, just another config, [fixed](https://github.com/ton-blockchain/multisig-contract) `get_messages_unsigned_by_id` get-method, prevent send non-bounceable messages to bridge. 

* `votes-collector.fc` - same, just another config and inability to remove old votes if config.state & 8 