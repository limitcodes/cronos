import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import { z } from "zod";

const aigateway = createAiGateway({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  gateway: process.env.CLOUDFLARE_GATEWAY_ID!,
  apiKey: process.env.CLOUDFLARE_API_TOKEN!,
});

const unified = createUnified();

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

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
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
