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
