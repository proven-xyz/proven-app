# Validation Checks

Run these checks before installation or upgrade.

## System requirements

```bash
uname -m | grep -E '^(x86_64|amd64)$'
free -g
df -BG .
```

Expected:
- architecture: `x86_64` / `amd64`
- RAM: at least 16 GB
- free disk: at least about 100 GB available for safe operation

## Software prerequisites

```bash
node --version
npm --version
docker --version
docker compose version
python3 --version
pip3 --version
python3 -m venv --help >/dev/null
wget --version
tar --version
curl --version
jq --version
```

Recommended versions / expectations:
- Node.js 18+
- Docker installed and daemon running
- Docker Compose available via `docker compose`
- Python 3 with `pip3` and `venv`

## Network checks

```bash
curl -X POST "$RPC_URL" -H "Content-Type: application/json"   -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# websocket reachability should also be confirmed with the provider or client tooling
```

## GenLayer-specific inputs to confirm

- validator wallet address
- operator address
- source of operator key (import / copy / generate)
- chosen LLM provider and matching environment variable
- deployment method: systemd, Docker Compose, or manual
- version to install or upgrade to

## Dependency notes

Install if missing:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3 python3-pip python3-venv wget tar curl jq
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

`genlayer` CLI is typically only needed on the machine where the staking wizard is run:

```bash
npm install -g genlayer
```
