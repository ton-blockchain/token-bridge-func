import TonWeb from "tonweb";

export const isDeployed = async (tonweb: TonWeb, address: string) => {
  const info = await tonweb.provider.getAddressInfo(address);
  if (info.state == "active") return true;
  return false;
};
