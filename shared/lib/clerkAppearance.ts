/** Makes Clerk's components match the app's colours and corners. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#047857",
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    borderRadius: "0.6rem",
    fontFamily: "var(--font-geist-sans)",
  },
  elements: {
    card: "shadow-none border-0",
    rootBox: "w-full",
    cardBox: "w-full shadow-lift border border-zinc-200/80 rounded-2xl",
    footer: "bg-zinc-50",
  },
};
