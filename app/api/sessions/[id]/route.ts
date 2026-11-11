import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutSessions, templateExercises, exercises, sessionSets, bodyWeights } from "@/lib/schema";
import { and, asc, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

type Ctx = { params: Promise<{ id: string }> };

type Block = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  targetSets: number;
  repsMin: number;
  repsMax: number;
};

function increment(equipment: string, weight: number) {
  if (equipment === "bodyweight") return 0;
  if (equipment === "dumbbell") return weight < 10 ? 1 : 2;
  return 2.5;
}

function suggest(b: Block, sets: { weight: number; reps: number }[]) {
  const top = Math.max(...sets.map((s) => s.weight));
  const atTop = sets.filter((s) => s.weight === top);
  const hitAll = atTop.length >= b.targetSets && atTop.every((s) => s.reps >= b.repsMax);
  const inc = increment(b.equipment, top);
  if (hitAll && inc > 0) {
    return { weight: Math.round((top + inc) * 100) / 100, reason: `Hit ${b.repsMax} reps on all sets last time` };
  }
  return { weight: top, reason: `Aim for ${b.repsMax} reps on every set` };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const [ws] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tplRows = ws.templateId
    ? await db
        .select({
          exerciseId: templateExercises.exerciseId,
          targetSets: templateExercises.targetSets,
          repsMin: templateExercises.repsMin,
          repsMax: templateExercises.repsMax,
          name: exercises.name,
          muscleGroup: exercises.muscleGroup,
          equipment: exercises.equipment,
        })
        .from(templateExercises)
        .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
        .where(eq(templateExercises.templateId, ws.templateId))
        .orderBy(asc(templateExercises.position))
    : [];

  const blocks: Block[] = [...tplRows];

  const mySets = await db
    .select()
    .from(sessionSets)
    .where(eq(sessionSets.sessionId, id))
    .orderBy(asc(sessionSets.createdAt));

  // Template'dan keyin o'chirilgan mashqlar bo'lsa ham yozilgan setlar yo'qolmasin
  const known = new Set(blocks.map((b) => b.exerciseId));
  const extraIds = Array.from(new Set(mySets.map((s) => s.exerciseId))).filter((x) => !known.has(x));
  if (extraIds.length) {
    const extra = await db.select().from(exercises).where(inArray(exercises.id, extraIds));
    extra.forEach((e) =>
      blocks.push({
        exerciseId: e.id,
        name: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        targetSets: 3,
        repsMin: 8,
        repsMax: 12,
      })
    );
  }

  // O'tgan safargi natijalar
  const exIds = blocks.map((b) => b.exerciseId);
  const prev = exIds.length
    ? await db
        .select({
          exerciseId: sessionSets.exerciseId,
          sessionId: sessionSets.sessionId,
          weight: sessionSets.weight,
          reps: sessionSets.reps,
          isWarmup: sessionSets.isWarmup,
          startedAt: workoutSessions.startedAt,
        })
        .from(sessionSets)
        .innerJoin(workoutSessions, eq(sessionSets.sessionId, workoutSessions.id))
        .where(
          and(
            eq(workoutSessions.userId, userId),
            ne(workoutSessions.id, id),
            isNotNull(workoutSessions.finishedAt),
            inArray(sessionSets.exerciseId, exIds)
          )
        )
        .orderBy(desc(workoutSessions.startedAt), asc(sessionSets.setNumber))
        .limit(800)
    : [];

  const lastByEx = new Map<string, { sessionId: string; date: Date; sets: { weight: number; reps: number }[] }>();
  for (const row of prev) {
    if (row.isWarmup) continue;
    const cur = lastByEx.get(row.exerciseId);
    if (!cur) {
      lastByEx.set(row.exerciseId, {
        sessionId: row.sessionId,
        date: row.startedAt,
        sets: [{ weight: row.weight, reps: row.reps }],
      });
    } else if (cur.sessionId === row.sessionId) {
      cur.sets.push({ weight: row.weight, reps: row.reps });
    }
  }

  const result = blocks.map((x) => {
    const last = lastByEx.get(x.exerciseId);
    const sets = mySets
      .filter((s) => s.exerciseId === x.exerciseId)
      .sort((a, c) => a.setNumber - c.setNumber)
      .map((s) => ({ id: s.id, setNumber: s.setNumber, weight: s.weight, reps: s.reps, isWarmup: s.isWarmup }));
    return {
      ...x,
      last: last ? { date: last.date.toISOString(), sets: last.sets } : null,
      suggestion: last ? suggest(x, last.sets) : null,
      sets,
    };
  });

  return NextResponse.json({
    session: {
      id: ws.id,
      name: ws.name,
      startedAt: ws.startedAt,
      finishedAt: ws.finishedAt,
      notes: ws.notes,
      bodyWeight: ws.bodyWeight,
    },
    exercises: result,
  });
}

// Mashg'ulotni yakunlash
export async function PUT(req: NextRequest, { params }: Ctx) {
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
  const raw = body.bodyWeight;
  const parsed = raw === "" || raw == null ? null : Number(raw);
  const bw = parsed !== null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  const [updated] = await db
    .update(workoutSessions)
    .set({
      finishedAt: ws.finishedAt ?? new Date(),
      notes: body.notes ? String(body.notes) : null,
      bodyWeight: bw,
    })
    .where(eq(workoutSessions.id, id))
    .returning();

  if (bw !== null && bw !== ws.bodyWeight) {
    await db.insert(bodyWeights).values({ userId, weight: bw });
  }

  return NextResponse.json(updated);
}

// Mashg'ulotni bekor qilish
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db
    .delete(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, session.user.id)));
  return NextResponse.json({ success: true });
}