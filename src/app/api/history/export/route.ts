import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { accountOwnerScope, requireUser } from "@/lib/auth";
import { statusSchema } from "@/lib/validators";

export const runtime = "nodejs";
function validDay(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const { response, user } = await requireUser(); if (response) return response;
  const params = request.nextUrl.searchParams;
  const from = params.get("from"); const to = params.get("to");
  if ((from && !validDay(from)) || (to && !validDay(to)) || (from && to && from > to)) return NextResponse.json({ error: "Rentang tanggal riwayat tidak valid." }, { status: 400 });
  const rawStatus = params.get("status"); const parsedStatus = statusSchema.safeParse(rawStatus);
  if (rawStatus && !parsedStatus.success) return NextResponse.json({ error: "Filter status tidak valid." }, { status: 400 });
  const accountId = params.get("accountId") || undefined; const actorId = params.get("actorId") || undefined; const query = params.get("q")?.trim();
  const where = {
    account: accountOwnerScope(user!),
    ...(accountId ? { accountId } : {}),
    ...(actorId ? { actorId } : {}),
    ...(parsedStatus.success ? { newStatus: parsedStatus.data } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}), ...(to ? { lt: new Date(new Date(to + "T00:00:00.000Z").getTime() + 86_400_000) } : {}) } } : {}),
    ...(query ? { OR: [{ account: { name: { contains: query, mode: "insensitive" as const } } }, { actor: { name: { contains: query, mode: "insensitive" as const } } }, { description: { contains: query, mode: "insensitive" as const } }] } : {})
  };
  const total = await db.activityLog.count({ where });
  if (total > 100_000) return NextResponse.json({ error: "Ekspor dibatasi 100.000 aktivitas. Persempit rentang atau gunakan filter." }, { status: 413 });
  const rows = await db.activityLog.findMany({ where, orderBy: { createdAt: "asc" }, include: { account: { select: { name: true } }, actor: { select: { name: true } }, dailyUpload: { select: { date: true, notes: true } } } });
  const book = new ExcelJS.Workbook(); book.creator = "Dtrminelabs Upload Tracker"; book.subject = "Riwayat aktivitas"; book.created = new Date();
  const summary = book.addWorksheet("Ringkasan"); summary.columns = [{ width: 30 }, { width: 42 }];
  summary.mergeCells("A1:B1"); summary.getCell("A1").value = "DTRMINELABS · RIWAYAT"; summary.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } }; summary.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF08182B" } }; summary.getRow(1).height = 32;
  summary.addRow(["Waktu ekspor", new Date().toLocaleString("id-ID")]); summary.addRow(["Rentang waktu", (from || "Semua waktu") + " s.d. " + (to || "Sekarang")]); summary.addRow(["Jumlah aktivitas", total]); summary.addRow(["Filter status", parsedStatus.success ? parsedStatus.data : "Semua status"]); summary.addRow(["Akun", accountId || "Semua akun"]); summary.addRow(["Pengguna", actorId || "Semua pengguna"]);
  const sheet = book.addWorksheet("Detail Riwayat", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [{ header: "Waktu perubahan", key: "createdAt", width: 23 }, { header: "Akun", key: "account", width: 28 }, { header: "Tanggal tracker", key: "affectedDate", width: 16 }, { header: "Status sebelumnya", key: "previous", width: 21 }, { header: "Status baru", key: "next", width: 21 }, { header: "Aktivitas", key: "description", width: 54 }, { header: "Pengguna", key: "actor", width: 24 }, { header: "Catatan tracker", key: "notes", width: 38 }];
  sheet.getRow(1).height = 25; sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10243D" } }; cell.alignment = { vertical: "middle" }; });
  for (const row of rows) { const added = sheet.addRow({ createdAt: row.createdAt, account: row.account.name, affectedDate: row.dailyUpload?.date, previous: row.previousStatus ?? "—", next: row.newStatus ?? "—", description: row.description, actor: row.actor.name, notes: row.dailyUpload?.notes ?? "" }); added.getCell(1).numFmt = "dd mmm yyyy hh:mm"; }
  sheet.autoFilter = { from: "A1", to: "H1" };
  for (const item of [summary, sheet]) item.eachRow(row => row.eachCell(cell => { cell.alignment = { ...cell.alignment, vertical: "middle", wrapText: true }; }));
  const buffer = await book.xlsx.writeBuffer();
  const filename = "dtrminelabs-riwayat-" + (from || "awal") + "-" + (to || "sekarang") + ".xlsx";
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=\"" + filename + "\"", "Cache-Control": "no-store" } });
}
