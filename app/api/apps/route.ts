import { auth } from "@/lib/auth";
import { composio } from "@/lib/composio";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const FEATURED_APPS = ["gmail", "github", "slack", "twitter"];

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const composioSession = await composio.create(session.user.id);
  const { items } = await composioSession.toolkits({ limit: 100 });

  const apps = items.filter((t) => FEATURED_APPS.includes(t.slug));
  return NextResponse.json(apps);
}
