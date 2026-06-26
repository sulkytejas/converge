"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { Toast } from "~/components/ui/toast";
import { StatCard } from "~/components/dashboard/widgets";
import { AdminRole } from "~/server/db/enums";
import {
  ACTIVITIES, ACT_TYPE_LABEL, BDMS, conversion, daysAgo, fmtMoney, FROZEN, initials,
  PARTNERS, PIPE_SEGMENTS, PRIORITY_BADGE, PROSPECTS, relDays, STAGE_BADGE, STATUS_BADGE,
  TASKS, TEMP_BADGE, TEMPS, TIER_BADGE, type Partner, type Temp, type Stage,
} from "./data";

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3 py-3 text-[13px] text-[#344054]";
const CARD = "rounded-xl border border-[#E4E7EC] bg-white";
const TODAY = "2026-03-06";
const TIER_RANK: Record<string, number> = { Diamond: 5, Titanium: 4, Platinum: 3, Gold: 2, Silver: 1 };
const STATUS_RANK: Record<string, number> = { Active: 3, Pending: 2, Deactivated: 1 };
const AVATAR_GRADIENTS = ["from-[#1570EF] to-[#0BA5EC]", "from-[#7F56D9] to-[#9E77ED]", "from-[#12B76A] to-[#32D583]", "from-[#F79009] to-[#FDB022]", "from-[#F04438] to-[#FD853A]"];
const avatarFor = (name: string) => AVATAR_GRADIENTS[name.length % AVATAR_GRADIENTS.length]!;

function Avatar({ name }: { name: string }) {
  return <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarFor(name)} text-[11px] font-bold text-white`}>{initials(name)}</span>;
}
function TempPill({ value, onChange }: { value: Temp; onChange: (t: Temp) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Temp)} className={`cursor-pointer rounded-full px-2 py-1 text-[11px] font-semibold outline-none ${TEMP_BADGE[value]}`}>
      {TEMPS.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

const PRESETS: { label: string; weeks: number }[] = [
  { label: "This Week", weeks: 1 }, { label: "Bi-weekly", weeks: 2 }, { label: "This Month", weeks: 4 }, { label: "This Quarter", weeks: 13 },
];
const CONTENT_TABS = ["Partner Portfolio", "Prospect Pipeline", "Activity Log", "My Tasks"];
const ACT_PILLS: { label: string; type: string }[] = [
  { label: "All", type: "" }, { label: "Calls", type: "call" }, { label: "Meetings", type: "meeting" }, { label: "Emails", type: "email" }, { label: "Notes", type: "note" }, { label: "Stage Changes", type: "stage-change" },
];

export default function BDMPerformancePage() {
  const meQ = api.authSession.me.useQuery();
  const role = meQ.data?.role;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isBdm = mounted && role === AdminRole.BDM;

  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const toast = (m: string) => { setToastMsg(m); setToastOpen(true); };

  const [bdm, setBdm] = useState("all");
  const [tab, setTab] = useState(0);
  const [partners, setPartners] = useState(PARTNERS);
  const [prospects, setProspects] = useState(PROSPECTS);
  const [tasks, setTasks] = useState(TASKS);

  // Portfolio filter + sort
  const [fType, setFType] = useState("");
  const [fTier, setFTier] = useState("");
  const [applied, setApplied] = useState({ type: "", tier: "" });
  const [sortKey, setSortKey] = useState("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Scorecard
  const [preset, setPreset] = useState("This Week");
  const [scFrom, setScFrom] = useState("");
  const [scTo, setScTo] = useState("");

  // Activity / task filters
  const [actType, setActType] = useState("");
  const [actRelated, setActRelated] = useState("");
  const [taskPill, setTaskPill] = useState("all");
  const [agendaOpen, setAgendaOpen] = useState(true);

  const fPartners = useMemo(() => partners.filter((p) => bdm === "all" || p.bdm === bdm), [partners, bdm]);
  const fProspects = useMemo(() => prospects.filter((p) => bdm === "all" || p.bdm === bdm), [prospects, bdm]);
  const fActivities = useMemo(() => ACTIVITIES.filter((a) => bdm === "all" || a.bdm === bdm), [bdm]);
  const fTasks = useMemo(() => tasks.filter((t) => bdm === "all" || t.bdm === bdm), [tasks, bdm]);

  // Stat cards
  const openTasks = fTasks.filter((t) => t.status === "pending").length;
  const overdue = fTasks.filter((t) => t.status === "pending" && t.due < TODAY).length;
  const dueToday = fTasks.filter((t) => t.status === "pending" && t.due === TODAY).length
    + fProspects.filter((p) => p.nextFollowup === TODAY && p.stage !== "Lost" && p.stage !== "Converted").length
    + fActivities.filter((a) => a.followup === TODAY).length;
  const revenue = fPartners.reduce((s, p) => s + p.revenue, 0);

  // Scorecard computation
  const weeks = PRESETS.find((p) => p.label === preset)?.weeks ?? 1;
  const rangeStartMs = FROZEN.getTime() - weeks * 7 * 86_400_000;
  const checkIns = fActivities.filter((a) => (a.type === "call" || a.type === "meeting") && new Date(`${a.date.slice(0, 10)}T00:00:00`).getTime() >= rangeStartMs).length;
  const ciTarget = 3 * weeks;
  const withFollowup = fActivities.filter((a) => a.followup).length;
  const compliance = fActivities.length ? Math.round((withFollowup / fActivities.length) * 100) : 0;
  const completedTasks = fTasks.filter((t) => t.status === "completed").length;
  const taskCompletion = fTasks.length ? Math.round((completedTasks / fTasks.length) * 100) : 0;
  const activeProspects = fProspects.filter((p) => p.stage !== "Lost" && p.stage !== "Converted");
  const staleCount = activeProspects.filter((p) => p.lastActDays >= 14).length;
  const stalePct = activeProspects.length ? Math.round((staleCount / activeProspects.length) * 100) : 0;
  const convertedCount = fProspects.filter((p) => p.stage === "Converted").length;
  const convRate = activeProspects.length ? Math.round((convertedCount / (activeProspects.length + convertedCount)) * 100) : 0;

  // Alerts
  const alerts = useMemo(() => {
    const out: { sev: "red" | "amber" | "yellow"; text: string }[] = [];
    fProspects.forEach((p) => {
      if (p.stage === "Lost" || p.stage === "Converted") return;
      if (p.lastActDays >= 30) out.push({ sev: "red", text: `${p.agency} — no activity in ${p.lastActDays} days (BDM: ${p.bdm})` });
      else if (p.lastActDays >= 14) out.push({ sev: "amber", text: `${p.agency} is stale — ${p.lastActDays} days since last activity (BDM: ${p.bdm})` });
      if (p.daysInStage >= 21) out.push({ sev: "yellow", text: `${p.agency} stuck in "${p.stage}" for ${p.daysInStage} days` });
    });
    fActivities.forEach((a) => {
      if (a.followup && daysAgo(a.followup) >= 2) out.push({ sev: "red", text: `${a.bdm} missed follow-up with ${a.related} (${daysAgo(a.followup)} days overdue)` });
    });
    fTasks.forEach((t) => {
      if (t.status === "pending" && daysAgo(t.due) >= 2) out.push({ sev: "amber", text: `${t.bdm} has overdue task: "${t.title.slice(0, 50)}" (${daysAgo(t.due)} days)` });
      if (t.rescheduled && t.rescheduled >= 2) out.push({ sev: "yellow", text: `${t.bdm} rescheduled "${t.title.slice(0, 40)}" ${t.rescheduled} times` });
    });
    const order = { red: 0, amber: 1, yellow: 2 };
    return out.sort((a, b) => order[a.sev] - order[b.sev]).slice(0, 8);
  }, [fProspects, fActivities, fTasks]);

  // Leaderboard
  const leaderboard = useMemo(() => BDMS.map((b) => {
    const active = partners.filter((p) => p.bdm === b && p.status === "Active");
    return {
      name: b,
      revenue: active.reduce((s, p) => s + p.revenue, 0),
      partners: active.length,
      students: active.reduce((s, p) => s + p.students, 0),
      activities: ACTIVITIES.filter((a) => a.bdm === b).length,
      prospects: PROSPECTS.filter((p) => p.bdm === b && p.stage !== "Lost" && p.stage !== "Converted").length,
    };
  }).sort((a, b) => b.revenue - a.revenue), [partners]);

  // Agenda
  const agenda = useMemo(() => {
    const out: { bucket: "overdue" | "today" | "upcoming"; title: string; sub: string; isTask: boolean }[] = [];
    fTasks.filter((t) => t.status === "pending").forEach((t) => {
      if (t.due < TODAY) out.push({ bucket: "overdue", title: t.title, sub: `Task · ${t.related}`, isTask: true });
      else if (t.due === TODAY) out.push({ bucket: "today", title: t.title, sub: `Task · ${t.related}`, isTask: true });
      else if (t.due <= "2026-03-07") out.push({ bucket: "upcoming", title: t.title, sub: `Task · due ${t.due.slice(5)}`, isTask: true });
    });
    fProspects.filter((p) => p.nextFollowup && p.stage !== "Lost" && p.stage !== "Converted").forEach((p) => {
      const f = p.nextFollowup!;
      if (f < TODAY) out.push({ bucket: "overdue", title: `Follow up: ${p.agency}`, sub: `Prospect · ${p.contact}`, isTask: false });
      else if (f === TODAY) out.push({ bucket: "today", title: `Follow up: ${p.agency}`, sub: `Prospect · ${p.contact}`, isTask: false });
      else if (f <= "2026-03-07") out.push({ bucket: "upcoming", title: `Follow up: ${p.agency}`, sub: `Prospect · due ${f.slice(5)}`, isTask: false });
    });
    fActivities.filter((a) => a.followup && a.followup <= TODAY).forEach((a) => {
      out.push({ bucket: a.followup! < TODAY ? "overdue" : "today", title: `Follow up: ${a.related}`, sub: `${ACT_TYPE_LABEL[a.type]} · ${a.bdm}`, isTask: false });
    });
    const ord = { overdue: 0, today: 1, upcoming: 2 };
    return out.sort((a, b) => ord[a.bucket] - ord[b.bucket]).slice(0, 8);
  }, [fTasks, fProspects, fActivities]);

  // Portfolio rows
  const portfolioRows = useMemo(() => {
    let rows = fPartners.filter((p) => (!applied.type || p.status === applied.type) && (!applied.tier || p.tier === applied.tier));
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (p: Partner): number | string => {
      switch (sortKey) {
        case "name": return p.name;
        case "tier": return TIER_RANK[p.tier] ?? 0;
        case "status": return STATUS_RANK[p.status] ?? 0;
        case "students": return p.students;
        case "apps": return p.apps;
        case "deposits": return p.deposits;
        case "conversion": return conversion(p);
        case "lastAct": return -p.lastActDays;
        default: return p.revenue;
      }
    };
    rows = [...rows].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
    return rows;
  }, [fPartners, applied, sortKey, sortDir]);

  const pipelineRows = useMemo(() => fPartners.filter((p) => p.pipe).sort((a, b) => b.students - a.students), [fPartners]);

  const visActivities = useMemo(() => ACTIVITIES.filter((a) => (bdm === "all" || a.bdm === bdm) && (!actType || a.type === actType) && (!actRelated || a.related === actRelated)), [bdm, actType, actRelated]);

  const taskCounts = {
    all: fTasks.length,
    open: fTasks.filter((t) => t.status === "pending").length,
    overdue: fTasks.filter((t) => t.status === "pending" && t.due < TODAY).length,
    urgent: fTasks.filter((t) => t.status === "pending" && t.priority === "Urgent").length,
    completed: fTasks.filter((t) => t.status === "completed").length,
  };
  const visTasks = useMemo(() => {
    let rows = [...fTasks];
    if (taskPill === "open") rows = rows.filter((t) => t.status === "pending");
    else if (taskPill === "overdue") rows = rows.filter((t) => t.status === "pending" && t.due < TODAY);
    else if (taskPill === "urgent") rows = rows.filter((t) => t.status === "pending" && t.priority === "Urgent");
    else if (taskPill === "completed") rows = rows.filter((t) => t.status === "completed");
    const pr = { Urgent: 0, Normal: 1, Low: 2 };
    return rows.sort((a, b) => {
      if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
      if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
      return a.due.localeCompare(b.due);
    });
  }, [fTasks, taskPill]);

  const sortHead = (key: string, label: string, extra = "") => (
    <th className={`${TH} ${extra} cursor-pointer select-none hover:text-[#1570EF]`} onClick={() => { if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(key); setSortDir("desc"); } }}>
      {label} <span className="text-[#98A2B3]">⇅</span>
    </th>
  );

  const setTemp = (name: string, t: Temp) => setPartners((p) => p.map((x) => (x.name === name ? { ...x, temp: t } : x)));
  const setProspectTemp = (id: string, t: Temp) => setProspects((p) => p.map((x) => (x.id === id ? { ...x, temp: t } : x)));
  const setProspectStage = (id: string, s: Stage) => setProspects((p) => p.map((x) => (x.id === id ? { ...x, stage: s } : x)));
  const toggleTask = (id: string) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t)));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#101828]">BDM Performance</h1>
        <p className="mt-1 text-sm text-[#667085]">{isBdm ? "Your partner portfolio, conversion rates, and revenue performance." : "Track BDM partner portfolios, conversion rates, and revenue performance."}</p>
      </div>

      {/* BDM selector */}
      {!isBdm && (
        <div className="mb-5 flex gap-1 border-b border-[#E4E7EC]">
          {[{ id: "all", label: "All BDMs", count: PARTNERS.length }, ...BDMS.map((b) => ({ id: b, label: b, count: PARTNERS.filter((p) => p.bdm === b).length }))].map((t) => {
            const on = bdm === t.id;
            return (
              <button key={t.id} onClick={() => setBdm(t.id)} className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${on ? "border-[#1570EF] text-[#1570EF]" : "border-transparent text-[#667085] hover:text-[#344054]"}`}>
                {t.label}<span className={`rounded-full px-1.5 py-0.5 text-[11px] ${on ? "bg-[#EFF8FF] text-[#1570EF]" : "bg-[#F2F4F7] text-[#344054]"}`}>{t.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon="partners" tone="blue" label="My Partners" value={fPartners.length} />
        <StatCard icon="approvals" tone="purple" label="Open Tasks" value={openTasks} />
        <StatCard icon="clock" tone="orange" label="Due Today" value={dueToday} />
        <StatCard icon="bolt" tone="red" label="Overdue" value={overdue} />
        <StatCard icon="revenue" tone="green" label="Revenue" value={fmtMoney(revenue)} sub={<span className="font-semibold text-[#027A48]">▲ +18%</span>} />
      </div>

      {/* Scorecard */}
      {!isBdm && (
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-[#101828]">Performance Scorecard</h3>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => setPreset(p.label)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${preset === p.label ? "border-[#1570EF] bg-[#EFF8FF] text-[#1570EF]" : "border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB]"}`}>{p.label}</button>
              ))}
              <span className="text-xs text-[#667085]">From</span>
              <input type="date" value={scFrom} onChange={(e) => { setScFrom(e.target.value); setPreset("custom"); }} className="h-8 rounded-lg border border-[#D0D5DD] px-2 text-xs outline-none focus:border-[#1570EF]" />
              <span className="text-xs text-[#667085]">To</span>
              <input type="date" value={scTo} onChange={(e) => { setScTo(e.target.value); setPreset("custom"); }} className="h-8 rounded-lg border border-[#D0D5DD] px-2 text-xs outline-none focus:border-[#1570EF]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <ScoreTile label="Partner Check-ins" value={String(checkIns)} target={`${checkIns}/${ciTarget} (3/week × ${weeks}w)`} good={checkIns >= ciTarget} warn={checkIns >= ciTarget * 0.66} width={Math.min(100, (checkIns / ciTarget) * 100)} />
            <ScoreTile label="Follow-up Compliance" value={`${compliance}%`} target={`${withFollowup}/${fActivities.length} followed up`} good={compliance >= 90} warn={compliance >= 70} width={compliance} />
            <ScoreTile label="Task Completion" value={`${taskCompletion}%`} target={`${completedTasks}/${fTasks.length} tasks done`} good={taskCompletion >= 70} warn={taskCompletion >= 40} width={taskCompletion} />
            <ScoreTile label="Stale Prospects" value={`${stalePct}%`} target={`${staleCount}/${activeProspects.length} stale (14d+)`} good={stalePct <= 20} warn={stalePct <= 40} width={100 - stalePct} invert />
            <ScoreTile label="Conversion Rate" value={`${convRate}%`} target={`${convertedCount} converted`} good={convRate >= 30} warn={convRate >= 15} width={convRate} purple />
          </div>
        </div>
      )}

      {/* Alerts */}
      {!isBdm && (
        <div className={`${CARD} mb-6`}>
          <div className="flex items-center gap-2 border-b border-[#E4E7EC] px-5 py-3.5">
            <span className="text-lg">⚠️</span><h3 className="text-[15px] font-semibold text-[#101828]">Alerts &amp; Red Flags</h3>
            <span className="rounded-full bg-[#FEF3F2] px-2 py-0.5 text-xs font-semibold text-[#B42318]">{alerts.length}</span>
          </div>
          <div className="divide-y divide-[#F2F4F7]">
            {alerts.length === 0 ? <div className="px-5 py-6 text-center text-sm text-[#98A2B3]">No alerts. All BDMs are on track.</div>
              : alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 text-[13px] text-[#344054]">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.sev === "red" ? "bg-[#F04438]" : a.sev === "amber" ? "bg-[#F79009]" : "bg-[#EAAA08]"}`} />{a.text}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {!isBdm && bdm === "all" && (
        <div className={`${CARD} mb-6`}>
          <div className="border-b border-[#E4E7EC] px-5 py-3.5"><h3 className="text-[15px] font-semibold text-[#101828]">BDM Leaderboard</h3></div>
          <div className="divide-y divide-[#F2F4F7]">
            {leaderboard.map((l, i) => (
              <div key={l.name} className="flex items-center gap-4 px-5 py-3.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${i === 0 ? "bg-[#F79009]" : i === 1 ? "bg-[#98A2B3]" : i === 2 ? "bg-[#B54708]" : "bg-[#D0D5DD]"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#101828]">{l.name}</div>
                  <div className="text-xs text-[#667085]">{l.partners} partners · {l.students} students · {l.activities} activities · {l.prospects} prospects</div>
                </div>
                <div className="text-right"><div className="text-sm font-bold text-[#101828]">{fmtMoney(l.revenue)}</div><div className="text-[11px] text-[#98A2B3]">Revenue</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda */}
      <div className={`${CARD} mb-6`}>
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-5 py-3.5">
          <div className="flex items-center gap-2"><span>📅</span><h3 className="text-[15px] font-semibold text-[#101828]">Today&apos;s Agenda</h3></div>
          <button onClick={() => setAgendaOpen((v) => !v)} className="text-xs font-semibold text-[#1570EF]">{agendaOpen ? "Collapse" : "Expand"}</button>
        </div>
        {agendaOpen && (
          <div className="divide-y divide-[#F2F4F7]">
            {agenda.length === 0 ? <div className="px-5 py-6 text-center text-sm text-[#98A2B3]">No items on today&apos;s agenda. All caught up!</div>
              : agenda.map((a, i) => (
                <button key={i} onClick={() => a.isTask ? setTab(3) : toast("Opens the related record in production")} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#F9FAFB]">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${a.bucket === "overdue" ? "bg-[#FEF3F2]" : a.bucket === "today" ? "bg-[#FFF6ED]" : "bg-[#EFF8FF]"}`}>{a.bucket === "overdue" ? "❗" : a.bucket === "today" ? "⏰" : "📆"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[#101828]">{a.title}{a.isTask && <span className="rounded bg-[#EFF8FF] px-1.5 py-0.5 text-[10px] font-bold text-[#1570EF]">TASK</span>}</div>
                    <div className="text-[11px] text-[#98A2B3]">{a.sub}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.bucket === "overdue" ? "bg-[#FEF3F2] text-[#B42318]" : a.bucket === "today" ? "bg-[#FFFAEB] text-[#B54708]" : "bg-[#EFF8FF] text-[#1570EF]"}`}>{a.bucket === "overdue" ? "Overdue" : a.bucket === "today" ? "Today" : "Upcoming"}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Content tabs */}
      <div className="mb-5 flex gap-1 border-b border-[#E4E7EC]">
        {CONTENT_TABS.map((t, i) => {
          const count = i === 0 ? fPartners.length : i === 1 ? fProspects.filter((p) => p.stage !== "Lost" && p.stage !== "Converted").length : i === 2 ? fActivities.length : fTasks.filter((x) => x.status === "pending").length;
          const on = tab === i;
          return (
            <button key={t} onClick={() => setTab(i)} className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${on ? "border-[#1570EF] text-[#1570EF]" : "border-transparent text-[#667085] hover:text-[#344054]"}`}>
              {t}<span className={`rounded-full px-1.5 py-0.5 text-[11px] ${on ? "bg-[#EFF8FF] text-[#1570EF]" : "bg-[#F2F4F7] text-[#344054]"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filter bar — Portfolio only */}
      {tab === 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <select className="h-9 rounded-lg border border-[#D0D5DD] px-3 text-sm text-[#344054] outline-none focus:border-[#1570EF]"><option>All Intakes</option><option>Spring 2026</option><option>Fall 2026</option><option>Spring 2027</option></select>
          <select className="h-9 rounded-lg border border-[#D0D5DD] px-3 text-sm text-[#344054] outline-none focus:border-[#1570EF]"><option>All Countries</option><option>UK</option><option>USA</option><option>Canada</option><option>Australia</option><option>Germany</option><option>Ireland</option><option>New Zealand</option></select>
          <select value={fType} onChange={(e) => setFType(e.target.value)} className="h-9 rounded-lg border border-[#D0D5DD] px-3 text-sm text-[#344054] outline-none focus:border-[#1570EF]"><option value="">All Partner Types</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Deactivated">Deactivated</option></select>
          <select value={fTier} onChange={(e) => setFTier(e.target.value)} className="h-9 rounded-lg border border-[#D0D5DD] px-3 text-sm text-[#344054] outline-none focus:border-[#1570EF]"><option value="">All Tiers</option><option>Diamond</option><option>Titanium</option><option>Platinum</option><option>Gold</option><option>Silver</option></select>
          <button onClick={() => { setApplied({ type: fType, tier: fTier }); toast("Filters applied"); }} className="h-9 rounded-lg border border-[#1570EF] px-3.5 text-[13px] font-semibold text-[#1570EF] hover:bg-[#EFF8FF]">Apply Filter</button>
          <button onClick={() => { setFType(""); setFTier(""); setApplied({ type: "", tier: "" }); toast("Filters reset"); }} className="h-9 rounded-lg border border-[#D0D5DD] px-3.5 text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB]">Reset</button>
        </div>
      )}

      {/* PORTFOLIO */}
      {tab === 0 && (
        <div className="space-y-6">
          <div className={CARD}>
            <div className="flex items-center gap-2 border-b border-[#E4E7EC] px-5 py-4"><h3 className="text-[15px] font-semibold text-[#101828]">Partner Portfolio</h3><span className="rounded-full bg-[#EFF8FF] px-2 py-0.5 text-xs font-semibold text-[#1570EF]">{portfolioRows.length}</span></div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr>
                  {sortHead("name", "Partner")}{sortHead("tier", "Tier")}<th className={TH}>Temp</th>{sortHead("status", "Status")}
                  {sortHead("students", "Students")}{sortHead("apps", "Applications")}{sortHead("deposits", "Deposits")}{sortHead("conversion", "Conversion")}
                  {sortHead("revenue", "Revenue")}{sortHead("lastAct", "Last Activity")}<th className={TH}>Actions</th>
                </tr></thead>
                <tbody>
                  {portfolioRows.map((p) => {
                    const conv = conversion(p); const st = STATUS_BADGE[p.status];
                    const convColor = p.apps === 0 ? "text-[#98A2B3]" : conv >= 30 ? "text-[#027A48]" : conv >= 20 ? "text-[#B54708]" : "text-[#B42318]";
                    return (
                      <tr key={p.name} className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#F9FAFB]">
                        <td className={TD}><div className="flex items-center gap-2.5"><Avatar name={p.name} /><div><div className="font-semibold text-[#101828]">{p.name}</div><div className="text-[11px] text-[#98A2B3]">{p.city}</div></div></div></td>
                        <td className={TD}><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_BADGE[p.tier]}`}>{p.tier}</span></td>
                        <td className={TD}><TempPill value={p.temp} onChange={(t) => setTemp(p.name, t)} /></td>
                        <td className={TD}><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.wrap}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{p.status}</span></td>
                        <td className={`${TD} font-semibold text-[#101828]`}>{p.students}</td>
                        <td className={TD}>{p.apps}</td>
                        <td className={`${TD} font-semibold text-[#101828]`}>{p.deposits}</td>
                        <td className={`${TD} font-semibold ${convColor}`}>{conv}%</td>
                        <td className={`${TD} font-bold text-[#101828]`}>{fmtMoney(p.revenue)}</td>
                        <td className={`${TD} whitespace-nowrap text-[#98A2B3]`}>{relDays(p.lastActDays)}</td>
                        <td className={TD}><button onClick={() => toast(`Partner details for ${p.name} would open in production`)} className="rounded-md border border-[#D0D5DD] px-2.5 py-1 text-xs font-semibold text-[#344054] hover:border-[#1570EF] hover:text-[#1570EF]">View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={CARD}>
            <div className="border-b border-[#E4E7EC] px-5 py-4"><h3 className="text-[15px] font-semibold text-[#101828]">Pipeline Visualization</h3></div>
            <div className="space-y-3 px-5 py-4">
              {pipelineRows.map((p) => {
                const pipe = p.pipe!; const total = pipe.leads + pipe.preapp + pipe.submitted + pipe.offer + pipe.deposit;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-[180px] shrink-0 truncate text-[13px] font-medium text-[#344054]">{p.name}</div>
                    <div className="flex h-6 flex-1 overflow-hidden rounded-md">
                      {PIPE_SEGMENTS.map((seg) => { const v = pipe[seg.key]; const w = (v / total) * 100; return <div key={seg.key} style={{ width: `${w}%`, background: seg.color }} className="flex items-center justify-center text-[10px] font-bold text-white">{v >= 3 ? v : ""}</div>; })}
                    </div>
                    <div className="w-8 shrink-0 text-right text-sm font-bold text-[#101828]">{total}</div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-4 border-t border-[#F2F4F7] pt-3">
                {PIPE_SEGMENTS.map((s) => <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-[#667085]"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROSPECTS */}
      {tab === 1 && (
        <div className={CARD}>
          <div className="flex items-center justify-between border-b border-[#E4E7EC] px-5 py-4">
            <div className="flex items-center gap-2"><h3 className="text-[15px] font-semibold text-[#101828]">Prospect Pipeline</h3><span className="rounded-full bg-[#EFF8FF] px-2 py-0.5 text-xs font-semibold text-[#1570EF]">{fProspects.length}</span></div>
            <button onClick={() => toast("Create Prospect modal would open in production")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1570EF] px-3.5 text-[13px] font-semibold text-white hover:bg-[#1565d8]">+ New Prospect</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Agency</th><th className={TH}>City</th><th className={TH}>Temp</th><th className={TH}>Stage</th><th className={TH}>Days in Stage</th><th className={TH}>Last Activity</th><th className={TH}>Next Follow-up</th><th className={TH}>Flag</th><th className={TH}>Actions</th></tr></thead>
              <tbody>
                {fProspects.map((p) => {
                  const flag = p.stage === "Lost" || p.stage === "Converted" ? null : p.lastActDays >= 30 ? { t: "At Risk", c: "bg-[#FEF3F2] text-[#B42318]" } : p.lastActDays >= 14 ? { t: "Stale", c: "bg-[#FFFAEB] text-[#B54708]" } : null;
                  return (
                    <tr key={p.id} className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#F9FAFB]">
                      <td className={TD}><div className="flex items-center gap-2.5"><Avatar name={p.agency} /><div><button onClick={() => toast(`Prospect details for ${p.agency} would open in production`)} className="font-semibold text-[#1570EF] hover:underline">{p.agency}</button><div className="text-[11px] text-[#98A2B3]">{p.contact}</div></div></div></td>
                      <td className={TD}>{p.city}</td>
                      <td className={TD}><TempPill value={p.temp} onChange={(t) => setProspectTemp(p.id, t)} /></td>
                      <td className={TD}>{p.stage === "Converted" ? <span className="font-semibold text-[#027A48]">Converted ✓</span> : p.stage === "Lost" ? <span className="font-semibold text-[#98A2B3]">Lost</span> : (
                        <select value={p.stage} onChange={(e) => setProspectStage(p.id, e.target.value as Stage)} className={`cursor-pointer rounded-full px-2 py-1 text-[11px] font-semibold outline-none ${STAGE_BADGE[p.stage]}`}>
                          {["Lead", "Contacted", "Meeting Done", "Proposal Sent", "Negotiation", "Onboarding"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}</td>
                      <td className={TD}>{p.daysInStage}d</td>
                      <td className={`${TD} text-[#98A2B3]`}>{relDays(p.lastActDays)}</td>
                      <td className={TD}>{p.nextFollowup ?? "—"}</td>
                      <td className={TD}>{flag ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${flag.c}`}>{flag.t}</span> : ""}</td>
                      <td className={TD}><button onClick={() => toast(`Prospect details for ${p.agency} would open in production`)} className="rounded-md border border-[#D0D5DD] px-2.5 py-1 text-xs font-semibold text-[#344054] hover:border-[#1570EF] hover:text-[#1570EF]">View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTIVITY LOG */}
      {tab === 2 && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={actRelated} onChange={(e) => setActRelated(e.target.value)} className="h-9 rounded-lg border border-[#D0D5DD] px-3 text-sm text-[#344054] outline-none focus:border-[#1570EF]">
              <option value="">All Partners &amp; Prospects</option>
              <optgroup label="Partners">{PARTNERS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}</optgroup>
              <optgroup label="Prospects">{PROSPECTS.map((p) => <option key={p.id} value={p.agency}>{p.agency}</option>)}</optgroup>
            </select>
            <div className="flex flex-wrap gap-1.5">
              {ACT_PILLS.map((pill) => <button key={pill.label} onClick={() => setActType(pill.type)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${actType === pill.type ? "bg-[#1570EF] text-white" : "bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC]"}`}>{pill.label}</button>)}
            </div>
            <button onClick={() => toast("Log Activity modal would open in production")} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1570EF] px-3.5 text-[13px] font-semibold text-white hover:bg-[#1565d8]">+ Log Activity</button>
          </div>
          <div className="space-y-3">
            {visActivities.length === 0 ? <div className={`${CARD} px-5 py-10 text-center text-sm text-[#98A2B3]`}>No activities match the current filters.</div>
              : visActivities.map((a) => {
                const icon = a.type === "call" ? "📞" : a.type === "meeting" ? "👥" : a.type === "email" ? "✉️" : a.type === "note" ? "📝" : "🔁";
                return (
                  <div key={a.id} className={`${CARD} p-4`}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F9FAFB] text-base">{icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-[#101828]">{ACT_TYPE_LABEL[a.type]} — <button onClick={() => setActRelated(a.related)} className="text-[#1570EF] hover:underline">{a.related}</button></div>
                          <span className="text-xs text-[#98A2B3]">{relDays(daysAgo(a.date.slice(0, 10)))}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-[#667085]">By {a.bdm}{a.durationMin ? ` · ${a.durationMin} min` : ""}{a.followup ? ` · Follow-up: ${a.followup}` : ""}</div>
                        <div className="mt-2 rounded-lg bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#344054]">{a.summary}</div>
                        <div className="mt-2 text-[11px] text-[#98A2B3]">🔒 Logged · Cannot be edited</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MY TASKS */}
      {tab === 3 && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-6 rounded-xl border border-[#E4E7EC] bg-white px-5 py-3.5">
            {[["Open", taskCounts.open, ""], ["Overdue", taskCounts.overdue, "text-[#B42318]"], ["Due Today", dueToday, ""], ["Urgent", taskCounts.urgent, ""], ["Completed", taskCounts.completed, "text-[#027A48]"]].map(([l, n, c]) => (
              <div key={l as string}><span className={`text-lg font-bold ${(c as string) || "text-[#101828]"}`}>{n as number}</span> <span className="text-xs text-[#667085]">{l as string}</span></div>
            ))}
            <button onClick={() => toast("Create Task modal would open in production")} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1570EF] px-3.5 text-[13px] font-semibold text-white hover:bg-[#1565d8]">+ New Task</button>
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {[["all", "All", taskCounts.all], ["open", "Open", taskCounts.open], ["overdue", "Overdue", taskCounts.overdue], ["urgent", "Urgent", taskCounts.urgent], ["completed", "Completed", taskCounts.completed]].map(([k, l, n]) => (
              <button key={k as string} onClick={() => setTaskPill(k as string)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${taskPill === k ? "bg-[#1570EF] text-white" : "bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC]"}`}>{l as string} {n as number}</button>
            ))}
          </div>
          <div className="space-y-2.5">
            {visTasks.map((t) => {
              const od = t.status === "pending" && t.due < TODAY; const isToday = t.status === "pending" && t.due === TODAY;
              const dueTag = t.status === "completed" ? "Completed" : od ? `${daysAgo(t.due)} days overdue` : isToday ? "Due today" : t.due;
              const dueCls = t.status === "completed" ? "text-[#027A48]" : od ? "text-[#B42318]" : isToday ? "text-[#B54708]" : "text-[#667085]";
              return (
                <div key={t.id} className={`${CARD} flex items-start gap-3 p-4 ${t.status === "completed" ? "opacity-60" : ""}`}>
                  <button onClick={() => toggleTask(t.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${t.status === "completed" ? "border-[#12B76A] bg-[#12B76A] text-white" : "border-[#D0D5DD] hover:border-[#1570EF]"}`}>{t.status === "completed" ? "✓" : ""}</button>
                  <button onClick={() => toast(`Task detail for ${t.id} would open in production`)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2"><span className={`text-sm font-semibold text-[#101828] ${t.status === "completed" ? "line-through" : ""}`}>{t.title}</span>{t.notes > 0 && <span className="rounded bg-[#EFF8FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#1570EF]">{t.notes} notes</span>}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${PRIORITY_BADGE[t.priority]}`}>{t.priority.toUpperCase()}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full bg-[#F2F4F7] px-2 py-0.5 font-medium ${dueCls}`}>📅 {dueTag}</span>
                      <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 font-medium text-[#667085]">{t.category}</span>
                      <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 font-medium text-[#667085]">👤 {t.related}</span>
                      {t.rescheduled ? <span className="rounded-full bg-[#FFFAEB] px-2 py-0.5 font-medium text-[#B54708]">Rescheduled {t.rescheduled}x</span> : null}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Toast message={toastMsg} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
}

function ScoreTile({ label, value, target, good, warn, width, purple, invert }: { label: string; value: string; target: string; good: boolean; warn: boolean; width: number; purple?: boolean; invert?: boolean }) {
  const valColor = good ? "text-[#027A48]" : warn ? "text-[#B54708]" : "text-[#B42318]";
  const barColor = purple ? "bg-[#7F56D9]" : good ? "bg-[#12B76A]" : invert ? "bg-[#F04438]" : "bg-[#F79009]";
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white p-4">
      <div className={`text-2xl font-extrabold ${valColor}`}>{value}</div>
      <div className="mt-0.5 text-[13px] font-medium text-[#344054]">{label}</div>
      <div className="mt-0.5 text-[11px] text-[#98A2B3]">{target}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F2F4F7]"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(0, Math.min(100, width))}%` }} /></div>
    </div>
  );
}
