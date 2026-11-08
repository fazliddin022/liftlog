import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users, exercises, workoutTemplates, templateExercises,
  workoutSessions, sessionSets, bodyWeights,
} from "@/lib/schema";
import type { Exercise } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

type Ex = {
  key: string;
  name: string;
  muscle: Exercise["muscleGroup"];
  equipment: Exercise["equipment"];
  base: number; // boshlang'ich og'irlik (kg)
  step: number; // har 2 haftada qo'shiladigan og'irlik
};

const EXERCISES: Ex[] = [
  { key: "chestPress", name: "Chest Press Machine", muscle: "chest", equipment: "machine", base: 30, step: 2.5 },
  { key: "inclinePress", name: "Incline Chest Press Machine", muscle: "chest", equipment: "machine", base: 25, step: 2.5 },
  { key: "pecDeck", name: "Pec Deck (Fly)", muscle: "chest", equipment: "machine", base: 25, step: 2.5 },
  { key: "pushdown", name: "Triceps Pushdown", muscle: "triceps", equipment: "cable", base: 20, step: 2.5 },
  { key: "overheadTri", name: "Overhead Triceps Extension", muscle: "triceps", equipment: "cable", base: 15, step: 2.5 },
  { key: "latPulldown", name: "Lat Pulldown", muscle: "back", equipment: "cable", base: 35, step: 2.5 },
  { key: "seatedRow", name: "Seated Cable Row", muscle: "back", equipment: "cable", base: 35, step: 2.5 },
  { key: "bicepsCurl", name: "Biceps Curl Machine", muscle: "biceps", equipment: "machine", base: 15, step: 2.5 },
  { key: "hammerCurl", name: "Hammer Curl", muscle: "biceps", equipment: "dumbbell", base: 8, step: 1 },
  { key: "shoulderPress", name: "Shoulder Press Machine", muscle: "shoulders", equipment: "machine", base: 20, step: 2.5 },
  { key: "lateralRaise", name: "Lateral Raise", muscle: "shoulders", equipment: "dumbbell", base: 6, step: 1 },
  { key: "rearDelt", name: "Rear Delt Fly Machine", muscle: "shoulders", equipment: "machine", base: 15, step: 2.5 },
  { key: "legPress", name: "Leg Press", muscle: "legs", equipment: "machine", base: 60, step: 5 },
  { key: "legCurl", name: "Seated Leg Curl", muscle: "legs", equipment: "machine", base: 25, step: 2.5 },
  { key: "calfRaise", name: "Calf Raise Machine", muscle: "legs", equipment: "machine", base: 30, step: 2.5 },
];

type Item = { ex: string; sets: number; min: number; max: number };

const PROGRAM: { name: string; weekday: number; items: Item[] }[] = [
  {
    name: "Chest & Triceps",
    weekday: 1,
    items: [
      { ex: "chestPress", sets: 3, min: 8, max: 12 },
      { ex: "inclinePress", sets: 3, min: 8, max: 12 },
      { ex: "pecDeck", sets: 3, min: 10, max: 15 },
      { ex: "pushdown", sets: 3, min: 10, max: 15 },
      { ex: "overheadTri", sets: 2, min: 10, max: 15 },
    ],
  },
  {
    name: "Back & Biceps",
    weekday: 3,
    items: [
      { ex: "latPulldown", sets: 3, min: 8, max: 12 },
      { ex: "seatedRow", sets: 3, min: 8, max: 12 },
      { ex: "bicepsCurl", sets: 3, min: 10, max: 12 },
      { ex: "hammerCurl", sets: 3, min: 10, max: 12 },
    ],
  },
  {
    name: "Shoulders & Legs",
    weekday: 5,
    items: [
      { ex: "shoulderPress", sets: 3, min: 8, max: 12 },
      { ex: "lateralRaise", sets: 3, min: 12, max: 15 },
      { ex: "rearDelt", sets: 2, min: 12, max: 15 },
      { ex: "legPress", sets: 3, min: 8, max: 12 },
      { ex: "legCurl", sets: 3, min: 10, max: 12 },
      { ex: "calfRaise", sets: 3, min: 12, max: 15 },
    ],
  },
];

export async function GET() {
  const [existing] = await db.select().from(users).where(eq(users.email, "demo@liftlog.com"));
  if (existing) return NextResponse.json({ message: "Already seeded" });

  const [demo] = await db
    .insert(users)
    .values({
      name: "Demo Lifter",
      email: "demo@liftlog.com",
      password: await bcrypt.hash("demo123", 10),
    })
    .returning();

  // Exercises
  const exRows = await db
    .insert(exercises)
    .values(
      EXERCISES.map((e) => ({
        userId: demo.id,
        name: e.name,
        muscleGroup: e.muscle,
        equipment: e.equipment,
      }))
    )
    .returning();
  const exId: Record<string, string> = {};
  EXERCISES.forEach((e, i) => { exId[e.key] = exRows[i].id; });

  // Templates
  const tplRows = await db
    .insert(workoutTemplates)
    .values(PROGRAM.map((p) => ({ userId: demo.id, name: p.name, weekday: p.weekday })))
    .returning();

  await db.insert(templateExercises).values(
    PROGRAM.flatMap((p, ti) =>
      p.items.map((item, pos) => ({
        templateId: tplRows[ti].id,
        exerciseId: exId[item.ex],
        position: pos,
        targetSets: item.sets,
        repsMin: item.min,
        repsMax: item.max,
      }))
    )
  );

  // Oxirgi 5 hafta mashg'ulot tarixi
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const plans: { tplIdx: number; date: Date; weekIdx: number }[] = [];

  for (let daysAgo = 35; daysAgo >= 1; daysAgo--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(18, 0, 0, 0);
    const weekday = d.getDay() === 0 ? 7 : d.getDay();
    const tplIdx = PROGRAM.findIndex((p) => p.weekday === weekday);
    if (tplIdx === -1) continue;
    plans.push({ tplIdx, date: d, weekIdx: Math.floor((35 - daysAgo) / 7) });
  }

  const sessionRows = await db
    .insert(workoutSessions)
    .values(
      plans.map((p) => ({
        userId: demo.id,
        templateId: tplRows[p.tplIdx].id,
        name: PROGRAM[p.tplIdx].name,
        startedAt: p.date,
        finishedAt: new Date(p.date.getTime() + 62 * 60000),
      }))
    )
    .returning();

  const setRows: (typeof sessionSets.$inferInsert)[] = [];
  sessionRows.forEach((s, i) => {
    const p = plans[i];
    PROGRAM[p.tplIdx].items.forEach((item) => {
      const ex = EXERCISES.find((e) => e.key === item.ex)!;
      const weight = ex.base + ex.step * Math.floor(p.weekIdx / 2);
      for (let n = 1; n <= item.sets; n++) {
        setRows.push({
          sessionId: s.id,
          exerciseId: exId[item.ex],
          setNumber: n,
          weight,
          reps: Math.max(item.min, item.max - (n - 1) * 2 + (p.weekIdx % 2)),
        });
      }
    });
  });
  for (let i = 0; i < setRows.length; i += 100) {
    await db.insert(sessionSets).values(setRows.slice(i, i + 100));
  }

  // Body weight (haftalik)
  await db.insert(bodyWeights).values(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - (35 - i * 7));
      return { userId: demo.id, weight: Math.round((70 + i * 0.4) * 10) / 10, date: d };
    })
  );

  return NextResponse.json({
    success: true,
    sessions: sessionRows.length,
    sets: setRows.length,
  });
}