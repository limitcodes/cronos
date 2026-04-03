import { auth } from "@/lib/auth";
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
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { Client } from "@upstash/workflow";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

type RawTool = {
  type: string;
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

function getBaseUrl() {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

function getQStashToken() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured");
  }
  return token;
}

function getScheduleMode(args: {
  delay_seconds?: number;
  scheduled_time?: string;
  cron?: string;
}) {
  const providedModes = [
    args.delay_seconds != null ? "delay_seconds" : null,
    args.scheduled_time ? "scheduled_time" : null,
    args.cron ? "cron" : null,
  ].filter(Boolean);

  if (providedModes.length > 1) {
    throw new Error("Use only one of delay_seconds, scheduled_time, or cron");
  }

  return providedModes[0] ?? "delay_seconds";
}

async function createRecurringSchedule({
  destination,
  body,
  cron,
  timezone,
  retries,
}: {
  destination: string;
  body: unknown;
  cron: string;
  timezone?: string;
  retries?: number;
}) {
  const response = await fetch(
    `https://qstash.upstash.io/v2/schedules/${encodeURIComponent(destination)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getQStashToken()}`,
        "Content-Type": "application/json",
        "Upstash-Cron": cron,
        ...(timezone ? { "Upstash-Cron-Timezone": timezone } : {}),
        ...(typeof retries === "number"
          ? { "Upstash-Retries": String(retries) }
          : {}),
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as { scheduleId?: string };
}

// Convert OpenAI-format meta-tools from Composio → Vercel AI SDK tool format
function composioMetaToolsToVercel(
  rawTools: RawTool[],
  sessionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  return Object.fromEntries(
    rawTools
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
                sessionId,
                arguments: args,
              });
            } catch (err) {
              return { error: String(err) };
            }
          },
        }),
      ]),
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
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
      .values({
        id: lastMessage.id ?? nanoid(),
        chatId,
        role: "user",
        content: text,
      })
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
  const rawComposioTools = filterComposioTools(
    (await composioSession.tools()) as RawTool[],
  );
  const composioTools = composioMetaToolsToVercel(
    rawComposioTools,
    composioSession.sessionId,
  );

  // Built-in schedule_task tool
  const workflowClient = new Client({ token: getQStashToken() });
  const baseUrl = getBaseUrl();

  const builtInTools = {
    schedule_task: tool({
      description:
        "Schedule a task to be executed later in this chat. Supports one-time delays, one-time scheduled timestamps, and recurring cron schedules for daily or other repeating tasks.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          task_description: {
            type: "string",
            description:
              "A clear description of what the agent should do when the scheduled time arrives. Be specific so the agent knows exactly what to do.",
          },
          delay_seconds: {
            type: "number",
            description:
              "Number of seconds to wait before executing the task. Use this OR scheduled_time, not both. Examples: 60 (1 min), 3600 (1 hour), 86400 (1 day).",
          },
          scheduled_time: {
            type: "string",
            description:
              "ISO 8601 timestamp for when to execute the task. Use this OR delay_seconds, not both. Example: 2025-03-20T15:00:00Z",
          },
          cron: {
            type: "string",
            description:
              "Cron expression for a recurring schedule. Use this for repeating tasks such as every day. Example: 0 9 * * *",
          },
          timezone: {
            type: "string",
            description:
              "IANA timezone for cron schedules, such as Asia/Kolkata or America/Los_Angeles. Only used when cron is provided.",
          },
        },
        required: ["task_description"],
      } as Parameters<typeof jsonSchema>[0]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) => {
        try {
          const mode = getScheduleMode(args);
          const payload = {
            chatId,
            userId: session.user.id,
            taskDescription: args.task_description,
          };

          if (mode === "cron") {
            const result = await createRecurringSchedule({
              destination: `${baseUrl}/api/tasks/execute`,
              body: payload,
              cron: String(args.cron),
              timezone: args.timezone ? String(args.timezone) : undefined,
              retries: 3,
            });

            const timezoneSuffix = args.timezone ? ` (${args.timezone})` : "";
            return {
              success: true,
              scheduleId: result.scheduleId,
              message: `Recurring task scheduled with cron "${args.cron}"${timezoneSuffix}: ${args.task_description}`,
            };
          }

          const delay =
            mode === "scheduled_time"
              ? Math.max(
                  0,
                  Math.floor(
                    (new Date(String(args.scheduled_time)).getTime() -
                      Date.now()) /
                      1000,
                  ),
                )
              : (args.delay_seconds ?? 60);

          await workflowClient.trigger({
            url: `${baseUrl}/api/tasks/execute`,
            body: payload,
            retries: 3,
            delay: `${delay}s`,
          });

          const scheduledAt =
            mode === "scheduled_time"
              ? new Date(String(args.scheduled_time)).toLocaleString()
              : `in ${delay} seconds`;

          return {
            success: true,
            message: `Task scheduled ${scheduledAt}: ${args.task_description}`,
          };
        } catch (err) {
          return { error: String(err) };
        }
      },
    }),
  };

  const result = streamText({
    model: cloudflareCompat(CLOUDFLARE_COMPAT_MODEL),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(50),
    tools: { ...composioTools, ...builtInTools },
    onFinish: async ({ response }) => {
      for (const msg of response.messages.filter(
        (m) => m.role === "assistant",
      )) {
        const content = msg.content;
        const text = Array.isArray(content)
          ? content
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text",
              )
              .map((p) => p.text)
              .join("")
          : String(content);

        if (text) {
          await db
            .insert(message)
            .values({ id: nanoid(), chatId, role: "assistant", content: text });
        }
      }
      await db
        .update(chat)
        .set({ updatedAt: new Date() })
        .where(eq(chat.id, chatId));
    },
  });

  return result.toUIMessageStreamResponse();
}
