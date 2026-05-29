"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SuperAdminSystemId } from "@/app/lib/superadmin/env";
import SaturnSuperAdminConsole from "@/app/admin/components/saturn-superadmin/SaturnSuperAdminConsole";

type SystemSummary = {
  id: SuperAdminSystemId;
  label: string;
};

type OrganizationSummary = {
  id: string;
  slug?: string | null;
  name: string;
  is_active?: boolean;
  admin_count?: number;
  account_count?: number;
};

type OrganizationDetail = {
  organization: OrganizationSummary;
  settings?: Record<string, unknown>;
  logistics_mode?: "legacy" | "integrated";
  admins?: Array<{
    user_id: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  }>;
  accounts?: Array<{
    user_id: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    roles?: string[];
    is_active?: boolean;
  }>;
  posts?: Array<{
    id: string;
    name: string;
    code: string;
    is_active?: boolean;
    member_count?: number;
  }>;
  companies?: Array<{
    id: string;
    name: string;
    slug: string;
    code?: string | null;
    is_active?: boolean;
  }>;
};

type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | Record<string, unknown>;
};

type SuperAdminPanelProps = {
  systems: SystemSummary[];
  currentUserEmail: string;
};

const SYSTEM_COPY: Record<SuperAdminSystemId, { noun: string; createLabel: string }> = {
  saturn: {
    noun: "entreprise",
    createLabel: "Créer une organisation Saturn",
  },
  mercury: {
    noun: "établissement",
    createLabel: "Créer une organisation Mercury",
  },
};

const ORGANIZATION_SKELETON_ROWS = ["primary", "secondary", "tertiary", "quaternary"];
const DETAIL_SKELETON_BLOCKS = ["settings", "access", "relations"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getApiError(data: unknown, fallback: string): string {
  const error = asRecord(data).error;
  return typeof error === "string" && error.trim() ? error : fallback;
}

async function apiFetch<T>(
  systemId: SuperAdminSystemId,
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const response = await fetch(`/api/superadmin/systems/${systemId}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : null),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function parseOrganizations(value: unknown): OrganizationSummary[] {
  const rows = Array.isArray(asRecord(value).organizations)
    ? (asRecord(value).organizations as unknown[])
    : [];

  const organizations: OrganizationSummary[] = [];

  for (const entry of rows) {
      const row = asRecord(entry);
      const id = asString(row.id);
      const name = asString(row.name) ?? asString(row.venue_name);
      if (!id || !name) continue;

      organizations.push({
        id,
        name,
        slug: asString(row.slug),
        is_active: row.is_active !== false,
        admin_count: typeof row.admin_count === "number" ? row.admin_count : undefined,
        account_count: typeof row.account_count === "number" ? row.account_count : undefined,
      });
  }

  return organizations;
}

function parseDetail(value: unknown): OrganizationDetail | null {
  const record = asRecord(value);
  const rawOrganization = asRecord(record.organization);
  const id = asString(rawOrganization.id);
  const name = asString(rawOrganization.name) ?? asString(rawOrganization.venue_name);
  if (!id || !name) return null;

  return {
    organization: {
      id,
      name,
      slug: asString(rawOrganization.slug),
      is_active: rawOrganization.is_active !== false,
      admin_count:
        typeof rawOrganization.admin_count === "number"
          ? rawOrganization.admin_count
          : undefined,
      account_count:
        typeof rawOrganization.account_count === "number"
          ? rawOrganization.account_count
          : undefined,
    },
    settings: asRecord(record.settings),
    logistics_mode:
      record.logistics_mode === "integrated" || record.logistics_mode === "legacy"
        ? record.logistics_mode
        : undefined,
    admins: Array.isArray(record.admins) ? (record.admins as OrganizationDetail["admins"]) : [],
    accounts: Array.isArray(record.accounts)
      ? (record.accounts as OrganizationDetail["accounts"])
      : [],
    posts: Array.isArray(record.posts) ? (record.posts as OrganizationDetail["posts"]) : [],
    companies: Array.isArray(record.companies)
      ? (record.companies as OrganizationDetail["companies"])
      : [],
  };
}

function displayPerson(person: {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  user_id: string;
}) {
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return name || person.email || person.user_id;
}

function OrganizationListSkeleton() {
  return (
    <div className="global-admin-skeleton-list" aria-hidden="true">
      {ORGANIZATION_SKELETON_ROWS.map((row) => (
        <div className="global-admin-skeleton-card" key={row}>
          <span className="global-admin-skeleton-line global-admin-skeleton-line--title" />
          <span className="global-admin-skeleton-line" />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="global-admin-skeleton-detail" aria-hidden="true">
      {DETAIL_SKELETON_BLOCKS.map((block) => (
        <div className="global-admin-box global-admin-skeleton-box" key={block}>
          <span className="global-admin-skeleton-line global-admin-skeleton-line--heading" />
          <span className="global-admin-skeleton-input" />
          <span className="global-admin-skeleton-input" />
          <span className="global-admin-skeleton-button" />
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminPanel({
  systems,
  currentUserEmail,
}: SuperAdminPanelProps) {
  const [activeSystem, setActiveSystem] = useState<SuperAdminSystemId>(
    systems[0]?.id ?? "saturn",
  );
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [status, setStatus] = useState("");
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  );

  const loadOrganizations = useCallback(async () => {
    if (systems.length === 0) {
      return;
    }

    setOrganizationsLoading(true);
    setStatus("");

    try {
      const result = await apiFetch<{ organizations: unknown[] }>(activeSystem, "/organizations");

      if (!result.ok) {
        setStatus(getApiError(result.data, "Chargement des organisations impossible."));
        return;
      }

      const nextOrganizations = parseOrganizations(result.data);
      setOrganizations(nextOrganizations);
      setSelectedOrganizationId((current) => {
        if (current && nextOrganizations.some((organization) => organization.id === current)) {
          return current;
        }

        return nextOrganizations[0]?.id ?? null;
      });
    } finally {
      setOrganizationsLoading(false);
    }
  }, [activeSystem, systems.length]);

  const loadDetail = useCallback(async () => {
    if (!selectedOrganizationId) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }

    setStatus("");
    setDetailLoading(true);

    try {
      const result = await apiFetch<OrganizationDetail>(
        activeSystem,
        `/organizations/${selectedOrganizationId}/settings`,
      );

      if (!result.ok) {
        setStatus(getApiError(result.data, "Chargement de la fiche impossible."));
        setDetail(null);
        return;
      }

      const parsed = parseDetail(result.data);
      setDetail(parsed);
    } finally {
      setDetailLoading(false);
    }
  }, [activeSystem, selectedOrganizationId]);

  useEffect(() => {
    setOrganizations([]);
    setDetail(null);
    setSelectedOrganizationId(null);
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (systems.length === 0) {
    return (
      <section className="global-admin-console global-admin-console--empty">
        <div className="global-admin-box">
          <h2>Aucun système configuré</h2>
          <p>
            Renseignez au moins `SATURN_API_BASE_URL` ou `MERCURY_API_BASE_URL` côté serveur.
          </p>
        </div>
      </section>
    );
  }

  if (activeSystem === "saturn") {
    return (
      <section className="global-admin-system-shell global-admin-system-shell--app">
        <div className="global-admin-system-switchbar" aria-label="Système actif">
          <div className="global-admin-tabs" role="tablist" aria-label="Systèmes">
            {systems.map((system) => (
              <button
                key={system.id}
                className={system.id === activeSystem ? "is-active" : ""}
                type="button"
                onClick={() => setActiveSystem(system.id)}
              >
                {system.label}
              </button>
            ))}
          </div>
        </div>

        <SaturnSuperAdminConsole />
      </section>
    );
  }

  async function createOrganization(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const venueName = String(formData.get("venue_name") ?? "").trim();
    const payload =
      activeSystem === "mercury"
        ? {
            venue_name: venueName || name,
            timezone: String(formData.get("timezone") ?? "Europe/Paris").trim(),
            currency_code: String(formData.get("currency_code") ?? "EUR").trim(),
          }
        : {
            name,
            slug,
            settings: {
              logistics_mode: String(formData.get("logistics_mode") ?? "legacy"),
            },
          };

    const result = await apiFetch(activeSystem, "/organizations", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!result.ok) {
      setStatus(getApiError(result.data, "Création impossible."));
      return;
    }

    setStatus("Organisation créée.");
    await loadOrganizations();
  }

  async function saveSettings(formData: FormData) {
    if (!selectedOrganizationId) return;

    const payload =
      activeSystem === "mercury"
        ? {
            settings: {
              venue_name: String(formData.get("venue_name") ?? "").trim(),
              timezone: String(formData.get("timezone") ?? "").trim(),
              currency_code: String(formData.get("currency_code") ?? "").trim(),
            },
          }
        : {
            settings: {
              logistics_mode: String(formData.get("logistics_mode") ?? "legacy"),
            },
          };

    const result = await apiFetch(
      activeSystem,
      `/organizations/${selectedOrganizationId}/settings`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );

    if (!result.ok) {
      setStatus(getApiError(result.data, "Sauvegarde impossible."));
      return;
    }

    setStatus("Configuration sauvegardée.");
    await loadDetail();
    await loadOrganizations();
  }

  async function saveAdmin(formData: FormData) {
    if (!selectedOrganizationId) return;

    const roles = formData.getAll("roles").map(String).filter(Boolean);
    const result = await apiFetch(
      activeSystem,
      `/organizations/${selectedOrganizationId}/admins`,
      {
        method: "POST",
        body: JSON.stringify({
          mode: String(formData.get("mode") ?? "create"),
          email: String(formData.get("email") ?? "").trim(),
          password: String(formData.get("password") ?? ""),
          first_name: String(formData.get("first_name") ?? "").trim() || undefined,
          last_name: String(formData.get("last_name") ?? "").trim() || undefined,
          roles: roles.length > 0 ? roles : undefined,
        }),
      },
    );

    if (!result.ok) {
      setStatus(getApiError(result.data, "Compte admin impossible à enregistrer."));
      return;
    }

    setStatus("Compte enregistré.");
    await loadDetail();
    await loadOrganizations();
  }

  async function createPost(formData: FormData) {
    if (!selectedOrganizationId || activeSystem !== "mercury") return;

    const result = await apiFetch(
      activeSystem,
      `/organizations/${selectedOrganizationId}/posts`,
      {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name") ?? "").trim(),
          code: String(formData.get("code") ?? "").trim(),
        }),
      },
    );

    if (!result.ok) {
      setStatus(getApiError(result.data, "Création du poste impossible."));
      return;
    }

    setStatus("Poste créé.");
    await loadDetail();
  }

  async function hardDeleteOrganization(formData: FormData) {
    if (!selectedOrganizationId || !selectedOrganization) return;

    const confirmation = String(formData.get("confirmation") ?? "").trim();
    const result = await apiFetch(
      activeSystem,
      `/organizations/${selectedOrganizationId}/hard-delete`,
      {
        method: "DELETE",
        body: JSON.stringify({ confirmation }),
      },
    );

    if (!result.ok) {
      setStatus(getApiError(result.data, "Purge impossible."));
      return;
    }

    setStatus(`${selectedOrganization.name} a été supprimée définitivement.`);
    setDetail(null);
    setSelectedOrganizationId(null);
    await loadOrganizations();
  }

  return (
    <section className="global-admin-console">
      <aside className="global-admin-sidebar">
        <div className="global-admin-account">
          <span>Connecté</span>
          <strong>{currentUserEmail}</strong>
        </div>

        <div className="global-admin-tabs" role="tablist" aria-label="Systèmes">
          {systems.map((system) => (
            <button
              key={system.id}
              className={system.id === activeSystem ? "is-active" : ""}
              type="button"
              onClick={() => setActiveSystem(system.id)}
            >
              {system.label}
            </button>
          ))}
        </div>

        <form action={createOrganization} className="global-admin-box">
          <h2>{SYSTEM_COPY[activeSystem].createLabel}</h2>
          {activeSystem === "mercury" ? (
            <>
              <label>
                <span>Nom établissement</span>
                <input name="venue_name" required />
              </label>
              <label>
                <span>Fuseau horaire</span>
                <input name="timezone" defaultValue="Europe/Paris" required />
              </label>
              <label>
                <span>Devise</span>
                <input name="currency_code" defaultValue="EUR" required />
              </label>
            </>
          ) : (
            <>
              <label>
                <span>Nom</span>
                <input name="name" required />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" required />
              </label>
              <label>
                <span>Mode logistique</span>
                <select name="logistics_mode" defaultValue="legacy">
                  <option value="legacy">Historique</option>
                  <option value="integrated">Intégré</option>
                </select>
              </label>
            </>
          )}
          <button type="submit">Créer</button>
        </form>
      </aside>

      <div className="global-admin-workspace">
        <div className="global-admin-toolbar">
          <div>
            <p className="global-admin-eyebrow">{SYSTEM_COPY[activeSystem].noun}</p>
            <h2>{selectedOrganization?.name ?? "Aucune organisation sélectionnée"}</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadOrganizations()}
            disabled={organizationsLoading}
          >
            {organizationsLoading ? "Chargement..." : "Rafraîchir"}
          </button>
        </div>

        {status ? <p className="global-admin-feedback">{status}</p> : null}

        <div className="global-admin-grid">
          <section className="global-admin-directory" aria-busy={organizationsLoading}>
            <h3>Organisations</h3>
            <div className="global-admin-list">
              {organizationsLoading && organizations.length === 0 ? (
                <OrganizationListSkeleton />
              ) : null}

              {!organizationsLoading && organizations.length === 0 ? (
                <div className="global-admin-empty global-admin-empty--compact">
                  Aucune organisation.
                </div>
              ) : null}

              {organizations.map((organization) => (
                <button
                  key={organization.id}
                  type="button"
                  className={organization.id === selectedOrganizationId ? "is-active" : ""}
                  onClick={() => setSelectedOrganizationId(organization.id)}
                >
                  <strong>{organization.name}</strong>
                  <span>
                    {organization.slug ?? organization.id}
                    {" · "}
                    {organization.admin_count ?? organization.account_count ?? 0} accès
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="global-admin-detail" aria-busy={detailLoading}>
            {detailLoading ? (
              <DetailSkeleton />
            ) : !detail ? (
              <div className="global-admin-empty">Sélectionnez une organisation.</div>
            ) : (
              <>
                <form action={saveSettings} className="global-admin-box">
                  <h3>Configuration</h3>
                  {activeSystem === "mercury" ? (
                    <>
                      <label>
                        <span>Nom établissement</span>
                        <input
                          name="venue_name"
                          defaultValue={String(detail.settings?.venue_name ?? detail.organization.name)}
                          required
                        />
                      </label>
                      <label>
                        <span>Fuseau horaire</span>
                        <input
                          name="timezone"
                          defaultValue={String(detail.settings?.timezone ?? "Europe/Paris")}
                          required
                        />
                      </label>
                      <label>
                        <span>Devise</span>
                        <input
                          name="currency_code"
                          defaultValue={String(detail.settings?.currency_code ?? "EUR")}
                          required
                        />
                      </label>
                    </>
                  ) : (
                    <label>
                      <span>Mode logistique</span>
                      <select name="logistics_mode" defaultValue={detail.logistics_mode ?? "legacy"}>
                        <option value="legacy" disabled={detail.logistics_mode === "integrated"}>
                          Historique
                        </option>
                        <option value="integrated">Intégré</option>
                      </select>
                    </label>
                  )}
                  <button type="submit">Sauvegarder</button>
                </form>

                <form action={saveAdmin} className="global-admin-box">
                  <h3>Ajouter un accès</h3>
                  <div className="global-admin-row">
                    <label>
                      <span>Mode</span>
                      <select name="mode" defaultValue="create">
                        <option value="create">Créer</option>
                        <option value="attach">Rattacher</option>
                      </select>
                    </label>
                    <label>
                      <span>Email</span>
                      <input name="email" type="email" required />
                    </label>
                  </div>
                  <div className="global-admin-row">
                    <label>
                      <span>Mot de passe</span>
                      <input name="password" type="password" minLength={8} />
                    </label>
                    <label>
                      <span>Prénom</span>
                      <input name="first_name" />
                    </label>
                    <label>
                      <span>Nom</span>
                      <input name="last_name" />
                    </label>
                  </div>
                  {activeSystem === "mercury" ? (
                    <div className="global-admin-checks">
                      {["admin", "manager", "barista", "server"].map((role) => (
                        <label key={role}>
                          <input
                            name="roles"
                            type="checkbox"
                            value={role}
                            defaultChecked={role === "admin"}
                          />
                          <span>{role}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  <button type="submit">Enregistrer l’accès</button>
                </form>

                <div className="global-admin-box">
                  <h3>Accès rattachés</h3>
                  <ul className="global-admin-rows">
                    {detail.accounts?.map((account) => (
                      <li key={account.user_id}>
                        <strong>{displayPerson(account)}</strong>
                        <span>
                          {account.email ?? "Email non renseigné"}
                          {"roles" in account && Array.isArray(account.roles)
                            ? ` · ${account.roles.join(", ")}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="global-admin-box">
                  <h3>Postes</h3>
                  <form action={createPost} className="global-admin-inline-form">
                    <input name="name" placeholder="Bar principal" required />
                    <input name="code" placeholder="BAR" required />
                    <button type="submit">Créer</button>
                  </form>
                  <ul className="global-admin-rows">
                    {detail.posts?.map((post) => (
                      <li key={post.id}>
                        <strong>{post.name}</strong>
                        <span>
                          {post.code} · {post.member_count ?? 0} membre
                          {(post.member_count ?? 0) > 1 ? "s" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <form action={hardDeleteOrganization} className="global-admin-box global-admin-danger">
                  <h3>Zone dangereuse</h3>
                  <p>
                    La purge dev supprime définitivement l’organisation et les données liées.
                  </p>
                  <label>
                    <span>
                      Confirmer avec “
                      {detail.organization.name}
                      ”
                    </span>
                    <input name="confirmation" required />
                  </label>
                  <button type="submit">Purger définitivement</button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
