# Base image ships with Node 20, npm, git, zsh, and the non-root `node` user.
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# - default-mysql-client: used by scripts/db-reset.sh and ad-hoc DB inspection
# - openssl, ca-certificates: required by Prisma at runtime
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
       default-mysql-client \
       openssl \
       ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
