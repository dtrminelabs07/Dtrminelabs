import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireUser } from "@/lib/auth";
import { statusSchema } from "@/lib/validators";

export const runtime = "nodejs";
const statuses = ["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"] as const;
type Status = typeof statuses[number];
const dayMs = 86_400_000;
function dayKey(date: Date) { return date.toISOString().slice(0, 10); }
function validDay(value: string | null) { if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00Z`); return Number.isFinite(date.getTime()) && dayKey(date) === value; }
function emptyCounts() { return Object.fromEntries(statuses.map(status => [status, 0])) as Record<Status, number>; }

export async function GET(request: NextRequest) {
  const { response, user } = await requireUser(); if (response) return response;
  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") ?? "month";
  let start: Date; let end: Date;
  if (mode === "month") {
    const month = params.get("month");
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: "Bulan tidak valid." }, { status: 400 });
    const [year, monthNumber] = month.split("-").map(Number); start = new Date(Date.UTC(year, monthNumber - 1, 1)); end = new Date(Date.UTC(year, monthNumber, 1));
  } else if (mode === "year") {
    const year = Number(params.get("year"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return NextResponse.json({ error: "Tahun tidak valid." }, { status: 400 });
    start = new Date(Date.UTC(year, 0, 1)); end = new Date(Date.UTC(year + 1, 0, 1));
  } else if (mode === "custom") {
    const from = params.get("from"); const to = params.get("to");
    if (!validDay(from) || !validDay(to) || from! > to!) return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
    start = new Date(`${from}T00:00:00Z`); end = new Date(new Date(`${to}T00:00:00Z`).getTime() + dayMs);
    if (end.getTime() - start.getTime() > dayMs * 3660) return NextResponse.json({ error: "Rentang laporan maksimal 10 tahun." }, { status: 400 });
  } else return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  const rawStatus = params.get("status"); const parsed = statusSchema.safeParse(rawStatus);
  if (rawStatus && !parsed.success) return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  const page = Number(params.get("page") ?? 1); if (!Number.isSafeInteger(page) || page < 1) return NextResponse.json({ error: "Halaman tidak valid." }, { status: 400 });
  const accountScope = accountOwnerScope(user!); const accountId = params.get("accountId") || undefined;
  const core = params.get("core") || undefined; const subCore = params.get("subCore") || undefined; const q = params.get("q")?.trim();
  const accountFilter = { ...accountScope, ...(accountId ? { id: accountId } : {}), ...(core ? { core } : {}), ...(subCore ? { subCore } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { username: { contains: q, mode: "insensitive" as const } }, { core: { contains: q, mode: "insensitive" as const } }, { subCore: { contains: q, mode: "insensitive" as const } }, { notes: { contains: q, mode: "insensitive" as const } }] } : {}) };
  const where = { date: { gte: start, lt: end }, account: accountFilter, ...(parsed.success ? { status: parsed.data } : {}) };
  const size = 30;
  const [rawRows, total, accounts] = await Promise.all([
    db.dailyUpload.findMany({ where, orderBy: [{ date: "desc" }, { account: { name: "asc" } }], skip: (page - 1) * size, take: size, include: { account: { select: { id: true, name: true, username: true, core: true, subCore: true, platform: true } }, updatedBy: { select: { name: true } } } }),
    db.dailyUpload.count({ where }),
    db.account.findMany({ where: accountScope, select: { id: true, name: true, core: true, subCore: true }, orderBy: [{ core: "asc" }, { name: "asc" }] })
  ]);
  // Ask PostgreSQL to aggregate by status and day so yearly views stay small even with many accounts.
  const aggregates = await db.dailyUpload.groupBy({ by: ["date", "status"], where, _count: { _all: true } });
  const counts = emptyCounts(); const buckets = new Map<string, Record<Status, number>>();
  const bucketMonthly = end.getTime() - start.getTime() > dayMs * 62;
  for (const row of aggregates) {
    counts[row.status] += row._count._all;
    const key = bucketMonthly ? dayKey(row.date).slice(0, 7) : dayKey(row.date);
    const bucket = buckets.get(key) ?? emptyCounts(); bucket[row.status] += row._count._all; buckets.set(key, bucket);
  }
  const comparisonStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  const compareRows = await db.dailyUpload.groupBy({ by: ["status"], where: { ...where, date: { gte: comparisonStart, lt: start } }, _count: { _all: true } });
  const comparison = emptyCounts(); for (const row of compareRows) comparison[row.status] = row._count._all;
  const totalPages = Math.max(1, Math.ceil(total / size));
  return NextResponse.json({ period: { start: dayKey(start), end: dayKey(new Date(end.getTime() - dayMs)) }, counts, comparison, trend: [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => ({ key, ...values })), trendUnit: bucketMonthly ? "month" : "day", rows: rawRows, total, page, pages: totalPages, accounts, categories: [...new Set(accounts.map(account => account.core))] }, { headers: { "Cache-Control": "no-store" } });
}
