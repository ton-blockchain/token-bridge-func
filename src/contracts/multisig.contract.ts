import TonWeb from "tonweb";

// @ts-ignore
export class MultisigContract extends TonWeb.Contract<
  {
    code: any;
    wc: number;
    address: any;
  },
  {}
> {
  constructor(provider, options) {
    options.wc = -1;

    super(provider, options);

    this.methods = {};
  }
  keyPair: nacl.SignKeyPair;
}
