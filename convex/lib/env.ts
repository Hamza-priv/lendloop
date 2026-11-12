// Reads Convex environment variables (set with `npx convex env set NAME value`).
// Secrets live only here, never in code or in exported n8n workflows.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Convex environment variable ${name}`);
  return value;
}

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
