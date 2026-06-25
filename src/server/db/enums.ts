export const OrganizationType = {
  AGENCY: 0,
} as const;
export type OrganizationType =
  (typeof OrganizationType)[keyof typeof OrganizationType];

export const UserType = {
  AGENCY_OWNER: 0,
  AGENCY_COUNSELLOR: 1,
  INDEPENDENT_COUNSELLOR: 2,
  ADMIN: 10,
} as const;
export type UserType = (typeof UserType)[keyof typeof UserType];

export const AdminRole = {
  SUPER_ADMIN: 0,
  FINANCE_MANAGER: 1,
  FINANCE_EXECUTIVE: 2,
  COUNSELLOR_LEAD: 3,
  COUNSELLOR: 4,
  OPERATIONS_LEAD: 5,
  OPERATIONS_EXECUTIVE: 6,
  CONTENT_MANAGER: 7,
  BDM: 8,
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export const AdminRoleLabel: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: "Super Admin",
  [AdminRole.FINANCE_MANAGER]: "Finance Manager",
  [AdminRole.FINANCE_EXECUTIVE]: "Finance Executive",
  [AdminRole.COUNSELLOR_LEAD]: "Counsellor Lead",
  [AdminRole.COUNSELLOR]: "Counsellor",
  [AdminRole.OPERATIONS_LEAD]: "Operations Lead",
  [AdminRole.OPERATIONS_EXECUTIVE]: "Operations Executive",
  [AdminRole.CONTENT_MANAGER]: "Content Manager",
  [AdminRole.BDM]: "BDM",
};

export const ADMIN_ROLE_CODES = Object.values(AdminRole) as AdminRole[];

export function isAdminRole(value: number): value is AdminRole {
  return ADMIN_ROLE_CODES.includes(value as AdminRole);
}

export const UserStatus = {
  UNDER_REVIEW: 0,
  APPROVED: 1,
  REJECTED: 2,
  INACTIVE: 3,
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const DocumentStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const ApplicationStatusLabel = {
  [UserStatus.UNDER_REVIEW]: "under_review",
  [UserStatus.APPROVED]: "approved",
  [UserStatus.REJECTED]: "rejected",
  [UserStatus.INACTIVE]: "inactive",
} as const;

export type ApplicationStatus = "under_review" | "approved" | "rejected" | "inactive";

export function statusCodeFromLabel(label: ApplicationStatus): UserStatus {
  switch (label) {
    case "under_review":
      return UserStatus.UNDER_REVIEW;
    case "approved":
      return UserStatus.APPROVED;
    case "rejected":
      return UserStatus.REJECTED;
    case "inactive":
      return UserStatus.INACTIVE;
  }
}

export function statusLabelFromCode(code: number): ApplicationStatus {
  if (code in ApplicationStatusLabel) {
    return ApplicationStatusLabel[code as UserStatus];
  }
  return "under_review";
}

const COUNSELLOR_RANGE_CODES: Record<string, number> = {
  "1 - 5": 1,
  "6 - 10": 2,
  "11 - 15": 3,
  "16 - 25": 4,
  "25+": 5,
};

const VOLUME_RANGE_CODES: Record<string, number> = {
  "1 - 25": 1,
  "26 - 50": 2,
  "51 - 100": 3,
  "101 - 250": 4,
  "250+": 5,
};

export function counsellorRangeToCode(label: string | undefined): number | null {
  if (!label) return null;
  return COUNSELLOR_RANGE_CODES[label] ?? null;
}

export function volumeRangeToCode(label: string | undefined): number | null {
  if (!label) return null;
  return VOLUME_RANGE_CODES[label] ?? null;
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

// 21-value student pipeline status. Codes are grouped in decades so the group
// is recoverable from the code alone (Math.floor(code / 10)). Labels match the
// design mocks exactly (cp-students.html statusGroups).
export const StudentStatus = {
  // Leads (group 0)
  NEW: 0,
  INTERESTED: 1,
  CONNECTED: 2,
  SHORTLISTED: 3,
  NO_INTEREST: 4,
  NO_RESPONSE: 5,
  // Pre-Application / Submission (group 1)
  BEGIN_APPLICATION: 10,
  DOCUMENT_PENDING: 11,
  APP_SUBMITTED: 12,
  APP_UNDER_REVIEW: 13,
  // Offer Stage (group 2)
  CONDITIONAL_OFFER: 20,
  UNCONDITIONAL_OFFER: 21,
  REJECTED_BY_UNIVERSITY: 22,
  // Student Decision (group 3)
  APPLICATION_WITHDRAWAL: 30,
  DECLINED_BY_STUDENT: 31,
  NOT_QUALIFIED: 32,
  // Post-Offer / Conversion (group 4)
  DEPOSIT_PAID: 40,
  VISA_SECURED: 41,
  VISA_REJECTED: 42,
  DEFERRED_TO_NEXT_INTAKE: 43,
  COURSE_CLOSED: 44,
  ENROLLED: 45,
} as const;
export type StudentStatus = (typeof StudentStatus)[keyof typeof StudentStatus];

export const StudentStatusLabel: Record<StudentStatus, string> = {
  [StudentStatus.NEW]: "New",
  [StudentStatus.INTERESTED]: "Interested",
  [StudentStatus.CONNECTED]: "Connected",
  [StudentStatus.SHORTLISTED]: "Shortlisted",
  [StudentStatus.NO_INTEREST]: "No Interest",
  [StudentStatus.NO_RESPONSE]: "No Response",
  [StudentStatus.BEGIN_APPLICATION]: "Begin Application",
  [StudentStatus.DOCUMENT_PENDING]: "Document Pending",
  [StudentStatus.APP_SUBMITTED]: "App Submitted",
  [StudentStatus.APP_UNDER_REVIEW]: "App Under Review",
  [StudentStatus.CONDITIONAL_OFFER]: "Conditional Offer Received",
  [StudentStatus.UNCONDITIONAL_OFFER]: "Unconditional Offer Received",
  [StudentStatus.REJECTED_BY_UNIVERSITY]: "Rejected by University",
  [StudentStatus.APPLICATION_WITHDRAWAL]: "Application Withdrawal",
  [StudentStatus.DECLINED_BY_STUDENT]: "Declined by Student",
  [StudentStatus.NOT_QUALIFIED]: "Not Qualified",
  [StudentStatus.DEPOSIT_PAID]: "Deposit Paid",
  [StudentStatus.VISA_SECURED]: "Visa Secured",
  [StudentStatus.VISA_REJECTED]: "Visa Rejected",
  [StudentStatus.DEFERRED_TO_NEXT_INTAKE]: "Deferred to Next Intake",
  [StudentStatus.COURSE_CLOSED]: "Course Closed",
  [StudentStatus.ENROLLED]: "Enrolled",
};

export const STUDENT_STATUS_CODES = Object.values(
  StudentStatus,
) as StudentStatus[];

// Status group = code decade. Group keys/labels match the mock's tab bar.
export const StudentStatusGroup = {
  LEADS: 0,
  PRE_APPLICATION: 1,
  OFFER: 2,
  DECISION: 3,
  POST_OFFER: 4,
} as const;
export type StudentStatusGroup =
  (typeof StudentStatusGroup)[keyof typeof StudentStatusGroup];

export const StudentStatusGroupLabel: Record<StudentStatusGroup, string> = {
  [StudentStatusGroup.LEADS]: "Leads",
  [StudentStatusGroup.PRE_APPLICATION]: "Pre-Application / Submission",
  [StudentStatusGroup.OFFER]: "Offer Stage",
  [StudentStatusGroup.DECISION]: "Student Decision",
  [StudentStatusGroup.POST_OFFER]: "Post-Offer / Conversion",
};

export function studentStatusGroup(status: number): StudentStatusGroup {
  return Math.floor(status / 10) as StudentStatusGroup;
}

// Seed data uses 1 Male / 2 Female; NULL = not provided. Options mirror the
// profile mock (cp-student-profile.html spGender).
export const Gender = {
  MALE: 1,
  FEMALE: 2,
  NON_BINARY: 3,
  PREFER_NOT_TO_SAY: 4,
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const GenderLabel: Record<Gender, string> = {
  [Gender.MALE]: "Male",
  [Gender.FEMALE]: "Female",
  [Gender.NON_BINARY]: "Non-Binary",
  [Gender.PREFER_NOT_TO_SAY]: "Prefer not to say",
};

export const GENDER_CODES = Object.values(Gender) as Gender[];

// Student-profile document slots (cp-student-profile Documents tab).
export interface StudentDocType {
  key: string;
  label: string;
  multiple: boolean;
  section: "academic" | "enrollment";
}

export const STUDENT_DOC_TYPES: StudentDocType[] = [
  { key: "sop", label: "Statement of Purpose (SOP)", multiple: false, section: "academic" },
  { key: "lor", label: "Letter of Recommendation (LOR)", multiple: true, section: "academic" },
  { key: "resume", label: "Resume / CV", multiple: false, section: "academic" },
  { key: "backlog", label: "Backlog Certificate", multiple: false, section: "academic" },
  { key: "additional", label: "Additional Documents", multiple: true, section: "academic" },
  { key: "offer_letter", label: "Offer Letter", multiple: true, section: "enrollment" },
  { key: "visa", label: "Visa Copy", multiple: false, section: "enrollment" },
  { key: "deposit_receipt", label: "Deposit Receipt", multiple: false, section: "enrollment" },
  { key: "tuition_receipt", label: "Tuition Payment Receipts", multiple: true, section: "enrollment" },
];

export const STUDENT_DOC_TYPE_KEYS = STUDENT_DOC_TYPES.map((d) => d.key);

// Task priority for student notes/tasks.
export const NotePriority = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
} as const;
export type NotePriority = (typeof NotePriority)[keyof typeof NotePriority];

export const NotePriorityLabel: Record<NotePriority, string> = {
  [NotePriority.LOW]: "Low",
  [NotePriority.MEDIUM]: "Medium",
  [NotePriority.HIGH]: "High",
};

export const NOTE_PRIORITY_CODES = Object.values(NotePriority) as NotePriority[];

// Profile mock's marital status options, in mock order.
export const MaritalStatus = {
  SINGLE: 0,
  MARRIED: 1,
  DIVORCED: 2,
  WIDOWED: 3,
  PREFER_NOT_TO_SAY: 4,
} as const;
export type MaritalStatus = (typeof MaritalStatus)[keyof typeof MaritalStatus];

export const MaritalStatusLabel: Record<MaritalStatus, string> = {
  [MaritalStatus.SINGLE]: "Single",
  [MaritalStatus.MARRIED]: "Married",
  [MaritalStatus.DIVORCED]: "Divorced",
  [MaritalStatus.WIDOWED]: "Widowed",
  [MaritalStatus.PREFER_NOT_TO_SAY]: "Prefer not to say",
};

export const MARITAL_STATUS_CODES = Object.values(
  MaritalStatus,
) as MaritalStatus[];

export const EmergencyRelationship = {
  PARENT: 0,
  SIBLING: 1,
  SPOUSE: 2,
  FRIEND: 3,
  OTHER: 4,
} as const;
export type EmergencyRelationship =
  (typeof EmergencyRelationship)[keyof typeof EmergencyRelationship];

export const EmergencyRelationshipLabel: Record<EmergencyRelationship, string> =
  {
    [EmergencyRelationship.PARENT]: "Parent",
    [EmergencyRelationship.SIBLING]: "Sibling",
    [EmergencyRelationship.SPOUSE]: "Spouse",
    [EmergencyRelationship.FRIEND]: "Friend",
    [EmergencyRelationship.OTHER]: "Other",
  };

export const EMERGENCY_RELATIONSHIP_CODES = Object.values(
  EmergencyRelationship,
) as EmergencyRelationship[];

// Academic Qualification levels (the mock's educationLevelOrder). Distinct
// from CourseLevel below — this is completed education, not intended study.
export const EducationLevel = {
  TENTH: 0,
  TWELFTH: 1,
  UG: 2,
  MASTERS: 3,
  PHD: 4,
} as const;
export type EducationLevel = (typeof EducationLevel)[keyof typeof EducationLevel];

export const EducationLevelLabel: Record<EducationLevel, string> = {
  [EducationLevel.TENTH]: "10th Grade",
  [EducationLevel.TWELFTH]: "12th Grade",
  [EducationLevel.UG]: "Undergraduate",
  [EducationLevel.MASTERS]: "Masters / MBA",
  [EducationLevel.PHD]: "PhD",
};

export const EDUCATION_LEVEL_CODES = Object.values(
  EducationLevel,
) as EducationLevel[];

// 0 Foundation … 5 PhD. Distinct from course.degree_level (which is the
// catalogue's 9-value taxonomy); this is the student's intended level.
export const CourseLevel = {
  FOUNDATION: 0,
  DIPLOMA: 1,
  UG: 2,
  PG: 3,
  MBA: 4,
  PHD: 5,
} as const;
export type CourseLevel = (typeof CourseLevel)[keyof typeof CourseLevel];

export const CourseLevelLabel: Record<CourseLevel, string> = {
  [CourseLevel.FOUNDATION]: "Foundation",
  [CourseLevel.DIPLOMA]: "Diploma",
  [CourseLevel.UG]: "UG",
  [CourseLevel.PG]: "PG",
  [CourseLevel.MBA]: "MBA",
  [CourseLevel.PHD]: "PhD",
};

export const COURSE_LEVEL_CODES = Object.values(CourseLevel) as CourseLevel[];

// Application pipeline: 0–7 are the ordinal happy-path stages; >= 20 are
// terminal/alternative outcomes (non-ordinal).
export const UniApplicationStatus = {
  BEGIN_APPLICATION: 0,
  DOCUMENTS_PENDING: 1,
  APPLICATION_SUBMITTED: 2,
  APPLICATION_UNDER_REVIEW: 3,
  CONDITIONAL_OFFER: 4,
  UNCONDITIONAL_OFFER: 5,
  DEPOSIT_PAID: 6,
  VISA_SECURED: 7,
  // Final happy-path stage: student confirmed enrolled at the university.
  // Set from the Student Placements page once visa is secured.
  ENROLLED: 8,
  REJECTED_BY_UNIVERSITY: 20,
  APPLICATION_WITHDRAWAL: 21,
  DECLINED_BY_STUDENT: 22,
  VISA_REJECTED: 23,
  DEFERRED_TO_NEXT_INTAKE: 24,
  COURSE_CLOSED: 25,
} as const;
export type UniApplicationStatus =
  (typeof UniApplicationStatus)[keyof typeof UniApplicationStatus];

export const UNI_APP_STATUS_CODES = Object.values(
  UniApplicationStatus,
) as UniApplicationStatus[];

// Application status → student pipeline status (the mock's
// STAGE_TO_TABLE_STATUS): the student's table row mirrors their
// furthest-stage application.
export const APP_TO_STUDENT_STATUS: Record<UniApplicationStatus, StudentStatus> = {
  [UniApplicationStatus.BEGIN_APPLICATION]: StudentStatus.BEGIN_APPLICATION,
  [UniApplicationStatus.DOCUMENTS_PENDING]: StudentStatus.DOCUMENT_PENDING,
  [UniApplicationStatus.APPLICATION_SUBMITTED]: StudentStatus.APP_SUBMITTED,
  [UniApplicationStatus.APPLICATION_UNDER_REVIEW]: StudentStatus.APP_UNDER_REVIEW,
  [UniApplicationStatus.CONDITIONAL_OFFER]: StudentStatus.CONDITIONAL_OFFER,
  [UniApplicationStatus.UNCONDITIONAL_OFFER]: StudentStatus.UNCONDITIONAL_OFFER,
  [UniApplicationStatus.DEPOSIT_PAID]: StudentStatus.DEPOSIT_PAID,
  [UniApplicationStatus.VISA_SECURED]: StudentStatus.VISA_SECURED,
  [UniApplicationStatus.ENROLLED]: StudentStatus.ENROLLED,
  [UniApplicationStatus.REJECTED_BY_UNIVERSITY]: StudentStatus.REJECTED_BY_UNIVERSITY,
  [UniApplicationStatus.APPLICATION_WITHDRAWAL]: StudentStatus.APPLICATION_WITHDRAWAL,
  [UniApplicationStatus.DECLINED_BY_STUDENT]: StudentStatus.DECLINED_BY_STUDENT,
  [UniApplicationStatus.VISA_REJECTED]: StudentStatus.VISA_REJECTED,
  [UniApplicationStatus.DEFERRED_TO_NEXT_INTAKE]: StudentStatus.DEFERRED_TO_NEXT_INTAKE,
  [UniApplicationStatus.COURSE_CLOSED]: StudentStatus.COURSE_CLOSED,
};

// Where the stepper shows a terminal outcome when an application has no
// stage history (e.g. seeded rows): the stage the outcome typically lands.
export const TERMINAL_FALLBACK_STAGE: Record<number, UniApplicationStatus> = {
  [UniApplicationStatus.REJECTED_BY_UNIVERSITY]:
    UniApplicationStatus.APPLICATION_UNDER_REVIEW,
  [UniApplicationStatus.APPLICATION_WITHDRAWAL]:
    UniApplicationStatus.DEPOSIT_PAID,
  [UniApplicationStatus.DECLINED_BY_STUDENT]: UniApplicationStatus.DEPOSIT_PAID,
  [UniApplicationStatus.VISA_REJECTED]: UniApplicationStatus.VISA_SECURED,
  [UniApplicationStatus.DEFERRED_TO_NEXT_INTAKE]:
    UniApplicationStatus.VISA_SECURED,
  [UniApplicationStatus.COURSE_CLOSED]: UniApplicationStatus.VISA_SECURED,
};

export const UniApplicationStatusLabel: Record<UniApplicationStatus, string> = {
  [UniApplicationStatus.BEGIN_APPLICATION]: "Begin Application",
  [UniApplicationStatus.DOCUMENTS_PENDING]: "Documents Pending",
  [UniApplicationStatus.APPLICATION_SUBMITTED]: "Application Submitted",
  [UniApplicationStatus.APPLICATION_UNDER_REVIEW]: "Application Under Review",
  [UniApplicationStatus.CONDITIONAL_OFFER]: "Conditional Offer",
  [UniApplicationStatus.UNCONDITIONAL_OFFER]: "Unconditional Offer",
  [UniApplicationStatus.DEPOSIT_PAID]: "Deposit Paid",
  [UniApplicationStatus.VISA_SECURED]: "Visa Secured",
  [UniApplicationStatus.ENROLLED]: "Enrolled",
  [UniApplicationStatus.REJECTED_BY_UNIVERSITY]: "Rejected by University",
  [UniApplicationStatus.APPLICATION_WITHDRAWAL]: "Application Withdrawal",
  [UniApplicationStatus.DECLINED_BY_STUDENT]: "Declined by Student",
  [UniApplicationStatus.VISA_REJECTED]: "Visa Rejected",
  [UniApplicationStatus.DEFERRED_TO_NEXT_INTAKE]: "Deferred to Next Intake",
  [UniApplicationStatus.COURSE_CLOSED]: "Course Closed",
};
