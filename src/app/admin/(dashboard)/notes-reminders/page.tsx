"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { FormSelect } from "~/components/ui/form-select";
import { StatCard, SkeletonTable } from "~/components/dashboard/widgets";
import { formatDate } from "~/components/dashboard/format";

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3 py-3 text-[13px] text-[#344054]";

const PRIORITY_TONE = ["bg-[#F2F4F7] text-[#667085]", "bg-[#FFFAEB] text-[#B54708]", "bg-[#FEF3F2] text-[#B42318]"];
const STATUS_TONE: Record<string, string> = {
  overdue: "bg-[#FEF3F2] text-[#B42318]",
  upcoming: "bg-[#EFF8FF] text-[#175CD3]",
  completed: "bg-[#ECFDF3] text-[#067647]",
  open: "bg-[#F2F4F7] text-[#667085]",
};
const STATUS_LABEL: Record<string, string> = { overdue: "Overdue", upcoming: "Upcoming", completed: "Completed", open: "Open" };

export default function NotesRemindersPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tab, setTab] = useState<"reminders" | "notes">("reminders");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");

  const utils = api.useUtils();
  const statsQ = api.notes.stats.useQuery();
  const queryInput = useMemo(
    () => ({ tab, status: (status || undefined) as "overdue" | "upcoming" | "completed" | undefined, priority: priority ? Number(priority) : undefined, search: search || undefined }),
    [tab, status, priority, search],
  );
  const listQ = api.notes.list.useQuery(queryInput, { placeholderData: keepPreviousData });
  const toggleDone = api.notes.toggleDone.useMutation({
    onSuccess: async () => { await Promise.all([utils.notes.list.invalidate(), utils.notes.stats.invalidate()]); },
  });

  const rows = listQ.data ?? [];
  const stats = statsQ.data ?? { overdue: 0, upcoming: 0, completed: 0, notes: 0 };
  const reset = () => { setStatus(""); setPriority(""); setSearch(""); };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">Notes &amp; Reminders</h1>
        <p className="mt-1 text-sm text-[#667085]">Follow-ups and notes across your students, in one place</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="bolt" tone="red" label="Overdue" value={stats.overdue} sub="Past due, open" />
        <StatCard icon="clock" tone="blue" label="Upcoming" value={stats.upcoming} sub="Due ahead" />
        <StatCard icon="check" tone="green" label="Completed" value={stats.completed} sub="Done reminders" />
        <StatCard icon="applications" tone="purple" label="Notes" value={stats.notes} sub="Plain notes" />
      </div>

      <div className="mb-4 flex gap-1 border-b border-[#E4E7EC]">
        {([["reminders", "Reminders"], ["notes", "Notes"]] as const).map(([id, label]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => { setTab(id); reset(); }} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${on ? "border-[#1570EF] text-[#1570EF]" : "border-transparent text-[#667085] hover:text-[#344054]"}`}>
              {label}
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        {tab === "reminders" && (
          <div className="w-44"><FormSelect label="Status" placeholder="All Status" options={[{ value: "overdue", label: "Overdue" }, { value: "upcoming", label: "Upcoming" }, { value: "completed", label: "Completed" }]} value={status} onChange={(e) => setStatus(e.target.value)} /></div>
        )}
        <div className="w-44"><FormSelect label="Priority" placeholder="All Priority" options={[{ value: "2", label: "High" }, { value: "1", label: "Medium" }, { value: "0", label: "Low" }]} value={priority} onChange={(e) => setPriority(e.target.value)} /></div>
        <div className="w-56"><label className="mb-1.5 block text-sm font-medium text-[#344054]">Search</label><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "reminders" ? "Search reminders…" : "Search notes…"} className="h-10 w-full rounded-lg border border-[#D0D5DD] px-3 text-sm outline-none focus:border-[#1570EF]" /></div>
        <Button variant="secondary" onClick={reset}>Reset</Button>
        <span className="ml-auto self-center text-xs text-[#98A2B3]">{rows.length} {tab === "reminders" ? "reminders" : "notes"}</span>
      </div>

      {tab === "reminders" ? (
        <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
          <div className="overflow-x-auto">
            {!mounted || listQ.isLoading ? (
              <div className="p-4"><SkeletonTable rows={8} cols={6} /></div>
            ) : (
              <table className="w-full border-collapse">
                <thead><tr>
                  <th className={`${TH} w-10`}></th><th className={TH}>Priority</th><th className={TH}>Subject</th>
                  <th className={TH}>Related To</th><th className={TH}>Due Date</th><th className={TH}>Status</th><th className={`${TH} text-right`}>Actions</th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#98A2B3]">No reminders found</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className={`border-b border-[#F2F4F7] last:border-0 hover:bg-[#F9FAFB] ${r.done ? "opacity-60" : ""}`}>
                      <td className={TD}>
                        <button onClick={() => toggleDone.mutate({ id: r.id })} className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${r.done ? "border-[#12B76A] bg-[#12B76A] text-white" : "border-[#D0D5DD] hover:border-[#1570EF]"}`}>{r.done ? "✓" : ""}</button>
                      </td>
                      <td className={TD}><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_TONE[r.priority] ?? PRIORITY_TONE[0]}`}>{r.priorityLabel}</span></td>
                      <td className={`max-w-[360px] px-3 py-3 text-[13px] text-[#101828] ${r.done ? "line-through" : "font-medium"}`}>{r.subject}</td>
                      <td className={TD}><Link href={`/admin/students/${r.studentId}`} className="font-medium text-[#1570EF] hover:underline">{r.student}</Link></td>
                      <td className={`${TD} whitespace-nowrap`}>{r.dueDate ? formatDate(r.dueDate) : "—"}</td>
                      <td className={TD}><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                      <td className={`${TD} text-right`}>{r.assignee ? <span className="text-xs text-[#667085]">{r.assignee}</span> : <span className="text-xs text-[#98A2B3]">Unassigned</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!mounted || listQ.isLoading ? (
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4"><SkeletonTable rows={6} cols={3} /></div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-[#E4E7EC] bg-white px-5 py-10 text-center text-sm text-[#98A2B3]">No notes found</div>
          ) : rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-[#E4E7EC] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] text-[#344054]">{r.subject}</p>
                <span className="shrink-0 text-xs text-[#98A2B3]">{formatDate(r.createdAt)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#667085]">
                <Link href={`/admin/students/${r.studentId}`} className="font-medium text-[#1570EF] hover:underline">{r.student}</Link>
                {r.assignee && <span>· by {r.assignee}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
