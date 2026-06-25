"use client";

import { type ReactNode } from "react";
import { api } from "~/trpc/react";
import { StatCard } from "~/components/ui/stat-card";
import { UniApplicationStatusLabel } from "~/server/db/enums";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(0, Math.floor((Date.now() - t.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function humanize(a: string): string {
  return a.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// UniApplicationStatusLabel is a Record over the enum; cast so a stray/unknown
// status code degrades gracefully instead of rendering "undefined".
function stageLabel(status: number): string {
  const map = UniApplicationStatusLabel as Record<number, string | undefined>;
  return map[status] ?? `Stage ${status}`;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-[#101828]">{title}</h2>
      {children}
    </div>
  );
}

function Bar({ label, value, max, tone = "#1570EF" }: { label: string; value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="text-[#344054]">{label}</span>
        <span className="font-semibold text-[#101828]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F2F4F7]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  );
}

function RankList({ rows, valueLabel }: { rows: { name: string; value: number }[]; valueLabel: string }) {
  if (rows.length === 0) return <Empty />;
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={`${r.name}-${i}`} className="flex items-center gap-3 text-[13px]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F4F7] text-xs font-semibold text-[#475467]">
            {i + 1}
          </span>
          <span className="flex-1 truncate text-[#344054]">{r.name}</span>
          <span className="shrink-0 font-semibold text-[#101828]">
            {r.value}
            <span className="ml-1 text-xs font-normal text-[#98A2B3]">{valueLabel}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return <p className="py-6 text-center text-[13px] text-[#98A2B3]">No data yet.</p>;
}

export default function DashboardPage() {
  const me = api.authSession.me.useQuery().data;
  const { data, isLoading } = api.dashboard.adminStats.useQuery();
  const firstName = me?.firstName ?? "";

  const pipelineMax = data
    ? Math.max(1, data.pipeline.underReview, data.pipeline.approved, data.pipeline.rejected, data.pipeline.inactive)
    : 1;
  const countryMax = data ? Math.max(1, ...data.applicationsByCountry.map((c) => c.count)) : 1;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-[#667085]">
          Here&apos;s what&apos;s happening across Collegepond today.
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Partners" value={data?.kpis.partners ?? "—"} />
        <StatCard label="Students" value={data?.kpis.students ?? "—"} />
        <StatCard label="Applications" value={data?.kpis.applications ?? "—"} />
        <StatCard
          label="Pending Approvals"
          value={data?.kpis.pendingApprovals ?? "—"}
          valueClassName={data && data.kpis.pendingApprovals > 0 ? "text-[#B54708]" : ""}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Partner Pipeline">
          {data ? (
            <>
              <Bar label="Under Review" value={data.pipeline.underReview} max={pipelineMax} tone="#F79009" />
              <Bar label="Approved" value={data.pipeline.approved} max={pipelineMax} tone="#12B76A" />
              <Bar label="Rejected" value={data.pipeline.rejected} max={pipelineMax} tone="#F04438" />
              <Bar label="Inactive" value={data.pipeline.inactive} max={pipelineMax} tone="#98A2B3" />
            </>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Application Queue">
          {data && data.applicationQueue.length > 0 ? (
            <ul className="space-y-2 text-[13px]">
              {data.applicationQueue.map((q) => (
                <li key={q.status} className="flex items-center justify-between">
                  <span className="text-[#344054]">{stageLabel(q.status)}</span>
                  <span className="font-semibold text-[#101828]">{q.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Recent Activity">
          {data && data.recentActivity.length > 0 ? (
            <ul className="space-y-3">
              {data.recentActivity.map((r) => (
                <li key={r.id} className="text-[13px]">
                  <div className="text-[#344054]">{humanize(r.action)}</div>
                  <div className="text-xs text-[#98A2B3]">
                    {r.entityType ? `${r.entityType} · ` : ""}
                    {timeAgo(r.at)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Top Partners">
          <RankList
            rows={(data?.topPartners ?? []).map((p) => ({ name: p.name, value: p.students }))}
            valueLabel="students"
          />
        </Card>

        <Card title="Top Universities">
          <RankList
            rows={(data?.topUniversities ?? []).map((u) => ({ name: u.name, value: u.applications }))}
            valueLabel="apps"
          />
        </Card>

        <Card title="Applications by Country">
          {data && data.applicationsByCountry.length > 0 ? (
            data.applicationsByCountry.map((c) => (
              <Bar key={c.country} label={c.country} value={c.count} max={countryMax} />
            ))
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      {isLoading && (
        <p className="mt-4 text-center text-xs text-[#98A2B3]">Loading dashboard…</p>
      )}
    </>
  );
}
