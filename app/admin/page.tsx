import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { RequireUser } from "@/features/auth/RequireUser";
import { Container } from "@/shared/components/Container";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <Container>
      <PageHeader title="Admin" subtitle="Moderate listings, manage lenders and watch the automations." />
      <RequireUser adminOnly fallback={<ListSkeleton />}>
        <AdminDashboard />
      </RequireUser>
    </Container>
  );
}
