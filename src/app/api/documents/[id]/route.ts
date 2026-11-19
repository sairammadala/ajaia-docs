import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDocument } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Polled by the editor to pick up changes made by collaborators. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const loaded = await getDocument(user.id, params.id);
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { document, access } = loaded;
  return NextResponse.json({
    title: document.title,
    content: document.content,
    updated_at: document.updated_at,
    canEdit: access.canEdit,
  });
}
