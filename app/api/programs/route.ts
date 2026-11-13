import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutTemplates, templateExercises, exercises } from "@/lib/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const templates = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.userId, userId))
    .orderBy(asc(workoutTemplates.weekday), asc(workoutTemplates.createdAt));

  const library = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
      equipment: exercises.equipment,
    })
    .from(exercises)
    .where(eq(exercises.userId, userId))
    .orderBy(asc(exercises.name));

  const ids = templates.map((t) => t.id);
  const rows = ids.length
    ? await db
        .select({
          id: templateExercises.id,
          templateId: templateExercises.templateId,
          exerciseId: templateExercises.exerciseId,
          position: templateExercises.position,
          targetSets: templateExercises.targetSets,
          repsMin: templateExercises.repsMin,
          repsMax: templateExercises.repsMax,
          name: exercises.name,
          muscleGroup: exercises.muscleGroup,
          equipment: exercises.equipment,
        })
        .from(templateExercises)
        .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
        .where(inArray(templateExercises.templateId, ids))
        .orderBy(asc(templateExercises.position))
    : [];

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      weekday: t.weekday,
      isActive: t.isActive,
      exercises: rows.filter((r) => r.templateId === t.id),
    })),
    library,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  let weekday: number | null = null;
  if (body.weekday !== null && body.weekday !== undefined && body.weekday !== "") {
    weekday = Number(body.weekday);
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7)
      return NextResponse.json({ error: "Invalid weekday" }, { status: 400 });
  }

  const [created] = await db
    .insert(workoutTemplates)
    .values({ userId: session.user.id, name, weekday })
    .returning();
  return NextResponse.json(created);
}