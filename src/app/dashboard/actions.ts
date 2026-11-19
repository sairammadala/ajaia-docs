"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createDocument as create, deleteDocument as remove, StoreError } from "@/lib/store";
import { uploadToHtml } from "@/lib/import";
import { importError, titleFromFileName } from "@/lib/markdown";

export async function createDocument() {
  const user = await requireUser();
  const doc = await create(user.id);
  redirect(`/doc/${doc.id}`);
}

export type ImportState = { error: string } | null;

/** Upload a .txt / .md / .docx file and turn it into a new editable document. */
export async function importDocument(formData: FormData): Promise<ImportState> {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File)) return { error: "Choose a file to upload." };
  const problem = importError(file.name, file.size);
  if (problem) return { error: problem };

  let id: string;
  try {
    const html = await uploadToHtml(file.name, Buffer.from(await file.arrayBuffer()));
    const doc = await create(user.id, { title: titleFromFileName(file.name), content: html });
    id = doc.id;
  } catch (err) {
    if (err instanceof StoreError) return { error: err.message };
    return { error: `We couldn’t read “${file.name}”. Is it a valid file?` };
  }
  redirect(`/doc/${id}`);
}

export async function deleteDocument(docId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await remove(user.id, docId);
  } catch (err) {
    if (err instanceof StoreError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/dashboard");
  return { ok: true };
}
