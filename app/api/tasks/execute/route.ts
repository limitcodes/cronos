import { composio } from "@/lib/composio";
import { db } from "@/lib/db";
import { chat, message } from "@/lib/db/schema";
import {
  convertToModelMessages,
  generateText,
  jsonSchema,
  stepCountIs,
  tool,
  UIMessage,
} from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { serve } from "@upstash/workflow/nextjs";

const aigateway = createAiGateway({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  gateway: process.env.CLOUDFLARE_GATEWAY_ID!,
  apiKey: process.env.CLOUDFLARE_API_TOKEN!,
});

const unified = createUnified();

type RawTool = {
  type: string;
  function: { name: string; description?: string; parameters: Record<string, unknown> };
};

export const { POST } = serve(async (context) => {
  const { chatId, userId, taskDescription } = context.requestPayload as {
    chatId: string;
    userId: string;
    taskDescription: string;
  };

  // Step 1: Verify chat still exists
  const chatRow = await context.run("verify-chat", async () => {
    const [row] = await db.select().from(chat).where(eq(chat.id, chatId));
    if (!row || row.userId !== userId) throw new Error("Chat not found");
    return { id: row.id, userId: row.userId };
  });

  // Step 2: Save a system-like message indicating the scheduled task is running
  await context.run("save-task-message", async () => {
    await db.insert(message).values({
      id: nanoid(),
      chatId: chatRow.id,
      role: "user",
      content: `[Scheduled Task] ${taskDescription}`,
    });
  });

  // Step 3: Load recent messages for context
  const recentMessages = await context.run("load-messages", async () => {
    const msgs = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId));
    return msgs.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));
  });

  // Step 4: Run the agent with the task
  const agentResponse = await context.run("run-agent", async () => {
    const composioSession = await composio.create(userId);
    const rawComposioTools = (await composioSession.tools()) as RawTool[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const composioTools: Record<string, any> = Object.fromEntries(
      rawComposioTools
        .filter((t) => t.function.name)
        .map((t) => [
          t.function.name,
          tool({
            description: t.function.description ?? t.function.name,
            inputSchema: jsonSchema(
              t.function.parameters as Parameters<typeof jsonSchema>[0]
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            execute: async (args: any) => {
              try {
                return await composio.tools.executeMetaTool(t.function.name, {
                  sessionId: composioSession.sessionId,
                  arguments: args,
                });
              } catch (err) {
                return { error: String(err) };
              }
            },
          }),
        ])
    );

    const { text } = await generateText({
      model: aigateway(unified("google-vertex-ai/zai-org/glm-5-maas")),
      messages: await convertToModelMessages(recentMessages as UIMessage[]),
      tools: composioTools,
      stopWhen: stepCountIs(10),
    });

    return text;
  });

  // Step 5: Save the agent's response
  await context.run("save-response", async () => {
    if (agentResponse) {
      await db.insert(message).values({
        id: nanoid(),
        chatId,
        role: "assistant",
        content: agentResponse,
      });
    }
    await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
  });
});
