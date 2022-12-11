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

Token bridge based on code of [Toncoin Bridge](https://github.com/ton-blockchain/bridge-func) and [Standard Jetton](https://github.com/ton-blockchain/token-contract).