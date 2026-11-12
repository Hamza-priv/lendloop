// Tells Convex to trust session tokens issued by your Clerk instance.
// Set CLERK_JWT_ISSUER_DOMAIN in the Convex dashboard (or `npx convex env set`).
import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
