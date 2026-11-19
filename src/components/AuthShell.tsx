import { Check, Share2, FileUp, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";

const POINTS = [
  { icon: Sparkles, text: "Rich-text editing with autosave. No save button, nothing lost." },
  { icon: Share2, text: "Share by email as viewer or editor, and change it any time." },
  { icon: FileUp, text: "Bring your work in from .docx, .md or .txt files." },
];

/** Split-screen frame: brand panel on the left, form on the right. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* decorative rings */}
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-56 -left-40 h-[38rem] w-[38rem] rounded-full bg-brand-800/60" />

        <div className="relative">
          <Logo href={null} tone="light" />
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-[2.75rem] font-semibold leading-[1.08] tracking-tight">
            Your team’s writing,
            <br />
            <span className="text-brand-300">in one calm place.</span>
          </h1>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[15px] leading-6 text-brand-100">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={15} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* floating mini document */}
        <div className="relative">
          <div className="max-w-sm animate-float rounded-xl bg-white p-5 text-ink shadow-pop">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold">Launch plan</p>
              <span className="badge bg-brand-100 text-brand-800">
                <Check size={11} /> Saved
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2 w-11/12 rounded bg-line" />
              <div className="h-2 w-9/12 rounded bg-line" />
              <div className="h-2 w-10/12 rounded bg-line" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <span className="flex -space-x-1.5">
                <span className="h-5 w-5 rounded-full border-2 border-white bg-brand-300" />
                <span className="h-5 w-5 rounded-full border-2 border-white bg-amber-300" />
              </span>
              Shared with 2 people
            </div>
          </div>
        </div>
      </aside>

      <section className="flex flex-col px-6 py-8 sm:px-12">
        <div className="lg:hidden">
          <Logo href={null} />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          {children}
        </div>
        <p className="text-center text-xs text-ink-faint">© Ajaia Docs · Built for the Ajaia take-home</p>
      </section>
    </main>
  );
}
