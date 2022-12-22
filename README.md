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

## Description

### Transfer ERC-20 EVM token -> TON Jetton

1. User calls `lock` method on the [EVM smart contract](https://github.com/ton-blockchain/token-bridge-solidity), indicating the address of the ERC-20 token, the token amount and destination TON address to receive jettons.

2. EVM smart contract emits `Lock` event.

3.
    ```
    export const MULTISIG_QUERY_TIMEOUT = 30 * 24 * 60 * 60; // 30 days
    const VERSION = 2;
    const timeout = evmTransaction.blockTime + MULTISIG_QUERY_TIMEOUT + VERSION;

    const queryId = timeout << 32 + first 32 bits of sha256(evmTransaction.blockHash + '_' + evmTransaction.transactionHash + '_' + evmTransaction.logIndex)
    ```

3. User pays `bridgeMintFee` in Toncoins by sending `op::pay_swap` to `jetton-bridge` TON smart contract with corresponding `queryId`.

4. Oracles detects new `Lock` event and `swap_paid` log, check its validity and submits votes to `multisig` TON smart contract with corresponding `queryId`.

5. When enough oracles votes are collected in the multisig, the multisig sends `op::execute_voting::swap` message to the `jetton-bridge`.

6. `jetton-bridge` creates (if it doesn't already exist) `jetton-minter` smart contract corresponding this ERC-20 token and fill-up user's `jetton-wallet`.

### Return

1. User send `burn` message to his `jetton-wallet`, indicating the destination EVM address to receive ERC-20 tokens.

2. `jetton-wallet` sends `burn-notification` to `jetton-minter` and `jetton-minter` forward it to `jetton-bridge`.

3. `jetton-bridge` produce `burn` log on valid `burn-notification`.

4. Oracles detects new `burn` log, check its validity and submits EVM-signatures to `votes-collector` TON Smart Contract.

5. When enough oracles signature are collected, user call `unlock` method of the EVM smart contract, indicating these signatures, and get ERC-20 tokens.

## Comparison with Toncoin bridge

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