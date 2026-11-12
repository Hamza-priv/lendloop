import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireUser } from "@/features/auth/RequireUser";
import { WantedBoard } from "@/features/wanted/WantedBoard";
import { Container } from "@/shared/components/Container";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";

export const metadata: Metadata = { title: "Wanted" };

export default function WantedPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader title="Wanted" subtitle="Tools neighbours need that nobody has listed yet." />
      <RequireUser fallback={<ListSkeleton />}>
        <Suspense fallback={<ListSkeleton />}>
          <WantedBoard />
        </Suspense>
      </RequireUser>
    </Container>
  );
}
