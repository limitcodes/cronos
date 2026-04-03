export const HIDDEN_COMPOSIO_META_TOOLS = new Set([
  "COMPOSIO_REMOTE_BASH_TOOL",
  "COMPOSIO_REMOTE_WORKBENCH",
]);

// Composio's toolkit listing API does not currently expose an `isPremium` flag.
// Keep this denylist aligned with the documented premium toolkits page.
export const PREMIUM_TOOLKIT_SLUGS = new Set([
  "codeinterpreter",
  "composio_search",
  "exa",
  "perplexityai",
  "serpapi",
]);
