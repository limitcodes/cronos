import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export const CLOUDFLARE_COMPAT_MODEL =
  process.env.CLOUDFLARE_MODEL ?? "custom-ollama/minimax-m2.7:cloud";

export const cloudflareCompat = createOpenAICompatible({
  name: "cloudflare-compat",
  baseURL: `https://gateway.ai.cloudflare.com/v1/${getRequiredEnv("CLOUDFLARE_ACCOUNT_ID")}/${getRequiredEnv("CLOUDFLARE_GATEWAY_ID")}/compat`,
  headers: {
    "cf-aig-authorization": `Bearer ${getRequiredEnv("CLOUDFLARE_API_TOKEN")}`,
  },
});
