import { z } from "zod";
export const statusSchema = z.enum(["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"]);
const accountFields = { name: z.string().trim().min(1).max(120), username: z.string().trim().max(120).optional().nullable(), avatarUrl: z.string().url().optional().or(z.literal("")).nullable(), platform: z.string().trim().max(80).optional().nullable(), core: z.string().trim().min(1).max(80), subCore: z.string().trim().max(80).optional().nullable(), isActive: z.boolean().optional(), internalNotes: z.string().trim().max(4000).optional().nullable() };
export const accountSchema = z.object(accountFields);
export const accountCreateSchema = z.object({ ...accountFields, password: z.string().min(1).max(200) });
export const accountUpdateSchema = z.object({ ...accountFields, password: z.string().max(200).optional() }).partial();
export const accountNoteSchema = z.object({ content: z.string().trim().min(1).max(4000) });
export const trackerSchema = z.object({ accountId: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), status: statusSchema, notes: z.string().max(1000).optional().nullable() });
