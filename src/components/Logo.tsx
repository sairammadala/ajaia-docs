import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1d5248" />
      <path d="M10 7h8l5 5v13a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" fill="#f7f5f0" />
      <path d="M18 7l5 5h-4a1 1 0 0 1-1-1z" fill="#7dbcb1" />
      <path d="M12.5 17h7M12.5 20.5h7M12.5 24h4" stroke="#1d5248" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({
  href = "/dashboard",
  tone = "dark",
}: {
  href?: string | null;
  tone?: "dark" | "light";
}) {
  const inner = (
    <>
      <LogoMark />
      <span
        className={`font-display text-[19px] font-semibold tracking-tight ${
          tone === "light" ? "text-white" : "text-ink"
        }`}
      >
        Ajaia<span className={tone === "light" ? "text-brand-300" : "text-brand-600"}> Docs</span>
      </span>
    </>
  );
  const cls = "inline-flex items-center gap-2.5 rounded-lg";
  return href ? (
    <Link href={href} className={cls} aria-label="Ajaia Docs home">
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
