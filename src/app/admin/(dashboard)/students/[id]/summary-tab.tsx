"use client";

import {
  EducationLevelLabel,
  EmergencyRelationshipLabel,
  GenderLabel,
  MaritalStatusLabel,
  STUDENT_DOC_TYPES,
  UniApplicationStatusLabel,
  type EducationLevel,
  type EmergencyRelationship,
  type Gender,
  type MaritalStatus,
} from "~/server/db/enums";
import { countryName, studentName, type AdminStudentFull } from "../lib";
import { ALL_TESTS, MONTHS } from "./profile-lib";

interface SummaryRow {
  label: string;
  value: string;
}

interface SummarySection {
  title: string;
  rows: SummaryRow[];
}

function label<T extends number>(
  map: Record<T, string>,
  code: number | null,
): string {
  if (code === null) return "";
  return (map as Record<number, string | undefined>)[code] ?? "";
}

function joinAddress(parts: Array<string | null>, country: string | null) {
  const addr = parts.filter(Boolean).join(", ");
  if (!addr) return "";
  return country ? `${addr}, ${country}` : addr;
}

function passDate(month: number | null, year: number | null): string {
  if (!month && !year) return "";
  const m = month ? (MONTHS[month - 1] ?? "") : "";
  return [m, year ? String(year) : ""].filter(Boolean).join(" ");
}

function buildSections(s: AdminStudentFull): SummarySection[] {
  const sections: SummarySection[] = [];

  sections.push({
    title: "Personal Information",
    rows: [
      {
        label: "Full Name",
        value: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
      },
      { label: "Email", value: s.email ?? "" },
      { label: "Phone", value: s.phone ?? "" },
      { label: "Date of Birth", value: s.dateOfBirth ?? "" },
      { label: "Gender", value: label<Gender>(GenderLabel, s.gender) },
      {
        label: "Marital Status",
        value: label<MaritalStatus>(MaritalStatusLabel, s.maritalStatus),
      },
      {
        label: "Mailing Address",
        value: joinAddress(
          [s.mailingAddress1, s.mailingAddress2, s.mailingCity, s.mailingState, s.mailingPostal],
          s.mailingCountry,
        ),
      },
      {
        label: "Permanent Address",
        value: joinAddress(
          [s.permanentAddress1, s.permanentAddress2, s.permanentCity, s.permanentState, s.permanentPostal],
          s.permanentCountry,
        ),
      },
    ],
  });

  sections.push({
    title: "Nationality & Passport",
    rows: [
      { label: "Nationality", value: s.nationality ? countryName(s.nationality) : "" },
      {
        label: "Dual Citizenship",
        value: s.dualCitizenship === null ? "" : s.dualCitizenship ? "Yes" : "No",
      },
      { label: "Passport Number", value: s.passportNumber ?? "" },
      { label: "Passport Expiry", value: s.passportExpiry ?? "" },
    ],
  });

  sections.push({
    title: "Emergency Contacts",
    rows:
      s.emergencyContacts.length === 0
        ? [{ label: "Emergency Contact", value: "" }]
        : s.emergencyContacts.map((c, i) => ({
            label: `Contact ${i + 1}`,
            value: [
              `${c.name} (${label<EmergencyRelationship>(EmergencyRelationshipLabel, c.relationship)})`,
              c.phone,
              c.email,
            ]
              .filter(Boolean)
              .join(" - "),
          })),
  });

  sections.push({
    title: "Academic Qualifications",
    rows:
      s.educationRows.length === 0
        ? [{ label: "Academic Entries", value: "" }]
        : s.educationRows.map((e) => ({
            label: label<EducationLevel>(
              EducationLevelLabel,
              e.level,
            ),
            value: [
              e.qualification,
              e.institution,
              e.major,
              e.score ? `Score: ${e.score}` : null,
              passDate(e.passMonth, e.passYear),
            ]
              .filter(Boolean)
              .join(" | "),
          })),
  });

  sections.push({
    title: "Work Experience",
    rows:
      s.workExperience.length === 0
        ? [{ label: "Work Experience", value: "" }]
        : s.workExperience.map((w, i) => ({
            label: `Experience ${i + 1}`,
            value: [
              w.company,
              w.jobTitle,
              w.employmentType ? `(${w.employmentType})` : null,
              w.currentlyWorking
                ? `${passDate(w.startMonth, w.startYear)} – Present`
                : `${passDate(w.startMonth, w.startYear)} – ${passDate(w.endMonth, w.endYear)}`,
            ]
              .filter(Boolean)
              .join(" - "),
          })),
  });

  const testRows: SummaryRow[] = [];
  for (const test of ALL_TESTS) {
    const attempts = s.testScores.filter((t) => t.test === test.key);
    for (const attempt of attempts) {
      const parts: string[] = [];
      for (const field of test.fields) {
        const v = attempt.scores[field.id];
        if (v !== undefined) {
          parts.push(`${field.shortLabel ?? field.label}: ${v}`);
        }
      }
      if (parts.length > 0) {
        testRows.push({
          label:
            attempts.length > 1
              ? `${test.label} (Attempt ${attempt.attempt})`
              : test.label,
          value:
            parts.join(", ") +
            (attempt.testDate ? ` — taken ${attempt.testDate}` : ""),
        });
      }
    }
  }
  sections.push({
    title: "Test Scores",
    rows: testRows.length > 0 ? testRows : [{ label: "Test Scores", value: "" }],
  });

  sections.push({
    title: "Universities Applied",
    rows:
      s.applicationCards.length === 0
        ? [{ label: "Applications", value: "" }]
        : s.applicationCards.map((a) => ({
            label: a.university,
            value: `${a.program} — ${
              (UniApplicationStatusLabel as Record<number, string | undefined>)[
                a.status
              ] ?? a.status
            }`,
          })),
  });

  sections.push({
    title: "Documents",
    rows: STUDENT_DOC_TYPES.map((dt) => {
      const files = s.documents.filter(
        (d) => d.docType === dt.key && (dt.multiple || d.isMostRecent),
      );
      return {
        label: dt.label,
        value: files.length > 0 ? `${files.length} file(s) uploaded` : "",
      };
    }),
  });

  const reportRows: SummaryRow[] = [];
  for (const test of ALL_TESTS) {
    for (let attempt = 1; attempt <= 10; attempt++) {
      const count = s.documents.filter(
        (d) => d.docType === `test_${test.key}_${attempt}`,
      ).length;
      if (count > 0) {
        reportRows.push({
          label: `${test.label} (Attempt ${attempt})`,
          value: `${count} report(s)`,
        });
      }
    }
  }
  sections.push({
    title: "Score Reports",
    rows:
      reportRows.length > 0
        ? reportRows
        : [{ label: "Score Reports", value: "" }],
  });

  return sections;
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Branded print window, lifted from the mock's downloadDocumentSummary.
function downloadSummary(s: AdminStudentFull, sections: SummarySection[]) {
  const w = window.open("", "_blank");
  if (!w) return;
  const dateStr = new Date().toLocaleDateString("en-GB");
  const body = sections
    .map(
      (sec) =>
        `<div class="sec"><div class="sec-title">${escapeHtml(sec.title)}</div><div class="grid">` +
        sec.rows
          .map(
            (r) =>
              `<div class="row"><span class="lbl">${escapeHtml(r.label)}:</span>` +
              (r.value
                ? `<span class="val">${escapeHtml(r.value)}</span>`
                : `<span class="empty">Not provided</span>`) +
              `</div>`,
          )
          .join("") +
        `</div></div>`,
    )
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Profile Summary - ${escapeHtml(studentName(s))}</title><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: "Inter", "Segoe UI", sans-serif; color: #101828; padding: 40px; max-width: 800px; margin: 0 auto; }
.header { text-align: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1570EF; }
.header h1 { font-size: 24px; color: #1570EF; margin-bottom: 4px; }
.header p { font-size: 13px; color: #667085; }
.meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; color: #344054; }
.sec { margin-top: 24px; }
.sec-title { font-size: 14px; font-weight: 700; color: #1570EF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #D1E9FF; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
.row { display: flex; align-items: baseline; gap: 8px; padding: 4px 0; }
.lbl { font-size: 12px; color: #667085; min-width: 130px; flex-shrink: 0; }
.val { font-size: 12px; font-weight: 600; color: #101828; }
.empty { font-size: 12px; color: #D0D5DD; font-style: italic; }
@media print { body { padding: 20px; } }
</style></head><body>
<div class="header"><h1>Collegepond</h1><p>Student Profile Summary</p></div>
<div class="meta"><span><strong>Student:</strong> ${escapeHtml(studentName(s))}</span><span><strong>Generated:</strong> ${dateStr}</span></div>
${body}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

export function SummaryTab({ student }: { student: AdminStudentFull }) {
  const sections = buildSections(student);

  return (
    <div className="rounded-[14px] border border-[#E4E7EC] bg-white p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-[#101828]">
          Student Profile Summary
        </h3>
        <button
          type="button"
          onClick={() => downloadSummary(student, sections)}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#1570EF] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1058c7]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      </div>

      <div className="mt-2">
        {sections.map((sec) => (
          <div key={sec.title} className="mt-6">
            <div className="mb-3 border-b-2 border-[#D1E9FF] pb-2 text-sm font-bold tracking-wide text-[#1570EF] uppercase">
              {sec.title}
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {sec.rows.map((r, i) => (
                <div key={`${r.label}-${i}`} className="flex items-baseline gap-2 py-1">
                  <span className="min-w-[130px] shrink-0 text-xs text-[#667085]">
                    {r.label}:
                  </span>
                  {r.value ? (
                    <span className="text-xs font-semibold break-words text-[#101828]">
                      {r.value}
                    </span>
                  ) : (
                    <span className="text-xs text-[#D0D5DD] italic">
                      Not provided
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
