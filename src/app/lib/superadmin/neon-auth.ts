import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";
import {
  getNeonAuthBaseUrl,
  getNeonAuthCookieSecret,
} from "@/app/lib/superadmin/env";

type NeonAuthInstance = ReturnType<typeof createNeonAuth>;

let cached: NeonAuthInstance | null = null;

// Singleton Neon Auth instance. Created lazily so env vars are only read when
// auth is actually used at request time (pages/actions are force-dynamic), never
// at module load / build time.
export function getNeonAuth(): NeonAuthInstance {
  if (!cached) {
    cached = createNeonAuth({
      baseUrl: getNeonAuthBaseUrl(),
      cookies: {
        secret: getNeonAuthCookieSecret(),
      },
    });
  }

  return cached;
}
