"use node";

// The LendLoop assistant. One reply per question, looping while the model uses
// the two read-only tools. Nothing here can change data: the assistant
// suggests, the user clicks.
//
// Provider: Google Gemini (free tier) when GEMINI_API_KEY is set, otherwise
// Claude when ANTHROPIC_API_KEY is set. AI_PROVIDER=gemini|anthropic forces one.
import Anthropic from "@anthropic-ai/sdk";
import { ApiError, GoogleGenAI, type Content, type FunctionCall, type Part } from "@google/genai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import { CATEGORIES, FALLBACK_ANSWER, MAX_TOOL_ROUNDS, SYSTEM, TOOL_SPECS, type Category } from "./assistantPrompt";

type Provider = "gemini" | "anthropic";
type Row = { role: "user" | "assistant"; text?: string; prompt?: string; provider?: Provider; contentJson?: string };

const CLAUDE_MODEL = "claude-opus-5-5";
// The free tier's Flash-Lite alias. Override with GEMINI_MODEL if Google renames it.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

function pickProvider(): Provider | null {
  const forced = process.env.AI_PROVIDER;
  if (forced === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/** A plain question the user typed (stored provider-neutral). */
const isQuestion = (r: Row) => r.role === "user" && r.text !== undefined && r.provider === undefined;

async function runTool(ctx: ActionCtx, userId: Id<"users">, name: string, input: unknown): Promise<unknown> {
  if (name === "search_tools") {
    const { query, category, available_only } = (input ?? {}) as { query?: string; category?: string; available_only?: boolean };
    const results = await ctx.runQuery(internal.assistant.searchTools, {
      userId,
      query: String(query ?? ""),
      category: (CATEGORIES as readonly string[]).includes(category ?? "") ? (category as Category) : undefined,
      availableOnly: Boolean(available_only),
    });
    return results.length ? { results } : { results: [], note: "No matching tools." };
  }
  if (name === "get_my_activity") return ctx.runQuery(internal.assistant.myActivity, { userId });
  throw new Error(`Unknown tool ${name}`);
}

type Save = (row: { role: "user" | "assistant"; content: unknown; text?: string }) => Promise<void>;

/** Retries brief AI outages (rate spikes, 5xx) twice with a short pause. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err instanceof Anthropic.APIError ? err.status : err instanceof ApiError ? err.status : undefined;
      const transient = status !== undefined && (status === 429 || status >= 500);
      if (!transient || attempt >= 2) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

// ---------------------------------------------------------------- Gemini

async function runGemini(ctx: ActionCtx, userId: Id<"users">, rows: Row[], save: Save) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const contents: Content[] = rows.flatMap((r): Content[] => {
    if (isQuestion(r)) return [{ role: "user", parts: [{ text: r.prompt ?? r.text! }] }];
    if (r.provider === "gemini" && r.contentJson) return [JSON.parse(r.contentJson) as Content];
    return []; // turns from another provider are skipped
  });
  const tools = [
    {
      functionDeclarations: TOOL_SPECS.map((t) => ({
        name: t.name,
        description: t.description,
        parametersJsonSchema: t.schema,
      })),
    },
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: { systemInstruction: SYSTEM, tools },
      }),
    );
    // Sent back unchanged next turn: Gemini signs its reasoning and checks the signature.
    const content: Content = response.candidates?.[0]?.content ?? { role: "model", parts: [] };
    const calls: FunctionCall[] = response.functionCalls ?? [];
    const done = calls.length === 0 || round === MAX_TOOL_ROUNDS;
    const blocked = !response.candidates?.length || response.candidates[0].finishReason === "SAFETY";

    contents.push(content);
    await save({
      role: "assistant",
      content,
      text: done ? (blocked ? "Sorry, I can't help with that one." : response.text?.trim() || FALLBACK_ANSWER) : undefined,
    });
    if (done) return;

    const parts: Part[] = [];
    for (const call of calls) {
      let response: Record<string, unknown>;
      try {
        response = { output: await runTool(ctx, userId, call.name ?? "", call.args) };
      } catch (err) {
        response = { error: err instanceof Error ? err.message : "Tool failed." };
      }
      parts.push({ functionResponse: { id: call.id, name: call.name, response } });
    }
    const toolTurn: Content = { role: "user", parts };
    contents.push(toolTurn);
    await save({ role: "user", content: toolTurn });
  }
}

// ---------------------------------------------------------------- Claude

async function runClaude(ctx: ActionCtx, userId: Id<"users">, rows: Row[], save: Save) {
  const client = new Anthropic();
  const convo: Anthropic.Beta.BetaMessageParam[] = rows.flatMap((r): Anthropic.Beta.BetaMessageParam[] => {
    if (isQuestion(r)) return [{ role: "user", content: [{ type: "text", text: r.prompt ?? r.text! }] }];
    if (r.provider === "anthropic" && r.contentJson) {
      return [{ role: r.role, content: JSON.parse(r.contentJson) } as Anthropic.Beta.BetaMessageParam];
    }
    return [];
  });
  const tools: Anthropic.Beta.BetaTool[] = TOOL_SPECS.map((t) => ({
    name: t.name,
    description: t.description,
    strict: true,
    input_schema: t.schema as unknown as Anthropic.Beta.BetaTool["input_schema"],
  }));

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await withRetry(() => client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if a safety check declines, the API retries on a suitable model
      output_config: { effort: "low" }, // chat: short, quick answers
      cache_control: { type: "ephemeral" },
      system: SYSTEM,
      tools,
      messages: convo,
    }));
    const uses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    const done = response.stop_reason !== "tool_use" || uses.length === 0 || round === MAX_TOOL_ROUNDS;
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")
      .trim();

    // Every block is stored and sent back unchanged (append-only conversation).
    convo.push({ role: "assistant", content: response.content });
    await save({
      role: "assistant",
      content: response.content,
      text: done ? (response.stop_reason === "refusal" ? "Sorry, I can't help with that one." : text || FALLBACK_ANSWER) : undefined,
    });
    if (done) return;

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of uses) {
      try {
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(await runTool(ctx, userId, use.name, use.input)) });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: use.id, content: err instanceof Error ? err.message : "Tool failed.", is_error: true });
      }
    }
    convo.push({ role: "user", content: results });
    await save({ role: "user", content: results });
  }
}

// ---------------------------------------------------------------- entry point

function friendlyError(err: unknown) {
  const status =
    err instanceof Anthropic.APIError ? err.status : err instanceof ApiError ? err.status : undefined;
  if (status === 429) return "The assistant has hit today's free limit or is busy. Try again a bit later.";
  if (status !== undefined && status >= 500) return "The AI service is busy right now. Try again in a minute.";
  if (status === 401 || status === 403) return "The assistant's API key isn't valid. An admin needs to check it in Convex.";
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach the assistant. Try again.";
  return "Something went wrong. Try again.";
}

export const respond = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const provider = pickProvider();
    if (!provider) {
      await ctx.runMutation(internal.assistant.finish, {
        userId,
        error: "The assistant isn't set up yet. An admin needs to add GEMINI_API_KEY (free) to the Convex environment.",
      });
      return;
    }
    const { messages } = await ctx.runQuery(internal.assistant.history, { userId });
    const save: Save = async (row) => {
      await ctx.runMutation(internal.assistant.append, {
        userId,
        role: row.role,
        provider,
        contentJson: JSON.stringify(row.content),
        text: row.text,
      });
    };

    try {
      if (provider === "gemini") await runGemini(ctx, userId, messages, save);
      else await runClaude(ctx, userId, messages, save);
      await ctx.runMutation(internal.assistant.finish, { userId });
    } catch (err) {
      console.error(`Assistant (${provider}) failed`, err);
      await ctx.runMutation(internal.assistant.finish, { userId, error: friendlyError(err) });
    }
  },
});
