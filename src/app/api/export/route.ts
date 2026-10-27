import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;
  const month = request.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: "Bulan tidak valid." }, { status: 400 });
  const [year, monthNumber] = month.split("-").map(Number);
  const rows = await db.dailyUpload.findMany({
    where: { date: { gte: new Date(Date.UTC(year, monthNumber - 1, 1)), lt: new Date(Date.UTC(year, monthNumber, 1)) } },
    include: { account: { select: { name: true, username: true, core: true, subCore: true } } },
    orderBy: [{ date: "asc" }, { account: { name: "asc" } }]
  });
  const quote = (value: string | null | undefined) => `"${(value ?? "").replaceAll('"', '""')}"`;
  const csv = ["date,account,username,core,sub_core,status,notes", ...rows.map(row => [row.date.toISOString().slice(0, 10), row.account.name, row.account.username, row.account.core, row.account.subCore, row.status, row.notes].map(quote).join(","))].join("\r\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dtrminelabs-${month}.csv"`, "Cache-Control": "no-store" } });
}
