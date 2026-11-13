import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutTemplates } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof workoutTemplates.$inferInsert> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    patch.name = name;
  }
  if ("weekday" in body) {
    if (body.weekday === null || body.weekday === "") {
      patch.weekday = null;
    } else {
      const w = Number(body.weekday);
      if (!Number.isInteger(w) || w < 1 || w > 7)
        return NextResponse.json({ error: "Invalid weekday" }, { status: 400 });
      patch.weekday = w;
    }
  }
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const [updated] = await db
    .update(workoutTemplates)
    .set(patch)
    .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, session.user.id)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db
    .delete(workoutTemplates)
    .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, session.user.id)));
  return NextResponse.json({ success: true });
}