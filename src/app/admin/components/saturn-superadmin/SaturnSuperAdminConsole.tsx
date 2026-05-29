"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetchJson, getErrorMessage } from "@/app/admin/components/saturn-superadmin/api";
import {
  parseOrganizationDetail,
  parseOrganizationSummary,
  toOrganizationSlug,
} from "@/app/admin/components/saturn-superadmin/parsing";
import {
  NotificationToasts,
  useTransientNotifications,
} from "@/app/admin/components/saturn-superadmin/useNotifications";
import {
  DashboardInlineFeedback,
  DashboardStateMessage,
  Modal,
  ModalActions,
  ModalHero,
  ModalSection,
  SuperAdminDirectorySkeleton,
} from "@/app/admin/components/saturn-superadmin/ui";
import { SaturnAccountSecurityPanel } from "./SaturnAccountSecurityPanel";
import { SaturnDeviceApprovalPanel } from "./SaturnDeviceApprovalPanel";
import { SaturnSuperAdminInspector, type SuperAdminAdminMode } from "./SaturnSuperAdminInspector";
import type {
  LogisticsMode,
  OrganizationDetail,
  OrganizationSummary,
} from "@/app/admin/components/saturn-superadmin/types";

export default function SaturnSuperAdminConsole() {
  const [activeWorkspace, setActiveWorkspace] = useState<"organizations" | "accounts">(
    "organizations",
  );
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const selectedOrganizationIdRef = useRef<string | null>(null);

  const organizationsRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [createLogisticsMode, setCreateLogisticsMode] = useState<LogisticsMode>("legacy");
  const [createStatus, setCreateStatus] = useState("");
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [hardDeleteConfirmation, setHardDeleteConfirmation] = useState("");
  const [hardDeleteStatus, setHardDeleteStatus] = useState("");
  const [hardDeletingOrganization, setHardDeletingOrganization] = useState(false);

  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [organizationsStatus, setOrganizationsStatus] = useState("");

  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailStatus, setDetailStatus] = useState("");

  const [logisticsModeDraft, setLogisticsModeDraft] = useState<LogisticsMode>("legacy");
  const [savingLogisticsMode, setSavingLogisticsMode] = useState(false);
  const [logisticsModeStatus, setLogisticsModeStatus] = useState("");

  const [adminMode, setAdminMode] = useState<SuperAdminAdminMode>("create");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const [isForbidden, setIsForbidden] = useState(false);
  const { notifications, pushNotification, dismissNotification } = useTransientNotifications();

  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ?? null;
  const activeOrganizationsCount = organizations.filter(
    (organization) => organization.is_active,
  ).length;
  const visibleOrganizations = organizations.filter((organization) => {
    const query = directoryQuery.trim().toLowerCase();
    if (!query) return true;

    return `${organization.name} ${organization.slug}`.toLowerCase().includes(query);
  });

  useEffect(() => {
    selectedOrganizationIdRef.current = selectedOrganizationId;
  }, [selectedOrganizationId]);

  const loadOrganizations = useCallback(async (preferredOrganizationId?: string | null) => {
    const requestId = organizationsRequestIdRef.current + 1;
    organizationsRequestIdRef.current = requestId;

    setLoadingOrganizations(true);
    setOrganizationsStatus("");

    const { res, data } = await apiFetchJson("/api/platform/super-admin/organizations");

    if (organizationsRequestIdRef.current !== requestId) return;

    if (res.status === 403) {
      setIsForbidden(true);
      setLoadingOrganizations(false);
      return;
    }

    if (!res.ok) {
      setOrganizationsStatus(getErrorMessage(data, "Impossible de charger les organisations."));
      setLoadingOrganizations(false);
      return;
    }

    const nextOrganizations = (Array.isArray(data.organizations) ? data.organizations : [])
      .map((entry) => parseOrganizationSummary(entry))
      .filter((entry): entry is OrganizationSummary => entry !== null);

    setOrganizations(nextOrganizations);

    if (preferredOrganizationId !== undefined) {
      const hasPreferredOrganization =
        preferredOrganizationId !== null &&
        nextOrganizations.some((organization) => organization.id === preferredOrganizationId);
      setSelectedOrganizationId(hasPreferredOrganization ? preferredOrganizationId : null);
    } else {
      const currentSelection = selectedOrganizationIdRef.current;
      if (
        currentSelection &&
        !nextOrganizations.some((organization) => organization.id === currentSelection)
      ) {
        setSelectedOrganizationId(null);
      } else if (!currentSelection && nextOrganizations[0]) {
        setSelectedOrganizationId(nextOrganizations[0].id);
      }
    }

    setLoadingOrganizations(false);
  }, []);

  const loadOrganizationDetail = useCallback(async (organizationId: string) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;

    setLoadingDetail(true);
    setDetailStatus("");

    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/organizations/${organizationId}/settings`,
    );

    if (detailRequestIdRef.current !== requestId) return;

    if (res.status === 403) {
      setIsForbidden(true);
      setLoadingDetail(false);
      return;
    }

    if (!res.ok) {
      setDetail(null);
      setDetailStatus(getErrorMessage(data, "Impossible de charger la fiche organisation."));
      setLoadingDetail(false);
      return;
    }

    const parsedDetail = parseOrganizationDetail(data);
    if (!parsedDetail) {
      setDetail(null);
      setDetailStatus("Organisation invalide renvoyée par l'API.");
      setLoadingDetail(false);
      return;
    }

    setDetail(parsedDetail);
    setLogisticsModeDraft(parsedDetail.logistics_mode);
    setLoadingDetail(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadOrganizations());
  }, [loadOrganizations]);

  useEffect(() => {
    queueMicrotask(() => {
      setShowHardDeleteModal(false);
      setHardDeleteConfirmation("");
      setHardDeleteStatus("");

      if (!selectedOrganizationId) {
        setDetail(null);
        setDetailStatus("");
        setLogisticsModeDraft("legacy");
        return;
      }

      void loadOrganizationDetail(selectedOrganizationId);
    });
  }, [selectedOrganizationId, loadOrganizationDetail]);

  function resetDetailFeedback() {
    setDetailStatus("");
    setLogisticsModeStatus("");
    setAdminStatus("");
    setHardDeleteStatus("");
  }

  const handleForbidden = useCallback(() => {
    setIsForbidden(true);
  }, []);

  function selectOrganization(organizationId: string) {
    const normalizedOrganizationId = organizationId.trim();
    if (selectedOrganizationId === normalizedOrganizationId) return;

    setSelectedOrganizationId(normalizedOrganizationId || null);
    setDetail(null);
    resetDetailFeedback();
  }

  function openCreateModal() {
    setCreateName("");
    setCreateSlug("");
    setCreateSlugTouched(false);
    setCreateLogisticsMode("legacy");
    setCreateStatus("");
    setShowCreateModal(true);
  }

  function openHardDeleteModal() {
    setHardDeleteConfirmation("");
    setHardDeleteStatus("");
    setShowHardDeleteModal(true);
  }

  function updateAdminField(field: "email" | "password" | "firstName" | "lastName", value: string) {
    if (field === "email") setAdminEmail(value);
    else if (field === "password") setAdminPassword(value);
    else if (field === "firstName") setAdminFirstName(value);
    else setAdminLastName(value);
  }

  async function handleCreateOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateStatus("");

    const normalizedName = createName.trim();
    const normalizedSlug = (createSlug.trim() || toOrganizationSlug(createName)).trim();

    if (!normalizedName) {
      setCreateStatus("Le nom de l'organisation est requis.");
      return;
    }

    if (!normalizedSlug) {
      setCreateStatus("Le slug est requis.");
      return;
    }

    setCreatingOrganization(true);

    const { res, data } = await apiFetchJson("/api/platform/super-admin/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: normalizedName,
        slug: normalizedSlug,
        settings: { logistics_mode: createLogisticsMode },
      }),
    });

    if (res.status === 403) {
      setIsForbidden(true);
      setCreatingOrganization(false);
      return;
    }

    if (!res.ok) {
      setCreateStatus(getErrorMessage(data, "Création de l'organisation impossible."));
      setCreatingOrganization(false);
      return;
    }

    const createdOrganization = parseOrganizationSummary(data.organization);
    setShowCreateModal(false);
    setCreatingOrganization(false);

    pushNotification({
      tone: "success",
      title: "Organisation créée",
      message: createdOrganization?.name
        ? `${createdOrganization.name} est maintenant disponible dans la plateforme.`
        : "La nouvelle organisation est maintenant disponible dans la plateforme.",
    });

    await loadOrganizations(createdOrganization?.id ?? null);
  }

  async function handleSaveLogisticsMode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganizationId) return;

    if (detail?.logistics_mode === "integrated" && logisticsModeDraft === "legacy") {
      setLogisticsModeStatus("Le retour du mode intégré vers le mode historique est interdit.");
      return;
    }

    setSavingLogisticsMode(true);
    setLogisticsModeStatus("");

    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/organizations/${selectedOrganizationId}/settings`,
      {
        method: "PATCH",
        body: JSON.stringify({ settings: { logistics_mode: logisticsModeDraft } }),
      },
    );

    if (res.status === 403) {
      setIsForbidden(true);
      setSavingLogisticsMode(false);
      return;
    }

    if (!res.ok) {
      setLogisticsModeStatus(getErrorMessage(data, "Sauvegarde du mode logistique impossible."));
      setSavingLogisticsMode(false);
      return;
    }

    setSavingLogisticsMode(false);
    pushNotification({
      tone: "success",
      title: "Mode logistique mis à jour",
      message: `L'organisation utilise maintenant le mode ${
        logisticsModeDraft === "integrated" ? "intégré" : "historique"
      }.`,
    });

    await loadOrganizationDetail(selectedOrganizationId);
    await loadOrganizations();
  }

  async function handleSaveAdmin(event: React.FormEvent<HTMLFormElement>): Promise<boolean> {
    event.preventDefault();
    if (!selectedOrganizationId) return false;

    const normalizedEmail = adminEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setAdminStatus("Email requis.");
      return false;
    }

    if (adminMode === "create" && adminPassword.length < 8) {
      setAdminStatus("Mot de passe requis (8 caractères min).");
      return false;
    }

    setSavingAdmin(true);
    setAdminStatus("");

    const payload: Record<string, unknown> = {
      mode: adminMode,
      email: normalizedEmail,
      first_name: adminFirstName.trim() || undefined,
      last_name: adminLastName.trim() || undefined,
    };

    if (adminMode === "create") payload.password = adminPassword;

    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/organizations/${selectedOrganizationId}/admins`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    if (res.status === 403) {
      setIsForbidden(true);
      setSavingAdmin(false);
      return false;
    }

    if (!res.ok) {
      setAdminStatus(getErrorMessage(data, "Mise à jour de l'admin impossible."));
      setSavingAdmin(false);
      return false;
    }

    setSavingAdmin(false);
    setAdminEmail("");
    setAdminPassword("");
    setAdminFirstName("");
    setAdminLastName("");

    pushNotification({
      tone: "success",
      title: adminMode === "create" ? "Compte admin créé" : "Compte admin rattaché",
      message:
        adminMode === "create"
          ? "Le nouveau compte admin a bien été créé."
          : "Le compte existant a bien été rattaché à l'organisation.",
    });

    await loadOrganizationDetail(selectedOrganizationId);
    await loadOrganizations();
    return true;
  }

  async function handleCreateCompany(input: {
    name: string;
    slug?: string;
    code?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    if (!selectedOrganizationId || !selectedOrganization) {
      return { ok: false, error: "Sélectionnez d'abord une organisation." };
    }

    const normalizedName = input.name.trim();
    const normalizedSlug = (input.slug?.trim() || toOrganizationSlug(input.name)).trim();
    const normalizedCode = input.code?.trim() || undefined;

    if (!normalizedName) return { ok: false, error: "Le nom de l'entreprise est requis." };
    if (!normalizedSlug) return { ok: false, error: "Le slug de l'entreprise est requis." };

    setSavingCompany(true);

    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/organizations/${selectedOrganizationId}/companies`,
      {
        method: "POST",
        body: JSON.stringify({
          name: normalizedName,
          slug: normalizedSlug,
          code: normalizedCode,
        }),
      },
    );

    if (res.status === 403) {
      setIsForbidden(true);
      setSavingCompany(false);
      return { ok: false };
    }

    if (!res.ok) {
      setSavingCompany(false);
      return { ok: false, error: getErrorMessage(data, "Création de l'entreprise impossible.") };
    }

    setSavingCompany(false);
    pushNotification({
      tone: "success",
      title: "Entreprise créée",
      message: `${normalizedName} est maintenant disponible dans ${selectedOrganization.name}.`,
    });

    await loadOrganizationDetail(selectedOrganizationId);
    return { ok: true };
  }

  async function handleHardDeleteOrganization(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedOrganizationId || !selectedOrganization) return;

    setHardDeletingOrganization(true);
    setHardDeleteStatus("");

    const organizationName = selectedOrganization.name;
    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/organizations/${selectedOrganizationId}/hard-delete`,
      {
        method: "DELETE",
        body: JSON.stringify({ confirmation: hardDeleteConfirmation }),
      },
    );

    if (res.status === 403) {
      setIsForbidden(true);
      setHardDeletingOrganization(false);
      return;
    }

    if (!res.ok) {
      setHardDeleteStatus(
        getErrorMessage(data, "La purge de développement de l'organisation a échoué."),
      );
      setHardDeletingOrganization(false);
      return;
    }

    const deletedUserCount =
      typeof data.deleted_user_count === "number" ? data.deleted_user_count : 0;

    setHardDeletingOrganization(false);
    setShowHardDeleteModal(false);
    setHardDeleteConfirmation("");
    setHardDeleteStatus("");
    setDetail(null);
    setSelectedOrganizationId(null);
    selectedOrganizationIdRef.current = null;

    pushNotification({
      tone: "success",
      title: "Entreprise purgée",
      message:
        deletedUserCount > 0
          ? `${organizationName} a été supprimée avec ${deletedUserCount} compte${
              deletedUserCount > 1 ? "s" : ""
            } lié${deletedUserCount > 1 ? "s" : ""}.`
          : `${organizationName} a été supprimée définitivement.`,
    });

    await loadOrganizations(null);
  }

  if (isForbidden) {
    return (
      <section className="saturn-superadmin-shell super-admin-page">
        <DashboardStateMessage
          tone="error"
          title="Accès refusé"
          description="Cette instance ne reconnaît pas le compte courant comme super admin."
        />
      </section>
    );
  }

  return (
    <section className="saturn-superadmin-shell saturn-superadmin-console">
      <div className="saturn-superadmin-workbench">
        <aside className="saturn-superadmin-primary-nav" aria-label="Navigation Saturn">
          <div className="saturn-superadmin-primary-nav__brand">
            <strong>Saturn</strong>
            <span>Gestion plateforme</span>
          </div>
          <button
            type="button"
            aria-current={activeWorkspace === "organizations" ? "page" : undefined}
            className={activeWorkspace === "organizations" ? "is-active" : ""}
            onClick={() => setActiveWorkspace("organizations")}
          >
            <strong>Organisations</strong>
            <span>{organizations.length} fiches</span>
          </button>
          <button
            type="button"
            aria-current={activeWorkspace === "accounts" ? "page" : undefined}
            className={activeWorkspace === "accounts" ? "is-active" : ""}
            onClick={() => setActiveWorkspace("accounts")}
          >
            <strong>Comptes</strong>
            <span>Sécurité et appareils</span>
          </button>
        </aside>

        <div className="saturn-superadmin-main">
          {activeWorkspace === "accounts" ? (
            <div className="saturn-security-workspace">
              <SaturnDeviceApprovalPanel onForbidden={handleForbidden} />
              <SaturnAccountSecurityPanel organizations={organizations} />
            </div>
          ) : (
            <>
              <div className="saturn-superadmin-toolbar">
                <div>
                  <h2>Organisations</h2>
                  <p>
                    {organizations.length} organisation{organizations.length > 1 ? "s" : ""}
                    {" · "}
                    {activeOrganizationsCount} active{activeOrganizationsCount > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="saturn-superadmin-toolbar__actions">
                  <button
                    type="button"
                    className="dashboard-button dashboard-button--secondary"
                    onClick={() => void loadOrganizations()}
                    disabled={loadingOrganizations}
                    title="Rafraîchir la liste"
                  >
                    Rafraîchir
                  </button>
                  <button type="button" className="dashboard-button" onClick={openCreateModal}>
                    Créer
                  </button>
                </div>
              </div>

              <div className="super-admin-layout">
                <div className="super-admin-panel super-admin-panel--directory">
                  <div className="super-admin-dir-header">
                    <div>
                      <h2>Liste</h2>
                      <p>Sélectionnez une ligne pour ouvrir les actions.</p>
                    </div>
                  </div>

                  <label className="super-admin-directory-search">
                    <span>Rechercher</span>
                    <input
                      type="search"
                      value={directoryQuery}
                      onChange={(event) => setDirectoryQuery(event.target.value)}
                      placeholder="Nom ou slug"
                    />
                  </label>

                  {organizationsStatus ? (
                    <DashboardInlineFeedback>{organizationsStatus}</DashboardInlineFeedback>
                  ) : null}

                  {loadingOrganizations ? (
                    <SuperAdminDirectorySkeleton includeHeader={false} />
                  ) : organizations.length === 0 ? (
                    <DashboardStateMessage
                      tone="info"
                      title="Aucune organisation"
                      description="Créez une organisation pour initialiser la plateforme."
                    />
                  ) : visibleOrganizations.length === 0 ? (
                    <DashboardStateMessage
                      tone="info"
                      title="Aucun résultat"
                      description="Aucune organisation ne correspond à cette recherche."
                    />
                  ) : (
                    <div className="super-admin-org-directory">
                      {visibleOrganizations.map((organization) => (
                        <button
                          key={organization.id}
                          type="button"
                          className={`super-admin-org-card${
                            organization.id === selectedOrganizationId ? " is-selected" : ""
                          }`}
                          onClick={() => selectOrganization(organization.id)}
                        >
                          <div className="super-admin-org-card__top">
                            <strong>{organization.name}</strong>
                            <span
                              className={`admin-account-card__chip admin-account-card__chip--status admin-account-card__chip--status-${
                                organization.is_active ? "active" : "disabled"
                              }`}
                            >
                              {organization.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="super-admin-org-card__meta">
                            <span>{organization.slug}</span>
                            <span>{renderOrganizationAdminCount(organization.admin_count)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <SaturnSuperAdminInspector
                  organizations={organizations}
                  selectedOrganizationId={selectedOrganizationId}
                  selectedOrganization={selectedOrganization}
                  detail={detail}
                  loadingOrganizations={loadingOrganizations}
                  loadingDetail={loadingDetail}
                  detailStatus={detailStatus}
                  logisticsModeDraft={logisticsModeDraft}
                  savingLogisticsMode={savingLogisticsMode}
                  logisticsModeStatus={logisticsModeStatus}
                  adminMode={adminMode}
                  adminEmail={adminEmail}
                  adminPassword={adminPassword}
                  adminFirstName={adminFirstName}
                  adminLastName={adminLastName}
                  adminStatus={adminStatus}
                  savingAdmin={savingAdmin}
                  savingCompany={savingCompany}
                  onOpenHardDeleteModal={openHardDeleteModal}
                  onSelectOrganization={selectOrganization}
                  onLogisticsModeChange={setLogisticsModeDraft}
                  onSaveLogisticsMode={handleSaveLogisticsMode}
                  onAdminModeChange={setAdminMode}
                  onAdminFieldChange={updateAdminField}
                  onSaveAdmin={handleSaveAdmin}
                  onCreateCompany={handleCreateCompany}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {showCreateModal ? (
        <Modal
          className="super-admin-modal"
          onClose={() => setShowCreateModal(false)}
          pending={creatingOrganization}
          pendingLabel="Création de l'organisation..."
        >
          <ModalHero
            eyebrow="Plateforme"
            title="Créer une organisation"
            description="Définissez le nom, le slug et le mode logistique de la nouvelle organisation."
            className="super-admin-modal__header"
          />

          <form onSubmit={handleCreateOrganization} className="admin-form" autoComplete="off">
            <ModalSection className="super-admin-modal__section">
              <div className="super-admin-modal__grid super-admin-modal__grid--two">
                <label className="admin-field">
                  <span>Nom</span>
                  <input
                    type="text"
                    value={createName}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      const previousGeneratedSlug = toOrganizationSlug(createName);
                      setCreateName(nextName);
                      if (!createSlugTouched || createSlug === previousGeneratedSlug) {
                        setCreateSlug(toOrganizationSlug(nextName));
                      }
                    }}
                    placeholder="Acme Mobility"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>Slug</span>
                  <input
                    type="text"
                    value={createSlug}
                    onChange={(event) => {
                      setCreateSlugTouched(true);
                      setCreateSlug(toOrganizationSlug(event.target.value));
                    }}
                    placeholder="acme-mobility"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>Mode logistique</span>
                  <select
                    value={createLogisticsMode}
                    onChange={(event) =>
                      setCreateLogisticsMode(event.target.value as LogisticsMode)
                    }
                  >
                    <option value="legacy">Historique</option>
                    <option value="integrated">Intégré</option>
                  </select>
                </label>
              </div>

              <div className="super-admin-modal__sectionActions">
                <button type="submit" className="dashboard-button" disabled={creatingOrganization}>
                  Créer l&apos;organisation
                </button>
              </div>
            </ModalSection>

            <ModalActions className="super-admin-modal__actions">
              <button
                type="button"
                className="dashboard-button dashboard-button--secondary"
                disabled={creatingOrganization}
                onClick={() => setShowCreateModal(false)}
              >
                Fermer
              </button>
            </ModalActions>

            {createStatus ? <DashboardInlineFeedback>{createStatus}</DashboardInlineFeedback> : null}
          </form>
        </Modal>
      ) : null}

      {showHardDeleteModal && selectedOrganization ? (
        <Modal
          className="super-admin-modal"
          onClose={() => setShowHardDeleteModal(false)}
          pending={hardDeletingOrganization}
          pendingLabel="Purge de l&apos;organisation..."
        >
          <ModalHero
            eyebrow="Purge dev"
            title={`Supprimer définitivement ${selectedOrganization.name}`}
            description="Action réservée au développement. Toutes les données liées à cette entreprise seront détruites."
            className="super-admin-modal__header"
          />

          <form onSubmit={handleHardDeleteOrganization} className="admin-form" autoComplete="off">
            <ModalSection className="super-admin-modal__section">
              <DashboardInlineFeedback tone="warning">
                Cette purge retire définitivement l&apos;entreprise, ses comptes, concessions, dépôts,
                relations partenaires, demandes, trajets, mouvements et interventions.
              </DashboardInlineFeedback>

              <div className="super-admin-modal__grid">
                <label className="admin-field">
                  <span>
                    Tapez le slug <strong>{selectedOrganization.slug}</strong> pour confirmer
                  </span>
                  <input
                    type="text"
                    value={hardDeleteConfirmation}
                    onChange={(event) => setHardDeleteConfirmation(event.target.value)}
                    placeholder={selectedOrganization.slug}
                    required
                  />
                </label>
              </div>

              {hardDeleteStatus ? (
                <DashboardInlineFeedback tone="error">{hardDeleteStatus}</DashboardInlineFeedback>
              ) : null}
            </ModalSection>

            <ModalActions className="super-admin-modal__actions">
              <button
                type="submit"
                className="dashboard-button dashboard-button--danger"
                disabled={hardDeletingOrganization}
              >
                {hardDeletingOrganization ? "Purge..." : "Purger définitivement"}
              </button>
              <button
                type="button"
                className="dashboard-button dashboard-button--secondary"
                disabled={hardDeletingOrganization}
                onClick={() => setShowHardDeleteModal(false)}
              >
                Annuler
              </button>
            </ModalActions>
          </form>
        </Modal>
      ) : null}

      <NotificationToasts notifications={notifications} onDismiss={dismissNotification} />
    </section>
  );
}

function renderOrganizationAdminCount(adminCount: number): string {
  return `${adminCount} admin${adminCount > 1 ? "s" : ""}`;
}
