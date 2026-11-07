import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  if (String(password).length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const cleanEmail = String(email).toLowerCase().trim();
  const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail));
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ name, email: cleanEmail, password: hashed }).returning();
  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}