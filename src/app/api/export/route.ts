import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { accountOwnerScope, requireUser } from "@/lib/auth";
import { statusSchema } from "@/lib/validators";

export const runtime = "nodejs";
const statuses = ["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"] as const;
const labels: Record<typeof statuses[number], string> = { COMPLETED: "Selesai", PENDING: "Belum", UPLOADED: "Sudah upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok habis", HOLIDAY: "Libur" };
const colors: Record<typeof statuses[number], string> = { COMPLETED: "10D6A0", PENDING: "FFC83D", UPLOADED: "20B8FF", LIMIT: "C477FF", OUT_OF_STOCK: "FF5263", HOLIDAY: "ED45DB" };
const validDay = (v: string | null) => { if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const date = new Date(`${v}T00:00:00Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v; };
function styledHeader(row: ExcelJS.Row) { row.height = 25; row.eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10243D" } }; cell.alignment = { vertical: "middle" }; cell.border = { bottom: { style: "thin", color: { argb: "FF1685FF" } } }; }); }
function columnRef(index: number) { let value = index; let label = ""; while (value > 0) { const remainder = (value - 1) % 26; label = String.fromCharCode(65 + remainder) + label; value = Math.floor((value - 1) / 26); } return label; }

export async function GET(request: NextRequest) {
  const { response, user } = await requireUser(); if (response) return response;
  const params = request.nextUrl.searchParams; const date = params.get("date"); const mode = params.get("mode") ?? "month";
  let start: Date; let end: Date; let periodName: string;
  if (date) {
    if (!validDay(date)) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    start = new Date(`${date}T00:00:00.000Z`); end = new Date(start.getTime() + 86_400_000); periodName = date;
  } else if (mode === "month") {
    const month = params.get("month"); if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: "Bulan tidak valid." }, { status: 400 });
    const [y, m] = month.split("-").map(Number); start = new Date(Date.UTC(y, m - 1, 1)); end = new Date(Date.UTC(y, m, 1)); periodName = month;
  } else if (mode === "year") {
    const y = Number(params.get("year")); if (!Number.isInteger(y) || y < 2000 || y > 2100) return NextResponse.json({ error: "Tahun tidak valid." }, { status: 400 });
    start = new Date(Date.UTC(y, 0, 1)); end = new Date(Date.UTC(y + 1, 0, 1)); periodName = String(y);
  } else if (mode === "custom") {
    const from = params.get("from"); const to = params.get("to"); if (!validDay(from) || !validDay(to) || from! > to!) return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
    start = new Date(`${from}T00:00:00Z`); end = new Date(new Date(`${to}T00:00:00Z`).getTime() + 86_400_000); if (end.getTime() - start.getTime() > 3660 * 86_400_000) return NextResponse.json({ error: "Rentang laporan maksimal 10 tahun." }, { status: 400 }); periodName = `${from}–${to}`;
  } else return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  const rawStatus = params.get("status"); const parsed = statusSchema.safeParse(rawStatus); if (rawStatus && !parsed.success) return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  const accountId = params.get("accountId") || undefined; const core = params.get("core") || undefined; const subCore = params.get("subCore") || undefined; const q = params.get("q")?.trim(); const scope = accountOwnerScope(user!);
  const account = { ...scope, ...(accountId ? { id: accountId } : {}), ...(core ? { core } : {}), ...(subCore ? { subCore } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { username: { contains: q, mode: "insensitive" as const } }, { core: { contains: q, mode: "insensitive" as const } }, { subCore: { contains: q, mode: "insensitive" as const } }] } : {}) };
  const where = { date: { gte: start, lt: end }, account, ...(parsed.success ? { status: parsed.data } : {}) };
  const total = await db.dailyUpload.count({ where }); if (total > 100_000) return NextResponse.json({ error: "Ekspor dibatasi 100.000 baris. Persempit rentang atau gunakan filter." }, { status: 413 });
  const rows = await db.dailyUpload.findMany({ where, orderBy: [{ date: "asc" }, { account: { name: "asc" } }], include: { account: { select: { id: true, name: true, username: true, core: true, subCore: true, platform: true } }, updatedBy: { select: { name: true } } } });
  if (params.get("format") !== "xlsx") {
    const quote = (value: string | null | undefined) => `"${(value ?? "").replaceAll('"', '""')}"`;
    const csv = ["date,account,username,core,sub_core,status,notes", ...rows.map(row => [row.date.toISOString().slice(0, 10), row.account.name, row.account.username, row.account.core, row.account.subCore, row.status, row.notes].map(quote).join(","))].join("\r\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dtrminelabs-${periodName}.csv"`, "Cache-Control": "no-store" } });
  }
  const workbook = new ExcelJS.Workbook(); workbook.creator = "Dtrminelabs Upload Tracker"; workbook.subject = "Laporan tracker upload"; workbook.title = `Laporan ${periodName}`; workbook.created = new Date(); workbook.modified = new Date();
  const summary = workbook.addWorksheet("Ringkasan", { views: [{ state: "frozen", ySplit: 4 }] }); summary.columns = [{ width: 32 }, { width: 24 }, { width: 24 }];
  summary.mergeCells("A1:C1"); summary.getCell("A1").value = "DTRMINELABS · UPLOAD TRACKER"; summary.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } }; summary.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF08182B" } }; summary.getRow(1).height = 34;
  summary.addRow(["Laporan", periodName]); summary.addRow(["Rentang tanggal", `${start.toISOString().slice(0, 10)} s.d. ${new Date(end.getTime() - 86_400_000).toISOString().slice(0, 10)}`]);
  summary.addRow(["Waktu ekspor", new Date().toLocaleString("id-ID")]);
  summary.addRow(["Akun tercakup", new Set(rows.map(row => row.account.id)).size]);
  summary.addRow(["Filter", [accountId ? "Akun" : "Semua akun", parsed.success ? labels[parsed.data] : "Semua status", core ?? "Semua core", subCore ?? "Semua sub-core", q ? `Pencarian: ${q}` : ""].filter(Boolean).join(" · ")]);
  summary.addRow([]); const header = summary.addRow(["Status", "Jumlah", "Persentase"]); styledHeader(header);
  const counts = Object.fromEntries(statuses.map(s => [s, 0])) as Record<typeof statuses[number], number>; for (const row of rows) counts[row.status]++;
  for (const s of statuses) { const r = summary.addRow([labels[s], counts[s], total ? counts[s] / total : 0]); r.getCell(2).numFmt = "#,##0"; r.getCell(3).numFmt = "0.0%"; r.getCell(1).font = { color: { argb: `FF${colors[s]}` }, bold: true }; }
  const processable = total - counts.HOLIDAY; summary.addRow(["Total catatan", total]); const completionRow = summary.addRow(["Tingkat selesai (libur dikecualikan)", processable ? counts.COMPLETED / processable : 0]); completionRow.getCell(2).numFmt = "0.0%";
  const details = workbook.addWorksheet("Rincian", { views: [{ state: "frozen", ySplit: 1 }] }); details.columns = [{ header: "Tanggal", key: "date", width: 14 }, { header: "Nama akun", key: "name", width: 28 }, { header: "Username", key: "username", width: 22 }, { header: "Core", key: "core", width: 20 }, { header: "Sub-core", key: "subCore", width: 20 }, { header: "Platform", key: "platform", width: 18 }, { header: "Status", key: "status", width: 20 }, { header: "Catatan", key: "notes", width: 38 }, { header: "Diubah oleh", key: "updatedBy", width: 24 }]; styledHeader(details.getRow(1));
  for (const row of rows) { const r = details.addRow({ date: row.date, name: row.account.name, username: row.account.username, core: row.account.core, subCore: row.account.subCore, platform: row.account.platform, status: labels[row.status], notes: row.notes, updatedBy: row.updatedBy.name }); r.getCell(1).numFmt = "dd mmm yyyy"; r.getCell(7).font = { bold: true, color: { argb: `FF${colors[row.status]}` } }; if (r.number % 2 === 0) r.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F7FB" } }; }); }
  details.autoFilter = { from: "A1", to: "I1" };
  if (mode === "month" && !date) {
    const [year, month] = periodName.split("-").map(Number);
    const dayCount = new Date(year, month, 0).getDate();
    const matrixAccounts = await db.account.findMany({ where: { ...account, isActive: true }, orderBy: [{ core: "asc" }, { name: "asc" }], select: { id: true, name: true } });
    const matrix = workbook.addWorksheet("Matriks", { views: [{ state: "frozen", xSplit: 1, ySplit: 1, activeCell: "B2" }] });
    matrix.columns = [{ header: "Nama Akun", key: "account", width: 30 }, ...Array.from({ length: dayCount }, (_, index) => ({ header: `${index + 1} ${new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, index + 1)))}`, key: `day${index + 1}`, width: 14 }))];
    styledHeader(matrix.getRow(1));
    const statusByAccountAndDate = new Map(rows.map(row => [`${row.accountId}:${row.date.toISOString().slice(0, 10)}`, row.status]));
    for (const accountRow of matrixAccounts) {
      const values: Record<string, string> = { account: accountRow.name };
      for (let day = 1; day <= dayCount; day++) {
        const state = statusByAccountAndDate.get(`${accountRow.id}:${`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`}`);
        values[`day${day}`] = state ? labels[state] : "";
      }
      matrix.addRow(values);
    }
    matrix.autoFilter = { from: "A1", to: `${columnRef(dayCount + 1)}1` };
    matrix.eachRow((row, rowNumber) => row.eachCell((cell, columnNumber) => {
      cell.alignment = { vertical: "middle", horizontal: columnNumber === 1 ? "left" : "center", wrapText: true };
      if (rowNumber > 1 && columnNumber > 1) {
        const label = String(cell.value ?? "");
        const state = statuses.find(candidate => labels[candidate] === label);
        if (state) { cell.font = { bold: true, color: { argb: `FF${colors[state]}` } }; cell.alignment = { vertical: "middle", horizontal: "center" }; }
      }
      if (rowNumber > 1 && rowNumber % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F7FB" } };
    }));
    matrix.eachRow(row => { row.height = 22; });
  }
  const daily = workbook.addWorksheet("Harian", { views: [{ state: "frozen", ySplit: 1 }] }); daily.columns = [{ header: "Tanggal", key: "date", width: 16 }, ...statuses.map(s => ({ header: labels[s], key: s, width: 18 })), { header: "Total", key: "total", width: 14 }]; styledHeader(daily.getRow(1));
  const byDate = new Map<string, Record<string, number>>(); for (const row of rows) { const key = row.date.toISOString().slice(0, 10); const record = byDate.get(key) ?? Object.fromEntries([...statuses, "total"].map(s => [s, 0])); record[row.status]++; record.total++; byDate.set(key, record); }
  for (const [date, record] of byDate) { const r = daily.addRow({ date: new Date(`${date}T00:00:00Z`), ...record }); r.getCell(1).numFmt = "dd mmm yyyy"; for (let i = 2; i <= r.cellCount; i++) r.getCell(i).numFmt = "#,##0"; }
  daily.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + daily.columnCount)}1` };
  for (const sheet of [summary, details, daily]) { sheet.eachRow(row => row.eachCell(cell => { cell.alignment = { ...cell.alignment, vertical: "middle", wrapText: true }; })); sheet.views = [{ state: "frozen", ySplit: sheet === summary ? 8 : 1 }]; }
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="dtrminelabs-laporan-${periodName}.xlsx"`, "Cache-Control": "no-store" } });
}
