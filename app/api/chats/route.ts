import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chat } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chats = await db
    .select()
    .from(chat)
    .where(eq(chat.userId, session.user.id))
    .orderBy(desc(chat.updatedAt));

  return NextResponse.json(chats);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json().catch(() => ({ title: "New Chat" }));

  const [newChat] = await db
    .insert(chat)
    .values({ id: nanoid(), userId: session.user.id, title: title ?? "New Chat" })
    .returning();

  return NextResponse.json(newChat);
}
