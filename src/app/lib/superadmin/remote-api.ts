import "server-only";

import { createHash, createHmac } from "node:crypto";
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

const SATURN_REQUEST_SIGNATURE_CONTEXT = "saturn-privileged-request:v1";
const SATURN_REQUEST_SIGNATURE_VERSION = "v1";
const SATURN_REQUEST_SIGNATURE_HEADER = "x-saturn-request-signature";
const SATURN_REQUEST_SIGNATURE_VERSION_HEADER =
  "x-saturn-request-signature-version";
const SATURN_REQUEST_TIMESTAMP_HEADER = "x-saturn-request-timestamp";
const SATURN_REQUEST_BODY_SHA256_HEADER = "x-saturn-content-sha256";

const UUID_SEGMENT =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

const SATURN_ALLOWED_PATHS: PathRule[] = [
  { methods: ["GET", "POST"], pattern: /^organizations$/ },
  {
    methods: ["GET", "PATCH"],
    pattern: new RegExp(`^organizations/${UUID_SEGMENT}/settings$`),
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^organizations/${UUID_SEGMENT}/admins$`),
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^organizations/${UUID_SEGMENT}/companies$`),
  },
  {
    methods: ["GET", "POST"],
    pattern: new RegExp(`^organizations/${UUID_SEGMENT}/partners$`),
  },
  {
    methods: ["PATCH"],
    pattern: new RegExp(
      `^organizations/${UUID_SEGMENT}/partners/${UUID_SEGMENT}$`,
    ),
  },
  {
    methods: ["PATCH"],
    pattern: new RegExp(
      `^organizations/${UUID_SEGMENT}/partners/configuration$`,
    ),
  },
  {
    methods: ["DELETE"],
    pattern: new RegExp(`^organizations/${UUID_SEGMENT}/hard-delete$`),
  },
  { methods: ["GET"], pattern: /^accounts$/ },
  { methods: ["GET"], pattern: new RegExp(`^accounts/${UUID_SEGMENT}$`) },
  {
    methods: ["GET"],
    pattern: new RegExp(`^accounts/${UUID_SEGMENT}/activity$`),
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^accounts/${UUID_SEGMENT}/sessions/revoke$`),
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^accounts/${UUID_SEGMENT}/password/rotate$`),
  },
  {
    methods: ["PATCH"],
    pattern: new RegExp(`^accounts/${UUID_SEGMENT}/devices/${UUID_SEGMENT}$`),
  },
  { methods: ["GET"], pattern: /^device-approvals$/ },
];

function assertAllowedProxyRoute(
  systemId: string,
  method: string,
  pathSegments: string[],
): void {
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

function buildRemoteUrl(
  systemId: string,
  pathSegments: string[],
  search: string,
): string {
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

function hashSha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function buildSaturnRequestSignaturePayload(input: {
  method: string;
  remoteUrl: string;
  bodySha256: string;
  timestamp: string;
}): string {
  const url = new URL(input.remoteUrl);
  return [
    SATURN_REQUEST_SIGNATURE_CONTEXT,
    input.method.toUpperCase(),
    `${url.pathname}${url.search}`,
    input.bodySha256,
    input.timestamp,
  ].join("\n");
}

function addSaturnRequestSignatureHeaders(params: {
  headers: Headers;
  serviceToken: string;
  method: string;
  remoteUrl: string;
  bodyText: string | undefined;
}): void {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodySha256 = hashSha256Base64Url(params.bodyText ?? "");
  const payload = buildSaturnRequestSignaturePayload({
    method: params.method,
    remoteUrl: params.remoteUrl,
    bodySha256,
    timestamp,
  });
  const signature = createHmac("sha256", params.serviceToken)
    .update(payload)
    .digest("base64url");

  params.headers.set(
    SATURN_REQUEST_SIGNATURE_VERSION_HEADER,
    SATURN_REQUEST_SIGNATURE_VERSION,
  );
  params.headers.set(SATURN_REQUEST_TIMESTAMP_HEADER, timestamp);
  params.headers.set(SATURN_REQUEST_BODY_SHA256_HEADER, bodySha256);
  params.headers.set(SATURN_REQUEST_SIGNATURE_HEADER, signature);
}

function buildProxyHeaders(params: {
  req: Request;
  session: GlobalSuperAdminSession;
  systemId: string;
  method: string;
  remoteUrl: string;
  bodyText: string | undefined;
}) {
  const { req, session, systemId, method, remoteUrl, bodyText } = params;
  const system = getRemoteSystemConfig(systemId);
  const headers = new Headers();
  const contentType = req.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  headers.set("authorization", `Bearer ${system.serviceToken}`);
  if (systemId === "saturn") {
    addSaturnRequestSignatureHeaders({
      headers,
      serviceToken: system.serviceToken,
      method,
      remoteUrl,
      bodyText,
    });
  }
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
    return Response.json(
      { error: "Route distante manquante." },
      { status: 400 },
    );
  }

  const sourceUrl = new URL(req.url);
  const method = req.method.toUpperCase();
  assertAllowedProxyRoute(systemId, method, pathSegments);

  const remoteUrl = buildRemoteUrl(systemId, pathSegments, sourceUrl.search);
  const hasBody = method !== "GET" && method !== "HEAD";
  const bodyText = hasBody ? await req.text() : undefined;

  const response = await fetch(remoteUrl, {
    method,
    headers: buildProxyHeaders({
      req,
      session,
      systemId,
      method,
      remoteUrl,
      bodyText,
    }),
    body: bodyText,
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: copyResponseHeaders(response.headers),
  });
}
