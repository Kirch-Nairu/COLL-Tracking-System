export const OFFICER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SCANNER', 'VIEWER'] as const;
export const MEMBER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const EVENT_ATTENDANCE_STATUSES = ['OPEN', 'CLOSED'] as const;
export const ATTENDANCE_STATUSES = ['PRESENT', 'LATE'] as const;

export type OfficerRole = (typeof OFFICER_ROLES)[number];
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export type EventAttendanceStatus = (typeof EVENT_ATTENDANCE_STATUSES)[number];
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
