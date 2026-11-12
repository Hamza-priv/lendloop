import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/shared/components/AuthShell";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell>
      <Suspense>
        {/* Path routing keeps the OAuth callback on this page, so a first-time Google
            user is handed over to sign-up instead of seeing "External Account was not found". */}
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      </Suspense>
    </AuthShell>
  );
}
