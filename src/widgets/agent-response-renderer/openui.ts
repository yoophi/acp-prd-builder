const OPENUI_BLOCK_RE = /```(?:openui|open-ui|ui)\s*\n([\s\S]*?)```/i;

export function parseOpenUiBlock(content: string): unknown | null {
  const match = content.match(OPENUI_BLOCK_RE);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function stripOpenUiBlocks(content: string) {
  return content.replace(OPENUI_BLOCK_RE, "").trim();
}
