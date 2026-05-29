import { getNeonAuth } from "@/app/lib/superadmin/neon-auth";

// Catch-all handler that proxies client auth requests (sign-in, sign-out,
// get-session, ...) to the managed Neon Auth server. Resolved lazily per request
// so NEON_AUTH_* env vars are never read at build time.
type RouteContext = { params: Promise<{ path: string[] }> };

export function GET(request: Request, context: RouteContext) {
  return getNeonAuth().handler().GET(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return getNeonAuth().handler().POST(request, context);
}
