# Converge by Collegepond

**B2B Partner Portal for International Education Consulting**

Converge is a B2B Partner Portal designed to streamline the recruitment partner ecosystem for international education consulting. The platform enables recruitment agencies, freelance counselors, and education consultants to register, manage student applications, track commissions, and collaborate with Collegepond's internal teams through a unified digital interface.

---

## Tech Stack

| Layer              | Technology                  | Purpose                                              |
| ------------------ | --------------------------- | ---------------------------------------------------- |
| Framework          | Next.js 14+ (App Router)    | Server-side rendering, API routes, server components |
| Language           | TypeScript                  | End-to-end type safety across all layers             |
| API Layer          | tRPC v11                    | Type-safe API procedures, middleware for auth/roles   |
| ORM                | Prisma                      | Database schema management, type-safe queries        |
| Styling            | Tailwind CSS                | Utility-first CSS framework for responsive UI        |
| UI Components      | shadcn/ui                   | Accessible, customizable component library           |
| Authentication     | NextAuth.js (Auth.js)       | Credential-based login, session management, RBAC     |
| Database           | PostgreSQL 16               | Relational data storage with ACID compliance         |
| File Storage       | AWS S3                      | Document uploads, logos, certificates                |
| Validation         | Zod                         | Runtime schema validation for inputs and env vars    |
| State Management   | TanStack React Query        | Server state caching via tRPC integration            |

---

## Prerequisites

- **Node.js** v20 LTS or higher (managed via [nvm](https://github.com/nvm-sh/nvm))
- **npm** v10+
- **Docker** (for local PostgreSQL database)
- **Git**

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd converge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment setup

Copy the example env file and populate it with your values:

```bash
cp .env.example .env
```

### 4. Start the database

```bash
./start-database.sh
```

This script spins up a PostgreSQL 16 container via Docker (or Podman). It reads the `DATABASE_URL` from your `.env` file and offers to generate a random password if you're using the default.

### 5. Push the database schema

```bash
npm run db:push
```

### 6. Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Command                  | Description                           |
| ------------------------ | ------------------------------------- |
| `npm run dev`            | Start dev server with Turbopack       |
| `npm run build`          | Production build                      |
| `npm run start`          | Start production server               |
| `npm run db:push`        | Push Prisma schema to database        |
| `npm run db:generate`    | Run Prisma migrations (dev)           |
| `npm run db:migrate`     | Deploy Prisma migrations (production) |
| `npm run db:studio`      | Open Prisma Studio GUI               |
| `npm run lint`           | Run ESLint                            |
| `npm run typecheck`      | Run TypeScript type checking          |
| `npm run format:check`   | Check code formatting with Prettier   |
| `npm run format:write`   | Auto-format code with Prettier        |

---

## Project Structure

```
converge/
├── prisma/
│   └── schema.prisma          # Database schema definition
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router pages and layouts
│   │   ├── _components/       # Page-level React components
│   │   ├── api/               # API route handlers
│   │   │   ├── auth/          # NextAuth.js route handler
│   │   │   └── trpc/          # tRPC HTTP handler
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── server/                # Server-side code
│   │   ├── api/               # tRPC routers and procedures
│   │   │   ├── root.ts        # Root tRPC router
│   │   │   ├── routers/       # Feature-specific tRPC routers
│   │   │   └── trpc.ts        # tRPC initialization and middleware
│   │   ├── auth/              # NextAuth.js configuration
│   │   │   ├── config.ts      # Auth providers, callbacks, adapter
│   │   │   └── index.ts       # Auth exports
│   │   └── db.ts              # Prisma client instance
│   ├── trpc/                  # tRPC client-side setup
│   │   ├── query-client.ts    # TanStack Query client config
│   │   ├── react.tsx          # React tRPC provider and hooks
│   │   └── server.ts          # Server-side tRPC caller
│   ├── styles/
│   │   └── globals.css        # Global styles and Tailwind imports
│   └── env.js                 # Environment variable validation (Zod)
├── generated/                 # Auto-generated Prisma client
├── start-database.sh          # Docker-based local DB setup script
├── next.config.js
├── tsconfig.json
├── eslint.config.js
├── postcss.config.js
├── prettier.config.js
└── package.json
```

---

## Feature Modules

### 1. Partner Registration & Onboarding
Multi-step registration form with OTP-verified identity (phone and Aadhaar), company document upload, and admin approval before granting portal access.

### 2. Authentication & Role-Based Access Control
Credential-based login via NextAuth.js with three roles:
- **Admin** — Full access across all counselors, commissions, payments, and team management
- **Manager** — Access to all counselors within their partner organization (read-only on financials)
- **Counselor** — Access limited to their own students and applications

### 3. MOU / Terms & Conditions Signing
Mandatory digital signature of Terms & Conditions upon first admin login via Digio/Leegality integration. Signed MOU is emailed and stored in the partner profile.

### 4. Dashboard
Role-appropriate overview with key metrics: total students, active applications by status, pending commissions, recent notifications, and quick-action buttons.

### 5. Student Management
Create and manage student profiles including personal information, academic history, test scores, passport details, and supporting documents. Each student maintains a complete application timeline.

### 6. Application Management
Applications linked to student profiles with specific universities and programs. Status lifecycle: Draft → Submitted → Under Review → Conditional Offer → Unconditional Offer → Visa Ready → Enrolled. Each status change triggers notifications.

### 7. University & Program Finder
Searchable directory of partner universities and programs. Filterable by country, program level, intake season, and tuition range. Includes entry requirements, deadlines, and commission structures.

### 8. Commission Tracking
Transparent commission management showing partner status tier, current rates, and per-university structures. Filterable by country and school. Includes commission history and payout schedule visibility.

### 9. Bank Details & Payouts
Partners upload cancelled cheques and enter bank details for commission payouts. Account name verification against company/individual name. Managed under the "Commissions" navigation section.

### 10. Contracts
View and download active contracts/MOUs. Tracks contract updates, validity periods, and current status (Active / Expired / Pending Renewal).

### 11. Team Management (Admin Only)
Admin users add counselors and managers to their partner organization. New team members receive temporary credentials via email. Admin assigns roles and selects primary contact.

### 12. Notification Preferences
Configurable delivery preferences for email (Immediate, Daily digest, Weekly digest, Never) and WhatsApp notifications for application status updates.

### 13. Education Loan Assistance
Workflow module to help students access education loan options. Partners can initiate loan assistance requests linked to student applications.

### 14. Excel Report Downloads
Server-generated Excel reports via ExcelJS: student lists with application statuses, commission summaries by period, application pipeline by university, and partner performance analytics.

---

## Database Entities

| Entity         | Description                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Partner**    | Registered partner company or freelancer. Fields: companyName, gstNumber, panCard, incorporationCert, logo, status |
| **User**       | Individual user account linked to a partner. Fields: name, email, phone, aadhaarHash, designation, role            |
| **Student**    | Student record created by counselors. Fields: name, email, phone, passport, educationHistory, documents            |
| **Application**| University application for a student. Fields: universityId, programId, status, intakeSeason, documents             |
| **University** | University master data. Fields: name, country, programs, commissionStructure, deadlines                            |
| **Commission** | Commission record tied to an application. Fields: applicationId, rate, amount, status, payoutDate, invoiceRef      |
| **Contract**   | MOU/agreement between Collegepond and partner. Fields: partnerId, documentUrl, signedDate, expiryDate, status      |
| **BankDetails**| Partner bank/payment details. Fields: partnerId, accountName, accountNumber, ifscCode, cancelledChequeUrl          |
| **Notification**| System notifications for partners. Fields: userId, type, message, channel, readStatus, sentAt                    |
| **AuditLog**   | System-wide activity tracking. Fields: userId, action, entityType, entityId, metadata, ipAddress, timestamp        |

### Key Relationships
- Partner has many Users (Admin, Managers, Counselors)
- User (Counselor) creates many Students
- Student has many Applications
- Application belongs to one University and one Program
- Application generates one Commission record
- Partner has one BankDetails record and many Contracts
- All entities link to AuditLog for compliance tracking

---

## Third-Party Integrations

| Service              | Provider              | Usage                                                  |
| -------------------- | --------------------- | ------------------------------------------------------ |
| SMS OTP              | MSG91                 | Phone number verification during registration and login |
| Email                | AWS SES               | Transactional emails: OTP, credentials, notifications  |
| WhatsApp             | MSG91 / Gupshup       | Application status updates, partner notifications      |
| GST Verification     | Masters India / Surepass | GSTIN validation and company details cross-check    |
| Aadhaar Verification | Surepass / Signzy     | OTP-based Aadhaar verification for partner KYC         |
| Payments             | Razorpay / RazorpayX  | Commission payouts and payment processing              |
| Digital Signature    | Digio / Leegality     | MOU/contract e-signature with legal validity           |
| Excel Reports        | ExcelJS               | Server-side report generation for downloads            |

---

## Environment Variables

Create a `.env` file based on `.env.example` with the following variables:

```bash
# Authentication
AUTH_SECRET=""                  # NextAuth.js secret (generate with: npx auth secret)

# Database
DATABASE_URL=""                # PostgreSQL connection string
                               # Example: postgresql://postgres:password@localhost:5432/converge

# AWS
AWS_ACCESS_KEY_ID=""           # AWS IAM credentials
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="ap-south-1"
AWS_S3_BUCKET=""               # S3 bucket for document storage

# AWS SES
AWS_SES_FROM_EMAIL=""          # Verified sender email address

# MSG91
MSG91_AUTH_KEY=""               # MSG91 API key for SMS OTP
MSG91_TEMPLATE_ID=""           # SMS template ID

# WhatsApp (MSG91 / Gupshup)
WHATSAPP_API_KEY=""            # WhatsApp messaging API key
WHATSAPP_TEMPLATE_ID=""

# GST Verification
GST_API_KEY=""                 # Masters India / Surepass API key

# Aadhaar Verification
AADHAAR_API_KEY=""             # Surepass / Signzy API key

# Razorpay
RAZORPAY_KEY_ID=""             # Razorpay API key
RAZORPAY_KEY_SECRET=""         # Razorpay API secret

# Digital Signature
DIGIO_CLIENT_ID=""             # Digio / Leegality client credentials
DIGIO_CLIENT_SECRET=""

# Application
NEXT_PUBLIC_APP_URL=""         # Public-facing app URL
```

Environment variables are validated at build time using Zod schemas defined in `src/env.js`.

---

## Deployment

The application is deployed on **AWS** using **SST (Serverless Stack)** for infrastructure-as-code.

| Service    | Configuration              | Purpose                                    |
| ---------- | -------------------------- | ------------------------------------------ |
| Region     | ap-south-1 (Mumbai)        | Lowest latency for target users in India   |
| Compute    | SST on AWS Lambda          | Serverless Next.js deployment via OpenNext  |
| CDN        | CloudFront                 | Static asset caching, edge delivery        |
| Database   | RDS PostgreSQL (db.t3.micro) | Managed relational DB with automated backups |
| Storage    | S3                         | Partner documents, logos, signed MOUs      |
| Email      | SES                        | Transactional email delivery               |
| Secrets    | SSM Parameter Store        | API keys, database credentials, tokens     |
| Monitoring | CloudWatch                 | Logs, alarms, performance metrics          |

### Environments

| Environment | URL                                        | Purpose                      |
| ----------- | ------------------------------------------ | ---------------------------- |
| Local       | localhost:3000                              | Development with Docker DB   |
| Staging     | staging.converge.collegepond.com            | Pre-production testing, UAT  |
| Production  | converge.collegepond.com                    | Live system                  |

### CI/CD Pipeline (GitHub Actions)

Triggered on push to `develop` (staging) and `main` (production):

1. Install dependencies
2. Run lint and type-check
3. Execute unit and API test suites
4. Run Prisma migration check
5. Build Next.js application
6. Deploy via SST to target AWS environment
7. Post-deployment health check

---

## Testing

| Type             | Tool                   | Coverage                                                        |
| ---------------- | ---------------------- | --------------------------------------------------------------- |
| Unit Tests       | Vitest                 | Business logic, commission calculations, role checks, validation |
| API Tests        | Vitest + tRPC caller   | All tRPC procedures tested with mock DB context per role        |
| Component Tests  | React Testing Library  | Form components, role-based UI rendering, state management      |
| E2E Tests        | Playwright             | Critical user flows: registration, login, application submission |

### Quality Gates

- All PRs require passing CI (lint + type-check + unit tests) before merge
- E2E test suite runs nightly on the staging environment
- UAT sign-off required from Collegepond team before production deployment

---

## Team

| Name              | Role                                              |
| ----------------- | ------------------------------------------------- |
| **Riana Nawany**  | Architecture, development, testing, deployment    |
| **Tejas Pashte**  | Architecture, development, testing, deployment    |

---

## License

This project is proprietary and confidential. Internal use only.
