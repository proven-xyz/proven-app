import { createClient, createAccount } from "genlayer-js";

const CHAIN = { id: 1, name: "testnet-bradbury" };
const ENDPOINT = process.env.NEXT_PUBLIC_GENLAYER_RPC || undefined;

export function createGenlayerClient(accountAddress?: string) {
  return createClient({
    chain: CHAIN,
    ...(accountAddress ? { account: accountAddress as any } : {}),
    ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
  } as any);
}

export function createGenlayerClientWithKey(privateKey: string) {
  const account = createAccount(privateKey as any);
  return createClient({
    chain: CHAIN,
    account,
    ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
  } as any);
}

export { createAccount };
