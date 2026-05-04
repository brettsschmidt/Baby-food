/**
 * Tiny safe Markdown subset → HTML.
 * Supports: headings (## / ###), bullets, numbered lists, **bold**, *italic*,
 * `code`, [links](url), bare URLs, blockquotes, paragraphs.
 *
 * Output is a string of escaped + tagged HTML safe to dangerouslySetInnerHTML.
 * No raw HTML in input is ever passed through.
 */

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  let out = escape(s);
  // bold then italic (long delimiters first)
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // markdown links [text](url) — keep the url-encoded form intact
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text: string, url: string) =>
    `<a href="${url}" target="_blank" rel="noreferrer noopener">${text}</a>`,
  );
  // bare URLs (skip ones already wrapped in href="…")
  out = out.replace(
    /(^|\s)(https?:\/\/[^\s<]+)/g,
    (_, pre: string, url: string) =>
      `${pre}<a href="${url}" target="_blank" rel="noreferrer noopener">${url}</a>`,
  );
  return out;
}

export function renderMarkdown(input: string): string {
  if (!input) return "";
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flushPara();
      closeList();
      continue;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    const bq = line.match(/^>\s?(.*)$/);

    if (h3) {
      flushPara();
      closeList();
      out.push(`<h3>${inline(h3[1])}</h3>`);
    } else if (h2) {
      flushPara();
      closeList();
      out.push(`<h2>${inline(h2[1])}</h2>`);
    } else if (ul) {
      flushPara();
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
    } else if (ol) {
      flushPara();
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
    } else if (bq) {
      flushPara();
      closeList();
      out.push(`<blockquote>${inline(bq[1])}</blockquote>`);
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return out.join("\n");
}
