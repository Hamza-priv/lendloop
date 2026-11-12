import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireUser } from "@/features/auth/RequireUser";
import { MessagesView } from "@/features/messages/MessagesView";
import { Container } from "@/shared/components/Container";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <Container>
      <PageHeader title="Messages" subtitle="Chat with neighbours about tools and pickups. New messages are also emailed." />
      <RequireUser fallback={<ListSkeleton />}>
        <Suspense fallback={<ListSkeleton />}>
          <MessagesView />
        </Suspense>
      </RequireUser>
    </Container>
  );
}
