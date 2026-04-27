# Converge by Collegepond

**B2B Partner Portal for International Education Consulting**

Converge is a B2B Partner Portal for the recruitment partner ecosystem of international education consulting. Recruitment agencies, freelance counselors, and education consultants register, manage student applications, track commissions, and collaborate with Collegepond's internal teams through a unified portal.

---

## Tech Stack

| Layer            | Technology                | Notes                                              |
| ---------------- | ------------------------- | -------------------------------------------------- |
| Framework        | Next.js 15 (App Router)   | Server components, route handlers                  |
| Language         | TypeScript                | Strict mode, end-to-end type safety                |
| API Layer        | tRPC v11                  | Type-safe procedures consumed by React Query       |
| ORM              | Prisma                    | Generated client; canonical DDL in `prisma/sql/`   |
| Styling          | Tailwind CSS v4           | Utility-first; theme tokens in `src/styles/globals.css` |
| Authentication   | OTP via MSG91 (in progress) | Email + phone OTP; session layer not yet wired in |
| Database         | MySQL 8                   | Local dev runs in Docker                           |
| Validation       | Zod                       | Runtime input + env validation (`src/env.js`)      |
| State            | TanStack React Query      | Via tRPC integration                               |

---

## Getting Started

You have two options. **Pick the dev container path** unless you have a reason to install everything natively.

### Option A — Dev container (recommended)

One-time host install: **Docker Desktop** + **VS Code** + the **Dev Containers** extension. Then:

```bash
git clone https://github.com/sulkytejas/converge.git
cd converge
code .
```

VS Code will detect `.devcontainer/` and prompt **"Reopen in Container"** — click it. The first build takes a few minutes (downloading the Node + MySQL images). After that:

- `npm install` has run
- `.env` was created from `.env.example`
- The MySQL container is up at host `db:3306` (also forwarded to host `localhost:3306`)
- Schema from `prisma/sql/schema.sql` is applied
- The Prisma client is generated

Open the integrated terminal and run `npm run dev`. App is available at `http://localhost:3000`.

To enable real OTP delivery, fill in the `MSG91_*` keys in `.env`. Without them, OTPs are logged to the server console (sandbox mode).

### Option B — Native setup

Prerequisites: Node.js 20+, npm 10+, Docker (for the MySQL container), Git.

```bash
git clone https://github.com/sulkytejas/converge.git
cd converge
npm install
cp .env.example .env
./start-database.sh        # boots a local MySQL 8 container
npm run db:reset           # applies schema + generates Prisma client
npm run dev
```

---

## Useful scripts

| Command                  | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `npm run dev`            | Dev server with Turbopack                                         |
| `npm run build`          | Production build                                                  |
| `npm run start`          | Production server                                                 |
| `npm run db:reset`       | Drop DB, apply `prisma/sql/schema.sql`, regenerate client (interactive) |
| `npm run db:reset:force` | Same, no confirmation prompt                                      |
| `npm run db:push`        | Push Prisma schema to DB (Prisma-driven path)                     |
| `npm run db:studio`      | Open Prisma Studio                                                |
| `npm run lint`           | ESLint                                                            |
| `npm run typecheck`      | TypeScript type-check (`tsc --noEmit`)                            |
| `npm run format:write`   | Auto-format with Prettier                                         |

---

## Project Structure

```
converge/
├── .devcontainer/             # Dev container (Dockerfile, compose, post-create)
├── prisma/
│   ├── schema.prisma          # Prisma model definitions
│   └── sql/schema.sql         # Canonical MySQL DDL — applied by db-reset.sh
├── scripts/
│   └── db-reset.sh            # Reset DB and apply prisma/sql/schema.sql
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (dashboard)/       # Admin dashboard route group (sidebar+topbar layout)
│   │   ├── admin/login/       # Admin OTP login
│   │   ├── login/             # Partner OTP login
│   │   ├── signup/            # Partner registration flow
│   │   ├── api/trpc/          # tRPC HTTP handler
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Redirects to /login
│   ├── components/
│   │   ├── dashboard/         # DashboardShell (HOC), Sidebar, Topbar, nav config
│   │   └── ui/                # Reusable UI primitives (button, inputs, modal, etc.)
│   ├── server/
│   │   ├── api/               # tRPC routers (auth, signup, admin-auth) + trpc.ts
│   │   ├── applications/      # Application/user persistence layer
│   │   └── db/enums.ts        # Domain enums for integer-coded columns
│   ├── trpc/                  # tRPC client setup (React provider, query client)
│   ├── styles/globals.css     # Tailwind + theme tokens
│   └── env.js                 # Zod schema for environment variables
├── generated/                 # Auto-generated Prisma client
├── start-database.sh          # Native-path Docker DB launcher
└── package.json
```

---

## Environment Variables

`.env.example` is the source of truth. Currently:

```bash
DATABASE_URL="mysql://root:password@localhost:3306/converge"

# MSG91 (OTP provider — leave empty for sandbox: OTPs print to server log)
MSG91_AUTH_KEY=""
MSG91_SMS_TEMPLATE_ID=""
MSG91_EMAIL_TEMPLATE_ID=""
MSG91_EMAIL_FROM=""
MSG91_EMAIL_DOMAIN=""

ADMIN_EMAIL=""
```

Variables are validated at startup by Zod (`src/env.js`). Set `SKIP_ENV_VALIDATION=1` to bypass the check during builds.

> Inside the dev container, `DATABASE_URL` is overridden by `.devcontainer/compose.yml` to point at the `db` service. Your `.env` is left untouched so the native-path workflow keeps working.

---

## Testing the UI without a database

Most auth tRPC routes still return placeholder success responses, so the UI flows can be exercised without a working DB.

```bash
SKIP_ENV_VALIDATION=1 npm run dev
```

- **Partner login** (`/login`) — any valid email, any 10-digit phone, any 5-digit OTP succeeds.
- **Partner signup** (`/signup`) — full multi-step flow; uploads accept any file; success returns a dummy application ID.
- **Admin login** (`/admin/login`) — email must end in `@collegepond.com` or `@convergeapp.co`; any 6-digit OTP succeeds; lands on `/cp-dashboard`.
- **Dashboard routes** (`/cp-dashboard`, `/cp-partners`, `/cp-students`, etc.) — currently render placeholder pages inside the shared sidebar+topbar shell.

---

## Planned scope

The sections below describe the target product — not all of it is implemented yet. Track the actual state via git history and the `(dashboard)` route stubs.

### Feature modules

1. **Partner Registration & Onboarding** — multi-step form with OTP verification, document upload, admin approval. *(signup flow partially implemented; admin approval is dev-only)*
2. **Authentication & RBAC** — OTP login backed by a session table; roles enforced inside tRPC. *(OTP flow exists; session layer not yet wired)*
3. **MOU / Terms signing** — digital signature via Digio/Leegality on first admin login.
4. **Dashboard** — role-appropriate metrics and quick actions. *(shell scaffolded; content TBD)*
5. **Student Management** — profiles, academic history, documents, application timeline.
6. **Application Management** — status lifecycle from Draft to Enrolled, with notification triggers.
7. **University & Program Finder** — searchable directory with entry requirements and commissions.
8. **Commission Tracking** — tier, rates, history, payout schedule.
9. **Bank Details & Payouts** — cancelled cheque upload, account verification.
10. **Contracts** — view/download active MOUs.
11. **Team Management (Admin)** — add counselors/managers, send credentials.
12. **Notification Preferences** — per-channel delivery cadence.
13. **Education Loan Assistance** — initiate loan requests against a student.
14. **Excel Reports** — server-generated via ExcelJS.

### Roles

- **Admin** — full access across counselors, commissions, payments, team
- **Manager** — read-most across the partner org
- **Counselor** — own students and applications only

### Third-party integrations (planned)

| Service               | Provider                | Usage                                   |
| --------------------- | ----------------------- | --------------------------------------- |
| SMS / Email OTP       | MSG91                   | Verification + notifications *(active)* |
| Email                 | AWS SES                 | Transactional email                     |
| WhatsApp              | MSG91 / Gupshup         | Application status updates              |
| GST verification      | Masters India / Surepass | GSTIN validation                       |
| Aadhaar verification  | Surepass / Signzy       | KYC                                     |
| Payments              | Razorpay / RazorpayX    | Commission payouts                      |
| Digital signature     | Digio / Leegality       | MOU e-signature                         |
| File storage          | AWS S3                  | Documents, logos, signed MOUs           |

### Deployment (planned)

AWS via SST (OpenNext) into ap-south-1: Lambda compute, CloudFront CDN, RDS MySQL, S3, SES, SSM Parameter Store, CloudWatch.

| Environment | Host                                  |
| ----------- | ------------------------------------- |
| Local       | localhost:3000                        |
| Staging     | staging.converge.collegepond.com      |
| Production  | converge.collegepond.com              |

---

## Team

| Name             | Role                                           |
| ---------------- | ---------------------------------------------- |
| **Riana Nawany** | Architecture, development, testing, deployment |
| **Tejas Pashte** | Architecture, development, testing, deployment |

---

## License

Proprietary and confidential. Internal use only.
