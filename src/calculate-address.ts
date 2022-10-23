
import * as fs from "fs";
import { keyPairFromSeed, recoverSeed } from "./utils/crypto";
import TonWeb from "tonweb";
import { readFileHex } from "./utils/fs";


(async () => {
    const seed = recoverSeed("bridge");
    const keyPair = keyPairFromSeed(seed);
    const options = {
        wc: -1,
        publicKey: keyPair.publicKey,
        collectorAddress: new TonWeb.Address(
        "-1:178057b141138abf835217357e282d1f6ffa4566a90f0e01571c5df6584ba78a"
        ),
        code: TonWeb.boc.Cell.oneFromBoc(
            readFileHex("./artifacts/jetton-bridge.code.hex")
      ),
      minterCodeHex: readFileHex("./artifacts/jetton-minter.code.hex"),
      walletCodeHex: readFileHex("./artifacts/jetton-wallet.code.hex")
    };
    const codeCell = new TonWeb.boc.Cell();
    codeCell.bits.writeUint(0xff00f800, 32);
    codeCell.bits.writeUint(0x88fb04, 32);
    codeCell.refs[0] = options.code;
    const dataCell = createDataCell();
    const stateInit = TonWeb.Contract.createStateInit(codeCell, dataCell);
    const stateInitHash = await stateInit.hash();
    const address = new TonWeb.Address(
      options.wc + ":" + TonWeb.utils.bytesToHex(stateInitHash)
    );
    
    function createDataCell() {
        const cell = new TonWeb.boc.Cell();
        cell.bits.writeAddress(options.collectorAddress);
        cell.refs[0] = TonWeb.boc.Cell.oneFromBoc(options.minterCodeHex);
        cell.refs[1] = TonWeb.boc.Cell.oneFromBoc(options.walletCodeHex);
        cell.bits.writeBytes(options.publicKey);
        return cell;
      }

    console.log({address: address.toString()});
    
})();

