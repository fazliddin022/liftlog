import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutTemplates, templateExercises, workoutSessions, bodyWeights } from "@/lib/schema";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // Hafta kuni brauzerdan keladi (server UTC'da ishlaydi, vaqt zonasi xatosini oldini olish uchun)
  const weekday = Number(new URL(req.url).searchParams.get("weekday")) || 0;

  const templates = await db
    .select()
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.userId, userId), eq(workoutTemplates.isActive, true)))
    .orderBy(asc(workoutTemplates.weekday));

  const tplIds = templates.map((t) => t.id);
  const tplExercises = tplIds.length
    ? await db
        .select({ templateId: templateExercises.templateId })
        .from(templateExercises)
        .where(inArray(templateExercises.templateId, tplIds))
    : [];
  const counts: Record<string, number> = {};
  tplExercises.forEach((r) => { counts[r.templateId] = (counts[r.templateId] || 0) + 1; });

  const since = new Date();
  since.setDate(since.getDate() - 84);
  const recent = await db
    .select({
      id: workoutSessions.id,
      name: workoutSessions.name,
      templateId: workoutSessions.templateId,
      startedAt: workoutSessions.startedAt,
      finishedAt: workoutSessions.finishedAt,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.startedAt, since)))
    .orderBy(desc(workoutSessions.startedAt));

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const active = recent.find((s) => !s.finishedAt && s.startedAt >= dayAgo) || null;

  const [lastBw] = await db
    .select()
    .from(bodyWeights)
    .where(eq(bodyWeights.userId, userId))
    .orderBy(desc(bodyWeights.date))
    .limit(1);

  const list = templates.map((t) => ({
    id: t.id,
    name: t.name,
    weekday: t.weekday,
    exerciseCount: counts[t.id] || 0,
  }));

  return NextResponse.json({
    templates: list,
    todayTemplate: list.find((t) => t.weekday === weekday) || null,
    activeSession: active ? { id: active.id, name: active.name, templateId: active.templateId } : null,
    recentSessions: recent,
    lastBodyWeight: lastBw?.weight ?? null,
  });
}