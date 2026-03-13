import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chat, message } from "@/lib/db/schema";
import {
  convertToModelMessages,
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
import { z } from "zod";

const aigateway = createAiGateway({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  gateway: process.env.CLOUDFLARE_GATEWAY_ID!,
  apiKey: process.env.CLOUDFLARE_API_TOKEN!,
});

const unified = createUnified();

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

    // Auto-title from first user message
    if (messages.filter((m) => m.role === "user").length === 1 && text) {
      await db
        .update(chat)
        .set({ title: text.slice(0, 60), updatedAt: new Date() })
        .where(eq(chat.id, chatId));
    }
  }

  const result = streamText({
    model: aigateway(unified("google-vertex-ai/zai-org/glm-5-maas")),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(50),
    tools: {
      weather: tool({
        description: "Get the weather in a location (fahrenheit)",
        inputSchema: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: Math.round(Math.random() * (90 - 32) + 32),
        }),
      }),
    },
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
