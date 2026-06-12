// Option lists and form config for the student profile tabs, lifted from
// the design mock (temp-static/cp-student-profile.html).

import {
  EducationLevel,
  EducationLevelLabel,
  EMERGENCY_RELATIONSHIP_CODES,
  EmergencyRelationshipLabel,
  MARITAL_STATUS_CODES,
  MaritalStatusLabel,
} from "~/server/db/enums";

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const MONTH_OPTIONS = MONTHS.map((m, i) => ({
  value: String(i + 1),
  label: m,
}));

export function yearOptions(from: number, to: number) {
  const out: Array<{ value: string; label: string }> = [];
  for (let y = to; y >= from; y--) out.push({ value: String(y), label: String(y) });
  return out;
}

export const MARITAL_STATUS_OPTIONS = MARITAL_STATUS_CODES.map((code) => ({
  value: String(code),
  label: MaritalStatusLabel[code],
}));

export const RELATIONSHIP_OPTIONS = EMERGENCY_RELATIONSHIP_CODES.map((code) => ({
  value: String(code),
  label: EmergencyRelationshipLabel[code],
}));

// Postal-address countries (mock's mailing/permanent country select).
export const ADDRESS_COUNTRIES = [
  "India",
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Ireland",
  "New Zealand",
  "Singapore",
  "UAE",
  "Nepal",
  "Sri Lanka",
  "Bangladesh",
  "Nigeria",
];

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

// ---------------------------------------------------------------------------
// Academic Qualification (mock's educationLevelOrder / boardOptions / …)
// ---------------------------------------------------------------------------

// Highest → lowest render order comes from reversing this.
export const EDUCATION_LEVEL_ORDER = [
  EducationLevel.TENTH,
  EducationLevel.TWELFTH,
  EducationLevel.UG,
  EducationLevel.MASTERS,
  EducationLevel.PHD,
] as const;

export const EDUCATION_LEVEL_OPTIONS = EDUCATION_LEVEL_ORDER.map((code) => ({
  value: String(code),
  label: EducationLevelLabel[code],
}));

export const isHigherLevel = (level: number) =>
  level === EducationLevel.UG ||
  level === EducationLevel.MASTERS ||
  level === EducationLevel.PHD;

export const BOARD_OPTIONS: Record<number, string[]> = {
  [EducationLevel.TENTH]: [
    "State Board",
    "CBSE",
    "ICSE",
    "IGCSE",
    "MYP",
    "US High School Diploma",
  ],
  [EducationLevel.TWELFTH]: [
    "State Board",
    "CBSE",
    "ISC",
    "A Levels",
    "International Baccalaureate",
    "US High School Diploma",
  ],
  [EducationLevel.UG]: [
    "Bachelor of Arts (BA)",
    "Bachelor of Science (BSc)",
    "Bachelor of Engineering (BE/BTech)",
    "Bachelor of Commerce (BCom)",
    "Bachelor of Business Administration (BBA)",
    "Bachelor of Computer Applications (BCA)",
    "Bachelor of Design (BDes)",
    "Bachelor of Architecture (BArch)",
    "Bachelor of Law (LLB)",
    "Bachelor of Pharmacy (BPharm)",
    "Bachelor of Nursing (BN)",
    "Other Bachelor's Degree",
  ],
  [EducationLevel.MASTERS]: [
    "Master of Arts (MA)",
    "Master of Science (MSc)",
    "Master of Engineering (ME/MTech)",
    "Master of Commerce (MCom)",
    "Master of Business Administration (MBA)",
    "Master of Computer Applications (MCA)",
    "Master of Law (LLM)",
    "Master of Public Health (MPH)",
    "Master of Design (MDes)",
    "Master of Social Work (MSW)",
    "Other Master's Degree",
  ],
  [EducationLevel.PHD]: [
    "Doctor of Philosophy (PhD)",
    "Doctor of Science (DSc)",
    "Doctor of Engineering (DEng)",
    "Doctor of Business Administration (DBA)",
    "Doctor of Education (EdD)",
    "Doctor of Medicine (MD)",
    "Other Doctorate",
  ],
};

export const GRADING_SYSTEM_OPTIONS = ["Percentage", "GPA", "Letter Grade"];

export const SCALE_OPTIONS = [
  "0 – 100%",
  "0 – 4.0 (US GPA)",
  "0 – 10 (India CGPA)",
  "0 – 7.0 (Australia GPA)",
  "0 – 4.0 (Canada GPA)",
  "Class I / II-1 / II-2 / III (UK Honours)",
  "A* – E (UK A-Level)",
  "A* – G (Cambridge)",
  "1 – 45 (IB Diploma)",
  "1 – 7 (IB MYP)",
  "Other",
];

// School-board picks auto-fill grading system + scale.
export const SCALE_BY_BOARD: Record<string, { system: string; scale: string }> =
  {
    CBSE: { system: "Percentage", scale: "0 – 100%" },
    ICSE: { system: "Percentage", scale: "0 – 100%" },
    ISC: { system: "Percentage", scale: "0 – 100%" },
    "State Board": { system: "Percentage", scale: "0 – 100%" },
    IGCSE: { system: "Letter Grade", scale: "A* – G (Cambridge)" },
    MYP: { system: "GPA", scale: "1 – 7 (IB MYP)" },
    "A Levels": { system: "Letter Grade", scale: "A* – E (UK A-Level)" },
    "International Baccalaureate": { system: "GPA", scale: "1 – 45 (IB Diploma)" },
    "US High School Diploma": { system: "GPA", scale: "0 – 4.0 (US GPA)" },
  };

// School boards auto-fill the qualification; higher degrees mirror the type.
export const QUALIFICATION_BY_BOARD: Record<number, Record<string, string>> = {
  [EducationLevel.TENTH]: {
    CBSE: "AISSE",
    ICSE: "ICSE Certificate",
    "State Board": "SSC / SSLC",
    IGCSE: "IGCSE Certificate",
    MYP: "MYP Certificate",
    "US High School Diploma": "High School Diploma (Grade 10)",
  },
  [EducationLevel.TWELFTH]: {
    CBSE: "AISSCE",
    ISC: "ISC Certificate",
    "State Board": "HSC",
    "A Levels": "A Level Certificate",
    "International Baccalaureate": "IB Diploma",
    "US High School Diploma": "High School Diploma",
  },
};

export function autoQualification(level: number, board: string): string {
  if (isHigherLevel(level)) return board;
  return QUALIFICATION_BY_BOARD[level]?.[board] ?? "";
}

export const MAJOR_OPTIONS: Record<number, string[]> = {
  [EducationLevel.UG]: [
    "Computer Science", "Information Technology", "Mechanical Engineering",
    "Electrical Engineering", "Civil Engineering", "Electronics & Communication",
    "Chemical Engineering", "Biotechnology", "Mathematics", "Physics",
    "Chemistry", "Biology", "Economics", "Finance", "Accounting", "Marketing",
    "Human Resources", "Business Analytics", "Data Science", "Psychology",
    "Sociology", "English Literature", "Political Science", "History",
    "Philosophy", "Journalism", "Design", "Architecture", "Pharmacy",
    "Nursing", "Law", "Commerce", "Agriculture", "Environmental Science",
    "Other",
  ],
  [EducationLevel.MASTERS]: [
    "Computer Science", "Information Technology", "Data Science",
    "Artificial Intelligence", "Machine Learning", "Cybersecurity",
    "Software Engineering", "Mechanical Engineering", "Electrical Engineering",
    "Civil Engineering", "Chemical Engineering", "Biotechnology",
    "MBA - Finance", "MBA - Marketing", "MBA - Strategy", "MBA - Operations",
    "MBA - HR", "MBA - Analytics", "MBA - General Management", "Economics",
    "Finance", "Accounting", "Public Health", "Psychology", "Sociology",
    "Education", "Law (LLM)", "Design", "Architecture", "Environmental Science",
    "Biomedical Engineering", "Public Policy", "International Relations",
    "Media & Communication", "Other",
  ],
  [EducationLevel.PHD]: [
    "Computer Science", "Data Science", "Artificial Intelligence",
    "Mechanical Engineering", "Electrical Engineering", "Civil Engineering",
    "Chemical Engineering", "Biotechnology", "Physics", "Chemistry",
    "Mathematics", "Economics", "Finance", "Management", "Psychology",
    "Sociology", "Education", "Public Health", "Law", "Environmental Science",
    "Biomedical Engineering", "Philosophy", "Political Science", "Other",
  ],
};

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export const EDUCATION_COUNTRIES = [
  "India",
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Germany",
  "Other",
];

export const INSTRUCTION_LANGUAGES = [
  "English",
  "Hindi",
  "Regional Language",
  "Other",
];

// ---------------------------------------------------------------------------
// Work Experience
// ---------------------------------------------------------------------------

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Internship",
  "Contract",
  "Freelance",
];

export const INDUSTRY_OPTIONS = [
  { value: "Technology", label: "Technology" },
  { value: "Finance", label: "Finance & Banking" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Education", label: "Education" },
  { value: "Consulting", label: "Consulting" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Retail", label: "Retail" },
  { value: "Media", label: "Media & Entertainment" },
  { value: "Government", label: "Government" },
  { value: "Other", label: "Other" },
];

export const WORK_COUNTRIES = [
  "India",
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Germany",
  "UAE",
  "Other",
];

// ---------------------------------------------------------------------------
// Tests (mock's standardizedTests / englishTests)
// ---------------------------------------------------------------------------

export interface TestField {
  id: string;
  label: string;
  shortLabel?: string;
  min: number;
  max: number;
  step?: number;
}

export interface TestDef {
  key: string;
  label: string;
  fields: TestField[];
  validate?: (v: Record<string, number | undefined>) => string | null;
}

export const STANDARDIZED_TESTS: TestDef[] = [
  {
    key: "GRE",
    label: "GRE",
    fields: [
      { id: "verbal", label: "Verbal", min: 130, max: 170 },
      { id: "quant", label: "Quantitative", min: 130, max: 170 },
      { id: "aw", label: "Analytical Writing", min: 0, max: 6, step: 0.5 },
      { id: "total", label: "Total", min: 260, max: 340 },
    ],
    validate: (v) => {
      if (v.verbal !== undefined && v.quant !== undefined && v.total !== undefined) {
        const sum = v.verbal + v.quant;
        if (v.total !== sum) {
          return `Total must equal Verbal + Quantitative (${sum})`;
        }
      }
      return null;
    },
  },
  {
    key: "GMAT",
    label: "GMAT",
    fields: [
      { id: "verbal", label: "Verbal", min: 6, max: 51 },
      { id: "quant", label: "Quantitative", min: 6, max: 51 },
      { id: "ir", label: "Integrated Reasoning", shortLabel: "IR", min: 1, max: 8 },
      { id: "awa", label: "AWA", min: 0, max: 6, step: 0.5 },
      { id: "total", label: "Total", min: 200, max: 800 },
    ],
  },
  {
    key: "GMAT_Focus",
    label: "GMAT Focus Edition",
    fields: [
      { id: "verbal", label: "Verbal Reasoning", min: 60, max: 90 },
      { id: "quant", label: "Quantitative Reasoning", min: 60, max: 90 },
      { id: "di", label: "Data Insights", min: 60, max: 90 },
      { id: "total", label: "Total Score", min: 205, max: 805 },
    ],
  },
  {
    key: "SAT",
    label: "SAT",
    fields: [
      { id: "rw", label: "Reading & Writing", min: 200, max: 800 },
      { id: "math", label: "Math", min: 200, max: 800 },
      { id: "total", label: "Total", min: 400, max: 1600 },
    ],
    validate: (v) => {
      if (v.rw !== undefined && v.math !== undefined && v.total !== undefined) {
        const sum = v.rw + v.math;
        if (v.total !== sum) {
          return `Total must equal Reading & Writing + Math (${sum})`;
        }
      }
      return null;
    },
  },
  {
    key: "ACT",
    label: "ACT",
    fields: [
      { id: "english", label: "English", min: 1, max: 36 },
      { id: "math", label: "Math", min: 1, max: 36 },
      { id: "reading", label: "Reading", min: 1, max: 36 },
      { id: "science", label: "Science", min: 1, max: 36 },
      { id: "composite", label: "Composite", min: 1, max: 36 },
    ],
  },
];

export const ENGLISH_TESTS: TestDef[] = [
  {
    key: "IELTS",
    label: "IELTS",
    fields: [
      { id: "listening", label: "Listening", min: 0, max: 9, step: 0.5 },
      { id: "reading", label: "Reading", min: 0, max: 9, step: 0.5 },
      { id: "writing", label: "Writing", min: 0, max: 9, step: 0.5 },
      { id: "speaking", label: "Speaking", min: 0, max: 9, step: 0.5 },
      { id: "overall", label: "Overall Band", min: 0, max: 9, step: 0.5 },
    ],
  },
  {
    key: "TOEFL",
    label: "TOEFL iBT",
    fields: [
      { id: "reading", label: "Reading", min: 0, max: 30 },
      { id: "listening", label: "Listening", min: 0, max: 30 },
      { id: "speaking", label: "Speaking", min: 0, max: 30 },
      { id: "writing", label: "Writing", min: 0, max: 30 },
      { id: "total", label: "Total", min: 0, max: 120 },
    ],
    validate: (v) => {
      if (
        v.reading !== undefined &&
        v.listening !== undefined &&
        v.speaking !== undefined &&
        v.writing !== undefined &&
        v.total !== undefined
      ) {
        const sum = v.reading + v.listening + v.speaking + v.writing;
        if (v.total !== sum) return `Total must equal R+L+S+W (${sum})`;
      }
      return null;
    },
  },
  {
    key: "TOEFL2026",
    label: "TOEFL 2026 Edition",
    fields: [
      { id: "reading", label: "Reading", min: 1, max: 6, step: 0.5 },
      { id: "listening", label: "Listening", min: 1, max: 6, step: 0.5 },
      { id: "speaking", label: "Speaking", min: 1, max: 6, step: 0.5 },
      { id: "writing", label: "Writing", min: 1, max: 6, step: 0.5 },
      { id: "overall", label: "Overall Band", min: 1, max: 6, step: 0.5 },
    ],
    validate: (v) => {
      if (
        v.reading !== undefined &&
        v.listening !== undefined &&
        v.speaking !== undefined &&
        v.writing !== undefined &&
        v.overall !== undefined
      ) {
        const avg = (v.reading + v.listening + v.speaking + v.writing) / 4;
        const rounded = Math.round(avg * 2) / 2;
        if (v.overall !== rounded) {
          return `Overall Band should be the average of R+L+S+W (${rounded.toFixed(1)})`;
        }
      }
      return null;
    },
  },
  {
    key: "PTE",
    label: "PTE Academic",
    fields: [
      { id: "listening", label: "Listening", min: 10, max: 90 },
      { id: "reading", label: "Reading", min: 10, max: 90 },
      { id: "speaking", label: "Speaking", min: 10, max: 90 },
      { id: "writing", label: "Writing", min: 10, max: 90 },
      { id: "overall", label: "Overall", min: 10, max: 90 },
    ],
  },
  {
    key: "Duolingo",
    label: "Duolingo English Test",
    fields: [
      { id: "overall", label: "Overall", min: 10, max: 160 },
      { id: "literacy", label: "Literacy", min: 10, max: 160 },
      { id: "comprehension", label: "Comprehension", min: 10, max: 160 },
      { id: "conversation", label: "Conversation", min: 10, max: 160 },
      { id: "production", label: "Production", min: 10, max: 160 },
    ],
  },
];

export const ALL_TESTS = [...STANDARDIZED_TESTS, ...ENGLISH_TESTS];

// ---------------------------------------------------------------------------
// In-form document uploads (Academic sections / Test attempts)
// ---------------------------------------------------------------------------

export const EDU_LEVEL_SLUG: Record<number, string> = {
  [EducationLevel.TENTH]: "10th",
  [EducationLevel.TWELFTH]: "12th",
  [EducationLevel.UG]: "ug",
  [EducationLevel.MASTERS]: "masters",
  [EducationLevel.PHD]: "phd",
};

export interface EduDocCategory {
  key: string;
  name: string;
  hint: string;
}

// Mock's per-level docCategories (buildEducationSection).
export function eduDocCategories(level: number): EduDocCategory[] {
  const cats: EduDocCategory[] = [
    {
      key: "transcript",
      name: "Transcript",
      hint: "Upload all transcript pages. Multiple files allowed.",
    },
  ];
  if (level === EducationLevel.TWELFTH) {
    cats.push({
      key: "predicted",
      name: "Predicted Scores",
      hint: "Upload predicted score sheet if available.",
    });
  }
  cats.push({
    key: "provisional",
    name: "Provisional Certificate",
    hint: "Upload provisional certificate if degree is pending.",
  });
  if (level === EducationLevel.UG || level === EducationLevel.MASTERS) {
    cats.push({
      key: "backlog",
      name: "Backlog Certificate",
      hint: "Upload backlog certificate if applicable.",
    });
  }
  cats.push(
    {
      key: "degree",
      name: "Degree Certificate",
      hint: "Upload final degree certificate.",
    },
    {
      key: "other",
      name: "Other Documents",
      hint: "Any additional supporting documents.",
    },
  );
  return cats;
}

export const eduDocType = (level: number, category: string) =>
  `edu_${EDU_LEVEL_SLUG[level]}_${category}`;

export const testDocType = (testKey: string, attempt: number) =>
  `test_${testKey}_${attempt}`;

// Empty string → null for optional text fields heading to the API.
export function strOrNull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}
