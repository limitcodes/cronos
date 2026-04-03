import { HIDDEN_COMPOSIO_META_TOOLS } from "@/lib/composio-config";

type RawTool = {
  type: string;
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export function filterComposioTools<T extends RawTool>(tools: T[]) {
  return tools.filter(
    (tool) =>
      tool.function.name && !HIDDEN_COMPOSIO_META_TOOLS.has(tool.function.name),
  );
}
