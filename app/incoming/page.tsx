import type { Metadata } from "next";
import { RequireUser } from "@/features/auth/RequireUser";
import { IncomingRequests } from "@/features/loans/LoanList";
import { Container } from "@/shared/components/Container";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";

export const metadata: Metadata = { title: "Incoming requests" };

export default function IncomingPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader title="Incoming requests" subtitle="Neighbours asking to borrow your tools." />
      <RequireUser fallback={<ListSkeleton />}>
        <IncomingRequests />
      </RequireUser>
    </Container>
  );
}
