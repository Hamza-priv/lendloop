import type { ReactNode } from "react";

/** Standard page width and padding for signed-in pages. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 ${className}`}>{children}</main>;
}
