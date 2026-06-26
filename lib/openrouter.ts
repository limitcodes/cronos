import { createOpenRouter } from "@openrouter/ai-sdk-provider";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export const OPENROUTER_MODEL = getRequiredEnv("OPENROUTER_MODEL");

export const openrouter = createOpenRouter({
  apiKey: getRequiredEnv("OPENROUTER_API_KEY"),
});
