import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutSessions, sessionSets, exercises } from "@/lib/schema";
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

  const [ws] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const weight = Number(body.weight);
  const reps = Math.round(Number(body.reps));
  if (!body.exerciseId || !Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) {
    return NextResponse.json({ error: "Invalid weight or reps" }, { status: 400 });
  }

  const [ex] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, body.exerciseId), eq(exercises.userId, userId)));
  if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  const existing = await db
    .select({ id: sessionSets.id })
    .from(sessionSets)
    .where(and(eq(sessionSets.sessionId, id), eq(sessionSets.exerciseId, body.exerciseId)));

  const [row] = await db
    .insert(sessionSets)
    .values({
      sessionId: id,
      exerciseId: body.exerciseId,
      setNumber: existing.length + 1,
      weight,
      reps,
      isWarmup: !!body.isWarmup,
    })
    .returning();

  return NextResponse.json(row);
}