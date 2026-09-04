export const ROLES = ["SUPER_ADMIN", "ADMIN", "SCANNER", "VIEWER"] as const;
export type OfficerRole = (typeof ROLES)[number];

export const MEMBER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const EVENT_ATTENDANCE_STATUSES = ["OPEN", "CLOSED"] as const;
export const ATTENDANCE_STATUSES = ["PRESENT", "LATE"] as const;

export const DEFAULT_TIME_ZONE = "Asia/Manila";
