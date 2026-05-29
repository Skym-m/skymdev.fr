import { requireGlobalSuperAdminSession } from "@/app/lib/superadmin/auth";
import { proxySuperAdminRequest } from "@/app/lib/superadmin/remote-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    system: string;
    path: string[];
  }>;
};

function assertTrustedMutation(req: Request): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return;
  }

  const requestOrigin = new URL(req.url).origin;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (!origin && !referer) {
    throw new Error("UNTRUSTED_SUPERADMIN_ORIGIN");
  }

  if (origin && origin !== requestOrigin) {
    throw new Error("UNTRUSTED_SUPERADMIN_ORIGIN");
  }

  if (referer) {
    try {
      if (new URL(referer).origin !== requestOrigin) {
        throw new Error("UNTRUSTED_SUPERADMIN_ORIGIN");
      }
    } catch {
      throw new Error("UNTRUSTED_SUPERADMIN_ORIGIN");
    }
  }
}

async function handle(req: Request, context: RouteContext): Promise<Response> {
  try {
    assertTrustedMutation(req);
  } catch {
    return Response.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  const session = await requireGlobalSuperAdminSession();
  const { system, path } = await context.params;

  try {
    return await proxySuperAdminRequest({
      req,
      session,
      systemId: system,
      pathSegments: path,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "UNKNOWN_SUPERADMIN_SYSTEM"
        ? "Système inconnu."
        : error instanceof Error && error.message === "SUPERADMIN_PROXY_SYSTEM_NOT_ENABLED"
          ? "Système superadmin non activé."
          : error instanceof Error && error.message === "SUPERADMIN_PROXY_ROUTE_NOT_ALLOWED"
            ? "Route superadmin non autorisée."
        : error instanceof Error && error.message === "INVALID_SUPERADMIN_PROXY_PATH"
          ? "Route distante invalide."
          : "Proxy superadmin indisponible.";
    const status =
      error instanceof Error && error.message === "UNKNOWN_SUPERADMIN_SYSTEM"
        ? 404
        : error instanceof Error && error.message === "SUPERADMIN_PROXY_SYSTEM_NOT_ENABLED"
          ? 404
          : error instanceof Error && error.message === "SUPERADMIN_PROXY_ROUTE_NOT_ALLOWED"
            ? 404
        : error instanceof Error && error.message === "INVALID_SUPERADMIN_PROXY_PATH"
          ? 400
          : 502;

    return Response.json({ error: message }, { status });
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
