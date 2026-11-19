"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  revokeShare as revoke,
  shareDocument,
  StoreError,
  updateDocument,
  updateShareRole as updateRole,
  type ShareEntry,
} from "@/lib/store";
import type { Role } from "@/lib/types";

type Fail = { ok: false; error: string };
type SaveResult = { ok: true; updatedAt: string } | Fail;

async function guard<T>(fn: () => Promise<T>): Promise<T | Fail> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof StoreError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Save editor content. Rejected unless the user is the owner or an editor. */
export async function saveContent(docId: string, content: string): Promise<SaveResult> {
  const user = await requireUser();
  return guard(async () => {
    const r = await updateDocument(user.id, docId, { content });
    return { ok: true as const, updatedAt: r.updated_at };
  });
}

export async function renameDocument(docId: string, title: string): Promise<SaveResult> {
  const user = await requireUser();
  return guard(async () => {
    const r = await updateDocument(user.id, docId, { title });
    revalidatePath("/dashboard");
    return { ok: true as const, updatedAt: r.updated_at };
  });
}

export async function shareAction(
  docId: string,
  email: string,
  role: Role,
): Promise<{ ok: true; share: ShareEntry } | Fail> {
  const user = await requireUser();
  return guard(async () => {
    const share = await shareDocument(user.id, docId, email, role);
    revalidatePath(`/doc/${docId}`);
    return { ok: true as const, share };
  });
}

export async function updateShareRole(
  docId: string,
  shareId: string,
  role: Role,
): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  return guard(async () => {
    await updateRole(user.id, docId, shareId, role);
    revalidatePath(`/doc/${docId}`);
    return { ok: true as const };
  });
}

export async function revokeShare(docId: string, shareId: string): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  return guard(async () => {
    await revoke(user.id, docId, shareId);
    revalidatePath(`/doc/${docId}`);
    return { ok: true as const };
  });
}
