const INVALID_API_RESPONSE = {
  error: "Réponse API invalide renvoyée par le serveur.",
  code: "INVALID_API_RESPONSE",
};

function toSaturnProxyPath(apiPath: string): string {
  const trimmed = apiPath.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error("Saturn superadmin API only supports internal API paths.");
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (!path.startsWith("/api/platform/super-admin/")) {
    throw new Error("Saturn superadmin API only supports /api/platform/super-admin paths.");
  }

  return path.replace(
    "/api/platform/super-admin/",
    "/api/superadmin/systems/saturn/",
  );
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  if ([204, 205, 304].includes(response.status)) {
    return {};
  }

  try {
    const text = await response.text();
    if (!text.trim()) return {};

    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : INVALID_API_RESPONSE;
  } catch {
    return INVALID_API_RESPONSE;
  }
}

export function getErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const error = data.error;
  return typeof error === "string" && error.trim() ? error : fallback;
}

export async function apiFetchJson(
  apiPath: string,
  init: RequestInit = {},
): Promise<{ res: Response; data: Record<string, unknown> }> {
  try {
    const res = await fetch(toSaturnProxyPath(apiPath), {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : null),
        ...(init.headers ?? {}),
      },
      credentials: "include",
    });
    const data = await readJson(res);
    if (res.ok && data.code === INVALID_API_RESPONSE.code) {
      return {
        res: new Response(JSON.stringify(data), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }),
        data,
      };
    }

    return { res, data };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erreur réseau inconnue.";
    const res = new Response(
      JSON.stringify({
        error: "Impossible de contacter Saturn.",
        code: "SATURN_PROXY_TRANSPORT_ERROR",
        detail,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
    return { res, data: await readJson(res) };
  }
}
