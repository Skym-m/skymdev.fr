import "server-only";

import { type GlobalSuperAdminSession } from "@/app/lib/superadmin/auth";
import { getRemoteSystemConfig } from "@/app/lib/superadmin/env";

type PathRule = {
  methods: readonly string[];
  pattern: RegExp;
};

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
]);

const UUID_SEGMENT = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

const SATURN_ALLOWED_PATHS: PathRule[] = [
  { methods: ["GET", "POST"], pattern: /^organizations$/ },
  { methods: ["GET", "PATCH"], pattern: new RegExp(`^organizations/${UUID_SEGMENT}/settings$`) },
  { methods: ["POST"], pattern: new RegExp(`^organizations/${UUID_SEGMENT}/admins$`) },
  { methods: ["POST"], pattern: new RegExp(`^organizations/${UUID_SEGMENT}/companies$`) },
  { methods: ["GET", "POST"], pattern: new RegExp(`^organizations/${UUID_SEGMENT}/partners$`) },
  {
    methods: ["PATCH"],
    pattern: new RegExp(`^organizations/${UUID_SEGMENT}/partners/${UUID_SEGMENT}$`),
  },
  {
    methods: ["PATCH"],
    pattern: new RegExp(`^organizations/${UUID_SEGMENT}/partners/configuration$`),
  },
  { methods: ["DELETE"], pattern: new RegExp(`^organizations/${UUID_SEGMENT}/hard-delete$`) },
  { methods: ["GET"], pattern: /^accounts$/ },
  { methods: ["GET"], pattern: new RegExp(`^accounts/${UUID_SEGMENT}$`) },
  { methods: ["GET"], pattern: new RegExp(`^accounts/${UUID_SEGMENT}/activity$`) },
  { methods: ["POST"], pattern: new RegExp(`^accounts/${UUID_SEGMENT}/sessions/revoke$`) },
  { methods: ["POST"], pattern: new RegExp(`^accounts/${UUID_SEGMENT}/password/rotate$`) },
  {
    methods: ["PATCH"],
    pattern: new RegExp(`^accounts/${UUID_SEGMENT}/devices/${UUID_SEGMENT}$`),
  },
  { methods: ["GET"], pattern: /^device-approvals$/ },
];

function assertAllowedProxyRoute(systemId: string, method: string, pathSegments: string[]): void {
  if (systemId !== "saturn") {
    throw new Error("SUPERADMIN_PROXY_SYSTEM_NOT_ENABLED");
  }

  const path = pathSegments.join("/");
  const isAllowed = SATURN_ALLOWED_PATHS.some(
    (rule) => rule.methods.includes(method) && rule.pattern.test(path),
  );
  if (!isAllowed) {
    throw new Error("SUPERADMIN_PROXY_ROUTE_NOT_ALLOWED");
  }
}

function buildRemoteUrl(systemId: string, pathSegments: string[], search: string): string {
  const system = getRemoteSystemConfig(systemId);
  if (
    pathSegments.some((segment) => {
      let decoded: string;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        return true;
      }
      return (
        decoded === "." ||
        decoded === ".." ||
        decoded.includes("/") ||
        decoded.includes("\\")
      );
    })
  ) {
    throw new Error("INVALID_SUPERADMIN_PROXY_PATH");
  }

  const normalizedPath = pathSegments
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${system.apiBaseUrl}/api/platform/super-admin/${normalizedPath}${search}`;
}

function buildProxyHeaders(req: Request, session: GlobalSuperAdminSession, systemId: string) {
  const system = getRemoteSystemConfig(systemId);
  const headers = new Headers();
  const contentType = req.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  headers.set("authorization", `Bearer ${system.serviceToken}`);
  headers.set("x-skymdev-superadmin-user-id", session.user.id);
  if (session.user.email) {
    headers.set("x-skymdev-superadmin-email", session.user.email);
  }

  return headers;
}

function copyResponseHeaders(source: Headers): Headers {
  const headers = new Headers();

  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set("Cache-Control", "no-store");
  return headers;
}

export async function proxySuperAdminRequest(params: {
  req: Request;
  session: GlobalSuperAdminSession;
  systemId: string;
  pathSegments: string[];
}): Promise<Response> {
  const { req, session, systemId, pathSegments } = params;
  if (pathSegments.length === 0) {
    return Response.json({ error: "Route distante manquante." }, { status: 400 });
  }

  const sourceUrl = new URL(req.url);
  const method = req.method.toUpperCase();
  assertAllowedProxyRoute(systemId, method, pathSegments);

  const remoteUrl = buildRemoteUrl(systemId, pathSegments, sourceUrl.search);
  const hasBody = method !== "GET" && method !== "HEAD";

  const response = await fetch(remoteUrl, {
    method,
    headers: buildProxyHeaders(req, session, systemId),
    body: hasBody ? await req.text() : undefined,
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: copyResponseHeaders(response.headers),
  });
}
