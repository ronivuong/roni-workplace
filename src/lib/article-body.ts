/** Helpers for Article SEO body: markdown (AI) ↔ HTML (Classic Editor) */

export function looksLikeHtml(text: string) {
  if (!text) return false;
  return /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|a|br|div|span|hr)\b/i.test(
    text
  );
}

/** Strip tags for plain text / word count */
export function htmlToPlainText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Minimal markdown → HTML for loading AI drafts into Classic Editor */
export function markdownToHtml(md: string): string {
  if (!md?.trim()) return "<p></p>";
  if (looksLikeHtml(md)) return md;

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType || !listItems.length) {
      listType = null;
      listItems = [];
      return;
    }
    const tag = listType;
    blocks.push(
      `<${tag}>${listItems.map((t) => `<li>${inlineMd(t)}</li>`).join("")}</${tag}>`
    );
    listType = null;
    listItems = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      i++;
      continue;
    }

    const ul = trimmed.match(/^[-*+]\s+(.+)$/);
    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ul) {
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(ul[1]);
      i++;
      continue;
    }
    if (ol) {
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(ol[1]);
      i++;
      continue;
    }

    flushList();

    if (trimmed.startsWith("### ")) {
      blocks.push(`<h3>${inlineMd(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      blocks.push(`<h2>${inlineMd(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      blocks.push(`<h2>${inlineMd(trimmed.slice(2))}</h2>`);
    } else if (trimmed.startsWith("> ")) {
      const quote: string[] = [trimmed.slice(2)];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quote.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(`<blockquote><p>${inlineMd(quote.join(" "))}</p></blockquote>`);
      continue;
    } else if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      blocks.push("<hr>");
    } else {
      const para: string[] = [trimmed];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().match(/^#{1,3}\s/) &&
        !lines[i].trim().match(/^[-*+]\s/) &&
        !lines[i].trim().match(/^\d+\.\s/) &&
        !lines[i].trim().startsWith("> ")
      ) {
        para.push(lines[i].trim());
        i++;
      }
      blocks.push(`<p>${inlineMd(para.join(" "))}</p>`);
      continue;
    }
    i++;
  }
  flushList();
  return blocks.join("") || "<p></p>";
}

function inlineMd(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

/** HTML → approximate markdown (Text tab / SEO checks that use ##) */
export function htmlToMarkdown(html: string): string {
  if (!html?.trim()) return "";
  if (!looksLikeHtml(html)) return html;

  const s = html
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "#### $1\n\n")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
      const t = htmlToPlainText(inner);
      return t
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n") + "\n\n";
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?ul[^>]*>/gi, "\n")
    .replace(/<\/?ol[^>]*>/gi, "\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "$1")
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<hr\s*\/?>/gi, "\n---\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return s;
}

/** Normalize body for SEO: prefer markdown-like headings detection */
export function bodyForSeo(body: string) {
  if (looksLikeHtml(body)) return htmlToMarkdown(body);
  return body || "";
}

export function bodyPlainText(body: string) {
  if (looksLikeHtml(body)) return htmlToPlainText(body);
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ensure content for TipTap: always HTML */
export function bodyToEditorHtml(body: string) {
  if (!body?.trim()) return "<p></p>";
  return markdownToHtml(body);
}
