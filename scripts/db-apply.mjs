#!/usr/bin/env node
// =============================================================================
// Converge — DB apply (Node port of db-apply.sh)
// =============================================================================
// Applies prisma/sql/migrations/*.sql in filename order and records each in
// schema_migrations. Idempotent, forward-only, non-destructive.
//
// Unlike db-apply.sh this shells out to nothing — it talks to MySQL through
// mysql2 — so it runs inside the DigitalOcean App Platform container, which has
// no `mysql` client. That's what lets migrations run as a PRE_DEPLOY job
// instead of by hand against production.
//
// Usage:
//   node scripts/db-apply.mjs              # interactive for remote hosts
//   node scripts/db-apply.mjs --force      # non-interactive (CI / pre-deploy)
//   node scripts/db-apply.mjs --baseline   # see "Baselining" below
//
// Baselining: prisma/sql/schema.sql already contains every delta, but loading it
// does NOT populate schema_migrations. A database bootstrapped that way looks
// identical to one that has never been migrated, and blindly applying the deltas
// would fail on duplicate columns/tables. When this script sees an empty
// schema_migrations alongside existing application tables it refuses to guess and
// tells you to run --baseline, which records the current files as applied without
// executing them. Run once per environment.
// =============================================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import mysql from "mysql2/promise";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG_DIR = join(ROOT, "prisma", "sql", "migrations");
const ENV_FILE = join(ROOT, ".env");
const LOCK_NAME = "converge_db_apply";

const argv = new Set(process.argv.slice(2));
const FORCE = argv.has("--force") || argv.has("-f");
const BASELINE = argv.has("--baseline");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "db"]);

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

// DATABASE_URL from the environment (App Platform) or .env (native host).
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(ENV_FILE)) {
    fail(`DATABASE_URL not set and ${ENV_FILE} missing.`);
  }
  const line = readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^DATABASE_URL=/.test(l))
    .pop();
  if (!line) fail("DATABASE_URL not found in .env.");
  return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

function connectionConfig(raw) {
  const u = new URL(raw);
  const database = decodeURIComponent(u.pathname.replace(/^\//, ""));
  if (!database) fail("could not parse database name from DATABASE_URL.");
  const isLocal = LOCAL_HOSTS.has(u.hostname);

  const cfg = {
    host: u.hostname === "localhost" ? "127.0.0.1" : u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
    multipleStatements: true, // migration files hold many statements
  };

  // Managed MySQL requires TLS. With the CA present we verify it; without, we
  // still encrypt but cannot verify — same posture as src/server/db.ts.
  if (!isLocal) {
    const ca = process.env.DATABASE_CA_CERT?.trim();
    cfg.ssl = ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
    if (!ca) {
      console.warn("[db-apply] No DATABASE_CA_CERT — TLS encrypted but unverified.");
    }
  }
  return { cfg, isLocal, display: `${cfg.user}@${cfg.host}:${cfg.port}/${database}` };
}

function migrationFiles() {
  if (!existsSync(MIG_DIR)) return [];
  return readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort();
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

const { cfg, isLocal, display } = connectionConfig(databaseUrl());
const files = migrationFiles();

console.log(`Target: ${display}`);
console.log(`Files:  ${files.length} migration(s) in prisma/sql/migrations`);

if (!isLocal && !FORCE) {
  if (!process.stdin.isTTY) {
    fail("refusing to touch a non-local database without --force (no TTY to confirm).");
  }
  const ok = await confirm(`Apply pending migrations to ${display}? [y/N]: `);
  if (!ok) {
    console.log("Aborted.");
    process.exit(1);
  }
}

const conn = await mysql.createConnection(cfg);
let locked = false;
try {
  // Serialise concurrent runners (multiple instances, overlapping deploys).
  const [[lock]] = await conn.query("SELECT GET_LOCK(?, 60) AS ok", [LOCK_NAME]);
  if (lock.ok !== 1) fail("could not acquire migration lock (another run in progress?).");
  locked = true;

  await conn.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (" +
      "version VARCHAR(255) NOT NULL, " +
      "applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
      "PRIMARY KEY (version)) ENGINE=InnoDB",
  );

  const [rows] = await conn.query("SELECT version FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  // Does this database already carry application tables?
  const [[{ n: otherTables }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables " +
      "WHERE table_schema = ? AND table_name <> 'schema_migrations'",
    [cfg.database],
  );

  if (BASELINE) {
    const pending = files.filter((f) => !applied.has(f));
    for (const f of pending) {
      await conn.query("INSERT INTO schema_migrations (version) VALUES (?)", [f]);
      console.log(`baseline ${f}`);
    }
    console.log(`\nDone. Baselined ${pending.length} migration(s) — none were executed.`);
    process.exit(0);
  }

  // Bootstrapped from schema.sql: tables exist but nothing is recorded. Applying
  // the deltas here would fail on objects that already exist, so stop and say so.
  if (applied.size === 0 && otherTables > 0 && files.length > 0) {
    console.error("");
    console.error("Error: this database has tables but no migration history.");
    console.error("");
    console.error("  That means it was loaded from prisma/sql/schema.sql, which already");
    console.error("  contains every delta but does not record them. Applying them now");
    console.error("  would fail on already-existing columns and tables.");
    console.error("");
    console.error("  Record them as applied (without executing) by running once:");
    console.error("      npm run db:baseline");
    console.error("");
    process.exit(1);
  }

  const pending = files.filter((f) => !applied.has(f));
  for (const f of files) if (applied.has(f)) console.log(`skip   ${f}`);

  for (const f of pending) {
    console.log(`apply  ${f}`);
    const sql = readFileSync(join(MIG_DIR, f), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (version) VALUES (?)", [f]);
  }

  console.log(`\nDone. Applied ${pending.length} new migration(s).`);
} finally {
  if (locked) await conn.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]).catch(() => {});
  await conn.end().catch(() => {});
}
