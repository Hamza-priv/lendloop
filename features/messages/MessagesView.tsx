"use client";

import { ArrowLeft, ArrowUp, BadgeCheck, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { CategoryTile } from "@/shared/lib/categories";
import { errorMessage } from "@/shared/lib/errors";
import { timeAgo } from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/Avatar";
import { ButtonLink } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";
import { type ConversationRow, useConversations, useMarkRead, useSendMessage, useThread } from "./hooks";

type ToolRef = ConversationRow["tool"];

function ToolThumb({ tool, size = "sm" }: { tool: ToolRef; size?: "sm" | "md" }) {
  if (!tool) return null;
  const dims = size === "sm" ? "size-9 rounded-lg" : "size-11 rounded-xl";
  // eslint-disable-next-line @next/next/no-img-element -- user uploads from Convex storage
  if (tool.imageUrl) return <img src={tool.imageUrl} alt="" className={`${dims} shrink-0 object-cover ring-1 ring-zinc-200`} />;
  return <CategoryTile category={tool.category} size={size} />;
}

function ConversationList({ rows, activeId }: { rows: ConversationRow[]; activeId: string | null }) {
  return (
    <ul className="divide-y divide-zinc-100">
      {rows.map((c) => (
        <li key={c._id}>
          <Link
            href={`/messages?c=${c._id}`}
            className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-zinc-50 ${activeId === c._id ? "bg-zinc-100/70" : ""}`}
          >
            <div className="relative">
              <Avatar name={c.other.name} size="md" />
              {c.unread && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-brand-600 ring-2 ring-white" aria-label="Unread" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={`truncate text-sm ${c.unread ? "font-semibold text-zinc-950" : "font-medium text-zinc-800"}`}>{c.other.name}</p>
                <span className="shrink-0 text-[11px] text-zinc-400">{timeAgo(c.lastMessageAt)}</span>
              </div>
              {c.tool && <p className="truncate text-xs text-zinc-500">{c.tool.name}</p>}
              {c.wanted && <p className="truncate text-xs text-violet-700">Request: {c.wanted.title}</p>}
              <p className={`mt-0.5 truncate text-sm ${c.unread ? "text-zinc-800" : "text-zinc-500"}`}>
                {c.lastFromMe && "You: "}
                {c.preview}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Thread({ conversationId }: { conversationId: Id<"conversations"> }) {
  const thread = useThread(conversationId);
  const send = useSendMessage();
  const markRead = useMarkRead();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const count = thread?.messages.length ?? 0;
  const lastAt = thread?.messages.at(-1)?.at;

  // Reading the thread marks it read (and clears its bell notification).
  useEffect(() => {
    if (thread) void markRead({ conversationId });
  }, [conversationId, lastAt, markRead, thread]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [count, conversationId]);

  if (thread === undefined) {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">Loading…</div>;
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      await send({ conversationId, body });
    } catch (err) {
      setDraft(body);
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const lastMine = [...thread.messages].reverse().find((m) => m.mine);
  const seen = lastMine && thread.otherReadAt >= lastMine.at;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <Link href="/messages" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="size-4" />
        </Link>
        <Avatar name={thread.other.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-950">
            {thread.other.name}
            {thread.other.trustedLender && <BadgeCheck className="size-4 text-brand-700" aria-label="Trusted Lender" />}
          </p>
          {thread.tool && <p className="truncate text-xs text-zinc-500">About: {thread.tool.name}</p>}
          {thread.wanted && <p className="truncate text-xs text-violet-700">About the request: {thread.wanted.title}</p>}
        </div>
        {thread.tool && (
          <Link href={`/tools?tool=${thread.tool._id}`} className="flex items-center gap-2 rounded-lg p-1 text-xs font-medium text-brand-700 hover:bg-brand-50">
            <ToolThumb tool={thread.tool} />
            <span className="hidden sm:inline">View tool</span>
          </Link>
        )}
      </div>

      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto bg-zinc-50/60 px-4 py-4">
        {thread.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            Say hello{thread.tool ? ` and ask about the ${thread.tool.name}` : ""}. Keep personal details to a minimum until you&apos;ve agreed a pickup.
          </p>
        ) : (
          thread.messages.map((m) => (
            <div key={m._id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                  m.mine ? "rounded-br-md bg-brand-700 text-white" : "rounded-bl-md bg-white text-zinc-800 ring-1 ring-zinc-200"
                }`}
                title={new Date(m.at).toLocaleString()}
              >
                {m.body}
              </div>
            </div>
          ))
        )}
        {seen && <p className="pr-1 text-right text-[11px] text-zinc-400">Seen</p>}
      </div>

      <form onSubmit={submit} className="border-t border-zinc-100 bg-white p-3">
        <div className="flex items-end gap-2 rounded-xl border border-zinc-300 px-3 py-2 focus-within:border-brand-600 focus-within:ring-3 focus-within:ring-brand-600/15">
          <textarea
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Message ${thread.other.name}…`}
            className="max-h-32 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400"
            aria-label="Write a message"
            autoFocus
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-brand-700 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            aria-label="Send message"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export function MessagesView() {
  const rows = useConversations();
  const params = useSearchParams();
  const router = useRouter();
  const active = (params.get("c") as Id<"conversations"> | null) ?? null;

  // On wide screens, open the newest conversation when none is chosen.
  useEffect(() => {
    if (!active && rows && rows.length > 0 && window.matchMedia("(min-width: 768px)").matches) {
      router.replace(`/messages?c=${rows[0]._id}`);
    }
  }, [active, rows, router]);

  if (rows === undefined) return <ListSkeleton />;
  if (rows.length === 0 && !active) {
    return (
      <EmptyState icon={<MessagesSquare />} title="No messages yet" action={<ButtonLink href="/tools">Browse tools</ButtonLink>}>
        Open a tool and press &ldquo;Message owner&rdquo; to ask about it. Replies show up here and by email.
      </EmptyState>
    );
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[480px] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
      <aside className={`w-full shrink-0 overflow-y-auto border-r border-zinc-100 md:block md:w-80 ${active ? "hidden" : "block"}`}>
        <ConversationList rows={rows} activeId={active} />
      </aside>
      <section className={`min-w-0 flex-1 flex-col md:flex ${active ? "flex" : "hidden"}`}>
        {active ? (
          <Thread key={active} conversationId={active} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">Choose a conversation</div>
        )}
      </section>
    </div>
  );
}
