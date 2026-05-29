import { redirect } from "next/navigation";
import { signInSuperAdmin } from "@/app/admin/actions";
import { isAnySuperAdminAuthConfigured } from "@/app/lib/superadmin/env";
import { readGlobalSuperAdminSession } from "@/app/lib/superadmin/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function resolveErrorMessage(error?: string): string | null {
  if (error === "missing_credentials") {
    return "Email et mot de passe requis.";
  }

  if (error === "invalid_credentials") {
    return "Identifiants invalides ou accès refusé.";
  }

  if (error === "access_denied") {
    return "Compte authentifié, mais absent de SUPERADMIN_ALLOWED_EMAILS.";
  }

  if (error === "missing_configuration") {
    return "Configuration Neon Auth manquante côté serveur.";
  }

  return null;
}

export default async function SuperAdminLoginPage({ searchParams }: LoginPageProps) {
  const session = await readGlobalSuperAdminSession();
  if (session) {
    redirect("/admin");
  }

  const params = await searchParams;
  const errorMessage =
    resolveErrorMessage(params.error) ??
    (!isAnySuperAdminAuthConfigured()
      ? "Configurez Neon Auth, ou SUPERADMIN_LOCAL_* en développement."
      : null);

  return (
    <main className="global-admin-login">
      <section className="global-admin-login__panel">
        <p className="global-admin-eyebrow">SkymDev</p>
        <h1>Superadmin</h1>
        <p>
          Connectez-vous avec le compte autorisé dans la source globale pour piloter Saturn et
          Mercury.
        </p>

        <form action={signInSuperAdmin} className="global-admin-form">
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Mot de passe</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Se connecter</button>
        </form>

        {errorMessage ? <p className="global-admin-feedback">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
