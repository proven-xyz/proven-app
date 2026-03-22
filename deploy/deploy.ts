import { readFileSync } from "fs";
import * as path from "path";
import { createInterface } from "readline";

import { createGenlayerClientWithKey } from "../lib/genlayer";

function prompt(question: string, { mask = false } = {}) {
  return new Promise<string>((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      reject(
        new Error(
          "DEPLOYER_PRIVATE_KEY is not set and no interactive terminal is available."
        )
      );
      return;
    }

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    const mutableRl = rl as typeof rl & {
      _writeToOutput: (text: string) => void;
      output: NodeJS.WriteStream;
    };

    const originalWrite = mutableRl._writeToOutput.bind(mutableRl);
    if (mask) {
      mutableRl._writeToOutput = function writeMaskedOutput(
        stringToWrite: string
      ): void {
        if (rl.line.length > 0) {
          mutableRl.output.write(`\r${question}${"*".repeat(rl.line.length)}`);
          return;
        }
        originalWrite(stringToWrite);
      };
    }

    rl.question(question, (answer) => {
      rl.close();
      if (mask) {
        process.stdout.write("\n");
      }
      resolve(answer.trim());
    });

    rl.once("SIGINT", () => {
      rl.close();
      reject(new Error("Prompt cancelled."));
    });
  });
}

async function getPrivateKey() {
  const envPrivateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (envPrivateKey) {
    return envPrivateKey;
  }

  const promptedPrivateKey = await prompt(
    "Enter DEPLOYER_PRIVATE_KEY (0x...): ",
    { mask: true }
  );

  if (!promptedPrivateKey) {
    throw new Error("A private key is required to deploy.");
  }

  return promptedPrivateKey;
}

async function deploy() {
  const privateKey = await getPrivateKey();
  const contractPath =
    process.argv[2] || process.env.DEPLOY_CONTRACT_PATH || "contracts/proven.py";
  const client = createGenlayerClientWithKey(privateKey as `0x${string}`);
  const account = client.account;

  if (!account || typeof account === "string") {
    throw new Error("Failed to initialize deployer account.");
  }

  console.log(`Deploying PROVEN contract from ${contractPath}...`);
  console.log("Deployer:", account.address);

  const contractCode = readFileSync(
    path.resolve(process.cwd(), contractPath),
    "utf-8"
  );

  const hash = await client.deployContract({
    code: contractCode,
    args: [],
  });

  console.log("Tx:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await client.waitForTransactionReceipt({
    hash: hash as `0x${string}`,
    status: "ACCEPTED" as any,
    retries: 200,
    interval: 5000,
  });

  const addr =
    (receipt as any).data?.contract_address ||
    (receipt as any).txDataDecoded?.contractAddress ||
    "UNKNOWN";

  console.log("");
  console.log("PROVEN contract deployed.");
  console.log("Address:", addr);
  console.log("");
  console.log("Next:");
  console.log(`1. Create .env.local: NEXT_PUBLIC_CONTRACT_ADDRESS=${addr}`);
  console.log("2. npm run dev");
  console.log("3. Test: create -> accept -> resolve");
}

deploy().catch((err) => {
  console.error("Deploy failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
