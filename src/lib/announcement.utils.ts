// src/lib/announcement.utils.ts
/** Strip tags for previews / derived titles */
export const htmlToText = (html: string): string => {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
};

/** Backend stores only htmlContent — derive a display title from the first heading/paragraph */
export const deriveTitle = (html: string): string => {
  if (!html) return "Announcement";
  const heading = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  const source = heading ? heading[1] : html;
  const text = htmlToText(source);
  if (!text) return "Announcement";
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
};

/** Minimal sanitizer: removes scripts/iframes/event handlers/js: urls */
export const sanitizeHtml = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
};

export const isHtmlEmpty = (html: string): boolean => {
  if (!html) return true;
  const withoutMedia = html.replace(/<(img|video|iframe|source)[^>]*>/gi, "x");
  return htmlToText(withoutMedia).length === 0;
};
