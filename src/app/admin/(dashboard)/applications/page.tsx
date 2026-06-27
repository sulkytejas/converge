"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { FormSelect } from "~/components/ui/form-select";
import { StatCard, SkeletonTable } from "~/components/dashboard/widgets";
import { countryFlag } from "~/components/dashboard/format";

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3 py-3 text-[13px] whitespace-nowrap text-[#344054]";

// Stage badge tone by status code (0–8 happy path, 20+ terminal).
function stageTone(status: number): string {
  if (status >= 20) return "bg-[#FEF3F2] text-[#B42318]"; // closed/rejected
  if (status === 8) return "bg-[#ECFDF3] text-[#067647]"; // enrolled
  if (status === 6 || status === 7) return "bg-[#ECFDF3] text-[#027A48]"; // deposit / visa
  if (status === 4 || status === 5) return "bg-[#F5F3FF] text-[#6941C6]"; // offers
  if (status === 2 || status === 3) return "bg-[#FFFAEB] text-[#B54708]"; // submitted / review
  return "bg-[#EFF8FF] text-[#175CD3]"; // begin / docs
}

const SCOPES = [
  { id: "active", label: "Active" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
] as const;

export default function ApplicationsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [scope, setScope] = useState<"active" | "closed" | "all">("active");
  const [status, setStatus] = useState("");
  const [orgId, setOrgId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtersQ = api.applications.filters.useQuery();
  const queryInput = useMemo(
    () => ({ page, scope, status: status ? Number(status) : undefined, orgId: orgId ? Number(orgId) : undefined, search: search || undefined }),
    [page, scope, status, orgId, search],
  );
  const listQ = api.applications.list.useQuery(queryInput, { placeholderData: keepPreviousData });

  const data = listQ.data;
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const stats = data?.stats ?? { active: 0, inProgress: 0, offers: 0, deposits: 0, enrolled: 0 };
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const reset = () => { setStatus(""); setOrgId(""); setSearch(""); setPage(1); };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">Applications</h1>
        <p className="mt-1 text-sm text-[#667085]">Track every university application across partners, stages, and intakes</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon="applications" tone="blue" label="Active" value={stats.active} sub="Not yet closed" />
        <StatCard icon="clock" tone="orange" label="In Progress" value={stats.inProgress} sub="Docs → review" />
        <StatCard icon="offer" tone="purple" label="Offers" value={stats.offers} sub="Conditional + uncond." />
        <StatCard icon="deposit" tone="green" label="Deposits" value={stats.deposits} sub="Deposit + visa" />
        <StatCard icon="trophy" tone="cyan" label="Enrolled" value={stats.enrolled} sub="Confirmed" />
      </div>

      {/* Scope tabs */}
      <div className="mb-4 flex gap-1 border-b border-[#E4E7EC]">
        {SCOPES.map((s) => {
          const on = scope === s.id;
          return (
            <button key={s.id} onClick={() => { setScope(s.id); setStatus(""); setPage(1); }} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${on ? "border-[#1570EF] text-[#1570EF]" : "border-transparent text-[#667085] hover:text-[#344054]"}`}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-52"><FormSelect label="Stage" placeholder="All Stages" options={(filtersQ.data?.statuses ?? []).map((s) => ({ value: String(s.code), label: s.label }))} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} /></div>
        <div className="w-52"><FormSelect label="Partner" placeholder="All Partners" options={(filtersQ.data?.partners ?? []).map((p) => ({ value: String(p.id), label: p.name }))} value={orgId} onChange={(e) => { setOrgId(e.target.value); setPage(1); }} /></div>
        <div className="w-56"><label className="mb-1.5 block text-sm font-medium text-[#344054]">Search</label><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search student…" className="h-10 w-full rounded-lg border border-[#D0D5DD] px-3 text-sm outline-none focus:border-[#1570EF]" /></div>
        <Button variant="secondary" onClick={reset}>Reset</Button>
        <span className="ml-auto self-center text-xs text-[#98A2B3]">{total} {total === 1 ? "application" : "applications"}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        <div className="flex items-center gap-2 border-b border-[#E4E7EC] px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-[#101828]">All Applications</h3>
          <span className="rounded-full bg-[#EFF8FF] px-2 py-0.5 text-xs font-semibold text-[#1570EF]">{total}</span>
        </div>
        <div className="overflow-x-auto">
          {!mounted || listQ.isLoading ? (
            <div className="p-4"><SkeletonTable rows={8} cols={7} /></div>
          ) : (
            <table className="w-full border-collapse">
              <thead><tr>
                <th className={TH}>Student</th><th className={TH}>Partner</th><th className={TH}>University</th>
                <th className={TH}>Program</th><th className={TH}>Stage</th><th className={TH}>Intake</th>
                <th className={TH}>Country</th><th className={TH}>Processor</th><th className={TH}>Days</th><th className={`${TH} text-right`}>Actions</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-[#98A2B3]">No applications found</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#F9FAFB]">
                    <td className={`${TD} font-semibold text-[#101828]`}>{r.student}</td>
                    <td className={TD}>{r.partner}</td>
                    <td className={TD}>{r.university}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-[13px] text-[#344054]">{r.program}</td>
                    <td className={TD}><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stageTone(r.status)}`}>{r.stage}</span></td>
                    <td className={TD}>{r.intake}</td>
                    <td className={TD}>{r.country ? `${countryFlag(r.country)} ${r.country}` : "—"}</td>
                    <td className={TD}>{r.processor ?? <span className="text-[#98A2B3]">Unassigned</span>}</td>
                    <td className={TD}>{r.days}d</td>
                    <td className={`${TD} text-right`}><Link href={`/admin/students/${r.studentId}`} className="rounded-md border border-[#D0D5DD] px-2.5 py-1 text-xs font-semibold text-[#344054] hover:border-[#1570EF] hover:text-[#1570EF]">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E4E7EC] px-5 py-3">
            <span className="text-[13px] text-[#667085]">Page {page} of {totalPages} ({total} entries)</span>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-[#D0D5DD] px-2.5 py-1 text-[13px] disabled:opacity-40">Prev</button>
              <span className="px-2 text-[13px] text-[#344054]">{page}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-[#D0D5DD] px-2.5 py-1 text-[13px] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
