import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireUser } from "@/features/auth/RequireUser";
import { BrowseTools } from "@/features/tools/BrowseTools";
import { Container } from "@/shared/components/Container";
import { ButtonLink } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { CardGridSkeleton } from "@/shared/ui/Skeleton";

export const metadata: Metadata = { title: "Browse tools" };

export default function ToolsPage() {
  return (
    <Container>
      <PageHeader
        title="Browse tools"
        subtitle="Everything your neighbours are happy to lend."
        action={<ButtonLink href="/tools/new" variant="secondary">List a tool</ButtonLink>}
      />
      <RequireUser fallback={<CardGridSkeleton />}>
        <Suspense fallback={<CardGridSkeleton />}>
          <BrowseTools />
        </Suspense>
      </RequireUser>
    </Container>
  );
}
