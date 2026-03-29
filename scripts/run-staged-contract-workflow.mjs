#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const DEFAULT_CONTRACT = "contracts/proven.py";

function printUsage() {
  console.log(`Usage:
  node scripts/run-staged-contract-workflow.mjs [--contract <path>] [--skip-studionet] [--deploy-bradbury] [--write-env]

Stages:
  1. genvm-lint check
  2. direct tests
  3. integration tests on localnet
  4. integration tests on studionet (unless skipped)
  5. optional Bradbury deploy

Examples:
  node scripts/run-staged-contract-workflow.mjs
  node scripts/run-staged-contract-workflow.mjs --skip-studionet
  node scripts/run-staged-contract-workflow.mjs --deploy-bradbury --write-env

Environment overrides:
  GENVM_LINT_BIN=genvm-lint node scripts/run-staged-contract-workflow.mjs
  PYTHON_BIN=python3 node scripts/run-staged-contract-workflow.mjs
`);
}

function renderCommand(command, args) {
  return [command, ...args].join(" ");
}

function runStep(title, command, args, options = {}) {
  console.log(`\n=== ${title} ===`);
  console.log(renderCommand(command, args));

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: options.shell ?? false,
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

const argv = process.argv.slice(2);
let contractPath = DEFAULT_CONTRACT;
let skipStudionet = false;
let deployBradbury = false;
let writeEnv = false;

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];

  if (arg === "--help" || arg === "-h") {
    printUsage();
    process.exit(0);
  }

  if (arg === "--contract") {
    contractPath = argv[i + 1] ?? DEFAULT_CONTRACT;
    i += 1;
    continue;
  }

  if (arg === "--skip-studionet") {
    skipStudionet = true;
    continue;
  }

  if (arg === "--deploy-bradbury") {
    deployBradbury = true;
    continue;
  }

  if (arg === "--write-env") {
    writeEnv = true;
    continue;
  }

  throw new Error(`Unknown option: ${arg}`);
}

try {
  runStep(
    "Contract lint",
    process.execPath,
    ["scripts/run-genvm-lint.mjs", "check", contractPath]
  );

  runStep("Direct tests", process.execPath, ["scripts/run-direct-tests.mjs"]);
  runStep("Integration tests (localnet)", process.execPath, [
    "scripts/run-integration-tests.mjs",
    "--network",
    "localnet",
  ]);

  if (!skipStudionet) {
    runStep("Integration tests (studionet)", process.execPath, [
      "scripts/run-integration-tests.mjs",
      "--network",
      "studionet",
    ]);
  }

  if (deployBradbury) {
    const deployArgs = [
      "scripts/genlayer-deploy.mjs",
      contractPath,
      "--network",
      "testnet-bradbury",
    ];
    if (writeEnv) {
      deployArgs.push("--write-env");
    }

    runStep("Deploy to Bradbury", process.execPath, deployArgs);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}

console.log("\nStaged contract workflow completed successfully.");
