import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/shared/components/AuthShell";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthShell>
      <Suspense>
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
      </Suspense>
    </AuthShell>
  );
}
