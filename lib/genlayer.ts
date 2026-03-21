import { createClient, createAccount } from "genlayer-js";

const CHAIN = { id: 1, name: "testnet-bradbury" };
const DEFAULT_SERVER_ENDPOINT = "https://rpc-bradbury.genlayer.com";

function getEndpoint() {
  if (process.env.NEXT_PUBLIC_GENLAYER_RPC) {
    return process.env.NEXT_PUBLIC_GENLAYER_RPC;
  }

  if (typeof window === "undefined") {
    return process.env.GENLAYER_RPC || DEFAULT_SERVER_ENDPOINT;
  }

  return undefined;
}

export function createGenlayerClient(accountAddress?: string) {
  const endpoint = getEndpoint();

  return createClient({
    chain: CHAIN,
    ...(accountAddress ? { account: accountAddress as any } : {}),
    ...(endpoint ? { endpoint } : {}),
  } as any);
}

export function createGenlayerClientWithKey(privateKey: string) {
  const account = createAccount(privateKey as any);
  const endpoint = getEndpoint();

  return createClient({
    chain: CHAIN,
    account,
    ...(endpoint ? { endpoint } : {}),
  } as any);
}

export { createAccount };
