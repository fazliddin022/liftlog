import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exercises } from "@/lib/schema";
import type { Exercise } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

const MUSCLES: Exercise["muscleGroup"][] = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "core", "other"];
const EQUIPMENT: Exercise["equipment"][] = ["machine", "barbell", "dumbbell", "cable", "bodyweight", "other"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const muscleGroup = MUSCLES.includes(body.muscleGroup) ? body.muscleGroup : "other";
  const equipment = EQUIPMENT.includes(body.equipment) ? body.equipment : "machine";

  // Bir xil nomli mashq qayta yaratilmaydi
  const mine = await db.select().from(exercises).where(eq(exercises.userId, userId));
  const same = mine.find((e) => e.name.toLowerCase() === name.toLowerCase());
  if (same) return NextResponse.json(same);

  const [created] = await db
    .insert(exercises)
    .values({ userId, name, muscleGroup, equipment })
    .returning();
  return NextResponse.json(created);
}