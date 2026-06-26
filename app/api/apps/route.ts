import { auth } from "@/lib/auth";
import { composio } from "@/lib/composio";
import { PREMIUM_TOOLKIT_SLUGS } from "@/lib/composio-config";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const MAX_VISIBLE_TOOLKITS = 24;

function rankToolkit(toolkit: { slug: string; name: string }, query?: string) {
  if (!query) return 0;

  const normalizedQuery = query.toLowerCase();
  const slug = toolkit.slug.toLowerCase();
  const name = toolkit.name.toLowerCase();

  if (slug === normalizedQuery || name === normalizedQuery) return 0;
  if (slug.startsWith(normalizedQuery) || name.startsWith(normalizedQuery)) return 1;
  if (slug.includes(normalizedQuery) || name.includes(normalizedQuery)) return 2;
  return 3;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.trim() || undefined;
  const isConnected = searchParams.get("filter") === "connected" ? true : undefined;
  let nextCursor = searchParams.get("cursor") || undefined;

  const composioSession = await composio.create(session.user.id);
  const toolkits = [];
  let pageCount = 0;

  do {
    const { items, cursor: pageNextCursor } = await composioSession.toolkits({
      limit: 50,
      cursor: nextCursor,
      isConnected,
      search,
    });

    toolkits.push(...items.filter((toolkit) => !PREMIUM_TOOLKIT_SLUGS.has(toolkit.slug)));
    nextCursor = pageNextCursor ?? undefined;
    pageCount += 1;
  } while (nextCursor && toolkits.length < MAX_VISIBLE_TOOLKITS && pageCount < 3);

  const items = Array.from(new Map(toolkits.map((toolkit) => [toolkit.slug, toolkit])).values())
    .sort((a, b) => {
      const rankDifference = rankToolkit(a, search) - rankToolkit(b, search);
      if (rankDifference !== 0) return rankDifference;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_VISIBLE_TOOLKITS);

  return NextResponse.json({ items, nextCursor });
}
