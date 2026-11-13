import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exercises, workoutTemplates, templateExercises } from "@/lib/schema";
import type { Exercise } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

type Item = {
  name: string;
  muscle: Exercise["muscleGroup"];
  equipment: Exercise["equipment"];
  sets: number;
  min: number;
  max: number;
};

const STARTER: { name: string; weekday: number; items: Item[] }[] = [
  {
    name: "Chest & Triceps",
    weekday: 1,
    items: [
      { name: "Chest Press Machine", muscle: "chest", equipment: "machine", sets: 4, min: 8, max: 12 },
      { name: "Smith Machine Bench Press", muscle: "chest", equipment: "machine", sets: 3, min: 8, max: 12 },
      { name: "Pec Fly", muscle: "chest", equipment: "machine", sets: 3, min: 10, max: 15 },
      { name: "Triceps Pushdown", muscle: "triceps", equipment: "cable", sets: 4, min: 8, max: 12 },
      { name: "Seated Triceps Press Machine", muscle: "triceps", equipment: "machine", sets: 3, min: 10, max: 12 },
    ],
  },
  {
    name: "Back & Biceps",
    weekday: 3,
    items: [
      { name: "Lat Pulldown", muscle: "back", equipment: "cable", sets: 4, min: 8, max: 12 },
      { name: "Seated Cable Row", muscle: "back", equipment: "cable", sets: 4, min: 8, max: 12 },
      { name: "Reverse Fly", muscle: "back", equipment: "machine", sets: 3, min: 10, max: 15 },
      { name: "Dumbbell Biceps Curl", muscle: "biceps", equipment: "dumbbell", sets: 4, min: 8, max: 12 },
      { name: "Hammer Curl", muscle: "biceps", equipment: "dumbbell", sets: 3, min: 8, max: 12 },
    ],
  },
  {
    name: "Shoulders & Legs",
    weekday: 5,
    items: [
      { name: "Goblet Squat", muscle: "legs", equipment: "dumbbell", sets: 4, min: 8, max: 12 },
      { name: "Leg Extension", muscle: "legs", equipment: "machine", sets: 3, min: 10, max: 15 },
      { name: "Lying Leg Curl", muscle: "legs", equipment: "machine", sets: 3, min: 10, max: 15 },
      { name: "Romanian Deadlift", muscle: "legs", equipment: "barbell", sets: 3, min: 8, max: 12 },
      { name: "Shoulder Press Machine", muscle: "shoulders", equipment: "machine", sets: 4, min: 8, max: 12 },
      { name: "Barbell Upright Row", muscle: "shoulders", equipment: "barbell", sets: 3, min: 10, max: 15 },
      { name: "Dumbbell Lateral Raise", muscle: "shoulders", equipment: "dumbbell", sets: 3, min: 12, max: 15 },
    ],
  },
];

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const existingTemplates = await db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId));
  const existingExercises = await db.select().from(exercises).where(eq(exercises.userId, userId));
  const exByName = new Map(existingExercises.map((e) => [e.name.toLowerCase(), e.id]));

  let created = 0;
  for (const day of STARTER) {
    if (existingTemplates.some((t) => t.name.toLowerCase() === day.name.toLowerCase())) continue;

    const [tpl] = await db
      .insert(workoutTemplates)
      .values({ userId, name: day.name, weekday: day.weekday })
      .returning();

    const rows: (typeof templateExercises.$inferInsert)[] = [];
    for (let i = 0; i < day.items.length; i++) {
      const it = day.items[i];
      let exId = exByName.get(it.name.toLowerCase());
      if (!exId) {
        const [e] = await db
          .insert(exercises)
          .values({ userId, name: it.name, muscleGroup: it.muscle, equipment: it.equipment })
          .returning();
        exId = e.id;
        exByName.set(it.name.toLowerCase(), exId);
      }
      rows.push({
        templateId: tpl.id,
        exerciseId: exId,
        position: i,
        targetSets: it.sets,
        repsMin: it.min,
        repsMax: it.max,
      });
    }
    await db.insert(templateExercises).values(rows);
    created++;
  }

  return NextResponse.json({ created });
}