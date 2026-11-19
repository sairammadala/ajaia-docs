"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Crown, Eye, Loader2, Pencil, Trash2, Users } from "lucide-react";
import Modal from "@/components/Modal";
import Avatar from "@/components/Avatar";
import { deleteDocument } from "@/app/dashboard/actions";
import type { DashboardDoc } from "@/lib/types";

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DocCard({ doc }: { doc: DashboardDoc }) {
  const owned = doc.role === "owner";
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteDocument(doc.id);
      if (res.ok) setConfirming(false);
      else setError(res.error ?? "Couldn’t delete this document.");
    });
  }

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        owned ? "border-line hover:border-brand-300" : "border-amber-200/80 hover:border-amber-300"
      }`}
    >
      {/* accent strip distinguishes owned (teal) from shared (amber) at a glance */}
      <div className={`h-1 ${owned ? "bg-brand-600" : "bg-amber-400"}`} aria-hidden />

      <Link href={`/doc/${doc.id}`} className="flex flex-1 flex-col rounded-t-xl p-5 focus-visible:ring-offset-0">
        <div className="flex items-center justify-between gap-2">
          {owned ? (
            <span className="badge bg-brand-50 text-brand-800">
              <Crown size={11} /> Owner
            </span>
          ) : doc.role === "editor" ? (
            <span className="badge bg-amber-50 text-amber-800">
              <Pencil size={11} /> Can edit
            </span>
          ) : (
            <span className="badge bg-amber-50 text-amber-800">
              <Eye size={11} /> View only
            </span>
          )}
          {owned && doc.shared_count > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted" title="Shared with others">
              <Users size={13} /> {doc.shared_count}
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 line-clamp-2 font-display text-[1.15rem] font-semibold leading-snug tracking-tight">
          {doc.title || "Untitled document"}
        </h3>
        <p className="mt-1.5 line-clamp-3 min-h-[3.75rem] text-[13px] leading-5 text-ink-muted">
          {doc.snippet || "Empty document"}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-ink-muted">
          {owned ? (
            <span suppressHydrationWarning>Edited {timeAgo(doc.updated_at)}</span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <Avatar name={doc.owner_name} seed={doc.owner_email} size={18} />
              <span className="truncate">Shared by {doc.owner_name}</span>
            </span>
          )}
          {!owned ? (
            <span className="shrink-0" suppressHydrationWarning>
              {timeAgo(doc.updated_at)}
            </span>
          ) : null}
        </div>
      </Link>

      {owned ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${doc.title}`}
          className="icon-btn absolute right-3 top-5 bg-white/90 opacity-0 shadow-card transition focus-visible:opacity-100 group-hover:opacity-100 [&:not(:hover)]:text-ink-muted"
          style={{ top: "1.1rem" }}
        >
          <Trash2 size={15} />
        </button>
      ) : null}

      <Modal open={confirming} onClose={() => !pending && setConfirming(false)} title="Delete this document?">
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-ink">“{doc.title}”</span> will be deleted for you and everyone it’s
          shared with. This can’t be undone.
        </p>
        {error ? (
          <div role="alert" className="alert-error mt-3">
            {error}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={remove} disabled={pending}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
