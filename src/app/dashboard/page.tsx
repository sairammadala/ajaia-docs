import type { Metadata } from "next";
import { Share2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listDocuments } from "@/lib/store";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";
import DocCard from "@/components/DocCard";
import DashboardActions from "@/components/DashboardActions";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documents" };

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const docs = await listDocuments(user.id);
  const owned = docs.filter((d) => d.role === "owner");
  const shared = docs.filter((d) => d.role !== "owner");
  const firstName = user.display_name.split(" ")[0];

  return (
    <div className="min-h-screen">
      <AutoRefresh />
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <UserMenu name={user.display_name} email={user.email} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700" suppressHydrationWarning>
              {greeting()}, {firstName}
            </p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Your documents</h1>
          </div>
          {docs.length > 0 ? <DashboardActions /> : null}
        </div>

        {docs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-10 space-y-12">
            <Section
              title="Owned by you"
              count={owned.length}
              dot="bg-brand-600"
              empty="You haven’t created any documents yet."
            >
              {owned.map((d) => (
                <DocCard key={d.id} doc={d} />
              ))}
            </Section>
            <Section
              title="Shared with you"
              count={shared.length}
              dot="bg-amber-400"
              empty="When someone shares a document with you, it will appear here."
            >
              {shared.map((d) => (
                <DocCard key={d.id} doc={d} />
              ))}
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  count,
  dot,
  empty,
  children,
}: {
  title: string;
  count: number;
  dot: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`sec-${title}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
        <h2 id={`sec-${title}`} className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
          {title}
        </h2>
        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink-muted">{count}</span>
      </div>
      {count === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-5 py-6 text-sm text-ink-muted">
          <Share2 size={16} className="shrink-0 text-ink-faint" />
          {empty}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-16 text-center">
      <svg width="168" height="132" viewBox="0 0 168 132" fill="none" aria-hidden="true">
        <ellipse cx="84" cy="120" rx="58" ry="7" fill="#e6e1d6" />
        <rect x="30" y="26" width="76" height="92" rx="9" transform="rotate(-8 30 26)" fill="#d6ebe6" />
        <rect x="52" y="14" width="80" height="98" rx="9" transform="rotate(5 52 14)" fill="#fff" stroke="#d3cdbd" strokeWidth="2" />
        <rect x="68" y="38" width="42" height="6" rx="3" fill="#1d5248" transform="rotate(5 68 38)" />
        <rect x="68" y="54" width="50" height="4" rx="2" fill="#e6e1d6" transform="rotate(5 68 54)" />
        <rect x="68" y="64" width="44" height="4" rx="2" fill="#e6e1d6" transform="rotate(5 68 64)" />
        <rect x="68" y="74" width="30" height="4" rx="2" fill="#e6e1d6" transform="rotate(5 68 74)" />
        <circle cx="132" cy="30" r="15" fill="#fbbf24" />
        <path d="M132 23v14M125 30h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight">Start your first document</h2>
      <p className="mt-2 max-w-md text-[15px] text-ink-muted">
        Write something new, or upload a .docx, .md or .txt file and keep editing it here. Share it with a
        teammate whenever you’re ready.
      </p>
      <div className="mt-7">
        <DashboardActions large />
      </div>
    </div>
  );
}
