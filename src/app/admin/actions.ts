"use server";

import { redirect } from "next/navigation";
import { isNeonAuthConfigured, isSuperAdminEmailAllowed } from "@/app/lib/superadmin/env";
import {
  clearLocalSuperAdminSession,
  createLocalSuperAdminSession,
  validateLocalSuperAdminCredentials,
} from "@/app/lib/superadmin/auth";
import { getNeonAuth } from "@/app/lib/superadmin/neon-auth";

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signInSuperAdmin(formData: FormData) {
  const email = readFormString(formData, "email").toLowerCase();
  const password = readFormString(formData, "password");

  if (!email || !password) {
    redirect("/admin/login?error=missing_credentials");
  }

  if (validateLocalSuperAdminCredentials({ email, password })) {
    await createLocalSuperAdminSession(email);
    redirect("/admin");
  }

  if (isNeonAuthConfigured()) {
    let signedIn = false;
    try {
      const auth = getNeonAuth();
      const { error } = await auth.signIn.email({ email, password });
      signedIn = !error;
    } catch {
      signedIn = false;
    }

    if (signedIn) {
      if (isSuperAdminEmailAllowed(email)) {
        redirect("/admin");
      }

      try {
        await getNeonAuth().signOut();
      } catch {
        // best-effort cleanup; deny access below either way
      }
      redirect("/admin/login?error=access_denied");
    }
  }

  redirect("/admin/login?error=invalid_credentials");
}

export async function signOutSuperAdmin() {
  await clearLocalSuperAdminSession();

  if (isNeonAuthConfigured()) {
    try {
      await getNeonAuth().signOut();
    } catch {
      // best-effort sign-out; always clear local + redirect below
    }
  }

  redirect("/admin/login");
}
