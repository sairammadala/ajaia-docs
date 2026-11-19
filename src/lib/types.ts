export type Role = "viewer" | "editor";

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface DocumentRow {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Access {
  isOwner: boolean;
  canView: boolean;
  canEdit: boolean;
  role: Role | "owner" | null;
}

/** A row on the dashboard: a document plus the viewer's relationship to it. */
export interface DashboardDoc {
  id: string;
  title: string;
  snippet: string;
  updated_at: string;
  owner_name: string;
  owner_email: string;
  /** "owner" for documents you own, otherwise your share role. */
  role: Role | "owner";
  shared_count: number;
}

export interface ShareRow {
  id: string;
  document_id: string;
  shared_with: string;
  role: Role;
  created_at: string;
}
