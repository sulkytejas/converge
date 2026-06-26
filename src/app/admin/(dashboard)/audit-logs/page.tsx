"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { FormSelect } from "~/components/ui/form-select";
import { Toast } from "~/components/ui/toast";
import { StatCard } from "~/components/dashboard/widgets";
import { AdminRole } from "~/server/db/enums";

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3.5 py-3 text-[13px] whitespace-nowrap text-[#344054]";

type Log = {
  id: string; userId: string; userName: string; action: string; module: string;
  description: string; ip: string; timestamp: string; details: Record<string, unknown>;
};

const ACTIONS = ["Login", "Logout", "Data Change", "Export", "Approval", "Settings Change", "User Management"];
const MODULES = ["Students", "Applications", "Finance", "Universities", "Commission Rates", "Partners", "Events", "Users", "Settings"];

const ACTION_TONE: Record<string, string> = {
  Login: "bg-[#EFF8FF] text-[#175CD3]",
  Logout: "bg-[#F2F4F7] text-[#667085]",
  "Data Change": "bg-[#FFFAEB] text-[#B54708]",
  Export: "bg-[#F0FDF4] text-[#067647]",
  Approval: "bg-[#FDF2FA] text-[#C11574]",
  "Settings Change": "bg-[#F5F3FF] text-[#6941C6]",
  "User Management": "bg-[#FFF1F3] text-[#C01048]",
};

// Illustrative seed data (no audit_log table yet — wire to a real one later).
const SEED: Log[] = [
  { id: "AUD-001", userId: "USR-001", userName: "Suraj Bajaj", action: "Login", module: "Users", description: "Logged in from Chrome on macOS", ip: "103.21.58.112", timestamp: "2026-06-27 09:15:22", details: { browser: "Chrome", os: "macOS", location: "Mumbai, IN" } },
  { id: "AUD-002", userId: "USR-005", userName: "Neha Sharma", action: "Approval", module: "Finance", description: "Approved invoice INV/GEC/2026/01 for Global Education Consultants", ip: "103.21.58.140", timestamp: "2026-06-27 09:42:10", details: { invoiceId: "INV/GEC/2026/01", amount: "₹8,86,770" } },
  { id: "AUD-003", userId: "USR-001", userName: "Suraj Bajaj", action: "Settings Change", module: "Settings", description: "Updated USD → INR exchange rate", ip: "103.21.58.112", timestamp: "2026-06-27 10:05:48", details: { setting: "fx.USD", before: "83.00", after: "83.50" } },
  { id: "AUD-004", userId: "USR-004", userName: "Priya Mehta", action: "Data Change", module: "Students", description: "Updated student profile for Priya Nair (CP-10025)", ip: "103.21.58.155", timestamp: "2026-06-27 11:20:33", details: { studentId: "CP-10025", before: "+91 90000 00000", after: "+91 98765 43210" } },
  { id: "AUD-005", userId: "USR-005", userName: "Neha Sharma", action: "Export", module: "Finance", description: "Exported reconciliation report (CSV)", ip: "103.21.58.140", timestamp: "2026-06-27 12:01:09", details: { reportName: "completed_payments", format: "CSV", rows: 1 } },
  { id: "AUD-006", userId: "USR-003", userName: "Aarav Kulkarni", action: "Login", module: "Users", description: "Logged in from Edge on Windows", ip: "49.36.128.55", timestamp: "2026-06-26 08:50:14", details: { browser: "Edge", os: "Windows", location: "Pune, IN" } },
  { id: "AUD-007", userId: "USR-005", userName: "Neha Sharma", action: "Approval", module: "Commission Rates", description: "Approved Stanford University commission rate change 12% → 15%", ip: "103.21.58.140", timestamp: "2026-06-26 10:14:51", details: { university: "Stanford University", before: "12%", after: "15%" } },
  { id: "AUD-008", userId: "USR-007", userName: "Kavita Rao", action: "Data Change", module: "Universities", description: "Added new university — Monash University", ip: "103.21.58.171", timestamp: "2026-06-26 11:33:02", details: { universityId: "UNI-021", country: "Australia" } },
  { id: "AUD-009", userId: "USR-001", userName: "Suraj Bajaj", action: "User Management", module: "Users", description: "Deactivated user account for a former counsellor (USR-009)", ip: "103.21.58.112", timestamp: "2026-06-26 14:22:40", details: { targetUser: "USR-009", before: "Active", after: "Deactivated" } },
  { id: "AUD-010", userId: "USR-004", userName: "Priya Mehta", action: "Logout", module: "Users", description: "Session ended", ip: "103.21.58.155", timestamp: "2026-06-26 18:05:00", details: { sessionDuration: "8h 15m" } },
  { id: "AUD-011", userId: "USR-006", userName: "Amit Patel", action: "Export", module: "Finance", description: "Exported partner invoice list (CSV)", ip: "103.21.58.160", timestamp: "2026-06-25 09:30:18", details: { reportName: "partner_invoices", format: "CSV", rows: 2 } },
  { id: "AUD-012", userId: "USR-002", userName: "Vikram Singh", action: "Data Change", module: "Partners", description: "Updated partner tier for Global Education Consultants", ip: "49.36.128.55", timestamp: "2026-06-25 12:45:27", details: { partnerId: "ORG-2", before: "Gold", after: "Diamond" } },
  { id: "AUD-013", userId: "USR-001", userName: "Suraj Bajaj", action: "Settings Change", module: "Settings", description: "Enabled two-factor authentication for admin roles", ip: "103.21.58.112", timestamp: "2026-06-25 15:10:55", details: { setting: "security.2fa", before: "Disabled", after: "Enabled" } },
  { id: "AUD-014", userId: "USR-004", userName: "Priya Mehta", action: "Approval", module: "Applications", description: "Approved counsellor invite for a new joiner", ip: "103.21.58.155", timestamp: "2026-06-24 10:02:33", details: { inviteId: "INV-204" } },
  { id: "AUD-015", userId: "USR-006", userName: "Amit Patel", action: "Data Change", module: "Finance", description: "Recorded vendor payment for INV-STAN-2026-01 (₹7,09,750)", ip: "103.21.58.160", timestamp: "2026-06-24 13:40:12", details: { invoiceId: "INV-STAN-2026-01", amountInr: "₹7,09,750" } },
  { id: "AUD-016", userId: "USR-003", userName: "Aarav Kulkarni", action: "Login", module: "Users", description: "Logged in from Chrome on Windows", ip: "49.36.128.55", timestamp: "2026-06-24 08:48:09", details: { browser: "Chrome", os: "Windows" } },
  { id: "AUD-017", userId: "USR-007", userName: "Kavita Rao", action: "Data Change", module: "Events", description: "Created event — Fall 2026 Virtual Fair", ip: "103.21.58.171", timestamp: "2026-06-23 16:25:44", details: { eventId: "EVT-031" } },
  { id: "AUD-018", userId: "USR-005", userName: "Neha Sharma", action: "Approval", module: "Finance", description: "Released partner payout via NEFT (NEFT-2026-0042)", ip: "103.21.58.140", timestamp: "2026-06-23 11:18:21", details: { reference: "NEFT-2026-0042", amount: "₹8,86,770" } },
  { id: "AUD-019", userId: "USR-001", userName: "Suraj Bajaj", action: "User Management", module: "Users", description: "Created user account for a new finance executive", ip: "103.21.58.112", timestamp: "2026-06-23 09:55:30", details: { targetUser: "USR-014", role: "Finance Executive" } },
  { id: "AUD-020", userId: "USR-002", userName: "Vikram Singh", action: "Export", module: "Partners", description: "Exported partner portfolio (CSV)", ip: "49.36.128.55", timestamp: "2026-06-22 14:12:05", details: { reportName: "partner_portfolio", format: "CSV", rows: 15 } },
  { id: "AUD-021", userId: "USR-006", userName: "Amit Patel", action: "Logout", module: "Users", description: "Session ended", ip: "103.21.58.160", timestamp: "2026-06-22 19:30:48", details: { sessionDuration: "6h 02m" } },
];

const PAGE_SIZE = 15;
const fmtKey = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const str = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
};

export default function AuditLogsPage() {
  const meQ = api.authSession.me.useQuery();
  const role = meQ.data?.role;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const canView = role === AdminRole.SUPER_ADMIN || role === AdminRole.FINANCE_MANAGER || role === AdminRole.FINANCE_EXECUTIVE;
  const canExport = role === AdminRole.SUPER_ADMIN || role === AdminRole.FINANCE_MANAGER;

  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  const users = useMemo(() => Array.from(new Set(SEED.map((l) => l.userName))).sort(), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SEED.filter((l) => {
      if (user && l.userName !== user) return false;
      if (action && l.action !== action) return false;
      if (module && l.module !== module) return false;
      const d = l.timestamp.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (q && !`${l.userName} ${l.action} ${l.description} ${l.ip} ${l.module}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [user, action, module, from, to, search]);

  const today = "2026-06-27";
  const todayLogs = SEED.filter((l) => l.timestamp.startsWith(today));
  const stats = {
    total: todayLogs.length,
    logins: todayLogs.filter((l) => l.action === "Login" || l.action === "Logout").length,
    changes: todayLogs.filter((l) => ["Data Change", "User Management", "Settings Change"].includes(l.action)).length,
    exports: todayLogs.filter((l) => l.action === "Export").length,
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const reset = () => { setUser(""); setAction(""); setModule(""); setFrom(""); setTo(""); setSearch(""); setPage(1); };
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const exportCsv = () => {
    const header = ["Audit ID", "Timestamp", "User", "User ID", "Action Type", "Module", "Description", "IP Address"];
    const body = filtered.map((l) => [l.id, l.timestamp, l.userName, l.userId, l.action, l.module, l.description, l.ip]);
    const csv = [header, ...body].map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit_log_export_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    setToastMsg("Audit log exported as CSV"); setToastOpen(true);
  };

  if (mounted && !canView) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-[#E4E7EC] bg-white px-8 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF3F2] text-2xl">🔒</div>
          <h2 className="text-lg font-bold text-[#101828]">Access Restricted</h2>
          <p className="mt-2 text-sm text-[#667085]">Audit Logs are available to Super Admins, Finance Managers, and Finance Executives only.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Audit Logs</h1>
          <p className="mt-1 text-sm text-[#667085]">Track all system activities and changes for compliance</p>
        </div>
        {mounted && canExport && <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="bolt" tone="blue" label="Total Actions Today" value={stats.total} sub="All activities recorded today" />
        <StatCard icon="check" tone="green" label="Login/Logouts Today" value={stats.logins} sub="Session events" />
        <StatCard icon="applications" tone="orange" label="Data Changes Today" value={stats.changes} sub="Records modified" />
        <StatCard icon="deposit" tone="green" label="Exports Today" value={stats.exports} sub="Data exports" />
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-44"><FormSelect label="User" placeholder="All Users" options={users.map((u) => ({ value: u, label: u }))} value={user} onChange={(e) => { setUser(e.target.value); setPage(1); }} /></div>
        <div className="w-44"><FormSelect label="Action" placeholder="All Actions" options={ACTIONS.map((a) => ({ value: a, label: a }))} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} /></div>
        <div className="w-44"><FormSelect label="Module" placeholder="All Modules" options={MODULES.map((m) => ({ value: m, label: m }))} value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} /></div>
        <div className="w-36"><label className="mb-1.5 block text-sm font-medium text-[#344054]">From</label><input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-[#D0D5DD] px-3 text-sm outline-none focus:border-[#1570EF]" /></div>
        <div className="w-36"><label className="mb-1.5 block text-sm font-medium text-[#344054]">To</label><input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-[#D0D5DD] px-3 text-sm outline-none focus:border-[#1570EF]" /></div>
        <div className="w-52"><label className="mb-1.5 block text-sm font-medium text-[#344054]">Search</label><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs..." className="h-10 w-full rounded-lg border border-[#D0D5DD] px-3 text-sm outline-none focus:border-[#1570EF]" /></div>
        <Button variant="secondary" onClick={reset}>Reset</Button>
        <span className="ml-auto self-center text-xs text-[#98A2B3]">Showing {filtered.length} of {SEED.length} entries</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        <div className="flex items-center gap-2 border-b border-[#E4E7EC] px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-[#101828]">Audit Log</h3>
          <span className="rounded-full bg-[#EFF8FF] px-2 py-0.5 text-xs font-semibold text-[#1570EF]">{filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Timestamp</th>
                <th className={TH}>User</th>
                <th className={TH}>Action Type</th>
                <th className={TH}>Module</th>
                <th className={`${TH} normal-case`}>Description</th>
                <th className={TH}>IP Address</th>
                <th className={`${TH} w-10`}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#98A2B3]">No audit entries found</td></tr>
              ) : rows.map((l) => {
                const isOpen = open.has(l.id);
                const before = l.details.before, after = l.details.after;
                return (
                  <Fragment key={l.id}>
                    <tr className="cursor-pointer border-b border-[#F2F4F7] last:border-0 hover:bg-[#F0F7FF]" onClick={() => toggle(l.id)}>
                      <td className={TD}>{l.timestamp}</td>
                      <td className={`${TD} font-semibold text-[#101828]`}>{l.userName}</td>
                      <td className={TD}><span className={`rounded-[10px] px-2 py-0.5 text-[11px] font-semibold ${ACTION_TONE[l.action] ?? "bg-[#F2F4F7] text-[#667085]"}`}>{l.action}</span></td>
                      <td className={TD}>{l.module}</td>
                      <td className="max-w-[320px] px-3.5 py-3 text-[13px] text-[#344054]">{l.description}</td>
                      <td className={TD}><code className="rounded bg-[#F9FAFB] px-1.5 py-0.5 font-mono text-xs">{l.ip}</code></td>
                      <td className={`${TD} text-center`}>
                        <svg viewBox="0 0 24 24" className={`mx-auto h-4 w-4 text-[#667085] transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[#F9FAFB]">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs sm:grid-cols-4">
                            <Detail k="Audit ID" v={l.id} /><Detail k="User ID" v={l.userId} />
                            <Detail k="Timestamp" v={l.timestamp} /><Detail k="IP Address" v={l.ip} />
                            {Object.entries(l.details).filter(([k]) => k !== "before" && k !== "after").map(([k, v]) => (
                              <Detail key={k} k={fmtKey(k)} v={str(v)} />
                            ))}
                          </div>
                          {before != null && after != null && (
                            <div className="mt-3">
                              <div className="mb-1.5 text-xs font-semibold text-[#475467]">Changes Made</div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-md bg-[#FEF3F2] px-2 py-1 text-[#912018]">{str(before)}</span>
                                <span className="text-[#98A2B3]">→</span>
                                <span className="rounded-md bg-[#ECFDF3] px-2 py-1 text-[#067647]">{str(after)}</span>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E4E7EC] px-5 py-3">
            <span className="text-[13px] text-[#667085]">Page {cur} of {totalPages} ({filtered.length} entries)</span>
            <div className="flex items-center gap-1.5">
              <button disabled={cur === 1} onClick={() => setPage(cur - 1)} className="rounded-md border border-[#D0D5DD] px-2.5 py-1 text-[13px] disabled:opacity-40">Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)} className={`rounded-md border px-2.5 py-1 text-[13px] ${n === cur ? "border-[#1570EF] bg-[#1570EF] text-white" : "border-[#D0D5DD]"}`}>{n}</button>
              ))}
              <button disabled={cur === totalPages} onClick={() => setPage(cur + 1)} className="rounded-md border border-[#D0D5DD] px-2.5 py-1 text-[13px] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <Toast message={toastMsg} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return <div><span className="text-[#98A2B3]">{k}:</span> <span className="font-medium text-[#344054]">{v}</span></div>;
}
