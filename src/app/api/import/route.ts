import { NextRequest, NextResponse } from "next/server";
import { ActivityAction, UploadStatus } from "@/generated/prisma/enums";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { statusSchema } from "@/lib/validators";

const rowSchema = z.object({ date: z.string(), account: z.string().trim().min(1), status: statusSchema, notes: z.string().optional().nullable() });
type PreparedRow = { accountId: string; accountName: string; date: Date; dateString: string; status: UploadStatus; notes: string | null; rowNumber: number };

export async function POST(request: NextRequest) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const input = z.object({ rows: z.array(z.unknown()).min(1).max(10000), commit: z.boolean().optional() }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Format impor tidak valid atau file kosong." }, { status: 400 });

  const accounts = await db.account.findMany({ select: { id: true, name: true, isActive: true } });
  const byName = new Map<string, typeof accounts>();
  for (const account of accounts) {
    const key = account.name.toLocaleLowerCase("id-ID");
    byName.set(key, [...(byName.get(key) ?? []), account]);
  }
  const rows: PreparedRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const duplicates: { row: number; message: string }[] = [];
  const seen = new Set<string>();

  input.data.rows.forEach((raw, index) => {
    const parsed = rowSchema.safeParse(raw);
    const rowNumber = index + 2;
    if (!parsed.success) {
      errors.push({ row: rowNumber, message: "Kolom atau status tidak valid; gunakan kode status yang ditentukan." });
      return;
    }
    const matches = byName.get(parsed.data.account.toLocaleLowerCase("id-ID")) ?? [];
    if (matches.length === 0) {
      errors.push({ row: rowNumber, message: `Akun '${parsed.data.account}' tidak ditemukan. Nama akun harus cocok dengan data Akun.` });
      return;
    }
    if (matches.length > 1) {
      errors.push({ row: rowNumber, message: `Nama akun '${parsed.data.account}' tidak unik; tidak dapat dipetakan secara aman.` });
      return;
    }
    const account = matches[0];
    if (!account.isActive) {
      errors.push({ row: rowNumber, message: `Akun '${account.name}' nonaktif.` });
      return;
    }
    const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== parsed.data.date) {
      errors.push({ row: rowNumber, message: "Tanggal harus valid dengan format YYYY-MM-DD." });
      return;
    }
    const key = `${account.id}:${parsed.data.date}`;
    if (seen.has(key)) {
      duplicates.push({ row: rowNumber, message: "Akun dan tanggal muncul lebih dari sekali dalam file." });
      return;
    }
    seen.add(key);
    rows.push({ accountId: account.id, accountName: account.name, date, dateString: parsed.data.date, status: parsed.data.status, notes: parsed.data.notes ?? null, rowNumber });
  });

  const existing = rows.length ? await db.dailyUpload.findMany({ where: { OR: rows.map(row => ({ accountId: row.accountId, date: row.date })) }, select: { accountId: true, date: true } }) : [];
  const existingKeys = new Set(existing.map(row => `${row.accountId}:${row.date.toISOString().slice(0, 10)}`));
  const conflicts = rows.filter(row => existingKeys.has(`${row.accountId}:${row.dateString}`)).map(row => ({ row: row.rowNumber, message: `${row.dateString} ${row.accountName}: data sudah ada.` }));
  const canImport = errors.length === 0 && duplicates.length === 0 && conflicts.length === 0;

  if (input.data.commit) {
    if (!canImport) return NextResponse.json({ error: "Impor dihentikan karena ada kesalahan atau data duplikat.", errors, duplicates, conflicts }, { status: 409 });
    await db.$transaction(async tx => {
      for (const row of rows) {
        const upload = await tx.dailyUpload.create({ data: { accountId: row.accountId, date: row.date, status: row.status, notes: row.notes, createdById: user!.id, updatedById: user!.id } });
        await tx.activityLog.create({ data: { accountId: row.accountId, dailyUploadId: upload.id, actorId: user!.id, action: ActivityAction.CREATED, newStatus: row.status, description: `Impor CSV mencatat status untuk ${row.dateString}` } });
      }
    });
    return NextResponse.json({ imported: rows.length });
  }
  return NextResponse.json({ total: input.data.rows.length, valid: rows.length, errors, duplicates, conflicts, canImport, rows: rows.map(({ accountId, dateString, status, notes }) => ({ accountId, date: dateString, status, notes })) });
}
