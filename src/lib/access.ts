import type { Access, DocumentRow, ShareRow } from "./types";

/**
 * Pure authorization resolver.
 *
 * The single source of truth for "who can do what". The data layer
 * (src/lib/store.ts) calls it before every read and write, and the UI uses
 * its result to decide what to render (read-only editor for a viewer, the
 * Share button only for the owner). Being pure, it is cheap to unit test.
 */
export function resolveAccess(
  doc: Pick<DocumentRow, "owner_id">,
  shares: Pick<ShareRow, "shared_with" | "role">[],
  userId: string | null | undefined,
): Access {
  if (!userId) {
    return { isOwner: false, canView: false, canEdit: false, role: null };
  }

  if (doc.owner_id === userId) {
    return { isOwner: true, canView: true, canEdit: true, role: "owner" };
  }

  const share = shares.find((s) => s.shared_with === userId);
  if (!share) {
    return { isOwner: false, canView: false, canEdit: false, role: null };
  }

  return {
    isOwner: false,
    canView: true,
    canEdit: share.role === "editor",
    role: share.role,
  };
}
