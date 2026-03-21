import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_CONTRACT = "contracts/proven.py";
const ENV_FILE = ".env.local";
const ENV_KEY = "NEXT_PUBLIC_CONTRACT_ADDRESS";
const ACCEPTED_STATUS = "ACCEPTED";
const FINALIZED_STATUS = "FINALIZED";
const STATUS_PROBE_ORDER = [
  "PROPOSING",
  "COMMITTING",
  "REVEALING",
  "READY_TO_FINALIZE",
  FINALIZED_STATUS,
  "UNDETERMINED",
  "CANCELED",
];
const LOCAL_GENLAYER_BIN = path.resolve(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "genlayer.cmd" : "genlayer"
);
const RECEIPT_RETRIES = parsePositiveInt(
  process.env.GENLAYER_DEPLOY_RECEIPT_RETRIES,
  180
);
const RECEIPT_INTERVAL_MS = parsePositiveInt(
  process.env.GENLAYER_DEPLOY_RECEIPT_INTERVAL_MS,
  5000
);
const BROADCAST_RECOVERY_GRACE_MS = parsePositiveInt(
  process.env.GENLAYER_DEPLOY_BROADCAST_GRACE_MS,
  15000
);
const RECEIPT_HEARTBEAT_MS = parsePositiveInt(
  process.env.GENLAYER_DEPLOY_HEARTBEAT_MS,
  30000
);

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/genlayer-deploy.mjs [contractPath] [--bin <path>] [--network <alias>] [--write-env] [--args <args...>]

Examples:
  node scripts/genlayer-deploy.mjs
  node scripts/genlayer-deploy.mjs --network testnet-bradbury
  node scripts/genlayer-deploy.mjs --bin /usr/local/bin/genlayer --network testnet-bradbury
  node scripts/genlayer-deploy.mjs contracts/proven.py --write-env
  node scripts/genlayer-deploy.mjs --network localnet --write-env --args "hello" 42

Environment overrides:
  GENLAYER_BIN=/usr/local/bin/genlayer node scripts/genlayer-deploy.mjs
  GENLAYER_DEPLOY_RECEIPT_RETRIES=60 GENLAYER_DEPLOY_RECEIPT_INTERVAL_MS=3000 node scripts/genlayer-deploy.mjs
  GENLAYER_DEPLOY_BROADCAST_GRACE_MS=10000 node scripts/genlayer-deploy.mjs
  GENLAYER_DEPLOY_HEARTBEAT_MS=30000 node scripts/genlayer-deploy.mjs
`);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function quoteWindowsArg(value) {
  if (value.length === 0) {
    return '""';
  }

  if (!/[\s"]/u.test(value)) {
    return value;
  }

  let escaped = '"';
  let backslashes = 0;

  for (const char of value) {
    if (char === "\\") {
      backslashes += 1;
      continue;
    }

    if (char === '"') {
      escaped += `${"\\".repeat(backslashes * 2 + 1)}"`;
      backslashes = 0;
      continue;
    }

    escaped += `${"\\".repeat(backslashes)}${char}`;
    backslashes = 0;
  }

  escaped += `${"\\".repeat(backslashes * 2)}"`;
  return escaped;
}

function quoteDisplayArg(value) {
  if (value.length === 0) {
    return '""';
  }

  if (!/[\s"'`$]/u.test(value)) {
    return value;
  }

  if (process.platform === "win32") {
    return quoteWindowsArg(value);
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildWindowsCommand(command, args) {
  return [quoteWindowsArg(command), ...args.map((arg) => quoteWindowsArg(String(arg)))].join(" ");
}

function renderUserCommand(command, args) {
  return [quoteDisplayArg(command), ...args.map((arg) => quoteDisplayArg(String(arg)))].join(" ");
}

function getSpawnConfig(command, args) {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", buildWindowsCommand(command, args)],
    };
  }

  return {
    command,
    args,
  };
}

function run(command, args, options = {}) {
  const spawnConfig = getSpawnConfig(command, args);
  const result = spawnSync(spawnConfig.command, spawnConfig.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...options,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null,
  };
}

function runStreaming(command, args, options = {}) {
  const { txHashRecoveryGraceMs = 0, ...spawnOptions } = options;
  const spawnConfig = getSpawnConfig(command, args);

  return new Promise((resolve) => {
    const child = spawn(spawnConfig.command, spawnConfig.args, {
      cwd: process.cwd(),
      ...spawnOptions,
    });

    let stdout = "";
    let stderr = "";
    let firstTxHash = null;
    let settled = false;
    let recoveryTimer = null;
    let forcedStopForTxRecovery = false;

    const clearRecoveryTimer = () => {
      if (recoveryTimer) {
        clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
    };

    const scheduleRecoveryTimer = () => {
      if (!txHashRecoveryGraceMs || recoveryTimer || !firstTxHash) {
        return;
      }

      process.stdout.write(
        `\nINFO: Broadcast detected for tx ${firstTxHash}. Giving the CLI ${Math.round(
          txHashRecoveryGraceMs / 1000
        )}s to finish cleanly before switching to direct receipt polling.\n`
      );

      recoveryTimer = setTimeout(() => {
        if (settled) {
          return;
        }

        forcedStopForTxRecovery = true;
        process.stdout.write(
          `\nINFO: Transaction hash ${firstTxHash} was observed and the deploy command is still waiting after ${Math.round(
            txHashRecoveryGraceMs / 1000
          )}s. Switching to explicit receipt polling.\n`
        );
        terminateProcessTree(child);
      }, txHashRecoveryGraceMs);
    };

    const updateBuffers = (target, chunk) => {
      const text = chunk.toString();
      if (target === "stdout") {
        stdout += text;
        process.stdout.write(text);
      } else {
        stderr += text;
        process.stderr.write(text);
      }

      if (!firstTxHash) {
        firstTxHash = findFirstTxHash(`${stdout}\n${stderr}`);
        if (firstTxHash) {
          scheduleRecoveryTimer();
        }
      }
    };

    child.stdout?.on("data", (chunk) => updateBuffers("stdout", chunk));
    child.stderr?.on("data", (chunk) => updateBuffers("stderr", chunk));

    child.on("error", (error) => {
      clearRecoveryTimer();
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        status: 1,
        stdout,
        stderr,
        error,
        firstTxHash,
        forcedStopForTxRecovery,
      });
    });

    child.on("close", (code) => {
      clearRecoveryTimer();
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        status: code ?? 1,
        stdout,
        stderr,
        error: null,
        firstTxHash,
        forcedStopForTxRecovery,
      });
    });
  });
}

function fail(message, details = "") {
  console.error(`\nERROR: ${message}`);
  if (details) {
    console.error(details.trim());
  }
  process.exit(1);
}

function findFirstTxHash(text) {
  const matches = text.match(/0x[a-fA-F0-9]{64}\b/g);
  if (!matches || matches.length === 0) {
    return null;
  }
  return matches[0];
}

function findLastTxHash(text) {
  const matches = text.match(/0x[a-fA-F0-9]{64}\b/g);
  if (!matches || matches.length === 0) {
    return null;
  }
  return matches[matches.length - 1];
}

function findLastAddress(text) {
  const matches = text.match(/0x[a-fA-F0-9]{40}\b/g);
  if (!matches || matches.length === 0) {
    return null;
  }
  return matches[matches.length - 1];
}

function parseContractAddress(text) {
  const patterns = [
    /contractAddress:\s*'?(0x[a-fA-F0-9]{40})'?/i,
    /contract_address:\s*'?(0x[a-fA-F0-9]{40})'?/i,
    /contract address:\s*(0x[a-fA-F0-9]{40})/i,
    /deployed contract address:\s*(0x[a-fA-F0-9]{40})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return findLastAddress(text);
}

function parseStatusName(text) {
  const patterns = [
    /status_name:\s*'([^']+)'/i,
    /statusName:\s*'([^']+)'/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function parseReceiptInfo(text) {
  return {
    txHash: findLastTxHash(text) ?? findFirstTxHash(text),
    contractAddress: parseContractAddress(text),
    statusName: parseStatusName(text),
  };
}

function upsertEnvValue(filePath, key, value) {
  const nextLine = `${key}=${value}`;

  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${nextLine}\n`, "utf8");
    return "created";
  }

  const current = readFileSync(filePath, "utf8");
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, nextLine)
    : `${current.replace(/\s*$/, "")}\n${nextLine}\n`;

  writeFileSync(filePath, next, "utf8");
  return "updated";
}

function getDefaultGenlayerCandidates() {
  const candidates = [];

  if (existsSync(LOCAL_GENLAYER_BIN)) {
    candidates.push({
      command: LOCAL_GENLAYER_BIN,
      source: "local node_modules/.bin",
    });
  }

  candidates.push({
    command: "genlayer",
    source: "PATH",
  });

  return candidates;
}

function pickGenlayerLauncher(explicitBin) {
  const candidates = explicitBin
    ? [{ command: explicitBin, source: "explicit override" }]
    : getDefaultGenlayerCandidates();
  const failures = [];

  for (const candidate of candidates) {
    const versionCheck = run(candidate.command, ["--version"]);
    if (!versionCheck.error && versionCheck.status === 0) {
      return {
        ...candidate,
        version: versionCheck.stdout.trim(),
      };
    }

    failures.push(
      [
        `- ${candidate.command} (${candidate.source})`,
        versionCheck.error ? `  ${String(versionCheck.error)}` : "",
        versionCheck.stderr?.trim() ? `  ${versionCheck.stderr.trim()}` : "",
        versionCheck.stdout?.trim() ? `  ${versionCheck.stdout.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  fail(
    "The GenLayer CLI could not be launched from this script. Make sure `genlayer` is installed and available in PATH, or pass --bin /path/to/genlayer.",
    failures.join("\n")
  );
}

function probeLastKnownStatus(command, txHash) {
  for (const status of STATUS_PROBE_ORDER) {
    const result = run(command, [
      "receipt",
      txHash,
      "--status",
      status,
      "--retries",
      "1",
      "--interval",
      "1000",
    ]);

    if (result.status === 0) {
      return {
        ...parseReceiptInfo(`${result.stdout}\n${result.stderr}`),
        targetStatus: status,
      };
    }
  }

  return null;
}

function buildRecoveryFailure(txHash, command, lastKnownStatus) {
  const lines = [
    `Transaction hash: ${txHash}`,
    `Last observed status: ${lastKnownStatus ?? "unknown"}`,
    "Manual check:",
    `  ${renderUserCommand(command, ["receipt", txHash, "--status", ACCEPTED_STATUS])}`,
  ];

  return lines.join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function terminateProcessTree(child) {
  if (!child?.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // Ignore kill races when the child exits naturally.
  }
}

function fetchReceipt(command, txHash) {
  return run(command, [
    "receipt",
    txHash,
    "--retries",
    "1",
    "--interval",
    "1000",
  ]);
}

async function pollReceiptUntilAccepted(command, txHash, retries, intervalMs) {
  const pollingStartedAt = Date.now();
  let lastInfo = {
    txHash,
    contractAddress: null,
    statusName: null,
  };
  let lastLoggedStatus = null;
  let lastLoggedAddress = null;
  let lastHeartbeatAt = 0;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const receiptResult = fetchReceipt(command, txHash);
    const receiptInfo = parseReceiptInfo(
      `${receiptResult.stdout}\n${receiptResult.stderr}`
    );
    const now = Date.now();
    const elapsedMs = now - pollingStartedAt;

    lastInfo = {
      txHash: receiptInfo.txHash ?? lastInfo.txHash ?? txHash,
      contractAddress: receiptInfo.contractAddress ?? lastInfo.contractAddress,
      statusName: receiptInfo.statusName ?? lastInfo.statusName,
    };

    if (lastInfo.statusName && lastInfo.statusName !== lastLoggedStatus) {
      console.log(
        `INFO: Receipt status: ${lastInfo.statusName} (elapsed ${formatDuration(
          elapsedMs
        )}, attempt ${attempt}/${retries})`
      );
      lastLoggedStatus = lastInfo.statusName;
      lastHeartbeatAt = now;
    }

    if (
      lastInfo.contractAddress &&
      lastInfo.contractAddress !== lastLoggedAddress
    ) {
      console.log(
        `INFO: Candidate contract address: ${lastInfo.contractAddress}`
      );
      lastLoggedAddress = lastInfo.contractAddress;
    }

    if (now - lastHeartbeatAt >= RECEIPT_HEARTBEAT_MS) {
      console.log(
        `INFO: Still waiting for ${ACCEPTED_STATUS} (elapsed ${formatDuration(
          elapsedMs
        )}, attempt ${attempt}/${retries}, last status ${lastInfo.statusName ?? "unknown"})`
      );
      lastHeartbeatAt = now;
    }

    if (
      lastInfo.statusName === ACCEPTED_STATUS ||
      lastInfo.statusName === FINALIZED_STATUS
    ) {
      return {
        ok: true,
        ...lastInfo,
        elapsedMs,
      };
    }

    if (attempt < retries) {
      await sleep(intervalMs);
    }
  }

  return {
    ok: false,
    ...lastInfo,
    elapsedMs: Date.now() - pollingStartedAt,
  };
}

async function recoverFromBroadcastedTx(command, txHash) {
  console.log(
    "\nINFO: Deploy command broadcast a transaction but did not exit cleanly. Falling back to receipt polling."
  );
  console.log(`INFO: Waiting for ${ACCEPTED_STATUS} on tx ${txHash}`);

  const acceptedResult = await pollReceiptUntilAccepted(
    command,
    txHash,
    RECEIPT_RETRIES,
    RECEIPT_INTERVAL_MS
  );

  if (acceptedResult.ok) {
    console.log(
      `INFO: Receipt polling completed in ${formatDuration(
        acceptedResult.elapsedMs ?? 0
      )}.`
    );
    return {
      ...acceptedResult,
      txHash: acceptedResult.txHash ?? txHash,
      recovered: true,
    };
  }

  const lastKnown = probeLastKnownStatus(command, txHash);
  if (lastKnown?.statusName === FINALIZED_STATUS) {
    console.log(
      `\nINFO: Receipt polling reached ${FINALIZED_STATUS}. Treating deployment as successful.`
    );
    return {
      ...lastKnown,
      txHash: lastKnown.txHash ?? txHash,
      recovered: true,
    };
  }

  fail(
    "Deployment transaction was broadcast, but it did not reach ACCEPTED in time.",
    buildRecoveryFailure(
      txHash,
      command,
      lastKnown?.statusName ??
        lastKnown?.targetStatus ??
        acceptedResult.statusName
    )
  );
}

async function main() {
  const argv = process.argv.slice(2);

  let contractArg = DEFAULT_CONTRACT;
  let network = "";
  let writeEnv = false;
  let deployArgs = [];
  let explicitBin = process.env.GENLAYER_BIN?.trim() ?? "";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--network") {
      network = argv[i + 1] ?? "";
      i += 1;
      continue;
    }

    if (arg === "--bin") {
      explicitBin = argv[i + 1] ?? "";
      i += 1;
      continue;
    }

    if (arg === "--write-env") {
      writeEnv = true;
      continue;
    }

    if (arg === "--args") {
      deployArgs = argv.slice(i + 1);
      break;
    }

    if (arg.startsWith("--")) {
      fail(`Unknown option: ${arg}`);
    }

    contractArg = arg;
  }

  if (!contractArg) {
    contractArg = DEFAULT_CONTRACT;
  }

  if (!existsSync(contractArg)) {
    fail(`Contract file not found: ${contractArg}`);
  }

  const contractPath = path.resolve(process.cwd(), contractArg);
  const genlayer = pickGenlayerLauncher(explicitBin);

  console.log(`\nINFO: Using GenLayer CLI: ${genlayer.command}`);
  if (genlayer.version) {
    console.log(`INFO: CLI version: ${genlayer.version}`);
  }

  if (network) {
    console.log(`\nINFO: Setting active GenLayer network to: ${network}`);
    const networkSet = run(genlayer.command, ["network", "set", network]);
    if (networkSet.status !== 0) {
      fail(
        "Unable to set the active GenLayer network.",
        `${networkSet.stdout}\n${networkSet.stderr}`
      );
    }
    if (networkSet.stdout.trim()) {
      console.log(networkSet.stdout.trim());
    }
  }

  console.log("\nINFO: Active network");
  const networkInfo = run(genlayer.command, ["network", "info"]);
  if (networkInfo.status !== 0) {
    fail(
      "Unable to read the active GenLayer network.",
      `${networkInfo.stdout}\n${networkInfo.stderr}`
    );
  }
  if (networkInfo.stdout.trim()) {
    console.log(networkInfo.stdout.trim());
  }

  const deployCommandArgs = ["deploy", "--contract", contractPath];
  if (deployArgs.length > 0) {
    deployCommandArgs.push("--args", ...deployArgs);
  }

  console.log(`\nINFO: Deploying ${contractArg}`);
  const deployResult = await runStreaming(genlayer.command, deployCommandArgs, {
    txHashRecoveryGraceMs: BROADCAST_RECOVERY_GRACE_MS,
  });
  const deployOutput = `${deployResult.stdout}\n${deployResult.stderr}`;
  const deployInfo = parseReceiptInfo(deployOutput);
  const txHash = deployResult.firstTxHash ?? deployInfo.txHash;

  let finalInfo = {
    txHash,
    contractAddress: deployInfo.contractAddress,
    statusName: deployInfo.statusName,
    recovered: false,
  };

  if (deployResult.status !== 0) {
    if (!txHash) {
      fail(
        "Deployment failed before a transaction hash was observed.",
        `${deployResult.stdout}\n${deployResult.stderr}`
      );
    }

    finalInfo = await recoverFromBroadcastedTx(genlayer.command, txHash);
  }

  const finalTxHash = finalInfo.txHash ?? txHash;
  const deployedAddress = finalInfo.contractAddress;

  if (finalInfo.recovered) {
    console.log(
      `\nINFO: Deployment recovered successfully from receipt polling at status ${finalInfo.statusName ?? ACCEPTED_STATUS}.`
    );
  }

  if (finalTxHash) {
    console.log(`\nSUCCESS: Deployment transaction hash: ${finalTxHash}`);
  }

  if (deployedAddress) {
    console.log(`SUCCESS: Detected deployed contract address: ${deployedAddress}`);
  } else {
    console.log(
      "\nWARNING: Could not automatically detect the deployed contract address from deploy or receipt output."
    );
  }

  if (writeEnv && deployedAddress) {
    const envPath = path.resolve(process.cwd(), ENV_FILE);
    const action = upsertEnvValue(envPath, ENV_KEY, deployedAddress);
    console.log(`INFO: ${ENV_FILE} ${action}: ${ENV_KEY}=${deployedAddress}`);
  } else if (writeEnv) {
    console.log(
      `INFO: Skipped ${ENV_FILE} update because no contract address could be parsed.`
    );
  }

  console.log("\nNext:");
  if (deployedAddress) {
    console.log(`1. Verify the contract at ${deployedAddress}.`);
  } else {
    console.log("1. Verify the deployed contract address from the receipt output above.");
  }
  if (!writeEnv) {
    console.log(`2. Optionally sync ${ENV_FILE} automatically next time with --write-env.`);
  }
  if (finalTxHash) {
    console.log(
      `3. Manual receipt check: ${renderUserCommand(genlayer.command, [
        "receipt",
        finalTxHash,
        "--status",
        ACCEPTED_STATUS,
      ])}`
    );
  }
  console.log("4. Run the app and test the deployed contract.");
}

main().catch((error) => {
  fail("Unexpected deploy wrapper error.", String(error));
});
