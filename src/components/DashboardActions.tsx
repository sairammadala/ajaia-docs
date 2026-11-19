"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { FilePlus2, Loader2, Upload } from "lucide-react";
import { createDocument } from "@/app/dashboard/actions";
import UploadModal from "@/components/UploadModal";

function NewButton({ large }: { large: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn-primary ${large ? "btn-lg" : ""}`}>
      {pending ? <Loader2 size={17} className="animate-spin" /> : <FilePlus2 size={17} />}
      {pending ? "Creating…" : "New document"}
    </button>
  );
}

/** The two primary dashboard actions. Used in the page header and the empty state. */
export default function DashboardActions({ large = false }: { large?: boolean }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={createDocument}>
        <NewButton large={large} />
      </form>
      <button
        type="button"
        onClick={() => setUploadOpen(true)}
        className={`btn btn-secondary ${large ? "btn-lg" : ""}`}
      >
        <Upload size={17} />
        Upload file
      </button>
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
