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
        <div className="global-admin-header__brand">
          <span className="global-admin-header__mark" aria-hidden="true">S</span>
          <div>
            <h1>Superadmin SkymDev</h1>
            <p>Console globale</p>
          </div>
        </div>

        <div className="global-admin-header__session">
          <span className="global-admin-header__user">{userLabel}</span>
          <form action={signOutSuperAdmin}>
            <button className="global-admin-ghost-button" type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <SuperAdminPanel
        systems={systems}
        currentUserEmail={userLabel}
      />
    </main>
  );
}
