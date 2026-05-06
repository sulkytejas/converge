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
