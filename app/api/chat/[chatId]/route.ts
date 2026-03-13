import { auth } from "@/lib/auth";
import { composio } from "@/lib/composio";
import { db } from "@/lib/db";
import { chat, message } from "@/lib/db/schema";
import {
  convertToModelMessages,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const aigateway = createAiGateway({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  gateway: process.env.CLOUDFLARE_GATEWAY_ID!,
  apiKey: process.env.CLOUDFLARE_API_TOKEN!,
});

const unified = createUnified();

type RawTool = { type: string; function: { name: string; description?: string; parameters: Record<string, unknown> } };

// Convert OpenAI-format meta-tools from Composio → Vercel AI SDK tool format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function composioMetaToolsToVercel(
  rawTools: RawTool[],
  session: Awaited<ReturnType<typeof composio.create>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  return Object.fromEntries(
    rawTools
      .filter((t) => t.function.name)
      .map((t) => [
        t.function.name,
        tool({
          description: t.function.description ?? t.function.name,
          inputSchema: jsonSchema(t.function.parameters as Parameters<typeof jsonSchema>[0]),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: async (args: any) => {
            try {
              return await session.execute(t.function.name, { arguments: args });
            } catch (err) {
              return { error: String(err) };
            }
          },
        }),
      ])
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { chatId } = await params;
  const { messages }: { messages: UIMessage[] } = await req.json();

  const [chatRow] = await db.select().from(chat).where(eq(chat.id, chatId));
  if (!chatRow || chatRow.userId !== session.user.id) {
    return new Response("Not found", { status: 404 });
  }

  // Persist latest user message
  const lastMessage = messages.at(-1);
  if (lastMessage?.role === "user") {
    const text = lastMessage.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("");

    await db
      .insert(message)
      .values({ id: lastMessage.id ?? nanoid(), chatId, role: "user", content: text })
      .onConflictDoNothing();

    if (messages.filter((m) => m.role === "user").length === 1 && text) {
      await db
        .update(chat)
        .set({ title: text.slice(0, 60), updatedAt: new Date() })
        .where(eq(chat.id, chatId));
    }
  }

  // Build Composio meta-tools for this user
  const composioSession = await composio.create(session.user.id);
  const rawComposioTools = await composioSession.tools() as RawTool[];
  const composioTools = composioMetaToolsToVercel(rawComposioTools, composioSession);

  const result = streamText({
    model: aigateway(unified("google-vertex-ai/zai-org/glm-5-maas")),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(50),
    tools: composioTools,
    onFinish: async ({ response }) => {
      for (const msg of response.messages.filter((m) => m.role === "assistant")) {
        const content = msg.content;
        const text = Array.isArray(content)
          ? content
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("")
          : String(content);

        if (text) {
          await db.insert(message).values({ id: nanoid(), chatId, role: "assistant", content: text });
        }
      }
      await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
    },
  });

  return result.toUIMessageStreamResponse();
}
