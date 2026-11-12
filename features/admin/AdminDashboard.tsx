"use client";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  HandCoins,
  Package,
  RefreshCw,
  Trash2,
  Users as UsersIcon,
  Workflow,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { LoanCard } from "@/features/loans/LoanCard";
import { useBrowseTools } from "@/features/tools/hooks";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { CategoryTile } from "@/shared/lib/categories";
import { errorMessage } from "@/shared/lib/errors";
import { CATEGORY_LABELS, timeAgo } from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/Avatar";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/PageHeader";
import { ListSkeleton, Skeleton } from "@/shared/ui/Skeleton";
import {
  useAdminUsers,
  useAllLoans,
  useAutomationHealth,
  useDismissError,
  useRemoveListing,
  useRetryEvent,
  useSetTrustedLender,
} from "./hooks";

async function attempt(fn: () => Promise<unknown>, success: string) {
  try {
    await fn();
    toast.success(success);
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

function Stat({ icon, label, value, tone = "default" }: { icon: ReactNode; label: string; value?: number; tone?: "default" | "warn" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500">{label}</span>
        <span className={`[&_svg]:size-4 ${tone === "warn" && value ? "text-red-600" : "text-zinc-400"}`}>{icon}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="mt-3 h-8 w-12" />
      ) : (
        <p className={`mt-2 text-3xl font-semibold tracking-tight ${tone === "warn" && value ? "text-red-700" : "text-zinc-950"}`}>
          {value}
        </p>
      )}
    </Card>
  );
}

function AutomationHealth() {
  const health = useAutomationHealth();
  const retry = useRetryEvent();
  const dismiss = useDismissError();
  if (!health) return <ListSkeleton count={2} />;
  if (health.failedEvents.length === 0 && health.errors.length === 0) {
    return (
      <EmptyState icon={<CheckCircle2 className="text-emerald-600" />} title="All systems normal">
        No failed notifications and no n8n workflow errors.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-6">
      {health.failedEvents.length > 0 && (
        <Card className="divide-y divide-zinc-100">
          <p className="px-5 py-3 text-sm font-semibold text-zinc-900">Failed notifications</p>
          {health.failedEvents.map((e) => (
            <div key={e._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-zinc-900">
                  {e.type.replace("loan.", "Loan ")} · {e.toolName}
                </p>
                <p className="mt-0.5 truncate text-zinc-500">
                  {e.attempts} attempts{e.lastError ? ` · ${e.lastError}` : ""}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => attempt(() => retry({ outboxId: e._id }), "Retry scheduled")}>
                <RefreshCw /> Retry
              </Button>
            </div>
          ))}
        </Card>
      )}
      {health.errors.length > 0 && (
        <Card className="divide-y divide-zinc-100">
          <p className="px-5 py-3 text-sm font-semibold text-zinc-900">n8n workflow errors</p>
          {health.errors.map((e) => (
            <div key={e._id} className="flex items-start gap-3 px-5 py-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">
                  {e.workflow}
                  {e.node && <span className="font-normal text-zinc-500"> / {e.node}</span>}
                </p>
                <p className="mt-0.5 break-words text-zinc-600">{e.message}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-xs text-zinc-400">{timeAgo(e._creationTime)}</span>
                <Button size="sm" variant="ghost" onClick={() => attempt(() => dismiss({ errorId: e._id }), "Error dismissed")}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Users() {
  const users = useAdminUsers();
  const setTrusted = useSetTrustedLender();
  if (!users) return <ListSkeleton />;
  return (
    <Card className="divide-y divide-zinc-100">
      {users.map((u) => (
        <div key={u._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={u.name} size="md" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900">
                {u.name}
                {u.role === "admin" && <Badge tone="violet">Admin</Badge>}
                {u.trustedLender && (
                  <Badge tone="green" icon={<BadgeCheck />}>
                    Trusted Lender
                  </Badge>
                )}
              </p>
              <p className="truncate text-sm text-zinc-500">{u.email || "No email"}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant={u.trustedLender ? "secondary" : "subtle"}
            onClick={() =>
              attempt(
                () => setTrusted({ userId: u._id, trusted: !u.trustedLender }),
                u.trustedLender ? `${u.name} is no longer a Trusted Lender` : `${u.name} is now a Trusted Lender`,
              )
            }
          >
            {u.trustedLender ? "Remove badge" : (
              <>
                <BadgeCheck /> Mark trusted
              </>
            )}
          </Button>
        </div>
      ))}
    </Card>
  );
}

function Listings() {
  const tools = useBrowseTools();
  const remove = useRemoveListing();
  const confirm = useConfirm();
  if (!tools) return <ListSkeleton />;
  if (tools.length === 0) return <EmptyState icon={<Package />} title="No listings" />;
  const onRemove = async (toolId: Id<"tools">, name: string) => {
    const ok = await confirm({
      title: `Remove "${name}"?`,
      description: "It is removed for everyone, and pending requests for it are declined.",
      confirmLabel: "Remove listing",
    });
    if (ok) await attempt(() => remove({ toolId }), "Listing removed");
  };
  return (
    <Card className="divide-y divide-zinc-100">
      {tools.map((t) => (
        <div key={t._id} className="flex items-center gap-3 px-5 py-3.5">
          <CategoryTile category={t.category} size="sm" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium text-zinc-900">{t.name}</p>
            <p className="text-zinc-500">
              {CATEGORY_LABELS[t.category]} · {t.isMine ? "You" : t.owner.name}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => onRemove(t._id, t.name)}>
            <Trash2 /> <span className="hidden sm:inline">Remove</span>
          </Button>
        </div>
      ))}
    </Card>
  );
}

function AllLoans() {
  const loans = useAllLoans();
  if (!loans) return <ListSkeleton />;
  if (loans.length === 0) return <EmptyState icon={<HandCoins />} title="No loans yet" />;
  return (
    <div className="space-y-3">
      {loans.map((loan) => (
        <LoanCard key={loan._id} loan={loan} perspective="admin" />
      ))}
    </div>
  );
}

const TABS = [
  { id: "health", label: "Automation health", icon: Workflow },
  { id: "loans", label: "All loans", icon: HandCoins },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "listings", label: "Listings", icon: Package },
] as const;

export function AdminDashboard() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("health");
  const users = useAdminUsers();
  const tools = useBrowseTools();
  const loans = useAllLoans();
  const health = useAutomationHealth();
  const problems = health ? health.failedEvents.length + health.errors.length : undefined;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<UsersIcon />} label="Users" value={users?.length} />
        <Stat icon={<Package />} label="Listings" value={tools?.length} />
        <Stat icon={<Activity />} label="Active loans" value={loans?.filter((l) => l.status === "approved").length} />
        <Stat icon={<AlertTriangle />} label="Automation issues" value={problems} tone="warn" />
      </div>

      <div>
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200 [scrollbar-width:none]" role="tablist">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`-mb-px flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  active ? "border-zinc-900 text-zinc-950" : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <t.icon className="size-4" />
                {t.label}
                {t.id === "health" && problems ? (
                  <span className="rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700">{problems}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div role="tabpanel">
          {tab === "health" && <AutomationHealth />}
          {tab === "loans" && <AllLoans />}
          {tab === "users" && <Users />}
          {tab === "listings" && <Listings />}
        </div>
      </div>
    </div>
  );
}
