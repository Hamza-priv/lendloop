"use client";

import { Inbox, Send } from "lucide-react";
import { ButtonLink } from "@/shared/ui/Button";
import { EmptyState, SectionTitle } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";
import { useIncomingRequests, useMyRequests, type LoanView } from "./hooks";
import { LoanCard } from "./LoanCard";

type Group = { title: string; loans: LoanView[] };

function groupLoans(loans: LoanView[], pendingTitle: string): Group[] {
  return [
    { title: pendingTitle, loans: loans.filter((l) => l.status === "requested") },
    { title: "Active loans", loans: loans.filter((l) => l.status === "approved") },
    { title: "History", loans: loans.filter((l) => l.status !== "requested" && l.status !== "approved") },
  ].filter((g) => g.loans.length > 0);
}

function Grouped({ loans, perspective, pendingTitle }: { loans: LoanView[]; perspective: "borrower" | "lender"; pendingTitle: string }) {
  return (
    <div className="space-y-10">
      {groupLoans(loans, pendingTitle).map((g) => (
        <section key={g.title}>
          <SectionTitle count={g.loans.length}>{g.title}</SectionTitle>
          <div className="space-y-3">
            {g.loans.map((loan) => (
              <LoanCard key={loan._id} loan={loan} perspective={perspective} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function MyRequests() {
  const loans = useMyRequests();
  if (loans === undefined) return <ListSkeleton />;
  if (loans.length === 0) {
    return (
      <EmptyState icon={<Send />} title="No requests yet" action={<ButtonLink href="/tools">Browse tools</ButtonLink>}>
        Find something you need and ask to borrow it for a few days.
      </EmptyState>
    );
  }
  return <Grouped loans={loans} perspective="borrower" pendingTitle="Waiting for an answer" />;
}

export function IncomingRequests() {
  const loans = useIncomingRequests();
  if (loans === undefined) return <ListSkeleton />;
  if (loans.length === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="No incoming requests"
        action={<ButtonLink href="/listings" variant="secondary">View my listings</ButtonLink>}
      >
        When a neighbour asks to borrow one of your tools, it shows up here.
      </EmptyState>
    );
  }
  return <Grouped loans={loans} perspective="lender" pendingTitle="Needs your answer" />;
}
