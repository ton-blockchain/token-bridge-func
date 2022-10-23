import { Cell } from "ton";

export type TWrappedTokenData = {
    chainId: number;
    tokenAddress: number;
    tokenDecimals: number;
    tokenName: string;
    tokenSymbol: string;
};

export const EMPTY_WRAPPED_TOKEN_DATA: TWrappedTokenData = {
    chainId: 0,
    tokenAddress: 0,
    tokenDecimals: 0,
    tokenName: "",
    tokenSymbol: "",
};

export const DEFAULT_WRAPPED_TOKEN_DATA: TWrappedTokenData = {
    chainId: 32,
    tokenAddress: 0xf324bc15d341f,
    tokenDecimals: 18,
    tokenName: "tether",
    tokenSymbol: "USDT",
}

export let buildWrappedTokenData = (data: TWrappedTokenData): Cell => {
    const wrappedTokenDataCell = new Cell();
    wrappedTokenDataCell.bits.writeUint(data.chainId, 32); // wrapped_token_data.chain_id
    wrappedTokenDataCell.bits.writeUint(
        data.tokenAddress,
        256
    ); // wrapped_token_data.token_address
    wrappedTokenDataCell.bits.writeInt(data.tokenDecimals, 8); // wrapped_token_data.token_decimals

    const tokenNameCell = new Cell();
    const tokenName = new TextEncoder().encode(data.tokenName);
    for (let i = 0; i < tokenName.length; i++) {
        tokenNameCell.bits.writeUint8(tokenName[i]);
    }
    wrappedTokenDataCell.refs.push(tokenNameCell); // wrapped_token_data.token_name

    const tokenSymbolCell = new Cell();
    const tokenSymbol = new TextEncoder().encode(
        data.tokenSymbol
    );
    for (let i = 0; i < tokenSymbol.length; i++) {
        tokenSymbolCell.bits.writeUint8(tokenSymbol[i]);
    }
    wrappedTokenDataCell.refs.push(tokenSymbolCell);

    return wrappedTokenDataCell;
}
