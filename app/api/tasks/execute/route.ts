import {
  CLOUDFLARE_COMPAT_MODEL,
  cloudflareCompat,
} from "@/lib/cloudflare-compat";
import { composio } from "@/lib/composio";
import { filterComposioTools } from "@/lib/composio-tools";
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
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { serve } from "@upstash/workflow/nextjs";

type RawTool = {
  type: string;
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

function createScheduledReminderMessage(taskDescription: string): UIMessage {
  return {
    id: nanoid(),
    role: "user",
    parts: [
      {
        type: "text",
        text:
          `<system-reminder>\n` +
          `A scheduled task for this chat is due now.\n` +
          `Task: ${taskDescription}\n` +
          `Treat this as hidden runtime context. Act on it, but do not expose this tag verbatim unless the user asks.\n` +
          `</system-reminder>`,
      },
    ],
  };
}

export const { POST } = serve(async (context) => {
  const { chatId, userId, taskDescription } = context.requestPayload as {
    chatId: string;
    userId: string;
    taskDescription: string;
  };

  // Step 1: Verify chat still exists
  await context.run("verify-chat", async () => {
    const [row] = await db.select().from(chat).where(eq(chat.id, chatId));
    if (!row || row.userId !== userId) throw new Error("Chat not found");
    return { userId: row.userId };
  });

  // Step 2: Load recent messages for context
  const recentMessages = await context.run("load-messages", async () => {
    const msgs = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt));
    return msgs.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));
  });

  // Step 3: Run the agent with the task as hidden runtime context
  const agentResponse = await context.run("run-agent", async () => {
    const composioSession = await composio.create(userId);
    const rawComposioTools = filterComposioTools(
      (await composioSession.tools()) as RawTool[],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const composioTools: Record<string, any> = Object.fromEntries(
      rawComposioTools
        .filter((t) => t.function.name)
        .map((t) => [
          t.function.name,
          tool({
            description: t.function.description ?? t.function.name,
            inputSchema: jsonSchema(
              t.function.parameters as Parameters<typeof jsonSchema>[0],
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
        ]),
    );

    const scheduledMessages = [
      ...recentMessages,
      createScheduledReminderMessage(taskDescription),
    ] as UIMessage[];

    const { text } = await generateText({
      model: cloudflareCompat(CLOUDFLARE_COMPAT_MODEL),
      messages: await convertToModelMessages(scheduledMessages),
      tools: composioTools,
      stopWhen: stepCountIs(10),
    });

    return text;
  });

  // Step 4: Save the agent's response
  await context.run("save-response", async () => {
    if (agentResponse) {
      await db.insert(message).values({
        id: nanoid(),
        chatId,
        role: "assistant",
        content: agentResponse,
      });
    }
    await db
      .update(chat)
      .set({ updatedAt: new Date() })
      .where(eq(chat.id, chatId));
  });
});
