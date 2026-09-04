import { z } from 'zod';
import { OFFICER_ROLES } from './constants';

export const bootstrapOfficerSchema = z.object({
  email: z.email(),
  password: z.string().min(12).max(128),
  fullName: z.string().min(2).max(120)
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128)
});

export const createMemberSchema = z.object({
  memberNo: z.string().min(1).max(40),
  fullName: z.string().min(2).max(160),
  position: z.string().max(100).optional().default(''),
  category: z.string().max(100).optional().default(''),
  phone: z.string().max(40).optional().default(''),
  email: z.union([z.email(), z.literal('')]).optional().default('')
});

export const updateMemberSchema = createMemberSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
});

export const createEventSchema = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(1000).optional().default(''),
  eventDate: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  lateAfter: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(1).max(80).default('Asia/Manila'),
  venue: z.string().max(200).optional().default(''),
  eventType: z.string().max(100).optional().default('')
});

export const updateEventSchema = createEventSchema.partial();

export const checkInSchema = z.object({
  qrToken: z.string().min(32).max(512),
  checkInMethod: z.enum(['QR', 'MANUAL']).default('QR')
});

export const manualCheckInSchema = z.object({
  memberId: z.string().uuid().optional(),
  memberNo: z.string().min(1).max(40).optional()
}).refine((value) => Boolean(value.memberId || value.memberNo), {
  message: 'memberId or memberNo is required'
});

export const correctionSchema = z.object({
  status: z.enum(['PRESENT', 'LATE']),
  reason: z.string().min(3).max(500)
});

export const officerRoleSchema = z.enum(OFFICER_ROLES);

export const createOfficerSchema = z.object({
  email: z.email(),
  password: z.string().min(12).max(128),
  fullName: z.string().min(2).max(120),
  role: officerRoleSchema
});

export const updateOfficerSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  role: officerRoleSchema.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });
