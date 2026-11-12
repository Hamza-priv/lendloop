"use client";

import { BadgeCheck, CalendarClock, HandHelping, MessageCircle, Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { CategoryTile } from "@/shared/lib/categories";
import { errorMessage } from "@/shared/lib/errors";
import { CATEGORIES, CATEGORY_LABELS, formatDate, timeAgo, todayIso, type Category } from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/Avatar";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Dialog } from "@/shared/ui/Dialog";
import { Field, FormError, Input, Select, Textarea } from "@/shared/ui/Field";
import { EmptyState, SectionTitle } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";
import { type WantedPost, useCloseWanted, useCreateWanted, useRespondWanted, useWantedList } from "./hooks";

function PostForm({ initialTitle, onDone }: { initialTitle: string; onDone: () => void }) {
  const create = useCreateWanted();
  const [title, setTitle] = useState(initialTitle);
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [neededBy, setNeededBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await create({ title, details, category: category || undefined, neededBy: neededBy || undefined });
      toast.success("Request posted", { description: "Neighbours can now offer theirs. You'll be told about matching listings too." });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="What do you need?" htmlFor="wanted-title">
        <Input
          id="wanted-title"
          required
          minLength={3}
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Screwdriver set"
          autoFocus
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="wanted-category" hint="Optional">
          <Select id="wanted-category" value={category} onChange={(e) => setCategory(e.target.value as Category | "")}>
            <option value="">Any</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Needed by" htmlFor="wanted-date" hint="Optional">
          <Input id="wanted-date" type="date" min={todayIso()} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
        </Field>
      </div>
      <Field label="Details" htmlFor="wanted-details" hint={`Optional. What it's for and for how long. ${details.length}/500`}>
        <Textarea
          id="wanted-details"
          rows={3}
          maxLength={500}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Putting together a wardrobe on Saturday, need it for an afternoon."
        />
      </Field>
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Post request
        </Button>
      </div>
    </form>
  );
}

function PostCard({ post }: { post: WantedPost }) {
  const respond = useRespondWanted();
  const close = useCloseWanted();
  const confirm = useConfirm();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function offer() {
    setBusy(true);
    try {
      router.push(`/messages?c=${await respond({ wantedId: post._id })}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  async function onClose() {
    const ok = await confirm({
      title: "Close this request?",
      description: "It disappears from the board. Chats you've started stay in Messages.",
      confirmLabel: "Close request",
      cancelLabel: "Keep it open",
    });
    if (!ok) return;
    try {
      await close({ wantedId: post._id });
      toast.success("Request closed");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
      <div className="flex min-w-0 flex-1 gap-4">
        {post.category ? (
          <CategoryTile category={post.category} />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 ring-inset">
            <HandHelping className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-zinc-950">{post.title}</h3>
            {post.neededBy && (
              <Badge tone="amber" icon={<CalendarClock />}>
                Needed by {formatDate(post.neededBy)}
              </Badge>
            )}
            {post.isMine && post.offers > 0 && (
              <Badge tone="green">
                {post.offers} {post.offers === 1 ? "offer" : "offers"}
              </Badge>
            )}
          </div>
          {post.details && <p className="text-sm leading-relaxed text-zinc-600">{post.details}</p>}
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Avatar name={post.requester.name} size="xs" />
            {post.isMine ? "You" : post.requester.name}
            {post.requester.trustedLender && <BadgeCheck className="size-3.5 text-brand-700" aria-label="Trusted Lender" />}
            <span>· {timeAgo(post.postedAt)}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:shrink-0">
        {post.isMine ? (
          <>
            {post.offers > 0 && (
              <Button size="sm" variant="subtle" onClick={() => router.push("/messages")}>
                <MessageCircle /> See offers
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={onClose}>
              <X /> Close
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={offer} loading={busy}>
            {!busy && <HandHelping />} I have one
          </Button>
        )}
      </div>
    </Card>
  );
}

export function WantedBoard() {
  const posts = useWantedList();
  const params = useSearchParams();
  const router = useRouter();
  const prefill = params.get("new");
  const [posting, setPosting] = useState(prefill !== null);

  const closeForm = () => {
    setPosting(false);
    if (prefill !== null) router.replace("/wanted");
  };

  const mine = posts?.filter((p) => p.isMine) ?? [];
  const others = posts?.filter((p) => !p.isMine) ?? [];

  return (
    <div className="space-y-10">
      <Card className="flex flex-col gap-4 bg-gradient-to-br from-violet-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-950">Can&apos;t find what you need?</p>
          <p className="text-sm text-zinc-600">
            Post it here. Neighbours who have one can offer it, and we&apos;ll tell you if a matching tool gets listed.
          </p>
        </div>
        <Button onClick={() => setPosting(true)} className="sm:shrink-0">
          <Plus /> Post a request
        </Button>
      </Card>

      {posts === undefined ? (
        <ListSkeleton />
      ) : (
        <>
          {mine.length > 0 && (
            <section>
              <SectionTitle count={mine.length}>Your requests</SectionTitle>
              <div className="space-y-3">
                {mine.map((p) => (
                  <PostCard key={p._id} post={p} />
                ))}
              </div>
            </section>
          )}
          <section>
            <SectionTitle count={others.length}>Neighbours are looking for</SectionTitle>
            {others.length === 0 ? (
              <EmptyState icon={<HandHelping />} title="No open requests right now">
                When a neighbour needs something nobody has listed, it shows up here.
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {others.map((p) => (
                  <PostCard key={p._id} post={p} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={posting} onClose={closeForm} title="Post a request" description="Requests stay up for 30 days, or until you close them.">
        <PostForm initialTitle={prefill ?? ""} onDone={closeForm} />
      </Dialog>
    </div>
  );
}
