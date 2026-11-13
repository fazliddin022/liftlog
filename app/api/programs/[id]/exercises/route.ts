import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutTemplates, templateExercises, exercises } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  const body = await req.json();

  const [tpl] = await db
    .select({ id: workoutTemplates.id })
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)));
  if (!tpl) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

  const [ex] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, body.exerciseId), eq(exercises.userId, userId)));
  if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  const current = await db
    .select({ exerciseId: templateExercises.exerciseId })
    .from(templateExercises)
    .where(eq(templateExercises.templateId, id));
  if (current.some((c) => c.exerciseId === ex.id))
    return NextResponse.json({ error: "Already in this workout" }, { status: 409 });

  const [row] = await db
    .insert(templateExercises)
    .values({
      templateId: id,
      exerciseId: ex.id,
      position: current.length,
      targetSets: 3,
      repsMin: 8,
      repsMax: 12,
    })
    .returning();
  return NextResponse.json(row);
}