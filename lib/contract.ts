import { createGenlayerClient } from "./genlayer";

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

export interface VSData {
  id: number;
  creator: string;
  opponent: string;
  question: string;
  creator_position: string;
  opponent_position: string;
  resolution_url: string;
  stake_amount: number;
  deadline: number;
  state: "open" | "accepted" | "resolved" | "cancelled";
  winner: string;
  resolution_summary: string;
  created_at: number;
  category: string;
}

// ── Read Methods ──

export async function getVS(vsId: number): Promise<VSData | null> {
  try {
    const client = createGenlayerClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_vs",
      args: [vsId],
    })) as VSData;
  } catch {
    return null;
  }
}

export async function getVSCount(): Promise<number> {
  try {
    const client = createGenlayerClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_vs_count",
      args: [],
    })) as number;
  } catch {
    return 0;
  }
}

export async function getUserVSList(address: string): Promise<number[]> {
  try {
    const client = createGenlayerClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_user_vs_list",
      args: [address],
    })) as number[];
  } catch {
    return [];
  }
}

// ── Write Methods ──

export async function createVS(
  wallet: string,
  params: {
    question: string;
    creator_position: string;
    opponent_position: string;
    resolution_url: string;
    deadline: number;
    stake_amount: number;
    category: string;
  }
) {
  const client = createGenlayerClient(wallet);
  await client.initializeConsensusSmartContract();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_vs",
    args: [
      params.question,
      params.creator_position,
      params.opponent_position,
      params.resolution_url,
      params.deadline,
      params.stake_amount,
      params.category,
    ],
    value: BigInt(params.stake_amount),
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED" as any,
    retries: 100,
    interval: 3000,
  });

  return { txHash, receipt };
}

export async function acceptVS(wallet: string, vsId: number, stakeAmount: number) {
  const client = createGenlayerClient(wallet);
  await client.initializeConsensusSmartContract();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "accept_vs",
    args: [vsId],
    value: BigInt(stakeAmount),
  });

  return await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED" as any,
    retries: 100,
    interval: 3000,
  });
}

export async function resolveVS(wallet: string, vsId: number) {
  const client = createGenlayerClient(wallet);
  await client.initializeConsensusSmartContract();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "resolve_vs",
    args: [vsId],
  });

  return await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED" as any,
    retries: 200,
    interval: 5000,
  });
}

export async function cancelVS(wallet: string, vsId: number) {
  const client = createGenlayerClient(wallet);
  await client.initializeConsensusSmartContract();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "cancel_vs",
    args: [vsId],
  });

  return await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED" as any,
    retries: 100,
    interval: 3000,
  });
}
