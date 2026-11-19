import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="workspace flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm text-ink-soft shadow-lift">
        <Loader2 size={16} className="animate-spin text-brand-600" />
        Opening document…
      </div>
    </div>
  );
}
