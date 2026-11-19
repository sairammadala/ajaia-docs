import Link from "next/link";
import { FileQuestion } from "lucide-react";
import Logo from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <span className="mt-12 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card">
        <FileQuestion size={26} />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Document not available</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-muted">
        It may have been deleted, or it hasn’t been shared with you. Ask the owner to invite you.
      </p>
      <Link href="/dashboard" className="btn btn-primary mt-7">
        Back to your documents
      </Link>
    </main>
  );
}
