import type { Metadata } from "next";
import { RequireUser } from "@/features/auth/RequireUser";
import { NewToolForm } from "@/features/tools/NewToolForm";
import { Container } from "@/shared/components/Container";
import { PageHeader } from "@/shared/ui/PageHeader";

export const metadata: Metadata = { title: "List a tool" };

export default function NewToolPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader title="List a tool" subtitle="Takes about a minute. You can edit or remove it any time." />
      <RequireUser>
        <NewToolForm />
      </RequireUser>
    </Container>
  );
}
