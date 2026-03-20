import { readFileSync } from "fs";
import path from "path";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

async function deploy() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error("❌ Set DEPLOYER_PRIVATE_KEY env var");
    process.exit(1);
  }

  const account = createAccount(pk);
  const client = createClient({ chain: testnetBradbury, account });

  console.log("⚡ Deploying PROVEN contract...");
  console.log("   Deployer:", account.address);

  const contractCode = readFileSync(
    path.resolve(process.cwd(), "contracts/proven.py"),
    "utf-8"
  );

  await client.initializeConsensusSmartContract();

  const hash = await client.deployContract({
    code: contractCode,
    args: [],
  });

  console.log("📡 Tx:", hash);
  console.log("⏳ Waiting for confirmation...");

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: "ACCEPTED" as any,
    retries: 200,
    interval: 5000,
  });

  const addr =
    (receipt as any).data?.contract_address ||
    (receipt as any).txDataDecoded?.contractAddress ||
    "UNKNOWN";

  console.log("");
  console.log("✅ PROVEN contract deployed!");
  console.log("   Address:", addr);
  console.log("");
  console.log("📋 Next:");
  console.log(`   1. Create .env.local: NEXT_PUBLIC_CONTRACT_ADDRESS=${addr}`);
  console.log("   2. npm run dev");
  console.log("   3. Test: create → accept → resolve");
}

deploy().catch((err) => {
  console.error("❌ Deploy failed:", err);
  process.exit(1);
});
