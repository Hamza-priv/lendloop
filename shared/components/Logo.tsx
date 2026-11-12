import Link from "next/link";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center rounded-lg bg-brand-700 text-white shadow-sm ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" className="size-[62%]" aria-hidden>
        <circle cx="9" cy="12" r="5" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="15" cy="12" r="5" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.65" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="LendLoop home">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight text-zinc-950">LendLoop</span>
    </Link>
  );
}
