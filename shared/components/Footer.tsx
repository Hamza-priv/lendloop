import Link from "next/link";
import { LogoMark } from "./Logo";

const LINKS = [
  { href: "/guide", label: "Guide" },
  { href: "/about", label: "About" },
  { href: "/guide#safety", label: "Safety" },
  { href: "/guide#faq", label: "FAQ" },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-6" />
          <span className="font-medium text-zinc-700">LendLoop</span>
          <span className="hidden md:inline">· Borrow what you need. Lend what you don&apos;t.</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-zinc-900">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
