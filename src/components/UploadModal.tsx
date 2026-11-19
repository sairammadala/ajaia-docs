"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, FileText, Loader2, UploadCloud, X } from "lucide-react";
import Modal from "@/components/Modal";
import { importDocument } from "@/app/dashboard/actions";
import { importError, MAX_IMPORT_LABEL } from "@/lib/markdown";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/leave fire for every child element; count to avoid flicker.
  const dragDepth = useRef(0);

  function reset() {
    setFile(null);
    setError(null);
    setDragging(false);
    dragDepth.current = 0;
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    if (pending) return;
    reset();
    onClose();
  }

  function pick(f: File | undefined | null) {
    if (!f) return;
    const problem = importError(f.name, f.size);
    if (problem) {
      setFile(null);
      setError(problem);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    setFile(f);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file to upload first.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    setError(null);
    startTransition(async () => {
      const res = await importDocument(fd); // redirects to the new doc on success
      if (res?.error) setError(res.error);
    });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upload a file"
      description="We’ll turn it into a new document you can edit right away."
      width="max-w-lg"
    >
      <form onSubmit={submit}>
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition duration-150 ${
            dragging
              ? "scale-[1.01] border-brand-500 bg-brand-50"
              : error
                ? "border-red-300 bg-red-50/40"
                : "border-line-strong bg-paper hover:border-brand-400"
          }`}
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              dragging ? "bg-brand-600 text-white" : "bg-white text-brand-700 shadow-card"
            }`}
          >
            <UploadCloud size={22} />
          </span>
          <p className="mt-4 text-sm font-medium">
            {dragging ? "Drop to upload" : "Drag a file here, or"}{" "}
            {!dragging ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
              >
                browse
              </button>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-ink-muted">.txt, .md or .docx · up to {MAX_IMPORT_LABEL}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,.markdown,.docx"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        {file ? (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <FileText size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-ink-muted">{formatSize(file.size)}</p>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove file"
              disabled={pending}
              onClick={reset}
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="alert-error mt-3">
            <AlertCircle size={16} className="mt-px shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={close} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || !file}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {pending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
