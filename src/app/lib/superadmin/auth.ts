import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getNeonAuth } from "@/app/lib/superadmin/neon-auth";
import {
  getLocalSuperAdminCredentials,
  isNeonAuthConfigured,
  isSuperAdminEmailAllowed,
} from "@/app/lib/superadmin/env";

export type GlobalSuperAdminSession = {
  user: {
    id: string;
    email: string | null;
  };
};

const LOCAL_SESSION_COOKIE = "skymdev_superadmin_session";
const LOCAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type LocalSessionPayload = {
  email: string;
  exp: number;
  sub: string;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signLocalPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function timingSafeStringEqual(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

function buildLocalSubject(email: string): string {
  const signature = createHmac("sha256", "skymdev-local-superadmin")
    .update(email)
    .digest("hex")
    .slice(0, 24);

  return `local:${signature}`;
}

function createLocalSessionCookieValue(email: string, secret: string): string {
  const payload: LocalSessionPayload = {
    sub: buildLocalSubject(email),
    email,
    exp: Math.floor(Date.now() / 1000) + LOCAL_SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signLocalPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function parseLocalSessionCookieValue(
  value: string,
  secret: string,
): GlobalSuperAdminSession | null {
  const [encodedPayload, signature] = value.split(".", 2);
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signLocalPayload(encodedPayload, secret);
  if (!timingSafeStringEqual(signature, expectedSignature)) {
    return null;
  }

  let payload: LocalSessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as LocalSessionPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return {
    user: {
      id: payload.sub,
      email: payload.email,
    },
  };
}

export async function createLocalSuperAdminSession(email: string): Promise<void> {
  const credentials = getLocalSuperAdminCredentials();
  if (!credentials) {
    throw new Error("LOCAL_SUPERADMIN_NOT_CONFIGURED");
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, createLocalSessionCookieValue(email, credentials.sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCAL_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearLocalSuperAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function validateLocalSuperAdminCredentials(params: {
  email: string;
  password: string;
}): boolean {
  const credentials = getLocalSuperAdminCredentials();
  if (!credentials || params.email !== credentials.email) {
    return false;
  }

  return timingSafeStringEqual(params.password, credentials.password);
}

async function readLocalSuperAdminSession(): Promise<GlobalSuperAdminSession | null> {
  const credentials = getLocalSuperAdminCredentials();
  if (!credentials) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  if (!cookieValue) {
    return null;
  }

  return parseLocalSessionCookieValue(cookieValue, credentials.sessionSecret);
}

// Authentication state for the super-admin console. Auth is delegated to the
// managed Neon Auth server (Better Auth). Authorization (who is a super-admin)
// is an email allowlist, since the managed server only proves identity.
//
// NOTE: this path has NO second factor (MFA). The allowlist + the shared service
// token + HTTPS are the only controls guarding god-mode. This is a deliberate,
// accepted trade-off for the managed-Neon-Auth setup.
export type SuperAdminAuthState =
  | { kind: "none" }
  | { kind: "local"; session: GlobalSuperAdminSession }
  | { kind: "neon"; session: GlobalSuperAdminSession };

async function readNeonSuperAdminState(): Promise<SuperAdminAuthState> {
  if (!isNeonAuthConfigured()) {
    return { kind: "none" };
  }

  let email: string | null;
  let id: string;
  try {
    const auth = getNeonAuth();
    const { data: session } = await auth.getSession();
    const user = session?.user;
    if (!user) {
      return { kind: "none" };
    }
    id = user.id;
    email = user.email?.trim().toLowerCase() ?? null;
  } catch {
    // Upstream auth server unreachable / transient error: fail closed.
    return { kind: "none" };
  }

  // Authenticated, but only allowlisted accounts get super-admin access.
  if (!isSuperAdminEmailAllowed(email)) {
    return { kind: "none" };
  }

  return {
    kind: "neon",
    session: {
      user: { id, email },
    },
  };
}

export async function readSuperAdminAuthState(): Promise<SuperAdminAuthState> {
  const localSession = await readLocalSuperAdminSession();
  if (localSession) {
    return { kind: "local", session: localSession };
  }

  return readNeonSuperAdminState();
}

export async function readGlobalSuperAdminSession(): Promise<GlobalSuperAdminSession | null> {
  const state = await readSuperAdminAuthState();
  if (state.kind === "none") {
    return null;
  }
  return state.session;
}

export async function requireGlobalSuperAdminSession(): Promise<GlobalSuperAdminSession> {
  const session = await readGlobalSuperAdminSession();
  if (session) {
    return session;
  }

  redirect("/admin/login");
}
