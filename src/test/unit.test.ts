import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { resolveAccess } from "@/lib/access";
import {
  fileTextToHtml,
  importError,
  isSupportedImport,
  MAX_IMPORT_BYTES,
  titleFromFileName,
} from "@/lib/markdown";
import { uploadToHtml } from "@/lib/import";

const doc = { owner_id: "owner" };
const shares = [
  { shared_with: "viewer", role: "viewer" as const },
  { shared_with: "editor", role: "editor" as const },
];

describe("resolveAccess", () => {
  it("owner can do everything", () => {
    expect(resolveAccess(doc, shares, "owner")).toEqual({
      isOwner: true,
      canView: true,
      canEdit: true,
      role: "owner",
    });
  });
  it("viewer reads but cannot edit", () => {
    expect(resolveAccess(doc, shares, "viewer")).toMatchObject({ canView: true, canEdit: false });
  });
  it("editor reads and edits", () => {
    expect(resolveAccess(doc, shares, "editor")).toMatchObject({ canView: true, canEdit: true });
  });
  it("strangers and signed-out users get nothing", () => {
    expect(resolveAccess(doc, shares, "stranger").canView).toBe(false);
    expect(resolveAccess(doc, shares, null).canView).toBe(false);
  });
});

describe("file import", () => {
  it("accepts .txt/.md/.docx and rejects the rest", () => {
    for (const ok of ["a.txt", "a.md", "A.MARKDOWN", "report.docx"]) expect(isSupportedImport(ok)).toBe(true);
    for (const bad of ["a.pdf", "a.doc", "a.png", "noext"]) expect(isSupportedImport(bad)).toBe(false);
  });

  it("reports clear errors for type, emptiness and size", () => {
    expect(importError("x.pdf", 10)).toMatch(/isn’t supported/);
    expect(importError("x.txt", 0)).toMatch(/empty/);
    expect(importError("x.txt", MAX_IMPORT_BYTES + 1)).toMatch(/too large/);
    expect(importError("x.txt", 10)).toBeNull();
  });

  it("renders markdown and escapes plain text", () => {
    expect(fileTextToHtml("d.md", "# Hi\n\n- a\n- b")).toContain("<h1>Hi</h1>");
    const txt = fileTextToHtml("d.txt", "a <b> tag\n\nsecond");
    expect(txt).toContain("&lt;b&gt;");
    expect(txt).toContain("<p>second</p>");
  });

  it("derives titles from file names", () => {
    expect(titleFromFileName("Meeting Notes.md")).toBe("Meeting Notes");
  });

  it("converts a .docx into editor HTML with formatting", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    );
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Plain </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>bold</w:t></w:r></w:p></w:body></w:document>`,
    );
    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    const html = await uploadToHtml("memo.docx", bytes);
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("Plain");
  });

  it("rejects a corrupt .docx", async () => {
    await expect(uploadToHtml("bad.docx", Buffer.from("not a zip"))).rejects.toBeDefined();
  });
});
