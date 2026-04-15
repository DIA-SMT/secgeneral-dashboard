"use client";

// Renders assistant messages with clean typography.
// Strips markdown artifacts and provides visual structure.

interface ChatMessageProps {
  content: string;
  role: "user" | "assistant";
}

export function ChatMessage({ content, role }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary text-white px-3.5 py-2.5 text-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  // Assistant message: clean up and render with structure
  const cleaned = cleanMarkdown(content);

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-xl rounded-bl-sm bg-background border border-border px-4 py-3 text-sm leading-relaxed">
        <div className="space-y-2.5">
          {cleaned.split("\n\n").map((block, i) => (
            <Block key={i} text={block} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Block({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Check if this is a "section header" line (starts with emoji or is very short and bold-like)
  const lines = trimmed.split("\n");

  if (lines.length === 1) {
    // Single line block
    return <p className="text-foreground">{formatInline(trimmed)}</p>;
  }

  // Multi-line block: first line might be a header
  const firstLine = lines[0].trim();
  const isHeader =
    /^[\p{Emoji_Presentation}\p{Emoji}\u200d]+/u.test(firstLine) ||
    (firstLine.length < 60 && !firstLine.endsWith(".") && !firstLine.endsWith("?"));

  if (isHeader && lines.length > 1) {
    return (
      <div>
        <p className="text-foreground font-medium text-[13px] mb-1">{formatInline(firstLine)}</p>
        <div className="space-y-1 text-muted">
          {lines.slice(1).map((line, j) => {
            const l = line.trim();
            if (!l) return null;
            // List item
            if (l.startsWith("- ") || l.startsWith("• ") || /^[\p{Emoji_Presentation}\p{Emoji}\u200d]/u.test(l)) {
              const cleaned = l.replace(/^[-•]\s*/, "");
              return (
                <p key={j} className="text-foreground pl-1">
                  {formatInline(cleaned)}
                </p>
              );
            }
            return (
              <p key={j} className="text-foreground">
                {formatInline(l)}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: render all lines
  return (
    <div className="space-y-1">
      {lines.map((line, j) => {
        const l = line.trim();
        if (!l) return null;
        if (l.startsWith("- ") || l.startsWith("• ")) {
          return (
            <p key={j} className="text-foreground pl-1">
              {formatInline(l.replace(/^[-•]\s*/, ""))}
            </p>
          );
        }
        return (
          <p key={j} className="text-foreground">
            {formatInline(l)}
          </p>
        );
      })}
    </div>
  );
}

function formatInline(text: string): string {
  // Remove markdown bold markers
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

function cleanMarkdown(text: string): string {
  return (
    text
      // Remove markdown table syntax
      .replace(/\|[^|]+\|/g, "")
      .replace(/[-]{3,}/g, "")
      // Clean up multiple blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
