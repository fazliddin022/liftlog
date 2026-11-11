import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutTemplates, workoutSessions } from "@/lib/schema";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

// Mashg'ulotni boshlash (yoki tugallanmaganini davom ettirish)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { templateId } = await req.json();
  const [tpl] = await db
    .select()
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));
  if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const [open] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.templateId, tpl.id),
        isNull(workoutSessions.finishedAt),
        gte(workoutSessions.startedAt, dayAgo)
      )
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);
  if (open) return NextResponse.json(open);

  const [created] = await db
    .insert(workoutSessions)
    .values({ userId, templateId: tpl.id, name: tpl.name })
    .returning();
  return NextResponse.json(created);
}