import { auth } from "@/lib/auth";
import { composio } from "@/lib/composio";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// POST /api/apps/[toolkit] — initiate OAuth, returns redirectUrl
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ toolkit: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toolkit } = await params;
  const callbackUrl = `${process.env.BETTER_AUTH_URL}/apps/callback?toolkit=${toolkit}`;

  const composioSession = await composio.create(session.user.id);
  const connectionRequest = await composioSession.authorize(toolkit, { callbackUrl });

  return NextResponse.json({ redirectUrl: connectionRequest.redirectUrl });
}

// DELETE /api/apps/[toolkit] — disconnect
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ toolkit: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toolkit } = await params;

  const accounts = await composio.connectedAccounts.list({
    userIds: [session.user.id],
    statuses: ["ACTIVE"],
  });

  const account = accounts.items.find((a) => a.toolkit.slug === toolkit);
  if (!account) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  await composio.connectedAccounts.delete(account.id);
  return NextResponse.json({ success: true });
}
