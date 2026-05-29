"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetchJson, getErrorMessage } from "@/app/admin/components/saturn-superadmin/api";
import {
  asRecord,
  asString,
  formatDeviceApprovalStatus,
  formatDeviceLocation,
  parseSaturnAccount,
  parseSaturnAccountDevice,
} from "@/app/admin/components/saturn-superadmin/device-approval-parsing";
import {
  DashboardInlineFeedback,
  DashboardStateMessage,
  Skeleton,
} from "@/app/admin/components/saturn-superadmin/ui";
import type {
  OrganizationSummary,
  SaturnAccount,
  SaturnAccountActivityEvent,
  SaturnAccountDetail,
  SaturnAccountDevice,
  SaturnDeviceApprovalStatus,
  SaturnAccountRole,
  SaturnAccountSession,
} from "@/app/admin/components/saturn-superadmin/types";

type SaturnAccountSecurityPanelProps = {
  organizations: OrganizationSummary[];
};

const ROLE_LABELS: Record<SaturnAccountRole, string> = {
  admin: "Admin",
  seller: "Vendeur",
  transporter: "Transport",
  driver: "Chauffeur",
  manager_vo: "Manager VO",
  manager_vn: "Manager VN",
};

function parseSession(value: unknown): SaturnAccountSession | null {
  const row = asRecord(value);
  const id = asString(row.id);
  if (!id) return null;

  return {
    id,
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
    refreshed_at: asString(row.refreshed_at),
    not_after: asString(row.not_after),
    ip_address: asString(row.ip_address),
    user_agent: asString(row.user_agent),
    aal: asString(row.aal),
  };
}

function parseActivity(value: unknown): SaturnAccountActivityEvent | null {
  const row = asRecord(value);
  const id = asString(row.id);
  const eventType = asString(row.event_type);
  if (!id || !eventType) return null;

  return {
    id,
    source: row.source === "supabase_auth" ? "supabase_auth" : "saturn",
    event_type: eventType,
    actor_user_id: asString(row.actor_user_id),
    target_user_id: asString(row.target_user_id),
    ip_address: asString(row.ip_address),
    user_agent: asString(row.user_agent),
    location: asRecord(row.location),
    payload: asRecord(row.payload),
    created_at: asString(row.created_at),
  };
}

function parseDetail(value: unknown): SaturnAccountDetail | null {
  const row = asRecord(value);
  const account = parseSaturnAccount(row.account);
  if (!account) return null;

  return {
    account,
    sessions: Array.isArray(row.sessions)
      ? row.sessions.map(parseSession).filter((entry): entry is SaturnAccountSession => entry !== null)
      : [],
    devices: Array.isArray(row.devices)
      ? row.devices
          .map(parseSaturnAccountDevice)
          .filter((entry): entry is SaturnAccountDevice => entry !== null)
      : [],
    activity: Array.isArray(row.activity)
      ? row.activity
          .map(parseActivity)
          .filter((entry): entry is SaturnAccountActivityEvent => entry !== null)
      : [],
  };
}

function formatDate(value: string | null): string {
  if (!value) return "Jamais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function accountName(account: SaturnAccount): string {
  return (
    [account.first_name, account.last_name].filter(Boolean).join(" ").trim() ||
    account.email ||
    "Compte sans email"
  );
}

function accountRole(account: SaturnAccount): string {
  return account.role ? ROLE_LABELS[account.role] : "Rôle inconnu";
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function deviceTitle(device: SaturnAccountDevice): string {
  return device.device_label || device.platform || "Appareil inconnu";
}

function deviceStatusTone(status: SaturnDeviceApprovalStatus): "neutral" | "warning" | "success" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "neutral";
}

function AccountListSkeleton() {
  return (
    <div className="super-admin-account-list" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="super-admin-account-card" key={index}>
          <Skeleton width="12rem" height="1rem" />
          <Skeleton width="9rem" height="0.8rem" />
          <Skeleton width="6rem" height="1.5rem" />
        </div>
      ))}
    </div>
  );
}

function EmptyDetail() {
  return (
    <DashboardStateMessage
      tone="info"
      title="Sélectionnez un compte"
      description="La fiche sécurité affiche les sessions, appareils et événements du compte choisi."
    />
  );
}

export function SaturnAccountSecurityPanel({ organizations }: SaturnAccountSecurityPanelProps) {
  const [accounts, setAccounts] = useState<SaturnAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const selectedAccountIdRef = useRef<string | null>(null);
  const [detail, setDetail] = useState<SaturnAccountDetail | null>(null);
  const [query, setQuery] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [status, setStatus] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.user_id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    setStatus("");

    const params = new URLSearchParams({
      perPage: "100",
      includeDisabled: "true",
    });
    if (query.trim()) params.set("q", query.trim());
    if (organizationFilter) params.set("organizationId", organizationFilter);
    if (roleFilter) params.set("role", roleFilter);

    const { res, data } = await apiFetchJson(`/api/platform/super-admin/accounts?${params}`);
    if (!res.ok) {
      setStatus(getErrorMessage(data, "Impossible de charger les comptes."));
      setLoadingAccounts(false);
      return;
    }

    const nextAccounts = Array.isArray(data.accounts)
      ? data.accounts
          .map(parseSaturnAccount)
          .filter((entry): entry is SaturnAccount => entry !== null)
      : [];

    setAccounts(nextAccounts);
    const currentSelection = selectedAccountIdRef.current;
    if (currentSelection && nextAccounts.some((account) => account.user_id === currentSelection)) {
      setSelectedAccountId(currentSelection);
    } else {
      setSelectedAccountId(nextAccounts[0]?.user_id ?? null);
    }
    setLoadingAccounts(false);
  }, [organizationFilter, query, roleFilter]);

  const loadDetail = useCallback(async (account: SaturnAccount) => {
    setLoadingDetail(true);
    setActionStatus("");
    setTemporaryPassword("");

    const params = new URLSearchParams({
      organizationId: account.organization_id,
      activityLimit: "120",
    });
    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/accounts/${account.user_id}?${params}`,
    );

    if (!res.ok) {
      setActionStatus(getErrorMessage(data, "Impossible de charger la sécurité du compte."));
      setDetail(null);
      setLoadingDetail(false);
      return;
    }

    const parsedDetail = parseDetail(data);
    if (!parsedDetail) {
      setActionStatus("Réponse sécurité invalide.");
      setDetail(null);
      setLoadingDetail(false);
      return;
    }

    setDetail(parsedDetail);
    setLoadingDetail(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadAccounts());
  }, [loadAccounts]);

  useEffect(() => {
    queueMicrotask(() => {
      const account = selectedAccount;
      if (!account) {
        setDetail(null);
        return;
      }

      void loadDetail(account);
    });
  }, [loadDetail, selectedAccount]);

  async function revokeSessions(sessionId?: string) {
    if (!detail) return;
    const actionKey = sessionId ? `session:${sessionId}` : "sessions:all";
    setPendingAction(actionKey);
    setActionStatus("");
    setTemporaryPassword("");

    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/accounts/${detail.account.user_id}/sessions/revoke`,
      {
        method: "POST",
        body: JSON.stringify({
          organizationId: detail.account.organization_id,
          sessionId,
          reason: sessionId ? "Déconnexion d'un appareil" : "Déconnexion globale",
        }),
      },
    );

    if (!res.ok) {
      setActionStatus(getErrorMessage(data, "Déconnexion impossible."));
      setPendingAction(null);
      return;
    }

    const revokedCount =
      typeof data.revoked_session_count === "number" ? data.revoked_session_count : 0;
    setActionStatus(`${revokedCount} session${revokedCount > 1 ? "s" : ""} révoquée${revokedCount > 1 ? "s" : ""}.`);
    await loadDetail(detail.account);
    setPendingAction(null);
  }

  async function rotatePassword() {
    if (!detail) return;
    setPendingAction("password");
    setActionStatus("");
    setTemporaryPassword("");

    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/accounts/${detail.account.user_id}/password/rotate`,
      {
        method: "POST",
        body: JSON.stringify({
          organizationId: detail.account.organization_id,
          reason: "Rotation manuelle depuis le panel global",
        }),
      },
    );

    if (!res.ok) {
      setActionStatus(getErrorMessage(data, "Rotation impossible."));
      setPendingAction(null);
      return;
    }

    setTemporaryPassword(asString(data.temporary_password) ?? "");
    const revokedCount =
      typeof data.revoked_session_count === "number" ? data.revoked_session_count : 0;
    setActionStatus(`Mot de passe tourné. ${revokedCount} session${revokedCount > 1 ? "s" : ""} révoquée${revokedCount > 1 ? "s" : ""}.`);
    await loadDetail(detail.account);
    setPendingAction(null);
  }

  async function decideDevice(device: SaturnAccountDevice, action: "approve" | "deny" | "revoke") {
    if (!detail) return;
    const actionKey = `device:${device.id}:${action}`;
    setPendingAction(actionKey);
    setActionStatus("");
    setTemporaryPassword("");

    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/accounts/${detail.account.user_id}/devices/${device.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          organizationId: detail.account.organization_id,
          action,
          reason:
            action === "approve"
              ? "Appareil validé depuis la fiche sécurité globale"
              : action === "deny"
                ? "Appareil refusé depuis la fiche sécurité globale"
                : "Appareil révoqué depuis la fiche sécurité globale",
        }),
      },
    );

    if (!res.ok) {
      setActionStatus(getErrorMessage(data, "Décision appareil impossible."));
      setPendingAction(null);
      return;
    }

    const label =
      action === "approve" ? "approuvé" : action === "deny" ? "refusé" : "révoqué";
    setActionStatus(`Appareil ${label}.`);
    await loadDetail(detail.account);
    setPendingAction(null);
  }

  return (
    <section className="saturn-account-security">
      <div className="saturn-account-security__toolbar">
        <div>
          <p className="global-admin-eyebrow">Sécurité</p>
          <h2>Comptes Saturn</h2>
        </div>

        <div className="saturn-account-security__filters">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un compte"
            aria-label="Rechercher un compte"
          />
          <select
            value={organizationFilter}
            onChange={(event) => setOrganizationFilter(event.target.value)}
            aria-label="Filtrer par organisation"
          >
            <option value="">Toutes les organisations</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filtrer par rôle"
          >
            <option value="">Tous les rôles</option>
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="dashboard-button dashboard-button--secondary"
            onClick={() => void loadAccounts()}
            disabled={loadingAccounts}
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {status ? <DashboardInlineFeedback tone="error">{status}</DashboardInlineFeedback> : null}

      <div className="saturn-account-security__layout">
        <aside className="super-admin-panel saturn-account-security__directory">
          <div className="super-admin-dir-header">
            <div>
              <h2>Annuaire</h2>
              <p>{accounts.length} compte{accounts.length > 1 ? "s" : ""}</p>
            </div>
          </div>

          {loadingAccounts ? (
            <AccountListSkeleton />
          ) : accounts.length === 0 ? (
            <DashboardStateMessage
              tone="info"
              title="Aucun compte"
              description="Aucun accès ne correspond aux filtres."
            />
          ) : (
            <div className="super-admin-account-list">
              {accounts.map((account) => (
                <button
                  key={account.user_id}
                  type="button"
                  className={`super-admin-account-card${
                    account.user_id === selectedAccountId ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedAccountId(account.user_id)}
                >
                  <strong>{accountName(account)}</strong>
                  <span>{account.email ?? shortId(account.user_id)}</span>
                  <small>{account.organization_name ?? account.organization_slug ?? "Organisation inconnue"}</small>
                  <span className="super-admin-focus-card__facts">
                    <span className="super-admin-meta-pill">{accountRole(account)}</span>
                    <span className="super-admin-meta-pill">
                      {account.is_disabled ? "Bloqué" : "Actif"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="saturn-account-security__detail">
          {loadingDetail ? (
            <div className="super-admin-panel">
              <Skeleton width="14rem" height="1.5rem" />
              <Skeleton width="100%" height="8rem" />
              <Skeleton width="100%" height="12rem" />
            </div>
          ) : !detail ? (
            <EmptyDetail />
          ) : (
            <>
              <section className="super-admin-panel saturn-account-security__identity">
                <div>
                  <p className="global-admin-eyebrow">{accountRole(detail.account)}</p>
                  <h2>{accountName(detail.account)}</h2>
                  <p>{detail.account.email ?? "Email non renseigné"}</p>
                </div>
                <div className="saturn-account-security__actions">
                  <button
                    type="button"
                    className="dashboard-button dashboard-button--secondary"
                    disabled={Boolean(pendingAction)}
                    onClick={() => void revokeSessions()}
                  >
                    {pendingAction === "sessions:all" ? "Déconnexion..." : "Tout déconnecter"}
                  </button>
                  <button
                    type="button"
                    className="dashboard-button dashboard-button--danger"
                    disabled={Boolean(pendingAction)}
                    onClick={() => void rotatePassword()}
                  >
                    {pendingAction === "password" ? "Rotation..." : "Tourner le mot de passe"}
                  </button>
                </div>
              </section>

              {actionStatus ? <DashboardInlineFeedback>{actionStatus}</DashboardInlineFeedback> : null}
              {temporaryPassword ? (
                <DashboardInlineFeedback tone="warning">
                  Mot de passe temporaire : <strong>{temporaryPassword}</strong>
                </DashboardInlineFeedback>
              ) : null}

              <section className="super-admin-panel">
                <div className="saturn-account-security__facts">
                  <article>
                    <span>Organisation</span>
                    <strong>{detail.account.organization_name ?? detail.account.organization_slug ?? "Inconnue"}</strong>
                  </article>
                  <article>
                    <span>Dernière connexion</span>
                    <strong>{formatDate(detail.account.last_sign_in_at)}</strong>
                  </article>
                  <article>
                    <span>Sessions</span>
                    <strong>{detail.sessions.length}</strong>
                  </article>
                  <article>
                    <span>Appareils</span>
                    <strong>{detail.devices.length}</strong>
                  </article>
                </div>
              </section>

              <section className="super-admin-panel">
                <div className="super-admin-dir-header">
                  <div>
                    <h2>Sessions actives</h2>
                    <p>Accès Supabase rattachés à ce compte.</p>
                  </div>
                </div>
                {detail.sessions.length === 0 ? (
                  <DashboardStateMessage tone="info" title="Aucune session active" />
                ) : (
                  <div className="saturn-account-security__rows">
                    {detail.sessions.map((session) => (
                      <article key={session.id}>
                        <div>
                          <strong>{session.ip_address ?? "IP inconnue"}</strong>
                          <p>{session.user_agent ?? "Agent inconnu"}</p>
                          <small>
                            Créée {formatDate(session.created_at)} · Dernière activité{" "}
                            {formatDate(session.refreshed_at ?? session.updated_at)}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--secondary"
                          disabled={Boolean(pendingAction)}
                          onClick={() => void revokeSessions(session.id)}
                        >
                          {pendingAction === `session:${session.id}` ? "Déconnexion..." : "Déconnecter"}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="super-admin-panel">
                <div className="super-admin-dir-header">
                  <div>
                    <h2>Appareils</h2>
                    <p>Terminaux détectés, localisation et état d&apos;autorisation.</p>
                  </div>
                </div>
                {detail.devices.length === 0 ? (
                  <DashboardStateMessage tone="info" title="Aucun appareil enregistré" />
                ) : (
                  <div className="saturn-account-security__rows">
                    {detail.devices.map((device) => (
                      <article key={device.id}>
                        <div>
                          <strong>{deviceTitle(device)}</strong>
                          <p>
                            {formatDeviceLocation(device)} ·{" "}
                            {device.last_ip ?? device.first_ip ?? "IP inconnue"}
                          </p>
                          <small>
                            Première vue {formatDate(device.first_seen_at)} · Dernière activité{" "}
                            {formatDate(device.last_seen_at)}
                          </small>
                          {device.user_agent ? <small>{device.user_agent}</small> : null}
                          {device.last_decision_reason ? (
                            <small>Motif : {device.last_decision_reason}</small>
                          ) : null}
                        </div>
                        <div className="saturn-account-security__deviceActions">
                          <span
                            className={`super-admin-meta-pill super-admin-meta-pill--${deviceStatusTone(
                              device.approval_status,
                            )}`}
                          >
                            {formatDeviceApprovalStatus(device.approval_status)}
                          </span>
                          {device.approval_status === "pending" ? (
                            <>
                              <button
                                type="button"
                                className="dashboard-button"
                                disabled={Boolean(pendingAction)}
                                onClick={() => void decideDevice(device, "approve")}
                              >
                                {pendingAction === `device:${device.id}:approve`
                                  ? "Validation..."
                                  : "Approuver"}
                              </button>
                              <button
                                type="button"
                                className="dashboard-button dashboard-button--secondary"
                                disabled={Boolean(pendingAction)}
                                onClick={() => void decideDevice(device, "deny")}
                              >
                                {pendingAction === `device:${device.id}:deny`
                                  ? "Refus..."
                                  : "Refuser"}
                              </button>
                            </>
                          ) : null}
                          {device.approval_status === "approved" ? (
                            <button
                              type="button"
                              className="dashboard-button dashboard-button--danger"
                              disabled={Boolean(pendingAction)}
                              onClick={() => void decideDevice(device, "revoke")}
                            >
                              {pendingAction === `device:${device.id}:revoke`
                                ? "Révocation..."
                                : "Révoquer"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="super-admin-panel">
                <div className="super-admin-dir-header">
                  <div>
                    <h2>Activité</h2>
                    <p>Événements Saturn et Auth remontés pour ce compte.</p>
                  </div>
                </div>
                {detail.activity.length === 0 ? (
                  <DashboardStateMessage tone="info" title="Aucune activité enregistrée" />
                ) : (
                  <div className="saturn-account-security__timeline">
                    {detail.activity.map((event) => (
                      <article key={`${event.source}-${event.id}`}>
                        <span className="super-admin-meta-pill">{event.source}</span>
                        <div>
                          <strong>{event.event_type}</strong>
                          <p>
                            {formatDate(event.created_at)}
                            {event.ip_address ? ` · ${event.ip_address}` : ""}
                          </p>
                          {event.user_agent ? <small>{event.user_agent}</small> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
