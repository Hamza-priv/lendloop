import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { AssistantWidget } from "@/features/assistant/AssistantWidget";
import { Footer } from "@/shared/components/Footer";
import { Header } from "@/shared/components/Header";
import { ConfirmProvider } from "@/shared/providers/ConfirmProvider";
import { ConvexClientProvider } from "@/shared/providers/ConvexClientProvider";
import { clerkAppearance } from "@/shared/lib/clerkAppearance";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LendLoop · Borrow what you need. Lend what you don't.", template: "%s · LendLoop" },
  description: "A neighbourhood tool-lending board. List tools, borrow from neighbours, get reminders.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>
            <ConfirmProvider>
              <Suspense fallback={<div className="h-16 border-b border-zinc-200/80 bg-white" />}>
                <Header />
              </Suspense>
              <div className="flex flex-1 flex-col">{children}</div>
              <Footer />
              <AssistantWidget />
              <Toaster position="top-center" richColors closeButton toastOptions={{ className: "font-sans" }} />
            </ConfirmProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
