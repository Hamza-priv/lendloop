import type { Metadata } from "next";
import { RequireUser } from "@/features/auth/RequireUser";
import { MyListings } from "@/features/tools/MyListings";
import { Container } from "@/shared/components/Container";
import { ButtonLink } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";

export const metadata: Metadata = { title: "My listings" };

export default function ListingsPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader
        title="My listings"
        subtitle="Tools you're sharing with the neighbourhood."
        action={<ButtonLink href="/tools/new">List a tool</ButtonLink>}
      />
      <RequireUser fallback={<ListSkeleton />}>
        <MyListings />
      </RequireUser>
    </Container>
  );
}
