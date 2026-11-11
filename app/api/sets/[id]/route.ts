import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionSets, workoutSessions } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth-config";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [row] = await db
    .select({ id: sessionSets.id })
    .from(sessionSets)
    .innerJoin(workoutSessions, eq(sessionSets.sessionId, workoutSessions.id))
    .where(and(eq(sessionSets.id, id), eq(workoutSessions.userId, session.user.id)));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(sessionSets).where(eq(sessionSets.id, id));
  return NextResponse.json({ success: true });
}