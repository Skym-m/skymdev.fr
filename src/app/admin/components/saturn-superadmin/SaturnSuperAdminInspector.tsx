"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { PartnerGovernanceManager } from "@/app/admin/components/saturn-superadmin/PartnerGovernanceManager";
import {
  formatAdminName,
  formatCollaborationProfile,
  toOrganizationSlug,
} from "@/app/admin/components/saturn-superadmin/parsing";
import type {
  LogisticsMode,
  OrganizationDetail,
  OrganizationSummary,
} from "@/app/admin/components/saturn-superadmin/types";
import {
  DashboardInlineFeedback,
  DashboardStateMessage,
  Modal,
  ModalActions,
  ModalHero,
  ModalSection,
  SuperAdminInspectorSkeleton,
} from "@/app/admin/components/saturn-superadmin/ui";

export type SuperAdminAdminMode = "create" | "attach";
type SuperAdminInspectorSection = "configuration" | "companies" | "collaboration" | "admins";

type SuperAdminInspectorProps = {
  organizations: OrganizationSummary[];
  selectedOrganizationId: string | null;
  selectedOrganization: OrganizationSummary | null;
  detail: OrganizationDetail | null;
  loadingOrganizations: boolean;
  loadingDetail: boolean;
  detailStatus: string;
  logisticsModeDraft: LogisticsMode;
  savingLogisticsMode: boolean;
  logisticsModeStatus: string;
  adminMode: SuperAdminAdminMode;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminStatus: string;
  savingAdmin: boolean;
  savingCompany: boolean;
  onOpenHardDeleteModal: () => void;
  onSelectOrganization: (organizationId: string) => void;
  onLogisticsModeChange: (mode: LogisticsMode) => void;
  onSaveLogisticsMode: (event: FormEvent<HTMLFormElement>) => void;
  onAdminModeChange: (mode: SuperAdminAdminMode) => void;
  onAdminFieldChange: (
    field: "email" | "password" | "firstName" | "lastName",
    value: string,
  ) => void;
  onSaveAdmin: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onCreateCompany: (input: {
    name: string;
    slug?: string;
    code?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
};

function renderAdminCount(count: number): string {
  return `${count} admin${count > 1 ? "s" : ""}`;
}

function MobileOrganizationSelector({
  organizations,
  selectedOrganizationId,
  loadingOrganizations,
  onSelectOrganization,
}: Pick<
  SuperAdminInspectorProps,
  "organizations" | "selectedOrganizationId" | "loadingOrganizations" | "onSelectOrganization"
>) {
  return (
    <div className="super-admin-mobile-selector">
      <label className="super-admin-mobile-selector__label" htmlFor="super-admin-mobile-selector">
        Entreprise
      </label>
      <select
        id="super-admin-mobile-selector"
        className="super-admin-mobile-selector__select"
        value={selectedOrganizationId ?? ""}
        onChange={(event) => onSelectOrganization(event.target.value)}
        disabled={loadingOrganizations || organizations.length === 0}
      >
        <option value="">Sélectionner une organisation</option>
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SuperAdminPageSection({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-partners__catalogSurface admin-partners__catalogSurface--plain">
      <div className="dashboard-panel__header">
        <h2>{title}</h2>
        {actions ? <div className="admin-partners__catalogActions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function OrganizationSummaryCard({
  selectedOrganization,
  detail,
}: Pick<SuperAdminInspectorProps, "selectedOrganization" | "detail">) {
  if (!selectedOrganization) return null;

  const adminCount = detail?.admins.length ?? selectedOrganization.admin_count;

  return (
    <div className="super-admin-focus-card">
      <div className="super-admin-focus-card__header">
        <div>
          <h4>{selectedOrganization.name}</h4>
          <p className="super-admin-focus-card__meta">{selectedOrganization.slug}</p>
        </div>
        <span className="super-admin-focus-card__state">
          {selectedOrganization.is_active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="super-admin-focus-card__facts">
        <span className="super-admin-meta-pill">{renderAdminCount(adminCount)}</span>
        <span className="super-admin-meta-pill">
          {detail?.companies.length ?? 0} entreprise{(detail?.companies.length ?? 0) > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function OrganizationConfigurationSection({
  detail,
  logisticsModeDraft,
  savingLogisticsMode,
  logisticsModeStatus,
  onLogisticsModeChange,
  onSaveLogisticsMode,
}: Pick<
  SuperAdminInspectorProps,
  | "detail"
  | "logisticsModeDraft"
  | "savingLogisticsMode"
  | "logisticsModeStatus"
  | "onLogisticsModeChange"
  | "onSaveLogisticsMode"
>) {
  if (!detail) return null;

  const legacyDowngradeLocked = detail.logistics_mode === "integrated";

  return (
    <form onSubmit={onSaveLogisticsMode} autoComplete="off">
      <SuperAdminPageSection title="Configuration active">
        <section className="dashboard-subpanel">
          <div className="admin-form admin-partners__stack">
            <label className="admin-field">
              <span>Mode logistique</span>
              <select
                value={logisticsModeDraft}
                onChange={(event) => onLogisticsModeChange(event.target.value as LogisticsMode)}
                disabled={savingLogisticsMode}
              >
                <option value="legacy" disabled={legacyDowngradeLocked}>
                  Historique
                </option>
                <option value="integrated">Intégré</option>
              </select>
            </label>

            {legacyDowngradeLocked ? (
              <DashboardInlineFeedback>
                Le retour du mode intégré vers le mode historique est définitivement bloqué.
              </DashboardInlineFeedback>
            ) : null}

            <div className="admin-partners__summaryList admin-partners__summaryList--metrics">
              <article className="admin-partners__summaryItem is-active">
                <strong>{formatCollaborationProfile(detail.collaboration_profile)}</strong>
                <p>Profil de collaboration actuellement appliqué.</p>
              </article>
              <article className="admin-partners__summaryItem">
                <strong>
                  {detail.relationship_counts.owner_active} / {detail.relationship_counts.owner_total}
                </strong>
                <p>Relations owner actives et visibles.</p>
              </article>
              <article className="admin-partners__summaryItem">
                <strong>
                  {detail.relationship_counts.partner_active} /{" "}
                  {detail.relationship_counts.partner_total}
                </strong>
                <p>Relations partenaire actives et visibles.</p>
              </article>
            </div>

            <div className="admin-partners__formActions">
              <button type="submit" className="dashboard-button" disabled={savingLogisticsMode}>
                {savingLogisticsMode ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>

            {logisticsModeStatus ? (
              <DashboardInlineFeedback>{logisticsModeStatus}</DashboardInlineFeedback>
            ) : null}
          </div>
        </section>
      </SuperAdminPageSection>
    </form>
  );
}

function OrganizationDangerZoneSection({
  selectedOrganization,
  onOpenHardDeleteModal,
}: Pick<SuperAdminInspectorProps, "selectedOrganization" | "onOpenHardDeleteModal">) {
  if (!selectedOrganization) return null;

  return (
    <SuperAdminPageSection title="Zone dangereuse">
      <section className="dashboard-subpanel super-admin-danger-zone">
        <DashboardInlineFeedback tone="warning">
          La purge de développement supprime définitivement l&apos;entreprise, ses comptes,
          concessions, dépôts, demandes, trajets, mouvements, interventions et relations
          partenaires.
        </DashboardInlineFeedback>
        <div className="super-admin-danger-zone__actions">
          <button
            type="button"
            className="dashboard-button dashboard-button--danger"
            onClick={onOpenHardDeleteModal}
          >
            Purge dev définitive
          </button>
        </div>
      </section>
    </SuperAdminPageSection>
  );
}

function OrganizationAdminsSection({
  detail,
  onOpenAddAdminModal,
}: {
  detail: OrganizationDetail | null;
  onOpenAddAdminModal: () => void;
}) {
  if (!detail) return null;

  return (
    <SuperAdminPageSection title="Administrateurs rattachés">
      <section className="dashboard-subpanel">
        <div className="dashboard-subpanel__header dashboard-subpanel__header--withActions">
          <div className="dashboard-subpanel__headerCopy">
            <h3>Comptes rattachés</h3>
          </div>
          <div className="dashboard-subpanel__headerActions">
            <button
              type="button"
              className="dashboard-button dashboard-button--secondary"
              onClick={onOpenAddAdminModal}
            >
              Ajouter un administrateur
            </button>
          </div>
        </div>

        {detail.admins.length > 0 ? (
          <ul className="admin-partners__summaryList super-admin-admin-list">
            {detail.admins.map((admin) => (
              <li key={admin.user_id} className="admin-partners__summaryItem">
                <strong>{formatAdminName(admin)}</strong>
                <p>{admin.email ?? "Aucune adresse e-mail renseignée."}</p>
              </li>
            ))}
          </ul>
        ) : (
          <article className="admin-partners__summaryItem">
            <strong>Aucun administrateur rattaché</strong>
            <p>Ajoutez un accès uniquement quand cette organisation en a réellement besoin.</p>
          </article>
        )}
      </section>
    </SuperAdminPageSection>
  );
}

function OrganizationCompaniesSection({
  detail,
  onOpenCreateCompanyModal,
}: {
  detail: OrganizationDetail | null;
  onOpenCreateCompanyModal: () => void;
}) {
  if (!detail) return null;

  return (
    <SuperAdminPageSection title="Entreprises propriétaires">
      <section className="dashboard-subpanel">
        <div className="dashboard-subpanel__header dashboard-subpanel__header--withActions">
          <div className="dashboard-subpanel__headerCopy">
            <h3>Rattachement métier</h3>
            <p>
              Ces entreprises portent la propriété des véhicules du groupe et servent de
              destinataire pour la facturation.
            </p>
          </div>
          <div className="dashboard-subpanel__headerActions">
            <button
              type="button"
              className="dashboard-button dashboard-button--secondary"
              onClick={onOpenCreateCompanyModal}
            >
              Ajouter une entreprise
            </button>
          </div>
        </div>

        {detail.companies.length > 0 ? (
          <ul className="admin-partners__summaryList super-admin-admin-list">
            {detail.companies.map((company) => (
              <li key={company.id} className="admin-partners__summaryItem">
                <strong>{company.name}</strong>
                <p>
                  {[company.code, company.slug].filter(Boolean).join(" · ") ||
                    "Aucun code métier renseigné."}
                </p>
                <div className="super-admin-focus-card__facts">
                  <span className="super-admin-meta-pill">
                    {company.is_active ? "Active" : "Inactive"}
                  </span>
                  {company.is_default ? (
                    <span className="super-admin-meta-pill">Par défaut</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <article className="admin-partners__summaryItem">
            <strong>Aucune entreprise propriétaire</strong>
            <p>Ajoutez ici les entreprises du groupe auxquelles les véhicules appartiennent.</p>
          </article>
        )}
      </section>
    </SuperAdminPageSection>
  );
}

function CompanyEditorModal({
  selectedOrganization,
  savingCompany,
  onClose,
  onCreateCompany,
}: Pick<
  SuperAdminInspectorProps,
  "selectedOrganization" | "savingCompany" | "onCreateCompany"
> & { onClose: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [companySlugTouched, setCompanySlugTouched] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [companyStatus, setCompanyStatus] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompanyStatus("");

    const result = await onCreateCompany({
      name: companyName,
      slug: companySlug,
      code: companyCode,
    });

    if (!result.ok) {
      setCompanyStatus(result.error ?? "Création de l'entreprise impossible.");
      return;
    }

    onClose();
  }

  return (
    <Modal
      className="super-admin-modal"
      onClose={onClose}
      pending={savingCompany}
      pendingLabel="Création de l'entreprise..."
    >
      <ModalHero
        eyebrow="Organisation"
        title="Ajouter une entreprise propriétaire"
        description={
          selectedOrganization
            ? `Créez une entreprise métier dans ${selectedOrganization.name}.`
            : "Créez une entreprise métier dans ce groupe."
        }
        className="super-admin-modal__header"
      />

      <form onSubmit={handleSubmit} className="admin-form" autoComplete="off">
        <ModalSection className="super-admin-modal__section">
          <div className="super-admin-modal__grid super-admin-modal__grid--two">
            <label className="admin-field">
              <span>Nom</span>
              <input
                type="text"
                value={companyName}
                onChange={(event) => {
                  const nextName = event.target.value;
                  const previousGeneratedSlug = toOrganizationSlug(companyName);
                  setCompanyName(nextName);
                  if (!companySlugTouched || companySlug === previousGeneratedSlug) {
                    setCompanySlug(toOrganizationSlug(nextName));
                  }
                }}
                required
              />
            </label>

            <label className="admin-field">
              <span>Slug</span>
              <input
                type="text"
                value={companySlug}
                onChange={(event) => {
                  setCompanySlugTouched(true);
                  setCompanySlug(toOrganizationSlug(event.target.value));
                }}
                placeholder="généré automatiquement"
              />
            </label>

            <label className="admin-field">
              <span>Code</span>
              <input
                type="text"
                value={companyCode}
                onChange={(event) => setCompanyCode(event.target.value.toUpperCase())}
                placeholder="Optionnel"
              />
            </label>
          </div>
          {companyStatus ? <DashboardInlineFeedback>{companyStatus}</DashboardInlineFeedback> : null}
        </ModalSection>

        <ModalActions className="super-admin-modal__actions">
          <button type="submit" className="dashboard-button" disabled={savingCompany}>
            {savingCompany ? "Enregistrement..." : "Créer l'entreprise"}
          </button>
          <button
            type="button"
            className="dashboard-button dashboard-button--secondary"
            disabled={savingCompany}
            onClick={onClose}
          >
            Fermer
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function AdminEditorModal({
  selectedOrganization,
  adminMode,
  adminEmail,
  adminPassword,
  adminFirstName,
  adminLastName,
  adminStatus,
  savingAdmin,
  onClose,
  onAdminModeChange,
  onAdminFieldChange,
  onSaveAdmin,
}: Pick<
  SuperAdminInspectorProps,
  | "selectedOrganization"
  | "adminMode"
  | "adminEmail"
  | "adminPassword"
  | "adminFirstName"
  | "adminLastName"
  | "adminStatus"
  | "savingAdmin"
  | "onAdminModeChange"
  | "onAdminFieldChange"
  | "onSaveAdmin"
> & { onClose: () => void }) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const saved = await onSaveAdmin(event);
    if (saved) onClose();
  }

  return (
    <Modal
      className="super-admin-modal"
      onClose={onClose}
      pending={savingAdmin}
      pendingLabel="Enregistrement de l'administrateur..."
    >
      <ModalHero
        eyebrow="Administration"
        title="Ajouter un administrateur"
        description={
          selectedOrganization
            ? `Créez ou rattachez un accès pour ${selectedOrganization.name}.`
            : "Créez ou rattachez un accès administrateur."
        }
        className="super-admin-modal__header"
      />

      <form onSubmit={handleSubmit} className="admin-form" autoComplete="off">
        <ModalSection className="super-admin-modal__section">
          <div className="super-admin-choiceRow" role="tablist" aria-label="Type d'action admin">
            <button
              type="button"
              role="tab"
              aria-selected={adminMode === "create"}
              className={`super-admin-choice${adminMode === "create" ? " is-selected" : ""}`}
              onClick={() => onAdminModeChange("create")}
            >
              <strong>Créer un compte</strong>
              <span>Nouveau compte admin dédié à cette organisation.</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={adminMode === "attach"}
              className={`super-admin-choice${adminMode === "attach" ? " is-selected" : ""}`}
              onClick={() => onAdminModeChange("attach")}
            >
              <strong>Rattacher un compte</strong>
              <span>Associer un compte existant à l&apos;organisation.</span>
            </button>
          </div>

          <div className="super-admin-modal__grid super-admin-modal__grid--two">
            <label className="admin-field">
              <span>Email</span>
              <input
                type="email"
                value={adminEmail}
                onChange={(event) => onAdminFieldChange("email", event.target.value)}
                required
              />
            </label>

            {adminMode === "create" ? (
              <label className="admin-field">
                <span>Mot de passe</span>
                <input
                  type="password"
                  minLength={8}
                  value={adminPassword}
                  onChange={(event) => onAdminFieldChange("password", event.target.value)}
                  required
                />
              </label>
            ) : null}

            <label className="admin-field">
              <span>Prénom</span>
              <input
                type="text"
                value={adminFirstName}
                onChange={(event) => onAdminFieldChange("firstName", event.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Nom</span>
              <input
                type="text"
                value={adminLastName}
                onChange={(event) => onAdminFieldChange("lastName", event.target.value)}
              />
            </label>
          </div>
          {adminStatus ? <DashboardInlineFeedback>{adminStatus}</DashboardInlineFeedback> : null}
        </ModalSection>

        <ModalActions className="super-admin-modal__actions">
          <button type="submit" className="dashboard-button" disabled={savingAdmin}>
            {savingAdmin ? "Enregistrement..." : "Valider"}
          </button>
          <button
            type="button"
            className="dashboard-button dashboard-button--secondary"
            disabled={savingAdmin}
            onClick={onClose}
          >
            Fermer
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function SaturnSuperAdminInspector({
  organizations,
  selectedOrganizationId,
  selectedOrganization,
  detail,
  loadingOrganizations,
  loadingDetail,
  detailStatus,
  logisticsModeDraft,
  savingLogisticsMode,
  logisticsModeStatus,
  adminMode,
  adminEmail,
  adminPassword,
  adminFirstName,
  adminLastName,
  adminStatus,
  savingAdmin,
  savingCompany,
  onOpenHardDeleteModal,
  onSelectOrganization,
  onLogisticsModeChange,
  onSaveLogisticsMode,
  onAdminModeChange,
  onAdminFieldChange,
  onSaveAdmin,
  onCreateCompany,
}: SuperAdminInspectorProps) {
  const [activeSection, setActiveSection] = useState<SuperAdminInspectorSection>("configuration");
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");

    function handleChange() {
      setIsCompactLayout(query.matches);
      if (!query.matches) setShowSectionModal(false);
    }

    handleChange();
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setActiveSection("configuration");
      setShowSectionModal(false);
      setShowAdminModal(false);
      setShowCompanyModal(false);
    });
  }, [selectedOrganizationId]);

  const sectionLinks = useMemo(
    () => [
      {
        id: "configuration" as const,
        eyebrow: "Organisation",
        label: "Configuration",
        description: "Mode logistique, structure et lecture rapide.",
      },
      {
        id: "companies" as const,
        eyebrow: "Métier",
        label: "Entreprises",
        description: detail
          ? `${detail.companies.length} entreprise${detail.companies.length > 1 ? "s" : ""} propriétaire${detail.companies.length > 1 ? "s" : ""}.`
          : "Rattachement véhicules et facturation.",
      },
      {
        id: "collaboration" as const,
        eyebrow: "Réseau",
        label: "Collaboration",
        description: detail
          ? `${detail.relationship_counts.owner_total + detail.relationship_counts.partner_total} relation(s) visible(s).`
          : "Liens partenaires, délégations et rôles.",
      },
      {
        id: "admins" as const,
        eyebrow: "Accès",
        label: "Administrateurs",
        description: detail ? renderAdminCount(detail.admins.length) : "Comptes rattachés.",
      },
    ],
    [detail],
  );

  const activeSectionLink =
    sectionLinks.find((section) => section.id === activeSection) ?? sectionLinks[0];

  function selectSection(sectionId: SuperAdminInspectorSection) {
    setActiveSection(sectionId);
    if (isCompactLayout) setShowSectionModal(true);
  }

  function openAdminModal() {
    setShowSectionModal(false);
    setShowAdminModal(true);
  }

  function openCompanyModal() {
    setShowSectionModal(false);
    setShowCompanyModal(true);
  }

  function openHardDeleteModal() {
    setShowSectionModal(false);
    onOpenHardDeleteModal();
  }

  function renderActiveSection() {
    if (!detail) return null;

    if (activeSection === "configuration") {
      return (
        <>
          <OrganizationConfigurationSection
            detail={detail}
            logisticsModeDraft={logisticsModeDraft}
            savingLogisticsMode={savingLogisticsMode}
            logisticsModeStatus={logisticsModeStatus}
            onLogisticsModeChange={onLogisticsModeChange}
            onSaveLogisticsMode={onSaveLogisticsMode}
          />
          <OrganizationDangerZoneSection
            selectedOrganization={selectedOrganization}
            onOpenHardDeleteModal={openHardDeleteModal}
          />
        </>
      );
    }

    if (activeSection === "collaboration") {
      return (
        <PartnerGovernanceManager
          partnersEndpoint={`/api/platform/super-admin/organizations/${detail.organization.id}/partners`}
          configurationEndpoint={`/api/platform/super-admin/organizations/${detail.organization.id}/partners/configuration`}
          showHeader
          surface="plain"
        />
      );
    }

    if (activeSection === "companies") {
      return (
        <OrganizationCompaniesSection
          detail={detail}
          onOpenCreateCompanyModal={openCompanyModal}
        />
      );
    }

    return (
      <OrganizationAdminsSection
        detail={detail}
        onOpenAddAdminModal={openAdminModal}
      />
    );
  }

  return (
    <div className="super-admin-detail">
      <MobileOrganizationSelector
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        loadingOrganizations={loadingOrganizations}
        onSelectOrganization={onSelectOrganization}
      />

      {selectedOrganization ? (
        <>
          <OrganizationSummaryCard selectedOrganization={selectedOrganization} detail={detail} />
          {loadingDetail ? <SuperAdminInspectorSkeleton includeSummaryCard={false} /> : null}

          {!loadingDetail && detailStatus ? (
            <DashboardStateMessage
              tone="error"
              title="Impossible de charger cette entreprise"
              description={detailStatus}
            />
          ) : null}

          {!loadingDetail && detail ? (
            <>
              <div className="super-admin-section-tabs" role="tablist" aria-label="Sections de la fiche entreprise">
                {sectionLinks.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSection === section.id}
                    className={`super-admin-section-tabs__button${
                      activeSection === section.id ? " is-active" : ""
                    }`}
                    onClick={() => selectSection(section.id)}
                  >
                    <span>{section.eyebrow}</span>
                    <strong>{section.label}</strong>
                  </button>
                ))}
              </div>

              <div className="super-admin-inspector-content">
                {!isCompactLayout ? renderActiveSection() : null}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="super-admin-empty">
          <div>
            <strong>Sélectionnez une entreprise</strong>
            <p>Cliquez sur une organisation à gauche pour ouvrir sa fiche de pilotage.</p>
          </div>
        </div>
      )}

      {isCompactLayout && showSectionModal && detail ? (
        <Modal
          className="super-admin-modal super-admin-section-modal"
          onClose={() => setShowSectionModal(false)}
        >
          <ModalHero
            eyebrow={activeSectionLink.eyebrow}
            title={activeSectionLink.label}
            description={activeSectionLink.description}
            className="super-admin-modal__header"
          />
          <div className="super-admin-section-modal__content">{renderActiveSection()}</div>
        </Modal>
      ) : null}

      {showAdminModal && detail ? (
        <AdminEditorModal
          selectedOrganization={selectedOrganization}
          adminMode={adminMode}
          adminEmail={adminEmail}
          adminPassword={adminPassword}
          adminFirstName={adminFirstName}
          adminLastName={adminLastName}
          adminStatus={adminStatus}
          savingAdmin={savingAdmin}
          onClose={() => setShowAdminModal(false)}
          onAdminModeChange={onAdminModeChange}
          onAdminFieldChange={onAdminFieldChange}
          onSaveAdmin={onSaveAdmin}
        />
      ) : null}

      {showCompanyModal && detail ? (
        <CompanyEditorModal
          selectedOrganization={selectedOrganization}
          savingCompany={savingCompany}
          onClose={() => setShowCompanyModal(false)}
          onCreateCompany={onCreateCompany}
        />
      ) : null}
    </div>
  );
}
