import { Address } from 'ton';
import * as fs from "fs";

const bridgeConfig = fs.readFileSync(`./artifacts/hr/jetton-bridge.json`, { encoding: 'utf8' });

const bridgeAddress = JSON.parse(bridgeConfig).address;
const address = '-1:152f7c7c604ae16f8567059fd8ef9c7da80d501647978c68b494b26f97e5af93';
(async () => {
    const normalizedAddress = Address.normalize(address);
    console.log({ normalizedAddress });

})();

