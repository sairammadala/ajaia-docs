"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  AlertTriangle,
  Bold,
  Check,
  ChevronLeft,
  Cloud,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
  Pilcrow,
} from "lucide-react";
import { saveContent, renameDocument } from "@/app/doc/[id]/actions";
import { LogoMark } from "@/components/Logo";
import ShareDialog from "@/components/ShareDialog";
import UserMenu from "@/components/UserMenu";
import type { ShareEntry } from "@/lib/store";

type SaveState = "idle" | "saving" | "saved" | "error";

const POLL_MS = 3000; // pick up collaborators' edits
const REFRESH_MS = 15000; // refresh role / share list from the server

interface Props {
  docId: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
  canEdit: boolean;
  isOwner: boolean;
  owner: { name: string; email: string };
  user: { name: string; email: string };
  shares: ShareEntry[];
}

export default function Editor({
  docId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
  canEdit,
  isOwner,
  owner,
  user,
  shares,
}: Props) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [title, setTitle] = useState(initialTitle);
  const [remoteNotice, setRemoteNotice] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHtml = useRef<string | null>(null);
  const pendingTitle = useRef<string | null>(null);
  const inFlight = useRef(0);
  const lastSeen = useRef(initialUpdatedAt);
  const titleFocused = useRef(false);

  const markSeen = (ts: string) => {
    if (ts && ts > lastSeen.current) lastSeen.current = ts;
  };

  const persist = useCallback(
    (html: string) => {
      if (!canEdit) return;
      setSaveState("saving");
      inFlight.current += 1;
      saveContent(docId, html)
        .then((r) => {
          if (r.ok) markSeen(r.updatedAt);
          setSaveState(r.ok ? "saved" : "error");
        })
        .catch(() => setSaveState("error"))
        .finally(() => {
          inFlight.current -= 1;
        });
    },
    [canEdit, docId],
  );

  const persistTitle = useCallback(
    (value: string) => {
      inFlight.current += 1;
      setSaveState("saving");
      renameDocument(docId, value)
        .then((r) => {
          if (r.ok) markSeen(r.updatedAt);
          setSaveState(r.ok ? "saved" : "error");
        })
        .catch(() => setSaveState("error"))
        .finally(() => {
          inFlight.current -= 1;
        });
    },
    [docId],
  );

  /** Send anything still waiting on a debounce timer right now. */
  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (titleTimer.current) {
      clearTimeout(titleTimer.current);
      titleTimer.current = null;
    }
    if (pendingHtml.current !== null) {
      const html = pendingHtml.current;
      pendingHtml.current = null;
      persist(html);
    }
    if (pendingTitle.current !== null) {
      const t = pendingTitle.current;
      pendingTitle.current = null;
      persistTitle(t);
    }
  }, [persist, persistTitle]);

  const editor = useEditor({
    editable: canEdit,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), Underline],
    content: initialContent || "<p></p>",
    editorProps: {
      attributes: { class: "doc-content", "data-placeholder": "Start writing…" },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      pendingHtml.current = editor.getHTML();
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        flush();
      }, 800);
    },
  });

  useEffect(() => {
    editor?.setEditable(canEdit);
  }, [editor, canEdit]);

  // Flush on tab hide / close / navigating away so the last keystrokes aren't lost.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  // ---- Live sync: pick up changes made by other people ----
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    const hasLocalChanges = () =>
      saveTimer.current !== null || titleTimer.current !== null || inFlight.current > 0;

    async function pull() {
      if (cancelled || document.visibilityState !== "visible") return;
      let res: Response;
      try {
        res = await fetch(`/api/documents/${docId}`, { cache: "no-store" });
      } catch {
        return;
      }
      if (cancelled) return;
      if (res.status === 404 || res.status === 401) {
        router.refresh(); // deleted or access revoked: the server page decides
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { title: string; content: string; updated_at: string };
      if (cancelled || data.updated_at <= lastSeen.current) return;
      if (hasLocalChanges()) return; // never clobber what this user is typing

      lastSeen.current = data.updated_at;
      if (data.content !== editor!.getHTML()) {
        const { from, to } = editor!.state.selection;
        editor!.commands.setContent(data.content || "<p></p>", false);
        const max = editor!.state.doc.content.size;
        editor!.commands.setTextSelection({ from: Math.min(from, max), to: Math.min(to, max) });
        setRemoteNotice(true);
      }
      if (!titleFocused.current) setTitle(data.title);
    }

    const poll = setInterval(pull, POLL_MS);
    const refresh = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    const onFocus = () => {
      pull();
      router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(refresh);
      window.removeEventListener("focus", onFocus);
    };
  }, [editor, docId, router]);

  useEffect(() => {
    if (!remoteNotice) return;
    const t = setTimeout(() => setRemoteNotice(false), 2500);
    return () => clearTimeout(t);
  }, [remoteNotice]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!canEdit) return;
    pendingTitle.current = value;
    setSaveState("saving");
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      titleTimer.current = null;
      flush();
    }, 600);
  }

  const roleLabel = isOwner ? null : canEdit ? "Can edit" : "View only";

  return (
    <div className="flex min-h-screen flex-col">
      {/* ---------- top bar ---------- */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <span className="tip" data-tip="Back to documents">
            <Link href="/dashboard" className="icon-btn" aria-label="Back to documents" onClick={flush}>
              <ChevronLeft size={20} />
            </Link>
          </span>
          <LogoMark size={26} />

          <div className="mx-1 min-w-0 flex-1">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onFocus={() => (titleFocused.current = true)}
              onBlur={() => {
                titleFocused.current = false;
                flush();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                  editor?.commands.focus("start");
                }
              }}
              readOnly={!canEdit}
              maxLength={200}
              placeholder="Untitled document"
              aria-label="Document title"
              title={canEdit ? "Click to rename" : undefined}
              className={`w-full max-w-xl truncate rounded-md border border-transparent bg-transparent px-2 py-1 font-display text-lg font-semibold tracking-tight text-ink outline-none transition placeholder:text-ink-faint ${
                canEdit
                  ? "hover:border-line-strong hover:bg-paper focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/25"
                  : "cursor-default"
              }`}
            />
          </div>

          <SaveStatus state={saveState} canEdit={canEdit} remote={remoteNotice} />

          {roleLabel ? (
            <span className="badge hidden bg-amber-50 text-amber-800 sm:inline-flex">
              {canEdit ? null : <Eye size={11} />} {roleLabel}
            </span>
          ) : null}
          {isOwner ? <ShareDialog docId={docId} owner={owner} initialShares={shares} /> : null}
          <div className="ml-1">
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>

        {/* ---------- toolbar ---------- */}
        {canEdit && editor ? <Toolbar editor={editor} /> : null}
      </header>

      {!canEdit ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-900">
          You’re viewing <strong>{owner.name}</strong>’s document in read-only mode. Updates appear live.
        </div>
      ) : null}

      {/* ---------- page ---------- */}
      <main className="workspace flex-1 px-3 py-6 sm:px-6 sm:py-10">
        <article className="mx-auto min-h-[70vh] w-full max-w-[816px] rounded-lg bg-white px-6 py-10 shadow-sheet sm:px-16 sm:py-16">
          <EditorContent editor={editor} />
        </article>
      </main>
    </div>
  );
}

function SaveStatus({ state, canEdit, remote }: { state: SaveState; canEdit: boolean; remote: boolean }) {
  const base = "hidden items-center gap-1.5 whitespace-nowrap text-xs md:inline-flex";
  if (remote)
    return (
      <span className={`${base} text-brand-700`} role="status">
        <Cloud size={13} /> Updated by a collaborator
      </span>
    );
  if (!canEdit)
    return (
      <span className={`${base} text-ink-muted`}>
        <Cloud size={13} /> Live updates on
      </span>
    );
  if (state === "saving")
    return (
      <span className={`${base} text-ink-muted`} role="status">
        <Loader2 size={13} className="animate-spin" /> Saving…
      </span>
    );
  if (state === "error")
    return (
      <span className={`${base} text-red-600`} role="alert">
        <AlertTriangle size={13} /> Couldn’t save. Keep typing to retry
      </span>
    );
  return (
    <span className={`${base} text-ink-muted`} role="status">
      <Check size={13} className="text-brand-600" /> {state === "saved" ? "Saved" : "All changes saved"}
    </span>
  );
}

function Btn({
  label,
  shortcut,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="tip" data-tip={shortcut ? `${label}  ${shortcut}` : label}>
      <button
        type="button"
        // keep the editor selection when clicking toolbar buttons
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition duration-150 disabled:pointer-events-none disabled:opacity-35 ${
          active
            ? "bg-brand-100 text-brand-800 shadow-[inset_0_0_0_1px_rgba(35,103,88,0.25)]"
            : "text-ink-soft hover:bg-ink/5 hover:text-ink"
        }`}
      >
        {children}
      </button>
    </span>
  );
}

function Group({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-0.5">
      {children}
    </div>
  );
}

const Sep = () => <span className="mx-2 h-5 w-px bg-line" aria-hidden />;

function Toolbar({ editor }: { editor: TiptapEditor }) {
  const run = () => editor.chain().focus();
  const S = 17;
  return (
    <div className="flex items-center overflow-x-auto border-t border-line bg-paper/70 px-3 py-1.5 sm:justify-center">
      <Group label="History">
        <Btn label="Undo" shortcut="Ctrl+Z" disabled={!editor.can().undo()} onClick={() => run().undo().run()}>
          <Undo2 size={S} />
        </Btn>
        <Btn label="Redo" shortcut="Ctrl+Shift+Z" disabled={!editor.can().redo()} onClick={() => run().redo().run()}>
          <Redo2 size={S} />
        </Btn>
      </Group>
      <Sep />
      <Group label="Text style">
        <Btn label="Body text" active={editor.isActive("paragraph")} onClick={() => run().setParagraph().run()}>
          <Pilcrow size={S} />
        </Btn>
        <Btn label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => run().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={S} />
        </Btn>
        <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => run().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={S} />
        </Btn>
        <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => run().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={S} />
        </Btn>
      </Group>
      <Sep />
      <Group label="Formatting">
        <Btn label="Bold" shortcut="Ctrl+B" active={editor.isActive("bold")} onClick={() => run().toggleBold().run()}>
          <Bold size={S} />
        </Btn>
        <Btn label="Italic" shortcut="Ctrl+I" active={editor.isActive("italic")} onClick={() => run().toggleItalic().run()}>
          <Italic size={S} />
        </Btn>
        <Btn label="Underline" shortcut="Ctrl+U" active={editor.isActive("underline")} onClick={() => run().toggleUnderline().run()}>
          <UnderlineIcon size={S} />
        </Btn>
      </Group>
      <Sep />
      <Group label="Lists">
        <Btn label="Bulleted list" shortcut="Ctrl+Shift+8" active={editor.isActive("bulletList")} onClick={() => run().toggleBulletList().run()}>
          <List size={S} />
        </Btn>
        <Btn label="Numbered list" shortcut="Ctrl+Shift+7" active={editor.isActive("orderedList")} onClick={() => run().toggleOrderedList().run()}>
          <ListOrdered size={S} />
        </Btn>
        <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => run().toggleBlockquote().run()}>
          <Quote size={S} />
        </Btn>
      </Group>
    </div>
  );
}
