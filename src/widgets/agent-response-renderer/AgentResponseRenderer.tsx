import type { ReactNode } from "react";
import { OpenUiRenderer } from "./OpenUiRenderer";
import { parseOpenUiBlock, stripOpenUiBlocks } from "./openui";

type AgentResponseRendererProps = {
  content: string;
  markdown: (content: string) => ReactNode;
};

export function AgentResponseRenderer({ content, markdown }: AgentResponseRendererProps) {
  const schema = parseOpenUiBlock(content);
  if (!schema) return <>{markdown(content)}</>;

  const visibleMarkdown = stripOpenUiBlocks(content);
  return (
    <div className="grid gap-3">
      {visibleMarkdown ? markdown(visibleMarkdown) : null}
      <OpenUiRenderer schema={schema} />
    </div>
  );
}
