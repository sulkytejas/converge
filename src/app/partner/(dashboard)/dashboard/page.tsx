"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { StatCard } from "~/components/ui/stat-card";
import { UniApplicationStatusLabel } from "~/server/db/enums";

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

function formatDate(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  return t.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function stageLabel(status: number): string {
  const map = UniApplicationStatusLabel as Record<number, string | undefined>;
  return map[status] ?? `Stage ${status}`;
}

function Card({ title, children, badge }: { title: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#101828]">{title}</h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

// Marks a widget that's intentionally rendered with static content — the UI is
// built and ready, it just needs a real data source wired in later.
function NeedsDataBadge() {
  return (
    <span className="rounded-full bg-[#FFFAEB] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#B54708] uppercase">
      Sample · needs data
    </span>
  );
}

function Empty() {
  return <p className="py-6 text-center text-[13px] text-[#98A2B3]">Nothing yet.</p>;
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const me = api.auth.me.useQuery(undefined, { retry: false });
  const recordVisit = api.auth.recordDashboardVisit.useMutation();
  const { data: stats } = api.dashboard.partnerStats.useQuery();

  // Bounce away if state has shifted (e.g. unsigned MOU, or status no longer
  // approved). Middleware enforces the cookie; this enforces the "approved +
  // signed" precondition for the dashboard page itself.
  useEffect(() => {
    const target = me.data?.redirectUrl;
    if (target && target !== "/partner/dashboard") {
      router.replace(target);
    }
  }, [me.data?.redirectUrl, router]);

  // Stamp last_login_at on every dashboard mount. useRef guards StrictMode
  // double-invocation in dev so we don't fire twice.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current) return;
    if (me.data?.redirectUrl !== "/partner/dashboard") return;
    recordedRef.current = true;
    recordVisit.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data?.redirectUrl]);

  const rm = stats?.relationshipManager;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">
          Welcome{me.data?.firstName ? `, ${me.data.firstName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-[#667085]">
          Here&apos;s an overview of your partnership with Collegepond.
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="All Applications" value={stats?.kpis.applications ?? "—"} />
        <StatCard label="Offers Received" value={stats?.kpis.offers ?? "—"} />
        <StatCard label="Deposits Paid" value={stats?.kpis.deposits ?? "—"} />
        <StatCard label="Visas Received" value={stats?.kpis.visas ?? "—"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Applications — live */}
        <div className="lg:col-span-2">
          <Card title="Recent Applications">
            {stats && stats.recentApplications.length > 0 ? (
              <ul className="divide-y divide-[#F2F4F7]">
                {stats.recentApplications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[#101828]">{a.student}</div>
                      <div className="truncate text-xs text-[#98A2B3]">{a.university}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[#475467]">{stageLabel(a.status)}</div>
                      <div className="text-xs text-[#98A2B3]">{timeAgo(a.at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </Card>
        </div>

        {/* Relationship Manager — live (the partner's BDM) */}
        <Card title="Your Relationship Manager">
          {rm ? (
            <div className="text-[13px]">
              <div className="font-semibold text-[#101828]">{rm.name}</div>
              <div className="mt-2 space-y-1 text-[#475467]">
                <div>
                  <span className="text-[#98A2B3]">Email:</span> {rm.email}
                </div>
                <div>
                  <span className="text-[#98A2B3]">Phone:</span> {rm.phone}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#98A2B3]">
              No relationship manager assigned yet.
            </p>
          )}
        </Card>

        {/* Students this year — live */}
        <Card title="Students This Year">
          <div className="text-[28px] font-bold text-[#101828]">
            {stats?.studentsThisYear ?? "—"}
          </div>
          <p className="mt-1 text-xs text-[#98A2B3]">
            New students added since January.
          </p>
        </Card>

        {/* Events — live (event table) */}
        <Card title="Upcoming Events">
          {stats && stats.events.length > 0 ? (
            <ul className="space-y-3">
              {stats.events.map((e) => (
                <li key={e.id} className="text-[13px]">
                  <div className="font-medium text-[#101828]">{e.title}</div>
                  <div className="text-xs text-[#98A2B3]">
                    {formatDate(e.date)}
                    {e.isVirtual ? " · Virtual" : e.location ? ` · ${e.location}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>

        {/* Quick Links — real navigation */}
        <Card title="Quick Links">
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            {[
              { label: "Students", href: "/partner/students" },
              { label: "Uni Assist", href: "/partner/uni-assist" },
              { label: "Events", href: "/partner/events" },
              { label: "Commission", href: "/partner/commission" },
              { label: "Resources", href: "/partner/resources" },
              { label: "My Account", href: "/partner/account" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg border border-[#E4E7EC] px-3 py-2 font-medium text-[#344054] transition-colors hover:border-[#1570EF] hover:text-[#1570EF]"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </Card>

        {/* ---- Static widgets below: UI built, awaiting a real data source ---- */}

        {/* TODO(data): Important Notices — needs a notices/announcements table. */}
        <Card title="Important Notices" badge={<NeedsDataBadge />}>
          <ul className="space-y-2 text-[13px] text-[#475467]">
            <li>• MOU renewals for FY26 are now open in My Account.</li>
            <li>• New commission slabs effective from the next intake.</li>
          </ul>
        </Card>

        {/* TODO(data): Partner Loyalty tier — needs loyalty/tier data (user.tier). */}
        <Card title="Partner Loyalty Program" badge={<NeedsDataBadge />}>
          <div className="text-[13px]">
            <div className="font-semibold text-[#101828]">Silver Partner</div>
            <p className="mt-1 text-xs text-[#98A2B3]">
              Reach 25 students this year to unlock Gold benefits.
            </p>
          </div>
        </Card>

        {/* TODO(data): EduFin loan banner — needs a partner-offers/promos source. */}
        <div className="rounded-xl border border-[#E4E7EC] bg-gradient-to-r from-[#EFF8FF] to-[#F9FAFB] p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#101828]">
                  Education loans made easy with EduFin Bank
                </h2>
                <NeedsDataBadge />
              </div>
              <p className="mt-1 text-[13px] text-[#475467]">
                Help your students fund their studies — fast approvals for Collegepond partners.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
