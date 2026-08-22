#!/usr/bin/env node
// =============================================================================
// Converge — inspect / restrict database user privileges
// =============================================================================
// Managed MySQL users created through DigitalOcean get privileges on ALL
// databases in the cluster, not just the one you intend. That is how a staging
// app with a mistyped DATABASE_URL was able to connect to production's
// `defaultdb` — the connection string was wrong, but nothing stopped it.
//
// This audits a user's grants and can narrow them to a single database.
//
// Run from the console of an app whose DATABASE_URL uses an ADMIN user
// (doadmin) — a user cannot revoke its own privileges.
//
//   npm run db:grants                                  # audit every user
//   npm run db:grants -- --user staging_user           # audit one user
//   npm run db:grants -- --user staging_user --restrict-to staging
//
// --restrict-to grants on the named database FIRST, then revokes the global
// privileges. That order matters: reversing it briefly leaves the user with no
// access at all, which would take the app down until the grant lands.
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(ROOT, ".env");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "db"]);

const argv = process.argv.slice(2);
function flag(name) {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
}
const ONLY_USER = flag("user");
const RESTRICT_TO = flag("restrict-to");

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

if (RESTRICT_TO && !ONLY_USER) fail("--restrict-to requires --user.");
// Guard against the obvious catastrophe: scoping an account to the database it
// is not supposed to be scoped to, or narrowing the admin user by mistake.
if (ONLY_USER === "doadmin") fail("refusing to modify the primary admin user.");

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(ENV_FILE)) fail(`DATABASE_URL not set and ${ENV_FILE} missing.`);
  const line = readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^DATABASE_URL=/.test(l))
    .pop();
  if (!line) fail("DATABASE_URL not found in .env.");
  return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

const u = new URL(databaseUrl());
const cfg = {
  host: u.hostname === "localhost" ? "127.0.0.1" : u.hostname,
  port: Number(u.port) || 3306,
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
};
if (!LOCAL_HOSTS.has(u.hostname)) {
  const ca = process.env.DATABASE_CA_CERT?.trim();
  cfg.ssl = ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

console.log(`Connected as: ${cfg.user}@${cfg.host}:${cfg.port}`);

const conn = await mysql.createConnection(cfg);
try {
  const [users] = await conn.query(
    "SELECT user, host FROM mysql.user WHERE user NOT LIKE 'mysql.%' ORDER BY user",
  );
  const targets = ONLY_USER ? users.filter((r) => r.user === ONLY_USER) : users;
  if (ONLY_USER && targets.length === 0) fail(`no such user: ${ONLY_USER}`);

  for (const { user, host } of targets) {
    const [rows] = await conn.query(`SHOW GRANTS FOR ?@?`, [user, host]);
    console.log(`\n${user}@${host}`);
    for (const row of rows) {
      const g = Object.values(row)[0];
      // ON *.* means cluster-wide: every database, including production's.
      const scope = / ON \*\.\* /.test(g) ? "  [GLOBAL]" : "";
      console.log(`  ${g}${scope}`);
    }
  }

  if (!RESTRICT_TO) {
    console.log("\n(audit only — pass --restrict-to <db> to narrow a user)");
    process.exit(0);
  }

  const target = targets[0];
  const [[dbExists]] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.schemata WHERE schema_name = ?",
    [RESTRICT_TO],
  );
  if (dbExists.n === 0) fail(`database '${RESTRICT_TO}' does not exist.`);

  console.log(`\nRestricting ${target.user}@${target.host} to '${RESTRICT_TO}'...`);
  // Grant first, revoke second — never leave the user with nothing.
  await conn.query(
    `GRANT ALL PRIVILEGES ON \`${RESTRICT_TO}\`.* TO ?@?`,
    [target.user, target.host],
  );
  console.log(`  granted on ${RESTRICT_TO}.*`);
  await conn.query(`REVOKE ALL PRIVILEGES ON *.* FROM ?@?`, [target.user, target.host]);
  console.log("  revoked global privileges");
  await conn.query("FLUSH PRIVILEGES");

  const [after] = await conn.query(`SHOW GRANTS FOR ?@?`, [target.user, target.host]);
  console.log(`\n${target.user}@${target.host} now has:`);
  for (const row of after) console.log(`  ${Object.values(row)[0]}`);
} finally {
  await conn.end().catch(() => {});
}
