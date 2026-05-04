import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

export function Markdown({
  source,
  className,
}: {
  source: string | null | undefined;
  className?: string;
}) {
  if (!source) return null;
  const html = renderMarkdown(source);
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-medium [&_li]:my-0 [&_p]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-xs",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
