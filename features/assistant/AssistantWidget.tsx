"use client";

import { ArrowUp, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/CurrentUserProvider";
import { errorMessage } from "@/shared/lib/errors";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { useAsk, useAssistantThread, useResetChat } from "./hooks";
import { RichText } from "./RichText";

const SUGGESTIONS = [
  "I need to hang some shelves. What can I borrow?",
  "Do I have any requests waiting for me?",
  "Help me write a listing for my lawn mower",
  "Write a quick thank-you note for a borrowed drill",
];

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Assistant is typing">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

/** Floating AI assistant for signed-in users. */
export function AssistantWidget() {
  const current = useCurrentUser();
  const thread = useAssistantThread();
  const ask = useAsk();
  const reset = useResetChat();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const thinking = thread?.status === "thinking" || sending;
  const messageCount = thread?.messages.length ?? 0;

  // Keep the newest message in view.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messageCount, thinking, open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  if (current.status !== "ready") return null;

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || thinking) return;
    setSending(true);
    setDraft("");
    try {
      await ask({ text: clean });
    } catch (err) {
      setDraft(clean);
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  async function newChat() {
    const ok = await confirm({
      title: "Start a new chat?",
      description: "This conversation will be cleared.",
      confirmLabel: "New chat",
      cancelLabel: "Keep chatting",
      tone: "primary",
    });
    if (ok) await reset({});
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-5 bottom-5 z-50 flex size-14 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-lift transition hover:scale-105 hover:bg-zinc-800 sm:right-6 sm:bottom-6"
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
      >
        {open ? <X className="size-6" /> : <Sparkles className="size-6" />}
      </button>

      {open && (
        <section
          className="fixed inset-x-3 bottom-24 z-50 flex max-h-[min(640px,calc(100vh-8rem))] animate-pop-in flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:right-6 sm:left-auto sm:w-[400px]"
          aria-label="LendLoop assistant"
        >
          <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-700 text-white">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-950">LendLoop assistant</p>
                <p className="text-xs text-zinc-500">Finds tools, checks your requests, drafts listings</p>
              </div>
            </div>
            {messageCount > 0 && (
              <button
                type="button"
                onClick={newChat}
                disabled={thinking}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" /> New chat
              </button>
            )}
          </header>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed" aria-live="polite">
            {thread === undefined ? (
              <div className="py-6 text-center">
                <Dots />
              </div>
            ) : !thread || messageCount === 0 ? (
              <div className="space-y-4 py-2">
                <p className="text-zinc-600">
                  Hi {current.user.name.split(" ")[0]}! Ask me to find a tool for a job, check on your requests, or help
                  write a listing.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2 text-left text-zinc-700 transition hover:border-brand-200 hover:bg-brand-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              thread.messages.map((m) =>
                m.role === "user" ? (
                  <div key={m._id} className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-3.5 py-2 whitespace-pre-wrap text-white">
                      {m.text}
                    </p>
                  </div>
                ) : (
                  <div key={m._id} className="max-w-[92%] rounded-2xl rounded-bl-md bg-zinc-100 px-3.5 py-2.5 text-zinc-700">
                    <RichText text={m.text} />
                  </div>
                ),
              )
            )}
            {thinking && (
              <div className="w-fit rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-3">
                <Dots />
              </div>
            )}
            {thread?.status === "error" && thread.error && !thinking && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700" role="alert">
                {thread.error}
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-zinc-100 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 focus-within:border-brand-600 focus-within:ring-3 focus-within:ring-brand-600/15">
              <textarea
                ref={input}
                rows={1}
                value={draft}
                maxLength={1000}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKey}
                placeholder={thread && thread.turnsLeft <= 0 ? "Chat is full. Start a new chat." : "Ask anything about LendLoop…"}
                disabled={thread !== undefined && thread !== null && thread.turnsLeft <= 0}
                className="max-h-32 flex-1 resize-none bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                aria-label="Message the assistant"
              />
              <button
                type="submit"
                disabled={!draft.trim() || thinking}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-brand-700 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                aria-label="Send"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-zinc-400">AI answers can be wrong. It can&apos;t change your requests or listings.</p>
          </form>
        </section>
      )}
    </>
  );
}
