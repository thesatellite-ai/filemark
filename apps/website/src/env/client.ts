import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Type-safe, validated client environment. Only `VITE_*` vars exist on this
 * static site (baked at build time). Validation runs at import — a missing or
 * malformed value **throws**, failing the build/dev start loudly rather than
 * silently shipping broken config.
 *
 * Set values in `apps/website/.env` (see `.env.example`). `VITE_*` is baked at
 * build time, so re-run the build after changing.
 */
export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    // GTM container id, e.g. GTM-XXXXXXX. Required.
    VITE_GTM_ID: z
      .string()
      .regex(/^GTM-[A-Z0-9]+$/, "VITE_GTM_ID must look like GTM-XXXXXXX"),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
