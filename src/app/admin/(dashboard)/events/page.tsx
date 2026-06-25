"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import { EventType, EventTypeLabel, EVENT_TYPE_CODES } from "~/server/db/enums";
import { formatDate } from "~/components/dashboard/format";
import { StatCard, Icon } from "~/components/dashboard/widgets";

type EventRow = RouterOutputs["events"]["list"][number];

const TYPE_BADGE: Record<number, string> = {
  [EventType.UNIVERSITY_FAIR]: "bg-[#EFF8FF] text-[#175CD3]",
  [EventType.WEBINAR]: "bg-[#F0FDF4] text-[#067647]",
  [EventType.WORKSHOP]: "bg-[#FFFAEB] text-[#B54708]",
  [EventType.INFO_SESSION]: "bg-[#FDF2FA] text-[#C11574]",
  [EventType.PARTNER_MEET]: "bg-[#F0F0FF] text-[#5925DC]",
  [EventType.OTHER]: "bg-[#F2F4F7] text-[#344054]",
};

const pad = (n: number) => String(n).padStart(2, "0");
const nn = (s: string): string | null => (s.trim() === "" ? null : s.trim());

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

// ---------------------------------------------------------------------------
// Compact month calendar with dots on days that have events.
// ---------------------------------------------------------------------------
function Calendar({ events }: { events: EventRow[] }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.eventDate, (counts.get(e.eventDate) ?? 0) + 1);

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const title = new Date(view.y, view.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = todayStr();
  const shift = (delta: number) =>
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });

  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E4E7EC] text-[#667085] hover:border-[#1570EF] hover:text-[#1570EF]"
        >
          ‹
        </button>
        <div className="text-[13px] font-semibold text-[#101828]">{title}</div>
        <button
          type="button"
          onClick={() => shift(1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E4E7EC] text-[#667085] hover:border-[#1570EF] hover:text-[#1570EF]"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1 text-[10px] font-semibold text-[#98A2B3]">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const ds = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
          const count = counts.get(ds) ?? 0;
          const isToday = ds === today;
          return (
            <div
              key={i}
              className={`flex h-9 flex-col items-center justify-center rounded-md text-[12px] ${
                isToday ? "bg-[#EFF8FF] font-bold text-[#1570EF]" : "text-[#344054]"
              }`}
            >
              {d}
              {count > 0 && (
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#1570EF]" title={`${count} event(s)`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit event modal.
// ---------------------------------------------------------------------------
function EventModal({ event, onClose }: { event: EventRow | null; onClose: () => void }) {
  const utils = api.useUtils();
  const isEdit = event !== null;
  const [f, setF] = useState(() => ({
    title: event?.title ?? "",
    eventType: (event?.eventType ?? EventType.UNIVERSITY_FAIR) as EventType,
    eventDate: event?.eventDate ?? "",
    startTime: event?.startTime ?? "10:00",
    endTime: event?.endTime ?? "12:00",
    isVirtual: event?.isVirtual ?? false,
    location: event?.location ?? "",
    meetingUrl: event?.meetingUrl ?? "",
    description: event?.description ?? "",
    maxAttendees: event?.maxAttendees != null ? String(event.maxAttendees) : "",
    isActive: event?.isActive ?? false,
  }));
  const [err, setErr] = useState("");
  const onDone = () => {
    void utils.events.list.invalidate();
    onClose();
  };
  const create = api.events.create.useMutation({ onSuccess: onDone });
  const update = api.events.update.useMutation({ onSuccess: onDone });
  const busy = create.isPending || update.isPending;

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (f.title.trim() === "") return setErr("Event name is required.");
    if (f.eventDate === "") return setErr("Event date is required.");
    const payload = {
      title: f.title.trim(),
      eventType: f.eventType,
      eventDate: f.eventDate,
      startTime: nn(f.startTime),
      endTime: nn(f.endTime),
      isVirtual: f.isVirtual,
      location: f.isVirtual ? null : nn(f.location),
      meetingUrl: f.isVirtual ? nn(f.meetingUrl) : null,
      description: nn(f.description),
      maxAttendees: f.maxAttendees.trim() === "" ? null : Number(f.maxAttendees),
      isActive: f.isActive,
    };
    if (isEdit) update.mutate({ ...payload, id: event.id });
    else create.mutate(payload);
  }

  const label = "mb-1.5 block text-[13px] font-semibold text-[#344054]";
  const input =
    "w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#344054] outline-none focus:border-[#1570EF]";

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[rgba(16,24,40,0.55)] p-4">
      <div className="max-h-[90vh] w-[560px] max-w-full overflow-y-auto rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-6 py-5">
          <h3 className="text-base font-bold text-[#101828]">
            {isEdit ? "Edit Event" : "Add Event"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#667085] hover:bg-[#F9FAFB]"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3.5 px-6 py-5">
          <div>
            <label className={label}>Event Name</label>
            <input
              className={input}
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. UK University Fair 2026"
            />
          </div>
          <div>
            <label className={label}>Event Type</label>
            <select
              className={input}
              value={f.eventType}
              onChange={(e) => set("eventType", Number(e.target.value) as EventType)}
            >
              {EVENT_TYPE_CODES.map((c) => (
                <option key={c} value={c}>
                  {EventTypeLabel[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Date</label>
              <input
                type="date"
                className={input}
                value={f.eventDate}
                onChange={(e) => set("eventDate", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Start Time</label>
              <input
                type="time"
                className={input}
                value={f.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>End Time</label>
              <input
                type="time"
                className={input}
                value={f.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#344054]">
            <input
              type="checkbox"
              checked={f.isVirtual}
              onChange={(e) => set("isVirtual", e.target.checked)}
            />
            Online event
          </label>
          {f.isVirtual ? (
            <div>
              <label className={label}>Meeting Link</label>
              <input
                className={input}
                value={f.meetingUrl}
                onChange={(e) => set("meetingUrl", e.target.value)}
                placeholder="https://zoom.us/j/…"
              />
            </div>
          ) : (
            <div>
              <label className={label}>Location</label>
              <input
                className={input}
                value={f.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Mumbai Convention Centre, Hall B"
              />
            </div>
          )}
          <div>
            <label className={label}>Description</label>
            <textarea
              className={`${input} min-h-[80px] resize-y`}
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of the event…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Max Attendees</label>
              <input
                type="number"
                min={1}
                className={input}
                value={f.maxAttendees}
                onChange={(e) => set("maxAttendees", e.target.value)}
                placeholder="100"
              />
            </div>
            <div>
              <label className={label}>Status</label>
              <select
                className={input}
                value={f.isActive ? "published" : "draft"}
                onChange={(e) => set("isActive", e.target.value === "published")}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          {err !== "" && <p className="text-[12px] text-[#F04438]">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#E4E7EC] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D0D5DD] bg-white px-[18px] py-2.5 text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-lg bg-[#1570EF] px-[18px] py-2.5 text-[13px] font-semibold text-white hover:bg-[#1260d4] disabled:opacity-50"
          >
            {busy ? "Saving…" : isEdit ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({
  e,
  readOnly,
  onEdit,
  onDelete,
}: {
  e: EventRow;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-3 rounded-xl border border-[#E4E7EC] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-bold text-[#101828]">{e.title}</h3>
          <span
            className={`rounded-[10px] px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[e.eventType] ?? TYPE_BADGE[EventType.OTHER]}`}
          >
            {(EventTypeLabel as Record<number, string | undefined>)[e.eventType] ??
              "Other"}
          </span>
          <span
            className={`rounded-[10px] px-2 py-0.5 text-[11px] font-semibold ${
              e.isActive ? "bg-[#ECFDF3] text-[#067647]" : "bg-[#F2F4F7] text-[#667085]"
            }`}
          >
            {e.isActive ? "Published" : "Draft"}
          </span>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#344054] hover:bg-[#F9FAFB]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md border border-[#FECDCA] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#B42318] hover:bg-[#FEF3F2]"
            >
              Delete
            </button>
          </div>
        )}
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
          {e.description.length > 180 ? `${e.description.slice(0, 178)}…` : e.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-4 border-t border-[#F2F4F7] pt-3 text-[12px] text-[#667085]">
        <span>
          Max attendees: <strong className="text-[#101828]">{e.maxAttendees ?? "—"}</strong>
        </span>
        <span>
          Registrations: <strong className="text-[#101828]">{e.registrations}</strong>
        </span>
      </div>
    </div>
  );
}

const filterSelectCls =
  "h-[38px] rounded-lg border border-[#D0D5DD] bg-white px-2.5 text-[13px] font-medium text-[#344054] outline-none hover:border-[#1570EF] focus:border-[#1570EF]";

export default function EventsPage() {
  const { data, isLoading } = api.events.list.useQuery();
  const utils = api.useUtils();
  const del = api.events.delete.useMutation({
    onSuccess: () => void utils.events.list.invalidate(),
  });

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [modal, setModal] = useState<{ event: EventRow | null } | null>(null);

  const rows = data ?? [];
  const today = todayStr();
  const upcoming = rows.filter((e) => e.eventDate >= today);
  const past = rows.filter((e) => e.eventDate < today);
  const thisMonthPrefix = today.slice(0, 7);
  const thisMonth = upcoming.filter((e) => e.eventDate.startsWith(thisMonthPrefix));

  const base = (tab === "upcoming" ? upcoming : past)
    .slice()
    .sort((a, b) =>
      tab === "upcoming"
        ? a.eventDate.localeCompare(b.eventDate)
        : b.eventDate.localeCompare(a.eventDate),
    );
  const filtered = base.filter((e) => {
    if (search !== "" && !e.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (type !== "" && String(e.eventType) !== type) return false;
    return true;
  });

  function confirmDelete(e: EventRow) {
    if (window.confirm(`Delete "${e.title}"? This cannot be undone.`)) {
      del.mutate({ id: e.id });
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Events</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Manage university fairs, webinars, and partner events.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ event: null })}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#1570EF] px-4 text-[13px] font-semibold text-white hover:bg-[#1260d4]"
        >
          + Add Event
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="calendar" tone="blue" value={upcoming.length} label="Upcoming Events" />
        <StatCard icon="calendar" tone="purple" value={thisMonth.length} label="This Month" />
        <StatCard icon="clock" tone="cyan" value={past.length} label="Past Events" />
        <StatCard icon="applications" tone="green" value={rows.length} label="Total Events" />
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

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events…"
          className="h-[38px] w-56 rounded-lg border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#344054] outline-none focus:border-[#1570EF]"
        />
        <select className={filterSelectCls} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          {EVENT_TYPE_CODES.map((c) => (
            <option key={c} value={String(c)}>
              {EventTypeLabel[c]}
            </option>
          ))}
        </select>
        {(search !== "" || type !== "") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setType("");
            }}
            className="h-[38px] rounded-lg border border-[#D0D5DD] bg-white px-3.5 text-[13px] font-medium text-[#667085] hover:bg-[#F9FAFB]"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        {/* Event list */}
        <div>
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] p-6 text-center text-[13px] text-[#667085]">
              Loading events…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] p-6 text-center">
              <h4 className="mb-1 font-semibold text-[#344054]">No events found</h4>
              <p className="text-[13px] text-[#667085]">
                {tab === "past"
                  ? "No past events to show."
                  : "No upcoming events — add one to get started."}
              </p>
            </div>
          ) : (
            filtered.map((e) => (
              <EventCard
                key={e.id}
                e={e}
                readOnly={tab === "past"}
                onEdit={() => setModal({ event: e })}
                onDelete={() => confirmDelete(e)}
              />
            ))
          )}
        </div>

        {/* Calendar (upcoming tab) */}
        {tab === "upcoming" && (
          <div className="order-first lg:order-last">
            <Calendar events={upcoming} />
          </div>
        )}
      </div>

      {modal && <EventModal event={modal.event} onClose={() => setModal(null)} />}
    </>
  );
}
