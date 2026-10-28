import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { accountNoteSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id, noteId } = await context.params;
  const parsed = accountNoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Catatan harus berisi 1 sampai 4.000 karakter." }, { status: 400 });
  const result = await db.accountNote.updateMany({ where: { id: noteId, accountId: id, account: { ownerId: null } }, data: { content: parsed.data.content } });
  if (!result.count) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
  const note = await db.accountNote.findUnique({ where: { id: noteId }, select: { id: true, content: true, createdAt: true, updatedAt: true, author: { select: { id: true, name: true } } } });
  return NextResponse.json(note, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id, noteId } = await context.params;
  const result = await db.accountNote.deleteMany({ where: { id: noteId, accountId: id, account: { ownerId: null } } });
  if (!result.count) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
