import { marked } from "marked";

/** Supported import types. Surfaced in the UI and the README. */
export const SUPPORTED_IMPORT_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMPORT_LABEL = "5 MB";

export function isSupportedImport(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_IMPORT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function importError(fileName: string, size: number): string | null {
  if (!isSupportedImport(fileName)) {
    return `“${fileName}” isn’t supported. Upload a .txt, .md or .docx file.`;
  }
  if (size === 0) return `“${fileName}” is empty.`;
  if (size > MAX_IMPORT_BYTES) {
    return `“${fileName}” is too large. The limit is ${MAX_IMPORT_LABEL}.`;
  }
  return null;
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Convert the raw text of an uploaded text file into editor HTML.
 *  - .md / .markdown -> rendered as Markdown
 *  - .txt            -> paragraphs, line breaks preserved, HTML escaped
 */
export function fileTextToHtml(fileName: string, text: string): string {
  const lower = fileName.toLowerCase();
  const isMarkdown = lower.endsWith(".md") || lower.endsWith(".markdown");

  if (isMarkdown) {
    return marked.parse(text, { async: false }) as string;
  }

  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => escapeHtml(block).replace(/\n/g, "<br>"))
    .filter((block) => block.trim().length > 0)
    .map((block) => `<p>${block}</p>`);

  return paragraphs.join("") || "<p></p>";
}

/** Derive a document title from a file name (strip extension). */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return base.length > 0 ? base : "Imported document";
}
