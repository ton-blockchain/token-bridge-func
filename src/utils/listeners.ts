import BigNumber from "bignumber.js";
import TonWeb from "tonweb";

export const waitForDeposit = (tonweb: TonWeb, address) =>
  new Promise(async (res) => {
    const interval = setInterval(async () => {
      const balance = await tonweb.getBalance(address);
      if (new BigNumber(balance).gt(0)) {
        console.log(`${address.toString()} balance — ${balance}`);
        clearInterval(interval);
        res(true);
      } else {
        console.log(`Waiting for deposit to ${address.toString(true)}`);
      }
    }, 2000);
  });

export const waitForDeploy = (tonweb: TonWeb, address) =>
  new Promise(async (res) => {
    const interval = setInterval(async () => {
      const { state } = await tonweb.provider.getAddressInfo(
        address.toString()
      );
      if (state === "active") {
        console.log(`${address.toString()} deployed`);
        clearInterval(interval);
        res(true);
      } else {
        console.log(`Waiting for deploy to ${address.toString(true)}`);
      }
    }, 2000);
  });
