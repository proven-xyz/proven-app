import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const CHAIN = testnetBradbury;
const ENDPOINT = process.env.NEXT_PUBLIC_GENLAYER_RPC || undefined;

export function createGenlayerClient(accountAddress?: string) {
  return createClient({
    chain: CHAIN,
    ...(accountAddress ? { account: accountAddress } : {}),
    ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
  });
}

export function createGenlayerClientWithKey(privateKey: string) {
  const account = createAccount(privateKey);
  return createClient({
    chain: CHAIN,
    account,
    ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
  });
}

export { createAccount };
