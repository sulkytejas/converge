"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { StudentStatusBadge } from "~/components/students/status";
import { StudentStatus } from "~/server/db/enums";
import { api } from "~/trpc/react";
import { statusLabel, type AdminStudentFull } from "../lib";

// The mock's LEAD_STAGES: the pre-application journey, driven by the same
// student.status field the Students table shows.
const LEAD_STAGES = [
  { label: "Lead Entered", status: StudentStatus.NEW },
  { label: "Connected", status: StudentStatus.CONNECTED },
  { label: "Shortlisted", status: StudentStatus.SHORTLISTED },
  { label: "Begin Application", status: StudentStatus.BEGIN_APPLICATION },
] as const;

interface LeadOption {
  label: string;
  to: number; // target StudentStatus
  kind: "current" | "advance" | "terminal" | "revert";
  negative?: boolean;
}

// Mock's LEAD_STAGE_ALTERNATIVES, expressed as status transitions. Stage 3
// has no options — from there the application cards take over.
const STAGE_OPTIONS: Record<number, LeadOption[]> = {
  0: [
    { label: "Lead Entered", to: StudentStatus.NEW, kind: "current" },
    { label: "Interested", to: StudentStatus.CONNECTED, kind: "advance" },
    {
      label: "No Response",
      to: StudentStatus.NO_RESPONSE,
      kind: "terminal",
      negative: true,
    },
    {
      label: "Not Interested",
      to: StudentStatus.NO_INTEREST,
      kind: "terminal",
      negative: true,
    },
    {
      label: "Deferred to Next Term",
      to: StudentStatus.DEFERRED_TO_NEXT_INTAKE,
      kind: "terminal",
    },
  ],
  1: [
    { label: "Connected", to: StudentStatus.CONNECTED, kind: "current" },
    {
      label: "Advance to Shortlisted",
      to: StudentStatus.SHORTLISTED,
      kind: "advance",
    },
    {
      label: "No Response",
      to: StudentStatus.NO_RESPONSE,
      kind: "terminal",
      negative: true,
    },
    {
      label: "Not Interested",
      to: StudentStatus.NO_INTEREST,
      kind: "terminal",
      negative: true,
    },
    { label: "Revert to Lead Entered", to: StudentStatus.NEW, kind: "revert" },
  ],
  2: [
    { label: "Shortlisted", to: StudentStatus.SHORTLISTED, kind: "current" },
    {
      label: "Shortlisted & Begin Application",
      to: StudentStatus.BEGIN_APPLICATION,
      kind: "advance",
    },
    {
      label: "Shortlisted & Not Interested",
      to: StudentStatus.NO_INTEREST,
      kind: "terminal",
      negative: true,
    },
    {
      label: "Shortlisted & No Response",
      to: StudentStatus.NO_RESPONSE,
      kind: "terminal",
      negative: true,
    },
    {
      label: "Shortlisted & Deferred to Next Term",
      to: StudentStatus.DEFERRED_TO_NEXT_INTAKE,
      kind: "terminal",
    },
    {
      label: "Revert to Connected",
      to: StudentStatus.CONNECTED,
      kind: "revert",
    },
  ],
  3: [],
};

const NEGATIVE_OVERLAYS = new Set<number>([
  StudentStatus.NO_INTEREST,
  StudentStatus.NO_RESPONSE,
]);

export function LeadPipeline({
  student,
  onToast,
}: {
  student: AdminStudentFull;
  onToast: (msg: string) => void;
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const statusMut = api.students.bulkUpdateStatus.useMutation({
    onSuccess: (_res, vars) => {
      void utils.students.adminGet.invalidate({ id: student.id });
      void utils.students.adminList.invalidate();
      onToast(`Status updated to: ${statusLabel(vars.status)}`);
    },
    onError: (err) => onToast(err.message),
  });

  const status = student.status;

  // Deferred doubles as a post-offer status — it only reads as a *lead*
  // overlay while the student has no applications.
  const overlayStatus =
    NEGATIVE_OVERLAYS.has(status) ||
    (status === StudentStatus.DEFERRED_TO_NEXT_INTAKE &&
      student.applicationCards.length === 0)
      ? status
      : null;
  const negative = NEGATIVE_OVERLAYS.has(status);

  // Stage position: direct for lead statuses; overlays sit where the lead
  // most plausibly stalled; anything past the lead group completes the strip.
  const stage =
    status === StudentStatus.NEW || status === StudentStatus.INTERESTED
      ? 0
      : status === StudentStatus.CONNECTED
        ? 1
        : status === StudentStatus.SHORTLISTED
          ? 2
          : overlayStatus !== null
            ? student.shortlists.length > 0
              ? 2
              : 0
            : 3;

  const completedAll = stage === 3 && overlayStatus === null;
  const options = STAGE_OPTIONS[stage] ?? [];
  const interactive = options.length > 1 && !statusMut.isPending;

  const pick = (option: LeadOption) => {
    setOpen(false);
    if (option.to === status) return;
    statusMut.mutate({ ids: [student.id], status: option.to });
  };

  return (
    <div className="mb-6 rounded-[14px] border border-[#E4E7EC] bg-white px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1570EF"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span className="text-sm font-bold text-[#101828]">Lead Pipeline</span>
        <StudentStatusBadge status={status} />
        {overlayStatus !== null && (
          <button
            type="button"
            disabled={statusMut.isPending}
            onClick={() =>
              statusMut.mutate({
                ids: [student.id],
                status: LEAD_STAGES[stage].status,
              })
            }
            className="flex cursor-pointer items-center gap-1 rounded-md border border-[#D0D5DD] bg-white px-2.5 py-1 text-[11px] font-medium text-[#667085] hover:border-[#F79009] hover:bg-[#FFF4ED] hover:text-[#DC6803] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-3 w-3"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Revert to {LEAD_STAGES[stage].label}
          </button>
        )}
      </div>

      <div ref={ref} className="flex items-start">
        {LEAD_STAGES.map((s, i) => {
          const done = i < stage || completedAll;
          const active = i === stage && !completedAll;
          const reached = done || active;
          const isActiveInteractive = active && interactive;

          const dotClass = active
            ? negative
              ? "border-[#F04438] bg-[#F04438] shadow-[0_0_0_4px_rgba(240,68,56,0.18)]"
              : overlayStatus !== null
                ? "border-[#667085] bg-[#667085] shadow-[0_0_0_4px_rgba(102,112,133,0.18)]"
                : "border-[#1570EF] bg-[#1570EF] shadow-[0_0_0_4px_rgba(21,112,239,0.18)]"
            : done
              ? "border-[#12B76A] bg-[#12B76A]"
              : "border-[#D0D5DD] bg-white";
          const labelClass = active
            ? negative
              ? "font-semibold text-[#B42318]"
              : overlayStatus !== null
                ? "font-semibold text-[#475467]"
                : "font-semibold text-[#1570EF]"
            : done
              ? "font-semibold text-[#027A48]"
              : "font-medium text-[#98A2B3]";

          return (
            <Fragment key={s.label}>
              {i > 0 && (
                <div
                  className={`mt-[13px] h-0.5 min-w-4 flex-1 ${
                    reached ? "bg-[#12B76A]" : "bg-[#E4E7EC]"
                  }`}
                />
              )}
              <div className="relative flex w-[110px] shrink-0 flex-col items-center gap-1.5">
                <button
                  type="button"
                  disabled={!isActiveInteractive}
                  onClick={() => setOpen((v) => !v)}
                  aria-label={
                    isActiveInteractive
                      ? `Change status from ${s.label}`
                      : s.label
                  }
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${dotClass} ${
                    isActiveInteractive ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {active && negative ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={2.5}
                      className="h-3.5 w-3.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : reached ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={3}
                      className="h-3.5 w-3.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </button>
                <button
                  type="button"
                  disabled={!isActiveInteractive}
                  onClick={() => setOpen((v) => !v)}
                  className={`flex items-start justify-center gap-0.5 text-center text-[11px] leading-[1.3] ${labelClass} ${
                    isActiveInteractive ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {active && overlayStatus !== null
                    ? statusLabel(overlayStatus)
                    : s.label}
                  {isActiveInteractive && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#98A2B3"
                      strokeWidth={2}
                      className="mt-px h-2.5 w-2.5 shrink-0"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>

                {open && active && interactive && (
                  <div className="absolute top-9 left-1/2 z-[90] min-w-[250px] -translate-x-1/2 rounded-[10px] border border-[#E4E7EC] bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
                    {options.map((o) => {
                      const selected =
                        overlayStatus !== null
                          ? o.to === status
                          : o.kind === "current";
                      const tone = o.negative
                        ? "text-[#B42318] hover:bg-[#FEF3F2]"
                        : o.kind === "advance"
                          ? "text-[#1570EF] hover:bg-[#F0F7FF]"
                          : o.kind === "revert"
                            ? "text-[#DC6803] hover:bg-[#FFF4ED]"
                            : "text-[#344054] hover:bg-[#F0F7FF] hover:text-[#1570EF]";
                      return (
                        <Fragment key={o.label}>
                          {o.kind === "revert" && (
                            <div className="my-1 h-px bg-[#F2F4F7]" />
                          )}
                          <button
                            type="button"
                            onClick={() => pick(o)}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] whitespace-nowrap ${tone} ${
                              selected ? "bg-[#F0F7FF] font-semibold" : "font-medium"
                            }`}
                          >
                            {o.kind === "advance" ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                className="h-3.5 w-3.5 shrink-0"
                              >
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                              </svg>
                            ) : o.kind === "revert" ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                className="h-3.5 w-3.5 shrink-0"
                              >
                                <line x1="19" y1="12" x2="5" y2="12" />
                                <polyline points="12 19 5 12 12 5" />
                              </svg>
                            ) : selected ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#1570EF"
                                strokeWidth={2.5}
                                className="h-3.5 w-3.5 shrink-0"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <span className="h-3.5 w-3.5 shrink-0" />
                            )}
                            {o.label}
                          </button>
                        </Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
