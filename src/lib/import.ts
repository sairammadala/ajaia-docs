import mammoth from "mammoth";
import { fileTextToHtml } from "@/lib/markdown";

/**
 * Convert an uploaded file's bytes into editor HTML (server side).
 * .docx goes through mammoth; text formats are decoded as UTF-8.
 */
export async function uploadToHtml(fileName: string, bytes: Buffer): Promise<string> {
  if (fileName.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.convertToHtml(
      { buffer: bytes },
      {
        styleMap: ["u => u"],
        // The editor has no image node; drop embedded images instead of bloating content.
        convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: "" })),
      },
    );
    return result.value.replace(/<img[^>]*>/g, "") || "<p></p>";
  }
  return fileTextToHtml(fileName, bytes.toString("utf8"));
}
