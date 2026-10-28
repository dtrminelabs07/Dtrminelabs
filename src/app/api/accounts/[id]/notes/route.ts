import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { accountNoteSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await context.params;
  const account = await db.account.findFirst({ where: { id, ownerId: null }, select: { id: true } });
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const notes = await db.accountNote.findMany({
    where: { accountId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, createdAt: true, updatedAt: true, author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(notes, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, context: Context) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const { id } = await context.params;
  const parsed = accountNoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Catatan harus berisi 1 sampai 4.000 karakter." }, { status: 400 });

  const account = await db.account.findFirst({ where: { id, ownerId: null }, select: { id: true } });
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  const note = await db.accountNote.create({
    data: { accountId: id, authorId: user!.id, content: parsed.data.content },
    select: { id: true, content: true, createdAt: true, updatedAt: true, author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(note, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
