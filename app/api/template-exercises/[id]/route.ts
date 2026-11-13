import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templateExercises, workoutTemplates } from "@/lib/schema";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

type Ctx = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await db
    .select({ id: templateExercises.id, templateId: templateExercises.templateId })
    .from(templateExercises)
    .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.id))
    .where(and(eq(templateExercises.id, id), eq(workoutTemplates.userId, userId)));
  return row;
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await findOwned(id, session.user.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Tartibni o'zgartirish
  if (body.direction === "up" || body.direction === "down") {
    const siblings = await db
      .select({ id: templateExercises.id })
      .from(templateExercises)
      .where(eq(templateExercises.templateId, row.templateId))
      .orderBy(asc(templateExercises.position), asc(templateExercises.id));
    const order = siblings.map((s) => s.id);
    const idx = order.indexOf(id);
    const swap = body.direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swap < 0 || swap >= order.length) return NextResponse.json({ success: true });
    [order[idx], order[swap]] = [order[swap], order[idx]];
    for (let i = 0; i < order.length; i++) {
      await db.update(templateExercises).set({ position: i }).where(eq(templateExercises.id, order[i]));
    }
    return NextResponse.json({ success: true });
  }

  // Set va rep maqsadlari
  const sets = Math.round(Number(body.targetSets));
  const min = Math.round(Number(body.repsMin));
  const max = Math.round(Number(body.repsMax));
  if (
    !Number.isFinite(sets) || sets < 1 || sets > 10 ||
    !Number.isFinite(min) || min < 1 ||
    !Number.isFinite(max) || max < min || max > 100
  ) {
    return NextResponse.json({ error: "Invalid sets or reps" }, { status: 400 });
  }

  const [updated] = await db
    .update(templateExercises)
    .set({ targetSets: sets, repsMin: min, repsMax: max })
    .where(eq(templateExercises.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await findOwned(id, session.user.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(templateExercises).where(eq(templateExercises.id, id));
  return NextResponse.json({ success: true });
}