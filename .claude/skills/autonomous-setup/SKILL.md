---
name: autonomous-setup
description: >
  Install and run the Converge app end-to-end on this machine with zero manual
  steps — check/install prerequisites (Node 20, Docker), create .env with
  generated secrets, start the MySQL container, load schema + seed data, boot
  the dev server, verify it works, and finish with a setup report. Use when the
  user asks to set up, install, or bootstrap this project, especially right
  after cloning. Safe to re-run: it detects an existing install and just
  verifies + reports.
---

# Autonomous end-to-end setup

You are setting this app up **for** the user. Assume they may be non-technical:
never hand them a command to run, never ask them to edit a file, and only stop
to ask a question when something genuinely needs their decision (see the two
exceptions below). Fix problems yourself and keep going. At the end, deliver
the report described in Phase 7 — that report is the deliverable.

The app: Next.js 15 + tRPC + Prisma + MySQL 8 (local dev DB runs in Docker).
Everything below happens from the repo root. If this session did not start
inside the repo (e.g. Claude just cloned it after a pasted onboarding
message), locate the clone and run every command from that directory.

**Only two questions are ever allowed:**
1. The database already contains tables (this is NOT a fresh clone) — ask
   before wiping it with `db:reset`.
2. A prerequisite install needs something only the user can do (e.g. Docker
   Desktop needs a GUI first-launch / license acceptance, or no package manager
   exists). Ask them to do that one thing, then continue yourself.

**Windows:** the repo's scripts are bash. If on native Windows, run everything
inside WSL; if WSL is missing, that's an exception-2 question.

## Phase 0 — Detect what already exists (idempotency)

Check, in order: does `.env` exist; is a `converge-mysql` container running; is
MySQL reachable; does the DB have tables; is a dev server already answering on
http://localhost:3000. If everything is already healthy, skip to Phase 6
(verify) and then report — do not reinstall or wipe anything.

## Phase 1 — Prerequisites

Check each tool BEFORE installing anything; install only what's actually
missing, always preferring paths that need no admin password. This app needs
only Node and a MySQL runtime (Docker) — no Python, no other languages.

**Package manager bootstrap (only if needed for an install below):**
- macOS: check `brew --version`. If Homebrew is missing and something below
  needs it, run the official installer
  (`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`).
  It prompts for the user's Mac login password and may install Xcode Command
  Line Tools — Claude runs it, and the ONE thing the user does is type their
  password when asked (this is exception 2: tell them exactly that, in plain
  words, then continue). Afterwards make brew available on PATH
  (`eval "$(/opt/homebrew/bin/brew shellenv)"` on Apple Silicon,
  `/usr/local/bin` on Intel).
- Linux: use the distro's existing manager (`apt`, `dnf`, `pacman`); `sudo`
  password prompts are handled the same way — user types it once, Claude does
  the rest.
- Skip the bootstrap entirely when nvm covers the need (see Node below).

**The tools:**
- **Node 20.x** (`engines` in package.json). Check `node --version`. If
  missing or wrong-major: prefer **nvm** (installs in the home folder, zero
  sudo, no Homebrew needed): install nvm via its official curl script, then
  `nvm install 20 && nvm use 20` — and use that Node for every later phase.
  `brew install node@20` is the alternative when brew already exists.
- **Docker or Podman** with the daemon running. macOS: if Docker Desktop is
  installed but not running, `open -a Docker` and poll `docker info` (up to
  ~60s). If neither exists, install Docker Desktop via
  `brew install --cask docker` (bootstrap brew first if needed), then
  `open -a Docker` — if a GUI first-run step (license click) blocks it,
  that's exception 2. Linux: `docker` engine via the distro manager, then
  ensure the daemon is started (`systemctl start docker`) and the user can
  reach it. Fallback: a locally installed MySQL 8 server also works (the
  scripts detect a local `mysql` client), but Docker is the default path.
- Verify `npm --version` works after Node install.

If an install fails one way, try the alternate route (brew ↔ nvm ↔ official
installer script) before asking the user anything. Record every tool's version
and whether you installed it or found it, for the report.

## Phase 2 — Dependencies

`npm install` (postinstall runs `prisma generate`; needs no DB). If it fails on
Node-version grounds, fix Phase 1 first; on network/registry errors retry once.

## Phase 3 — .env

If `.env` already exists, keep it (fill only missing required keys). Otherwise
`cp .env.example .env`, then edit `.env`:

- `DATABASE_URL`: generate a URL-safe password with
  `openssl rand -base64 12 | tr '+/' '-_'` and set
  `mysql://root:<password>@localhost:3306/converge`. **Never leave the literal
  `password` default** — `start-database.sh` prompts interactively on it, which
  breaks unattended runs. If port 3306 is already taken by something that is
  NOT the `converge-mysql` container, use the next free port (3307, 3308…) in
  the URL — the script starts the container on whatever port the URL says.
- `AUTH_SECRET`: `openssl rand -base64 48`.
- Leave everything else empty — those are all optional in dev and degrade
  safely: empty `MSG91_AUTH_KEY` = **sandbox mode, login OTP codes are printed
  to the dev-server log**; empty `SPACES_*` = uploads go to `./public/uploads`;
  Razorpay/TLS/CDN vars are prod-only.

## Phase 4 — Database

1. If a `converge-mysql` container exists but is stopped: `docker start
   converge-mysql`. If it's already running, skip to readiness. Only when no
   container exists run `./start-database.sh` (non-interactive now that the
   password isn't the default).
2. **Wait for MySQL readiness** — first boot initializes for 10–60s. Poll
   `docker exec converge-mysql mysqladmin ping -uroot -p<password>` every ~3s,
   up to 2 minutes, before touching the DB.
3. Load schema + seed: `npm run db:reset:force` (drops/recreates `converge`,
   applies `prisma/sql/schema.sql` + `prisma/sql/seed.sql`, regenerates the
   Prisma client). **Guard:** if Phase 0 found existing tables, ask before
   this step (exception 1); on a fresh DB just run it.

## Phase 5 — Run the app

Start exactly ONE dev server: `npm run dev` as a background task. Do not start
a second one if a healthy one already answers — stale duplicate servers cause
fake hydration errors. Wait for Next's "Ready" line (first compile can take a
while), then confirm:

- `curl -s http://localhost:3000/api/health` → healthy (includes a DB ping)
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → 200

Leave the dev server running for the user.

## Phase 6 — Verify with a real login (best effort)

Sandbox OTP makes a genuine end-to-end check possible with no external
services: visit `http://localhost:3000/admin/login`, submit
`admin@collegepond.com`, then read the OTP code from the dev-server background
output and enter it. Use browser automation if available in this session;
otherwise verify via curl that the login page renders (HTTP 200) and note in
the report that the click-through was skipped. Never mark a step verified that
you didn't actually verify.

## Phase 7 — The report

Write `SETUP-REPORT.md` at the repo root (do not commit it) AND print the same
content as your final message. Plain language — written for someone
non-technical. It must contain:

1. **Status line up top**: "✅ Converge is installed and running at
   http://localhost:3000" (or what failed and what you did about it).
2. **What was done** — checklist of phases with ✅/⚠️/❌ and anything you had
   to install (with versions: Node, npm, Docker, MySQL image).
3. **How to log in** — the seeded accounts table:

   | Portal | URL | Email | Role |
   |---|---|---|---|
   | Admin | http://localhost:3000/admin/login | admin@collegepond.com | Super Admin |
   | Admin | http://localhost:3000/admin/login | finance.manager@collegepond.com | Finance Manager |
   | Admin | http://localhost:3000/admin/login | counsellor@collegepond.com | Counsellor |
   | Admin | http://localhost:3000/admin/login | bdm@collegepond.com | BDM |
   | Partner | http://localhost:3000/login | gec.owner@example.com | Partner org owner |

   (Full role list is in the header of `prisma/sql/seed.sql`.)
4. **About the login code**: no real emails/SMS are sent in dev — when the
   site asks for a code, they can just ask Claude "what's my login code?" and
   Claude reads it from the server log. Spell that out.
5. **Next time**: to start the app again they can ask Claude to "start the
   app", or run `./start-database.sh` then `npm run dev`.
6. **Not configured (on purpose)**: MSG91 (real email/SMS), DigitalOcean
   Spaces (cloud file storage), RazorpayX (payouts) — the app runs fine
   without them in dev; each needs real credentials in `.env` for production.
7. **If something failed**: exactly what, the error, and the single next
   action needed.
