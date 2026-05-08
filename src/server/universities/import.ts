import * as XLSX from "xlsx";
import { db } from "~/server/db";

// Sheet names in the Master_B2B template. Anything else is ignored.
const SHEET_UNIVERSITY = "University";
const SHEET_COURSE = "Course";

// Header → DB-friendly key. Keys are case-insensitive on lookup.
const UNI_HEADERS = {
  id: "id",
  name: "name",
  city: "city",
  country: "country",
  type: "type",                // optional: "Public" | "Private" or 0/1
  ranking: "ranking",          // optional: number
  app_source: "app_source",    // optional: free text
  website: "website",
  logo_url: "logo_url",
  is_open: "is_open",
} as const;

const COURSE_HEADERS = {
  id: "id",
  name: "name",
  degree_level: "degree_level",
  duration_months: "duration_months",
  tuition_fee: "tuition_fee",
  currency: "currency",
  is_open: "is_open",
  university_id: "university_id", // also accepts university_Id from the template
  code: "code",
  url: "url",
  toefl: "toefl",
  ielts: "ielts",
  det: "det",
  is_stem: "is_stem",
  intake_month: "intake_month",
  intake_year: "intake_year",
  is_coop_available: "is_coop_available",
  has_app_fee_waiver: "has_app_fee_waiver",
  app_fee: "app_fee",
  has_tuition_deposit: "has_tuition_deposit",
  has_scholarship: "has_scholarship",
  scholarship_amount: "scholarship_amount",
  min_entry_requirements: "min_entry_requirements",
  min_entry_requirements_scale: "min_entry_requirements_scale",
  has_faster_tat: "has_faster_tat",
} as const;

export interface ImportError {
  sheet: "University" | "Course";
  row: number; // 1-indexed (header is row 1, first data row is 2)
  message: string;
}

export interface ImportSummary {
  universities: { created: number; matchedExisting: number };
  courses: { created: number; updated: number };
  errors: ImportError[];
}

type CellValue = string | number | boolean | null | undefined;
type RowMap = Record<string, CellValue>;

function normaliseHeader(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function rowsFromSheet(sheet: XLSX.WorkSheet): {
  headers: string[];
  rows: RowMap[];
} {
  const aoa = XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });
  if (aoa.length === 0) return { headers: [], rows: [] };
  const headerRow = aoa[0] ?? [];
  const headers = headerRow.map((h) =>
    h === null || h === undefined ? "" : normaliseHeader(String(h)),
  );
  const rows: RowMap[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const dataRow = aoa[i] ?? [];
    if (dataRow.every((c) => c === null || c === undefined || c === "")) continue;
    const obj: RowMap = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = dataRow[idx] ?? null;
    });
    rows.push(obj);
  }
  return { headers, rows };
}

// Robust truthy/falsy: accepts 1/0, true/false, yes/no, y/n.
function asBool(v: CellValue, fallback = false): number {
  if (v === null || v === undefined || v === "") return fallback ? 1 : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v ? 1 : 0;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "t"].includes(s)) return 1;
  if (["0", "false", "no", "n", "f"].includes(s)) return 0;
  return fallback ? 1 : 0;
}

function asString(v: CellValue, max = 255): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function asInt(v: CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : Number(String(v).trim().replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function asDecimal(v: CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : Number(String(v).trim().replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n;
}

function asCountry(v: CellValue): string | null {
  const s = asString(v, 2);
  if (!s) return null;
  return s.toUpperCase();
}

export async function parseAndImport(buffer: Buffer): Promise<ImportSummary> {
  const wb = XLSX.read(buffer, { type: "buffer" });

  const uniSheet = wb.Sheets[SHEET_UNIVERSITY];
  const courseSheet = wb.Sheets[SHEET_COURSE];

  if (!uniSheet && !courseSheet) {
    return {
      universities: { created: 0, matchedExisting: 0 },
      courses: { created: 0, updated: 0 },
      errors: [
        {
          sheet: "University",
          row: 0,
          message: `File must contain a "${SHEET_UNIVERSITY}" or "${SHEET_COURSE}" sheet.`,
        },
      ],
    };
  }

  const errors: ImportError[] = [];
  const summary: ImportSummary = {
    universities: { created: 0, matchedExisting: 0 },
    courses: { created: 0, updated: 0 },
    errors,
  };

  // xlsx_id → db_id. Built up as we process universities. When the Course
  // sheet references university_id (sheet) we translate to the DB id.
  const xlsxToDbId = new Map<number, number>();

  // ---------------- Universities ----------------
  if (uniSheet) {
    const { rows } = rowsFromSheet(uniSheet);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const rowNum = i + 2;
      const name = asString(r[UNI_HEADERS.name], 150);
      const country = asCountry(r[UNI_HEADERS.country]);
      if (!name) {
        errors.push({ sheet: "University", row: rowNum, message: "name is required" });
        continue;
      }
      if (country?.length !== 2) {
        errors.push({
          sheet: "University",
          row: rowNum,
          message: "country must be a 2-letter ISO code (e.g. US, GB, IN)",
        });
        continue;
      }

      // type accepts "Public"/"Private" (case-insensitive) or 0/1.
      const rawType = r[UNI_HEADERS.type];
      let typeCode = 0;
      if (rawType !== null && rawType !== undefined && rawType !== "") {
        if (typeof rawType === "number") {
          typeCode = rawType === 1 ? 1 : 0;
        } else {
          typeCode = String(rawType).trim().toLowerCase().startsWith("priv") ? 1 : 0;
        }
      }

      const data = {
        name,
        city: asString(r[UNI_HEADERS.city], 100),
        country,
        type: typeCode,
        ranking: asInt(r[UNI_HEADERS.ranking]),
        app_source: asString(r[UNI_HEADERS.app_source], 50),
        website: asString(r[UNI_HEADERS.website], 255),
        logo_url: asString(r[UNI_HEADERS.logo_url], 255),
        is_open: asBool(r[UNI_HEADERS.is_open], true),
      };

      // Match-or-create on (name, country). Cheap dedupe and re-import safety.
      const existing = await db.university.findFirst({
        where: { name: data.name, country: data.country },
        select: { id: true },
      });
      let dbId: number;
      if (existing) {
        await db.university.update({ where: { id: existing.id }, data });
        summary.universities.matchedExisting++;
        dbId = existing.id;
      } else {
        const created = await db.university.create({ data, select: { id: true } });
        summary.universities.created++;
        dbId = created.id;
      }

      const xlsxId = asInt(r[UNI_HEADERS.id]);
      if (xlsxId !== null) xlsxToDbId.set(xlsxId, dbId);
    }
  }

  // ---------------- Courses ----------------
  if (courseSheet) {
    const { rows } = rowsFromSheet(courseSheet);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const rowNum = i + 2;
      const name = asString(r[COURSE_HEADERS.name], 150);
      const universityXlsxId = asInt(r[COURSE_HEADERS.university_id]);

      if (!name) {
        errors.push({ sheet: "Course", row: rowNum, message: "name is required" });
        continue;
      }
      if (universityXlsxId === null) {
        errors.push({
          sheet: "Course",
          row: rowNum,
          message: "university_Id is required",
        });
        continue;
      }
      const universityId = xlsxToDbId.get(universityXlsxId);
      if (!universityId) {
        errors.push({
          sheet: "Course",
          row: rowNum,
          message: `No matching University row for university_Id=${universityXlsxId}`,
        });
        continue;
      }

      const data = {
        university_id: universityId,
        name,
        code: asString(r[COURSE_HEADERS.code], 50),
        degree_level: asInt(r[COURSE_HEADERS.degree_level]),
        duration_months: asInt(r[COURSE_HEADERS.duration_months]),
        tuition_fee: asDecimal(r[COURSE_HEADERS.tuition_fee]),
        currency: asString(r[COURSE_HEADERS.currency], 3),
        is_open: asBool(r[COURSE_HEADERS.is_open], true),
        url: asString(r[COURSE_HEADERS.url], 500),
        toefl: asDecimal(r[COURSE_HEADERS.toefl]),
        ielts: asDecimal(r[COURSE_HEADERS.ielts]),
        det: asInt(r[COURSE_HEADERS.det]),
        is_stem: asBool(r[COURSE_HEADERS.is_stem]),
        intake_month: asString(r[COURSE_HEADERS.intake_month], 50),
        intake_year: asInt(r[COURSE_HEADERS.intake_year]),
        is_coop_available: asBool(r[COURSE_HEADERS.is_coop_available]),
        has_app_fee_waiver: asBool(r[COURSE_HEADERS.has_app_fee_waiver]),
        app_fee: asDecimal(r[COURSE_HEADERS.app_fee]),
        has_tuition_deposit: asBool(r[COURSE_HEADERS.has_tuition_deposit]),
        has_scholarship: asBool(r[COURSE_HEADERS.has_scholarship]),
        scholarship_amount: asDecimal(r[COURSE_HEADERS.scholarship_amount]),
        min_entry_requirements: asString(r[COURSE_HEADERS.min_entry_requirements], 50),
        min_entry_requirements_scale: asString(
          r[COURSE_HEADERS.min_entry_requirements_scale],
          20,
        ),
        has_faster_tat: asBool(r[COURSE_HEADERS.has_faster_tat]),
      };

      // Upsert by code if present (the schema's UNIQUE), else insert.
      if (data.code) {
        const existing = await db.course.findUnique({
          where: { code: data.code },
          select: { id: true },
        });
        if (existing) {
          await db.course.update({ where: { id: existing.id }, data });
          summary.courses.updated++;
          continue;
        }
      }
      await db.course.create({ data });
      summary.courses.created++;
    }
  }

  return summary;
}
