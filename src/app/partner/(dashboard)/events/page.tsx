"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import { EventType, EventTypeLabel } from "~/server/db/enums";
import { formatDate } from "~/components/dashboard/format";
import { StatCard, EmptyState, Icon } from "~/components/dashboard/widgets";

type EventRow = RouterOutputs["events"]["forPartners"][number];

const TYPE_BADGE: Record<number, string> = {
  [EventType.UNIVERSITY_FAIR]: "bg-[#EFF8FF] text-[#175CD3]",
  [EventType.WEBINAR]: "bg-[#F0FDF4] text-[#067647]",
  [EventType.WORKSHOP]: "bg-[#FFFAEB] text-[#B54708]",
  [EventType.INFO_SESSION]: "bg-[#FDF2FA] text-[#C11574]",
  [EventType.PARTNER_MEET]: "bg-[#F0F0FF] text-[#5925DC]",
  [EventType.OTHER]: "bg-[#F2F4F7] text-[#344054]",
};

const pad = (n: number) => String(n).padStart(2, "0");

function formatTime(hhmm: string | null): string {
  if (!hhmm) return "";
  const parts = hhmm.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ap}`;
}

function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

function EventCard({ e }: { e: EventRow }) {
  return (
    <div className="mb-3 rounded-xl border border-[#E4E7EC] bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-bold text-[#101828]">{e.title}</h3>
        <span
          className={`rounded-[10px] px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[e.eventType] ?? TYPE_BADGE[EventType.OTHER]}`}
        >
          {(EventTypeLabel as Record<number, string | undefined>)[e.eventType] ??
            "Other"}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-4 text-[12px] text-[#475467]">
        <span className="flex items-center gap-1.5">
          <Icon name="calendar" size={13} /> {formatDate(e.eventDate)}
        </span>
        {(e.startTime ?? e.endTime) && (
          <span className="flex items-center gap-1.5">
            <Icon name="clock" size={13} /> {formatTime(e.startTime)}
            {e.endTime ? ` – ${formatTime(e.endTime)}` : ""}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Icon name="globe" size={13} /> {e.isVirtual ? "Online" : (e.location ?? "—")}
        </span>
      </div>
      {e.description && (
        <p className="mt-2.5 text-[13px] leading-relaxed text-[#475467]">
          {e.description}
        </p>
      )}
      {e.isVirtual && e.meetingUrl && (
        <a
          href={e.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1570EF] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#1260d4]"
        >
          Join Online
        </a>
      )}
    </div>
  );
}

export default function PartnerEventsPage() {
  const { data, isLoading } = api.events.forPartners.useQuery();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const rows = data ?? [];
  const today = todayStr();
  const upcoming = rows
    .filter((e) => e.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const past = rows
    .filter((e) => e.eventDate < today)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const thisMonth = upcoming.filter((e) => e.eventDate.startsWith(today.slice(0, 7)));

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">Events</h1>
        <p className="mt-1 text-sm text-[#667085]">
          Webinars, university fairs, and partner meetups from Collegepond.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="calendar" tone="blue" value={upcoming.length} label="Upcoming Events" />
        <StatCard icon="calendar" tone="purple" value={thisMonth.length} label="This Month" />
        <StatCard icon="clock" tone="cyan" value={past.length} label="Past Events" />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-[#E4E7EC]">
        {(
          [
            { key: "upcoming", label: "Upcoming Events", count: upcoming.length },
            { key: "past", label: "Past Events", count: past.length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "border-[#1570EF] text-[#1570EF]"
                : "border-transparent text-[#667085] hover:text-[#1570EF]"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                tab === t.key ? "bg-[#EFF8FF] text-[#1570EF]" : "bg-[#F2F4F7] text-[#344054]"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] p-6 text-center text-[13px] text-[#667085]">
          Loading events…
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          label={
            tab === "upcoming" ? "No upcoming events right now." : "No past events."
          }
        />
      ) : (
        list.map((e) => <EventCard key={e.id} e={e} />)
      )}
    </>
  );
}
