import { Streamdown } from "streamdown";
import { createCodePlugin } from "@streamdown/code";
import { mermaid } from "@streamdown/mermaid";

// Create code plugin with dark theme
const code = createCodePlugin({
  themes: ["github-dark", "github-dark"], // Use dark theme for both light/dark modes
});

// Streamdown plugins for markdown rendering
const streamdownPlugins = { code, mermaid };

// Helper component for rendering markdown content
export function MarkdownContent({ content, className = "" }: { content: string; className?: string }) {
  if (!content) return <span className="muted">—</span>;
  return (
    <div className={className}>
      <Streamdown plugins={streamdownPlugins}>{content}</Streamdown>
    </div>
  );
}
