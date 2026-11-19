"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Share2, UserPlus, X } from "lucide-react";
import Modal from "@/components/Modal";
import Avatar from "@/components/Avatar";
import { shareAction, updateShareRole, revokeShare } from "@/app/doc/[id]/actions";
import type { ShareEntry } from "@/lib/store";
import type { Role } from "@/lib/types";

interface Props {
  docId: string;
  owner: { name: string; email: string };
  initialShares: ShareEntry[];
}

export default function ShareDialog({ docId, owner, initialShares }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [shares, setShares] = useState<ShareEntry[]>(initialShares);

  // Keep in sync when the server sends fresh data (router.refresh).
  const key = JSON.stringify(initialShares);
  useEffect(() => setShares(JSON.parse(key) as ShareEntry[]), [key]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await shareAction(docId, email, role);
      if (res.ok) {
        const added = res.share;
        setMessage({ ok: true, text: `Shared with ${added.email} as ${added.role}.` });
        setEmail("");
        setShares((prev) => [...prev.filter((s) => s.id !== added.id), added]);
        router.refresh();
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary btn-sm">
        <Share2 size={15} />
        Share
        {shares.length > 0 ? (
          <span className="-mr-1 rounded-full bg-white/20 px-1.5 text-[11px] leading-4">{shares.length}</span>
        ) : null}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Share document"
        description="Invite people by email. They need an Ajaia Docs account."
        width="max-w-lg"
      >
        <form onSubmit={submit}>
          <label htmlFor="share-email" className="label">
            Email address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="share-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (message && !message.ok) setMessage(null);
              }}
              placeholder="teammate@company.com"
              className={`input min-w-0 flex-1 ${message && !message.ok ? "input-error" : ""}`}
              aria-invalid={message ? !message.ok : undefined}
            />
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                aria-label="Permission"
                className="select w-[7.5rem]"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button type="submit" disabled={pending || !email.trim()} className="btn btn-primary">
                {pending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Invite
              </button>
            </div>
          </div>
          {message ? (
            <div role={message.ok ? "status" : "alert"} className={`${message.ok ? "alert-success" : "alert-error"} mt-3`}>
              {message.ok ? (
                <CheckCircle2 size={16} className="mt-px shrink-0" />
              ) : (
                <AlertCircle size={16} className="mt-px shrink-0" />
              )}
              {message.text}
            </div>
          ) : null}
        </form>

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">People with access</p>
          <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            <li className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={owner.name} seed={owner.email} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{owner.name} <span className="text-ink-muted">(you)</span></p>
                <p className="truncate text-xs text-ink-muted">{owner.email}</p>
              </div>
              <span className="text-xs font-medium text-ink-muted">Owner</span>
            </li>
            {shares.map((s) => (
              <ShareRowItem
                key={`${s.id}-${s.role}`}
                docId={docId}
                entry={s}
                onRemoved={(id) => {
                  setShares((prev) => prev.filter((x) => x.id !== id));
                  router.refresh();
                }}
              />
            ))}
          </ul>
          {shares.length === 0 ? (
            <p className="mt-2 text-xs text-ink-muted">Only you can see this document right now.</p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </Modal>
    </>
  );
}

function ShareRowItem({
  docId,
  entry,
  onRemoved,
}: {
  docId: string;
  entry: ShareEntry;
  onRemoved: (id: string) => void;
}) {
  const [role, setRole] = useState<Role>(entry.role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={entry.name} seed={entry.email} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.name}</p>
          <p className="truncate text-xs text-ink-muted">{entry.email}</p>
        </div>
        <select
          value={role}
          disabled={pending}
          aria-label={`Permission for ${entry.email}`}
          onChange={(e) => {
            const next = e.target.value as Role;
            const prev = role;
            setRole(next);
            setError(null);
            startTransition(async () => {
              const res = await updateShareRole(docId, entry.id, next);
              if (!res.ok) {
                setRole(prev);
                setError(res.error);
              }
            });
          }}
          className="select w-[6.75rem] py-1.5 text-[13px]"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button
          type="button"
          disabled={pending}
          aria-label={`Remove ${entry.email}`}
          className="icon-btn hover:bg-red-50 hover:text-red-700"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await revokeShare(docId, entry.id);
              if (res.ok) onRemoved(entry.id);
              else setError(res.error);
            });
          }}
        >
          <X size={16} />
        </button>
      </div>
      {error ? <p className="mt-1 pl-11 text-xs text-red-700">{error}</p> : null}
    </li>
  );
}
