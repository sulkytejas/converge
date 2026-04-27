#!/usr/bin/env bash
# Runs once after the dev container is built. Idempotent: safe to re-run.
#
# Steps:
#   1. Create .env from .env.example if missing
#   2. npm install
#   3. Apply database schema and generate Prisma client
#
# DATABASE_URL is provided by .devcontainer/compose.yml as an env var, so this
# script does not depend on the host's .env DATABASE_URL value.

set -euo pipefail

cd "$(dirname "$0")/.."

# 1. Ensure .env exists. We do NOT rewrite an existing .env — DATABASE_URL is
#    overridden via compose env at runtime, so the host's localhost-style URL
#    in .env is fine for native dev and ignored inside the container.
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[setup] Created .env from .env.example."
  echo "[setup]   MSG91 keys are blank — OTPs will print to the server log."
fi

# 2. Install dependencies (cached in the node-modules named volume on rebuilds)
echo "[setup] Installing npm dependencies..."
npm install

# 3. Apply schema and generate Prisma client
#    Compose's depends_on:condition:service_healthy guarantees MySQL is ready.
echo "[setup] Applying database schema..."
npm run db:reset:force

echo
echo "[setup] Done."
echo "[setup]   Run 'npm run dev' to start the app at http://localhost:3000."
