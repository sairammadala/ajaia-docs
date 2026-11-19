import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDocument } from "@/lib/store";
import Editor from "@/components/Editor";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const loaded = await getDocument(user.id, params.id);
  return { title: loaded?.document.title || "Untitled document" };
}

export default async function DocPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const loaded = await getDocument(user.id, params.id);
  if (!loaded) notFound(); // missing, or no access

  const { document, access, owner, shares } = loaded;
  return (
    <Editor
      docId={document.id}
      initialTitle={document.title}
      initialContent={document.content}
      initialUpdatedAt={document.updated_at}
      canEdit={access.canEdit}
      isOwner={access.isOwner}
      owner={{ name: owner.display_name, email: owner.email }}
      user={{ name: user.display_name, email: user.email }}
      shares={shares}
    />
  );
}
