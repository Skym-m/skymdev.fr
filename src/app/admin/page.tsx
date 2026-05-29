import { signOutSuperAdmin } from "@/app/admin/actions";
import SuperAdminPanel from "@/app/admin/components/SuperAdminPanel";
import { requireGlobalSuperAdminSession } from "@/app/lib/superadmin/auth";
import { getConfiguredSystems } from "@/app/lib/superadmin/env";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const session = await requireGlobalSuperAdminSession();
  const systems = getConfiguredSystems();

  const userLabel = session.user.email ?? session.user.id;

  return (
    <main className="global-admin-page global-admin-page--app">
      <header className="global-admin-header">
        <div>
          <h1>Superadmin SkymDev</h1>
          <p>{userLabel}</p>
        </div>

        <form action={signOutSuperAdmin}>
          <button className="global-admin-ghost-button" type="submit">
            Déconnexion
          </button>
        </form>
      </header>

      <SuperAdminPanel
        systems={systems}
        currentUserEmail={userLabel}
      />
    </main>
  );
}
