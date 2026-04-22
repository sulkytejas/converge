import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");

export type ApplicationStatus = "under_review" | "approved" | "rejected";

export interface Application {
  applicationId: string;
  email: string;
  role: "agency" | "independent";
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  companyName?: string;
  companyWebsite?: string;
  country?: string;
  state?: string;
  city?: string;
  companyAddress?: string;
  numCounselors?: string;
  annualVolume?: string;
  documents?: Record<string, string>;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
}

function loadAll(): Record<string, Application> {
  if (!existsSync(DATA_FILE)) return {};
  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as Record<string, Application>;
  } catch {
    return {};
  }
}

function saveAll(all: Record<string, Application>) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), "utf8");
}

function keyOf(email: string): string {
  return email.toLowerCase();
}

function generateApplicationId(): string {
  return `#CP-${new Date().getFullYear()}-${String(
    Math.floor(Math.random() * 999999),
  ).padStart(6, "0")}`;
}

export function getApplicationByEmail(email: string): Application | null {
  const all = loadAll();
  return all[keyOf(email)] ?? null;
}

export function saveApplication(
  input: Omit<Application, "applicationId" | "status" | "submittedAt" | "updatedAt">,
): Application {
  const all = loadAll();
  const key = keyOf(input.email);
  const now = new Date().toISOString();
  const existing = all[key];
  const app: Application = {
    ...input,
    applicationId: existing?.applicationId ?? generateApplicationId(),
    status: "under_review",
    submittedAt: existing?.submittedAt ?? now,
    updatedAt: now,
  };
  all[key] = app;
  saveAll(all);
  return app;
}

export function setApplicationStatus(
  email: string,
  status: ApplicationStatus,
): Application | null {
  const all = loadAll();
  const key = keyOf(email);
  const existing = all[key];
  if (!existing) return null;
  const updated: Application = { ...existing, status, updatedAt: new Date().toISOString() };
  all[key] = updated;
  saveAll(all);
  return updated;
}
