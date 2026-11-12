import type { Metadata } from "next";
import { RequireUser } from "@/features/auth/RequireUser";
import { MyRequests } from "@/features/loans/LoanList";
import { Container } from "@/shared/components/Container";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";

export const metadata: Metadata = { title: "My requests" };

export default function RequestsPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader title="My requests" subtitle="Things you've asked to borrow." />
      <RequireUser fallback={<ListSkeleton />}>
        <MyRequests />
      </RequireUser>
    </Container>
  );
}
