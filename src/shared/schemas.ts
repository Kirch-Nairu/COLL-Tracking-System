import { z } from "zod";
import { ROLES } from "./constants";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128)
});

export const bootstrapSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(120)
});

export const memberCreateSchema = z.object({
  memberNo: z.string().trim().min(2).max(40).optional(),
  fullName: z.string().trim().min(2).max(160),
  position: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.union([z.email(), z.literal("")]).optional()
});

export const memberPatchSchema = memberCreateSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

export const eventCreateSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  eventDate: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  lateAfter: z.string().regex(/^\d{2}:\d{2}$/),
  venue: z.string().trim().max(200).optional().or(z.literal("")),
  eventType: z.string().trim().max(120).optional().or(z.literal(""))
}).refine((data) => data.lateAfter >= data.startTime, {
  message: "Late threshold cannot be earlier than event start time.",
  path: ["lateAfter"]
});

export const eventPatchSchema = eventCreateSchema.partial();

export const checkInSchema = z.object({
  qrToken: z.string().min(20).max(500)
});

export const manualCheckInSchema = z.object({
  memberId: z.uuid()
});

export const roleSchema = z.enum(ROLES);
