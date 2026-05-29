export type SuperAdminSystemId = "saturn" | "mercury";

type RemoteSystemConfig = {
  id: SuperAdminSystemId;
  label: string;
  apiBaseUrl: string;
  serviceToken: string;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

// The service token is the shared secret that authenticates skymdev.fr to a
// remote system's privileged API. In production it must be long and random;
// refuse to start with a weak or placeholder value so a misconfiguration can
// never ship a guessable secret. Saturn enforces the same floor on its side.
const SERVICE_TOKEN_MIN_LENGTH = 32;
const WEAK_SERVICE_TOKENS = new Set([
  "change-me",
  "changeme",
  "change_me",
  "placeholder",
  "secret",
  "token",
  "test",
  "password",
]);

function readServiceToken(name: string): string {
  const value = readRequiredEnv(name);
  if (process.env.NODE_ENV === "production") {
    if (
      value.length < SERVICE_TOKEN_MIN_LENGTH ||
      WEAK_SERVICE_TOKENS.has(value.toLowerCase())
    ) {
      throw new Error(
        `${name} must be a strong random secret (>= ${SERVICE_TOKEN_MIN_LENGTH} chars, non-placeholder) in production.`,
      );
    }
  }

  return value;
}

function normalizeBaseUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid URL in ${name}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Invalid protocol in ${name}`);
  }

  const isLocalhost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && (process.env.NODE_ENV === "production" || !isLocalhost)) {
    throw new Error(`${name} must use HTTPS outside local development.`);
  }

  return url.origin;
}

// Full base URL of the managed Neon Auth server, e.g.
// https://ep-xxxx.neonauth.<region>.aws.neon.tech/neondb/auth — the path matters,
// so (unlike remote system URLs) we keep it intact and only trim a trailing slash.
export function getNeonAuthBaseUrl(): string {
  const value = readRequiredEnv("NEON_AUTH_BASE_URL");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid URL in NEON_AUTH_BASE_URL");
  }

  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("NEON_AUTH_BASE_URL must use HTTPS in production.");
  }

  return value.replace(/\/+$/, "");
}

// Secret used to sign the cached session cookie. The SDK requires >= 32 chars.
export function getNeonAuthCookieSecret(): string {
  const value = readRequiredEnv("NEON_AUTH_COOKIE_SECRET");
  if (value.length < 32) {
    throw new Error("NEON_AUTH_COOKIE_SECRET must be at least 32 characters.");
  }

  return value;
}

export function isNeonAuthConfigured(): boolean {
  return Boolean(
    readOptionalEnv("NEON_AUTH_BASE_URL") && readOptionalEnv("NEON_AUTH_COOKIE_SECRET"),
  );
}

// Authorization allowlist. Neon Auth proves *who* a user is; this decides *who*
// is a super-admin. Fail-closed: with no allowlist, nobody is authorized.
export function isSuperAdminEmailAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const raw = readOptionalEnv("SUPERADMIN_ALLOWED_EMAILS");
  if (!raw) {
    return false;
  }

  const allowed = new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );

  return allowed.has(email.trim().toLowerCase());
}

export function getLocalSuperAdminCredentials(): {
  email: string;
  password: string;
  sessionSecret: string;
} | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const email = readOptionalEnv("SUPERADMIN_LOCAL_EMAIL")?.toLowerCase() ?? null;
  const password = readOptionalEnv("SUPERADMIN_LOCAL_PASSWORD");
  const sessionSecret = readOptionalEnv("SUPERADMIN_LOCAL_SESSION_SECRET");

  if (!email || !password || !sessionSecret) {
    return null;
  }

  if (sessionSecret.length < 32) {
    throw new Error("SUPERADMIN_LOCAL_SESSION_SECRET must be at least 32 characters.");
  }

  return {
    email,
    password,
    sessionSecret,
  };
}

export function isAnySuperAdminAuthConfigured(): boolean {
  return isNeonAuthConfigured() || Boolean(getLocalSuperAdminCredentials());
}

export function getRemoteSystemConfig(systemId: string): RemoteSystemConfig {
  if (systemId === "saturn") {
    return {
      id: "saturn",
      label: "Saturn",
      apiBaseUrl: normalizeBaseUrl(
        readRequiredEnv("SATURN_API_BASE_URL"),
        "SATURN_API_BASE_URL",
      ),
      serviceToken: readServiceToken("SATURN_SUPERADMIN_SERVICE_TOKEN"),
    };
  }

  if (systemId === "mercury") {
    return {
      id: "mercury",
      label: "Mercury",
      apiBaseUrl: normalizeBaseUrl(
        readRequiredEnv("MERCURY_API_BASE_URL"),
        "MERCURY_API_BASE_URL",
      ),
      serviceToken: readServiceToken("MERCURY_SUPERADMIN_SERVICE_TOKEN"),
    };
  }

  throw new Error("UNKNOWN_SUPERADMIN_SYSTEM");
}

export function getConfiguredSystems(): Array<Pick<RemoteSystemConfig, "id" | "label">> {
  const systems: Array<Pick<RemoteSystemConfig, "id" | "label">> = [
    {
      id: "saturn",
      label: "Saturn",
    },
    {
      id: "mercury",
      label: "Mercury",
    },
  ];

  return systems.filter((system) => {
    if (system.id === "saturn") {
      return Boolean(readOptionalEnv("SATURN_API_BASE_URL"));
    }

    return Boolean(readOptionalEnv("MERCURY_API_BASE_URL"));
  });
}
