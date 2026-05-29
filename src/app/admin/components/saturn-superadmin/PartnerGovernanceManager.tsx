"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetchJson, getErrorMessage } from "@/app/admin/components/saturn-superadmin/api";
import {
  buildRelationshipDraft,
  COLLABORATION_PROFILE_OPTIONS,
  formatPartnerDate,
  PARTNER_CAPABILITY_LABELS,
  parsePartnerPayload,
  RELATIONSHIP_STATE_LABELS,
  relationshipStateChipClass,
} from "@/app/admin/components/saturn-superadmin/parsing";
import {
  createEmptyPartnerCapabilities,
  PARTNER_CAPABILITY_KEYS,
  type CollaborationProfile,
  type PartnerCapabilities,
  type PartnerRelationshipState,
  type PartnerPayload,
  type RelationshipDraft,
} from "@/app/admin/components/saturn-superadmin/types";
import {
  DashboardInlineFeedback,
  DashboardStateMessage,
  Modal,
  ModalActions,
  ModalHero,
  ModalSection,
  PartnerGovernanceManagerSkeleton,
} from "@/app/admin/components/saturn-superadmin/ui";

type PartnerGovernanceManagerProps = {
  partnersEndpoint: string;
  configurationEndpoint: string;
  showHeader?: boolean;
  surface?: "panel" | "plain";
};

function rootClassName(surface: "panel" | "plain"): string {
  return surface === "panel"
    ? "dashboard-panel dashboard-panel--primary"
    : "admin-partners__catalogSurface admin-partners__catalogSurface--plain";
}

export function PartnerGovernanceManager({
  partnersEndpoint,
  configurationEndpoint,
  showHeader = true,
  surface = "panel",
}: PartnerGovernanceManagerProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<PartnerPayload | null>(null);
  const [profileDraft, setProfileDraft] = useState<CollaborationProfile>("standard");
  const [profilePending, setProfilePending] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPartnerOrganizationId, setSelectedPartnerOrganizationId] = useState("");
  const [createCapabilities, setCreateCapabilities] = useState<PartnerCapabilities>(
    createEmptyPartnerCapabilities(),
  );
  const [relationshipDrafts, setRelationshipDrafts] = useState<Record<string, RelationshipDraft>>(
    {},
  );
  const [relationshipPendingById, setRelationshipPendingById] = useState<Record<string, boolean>>(
    {},
  );

  const hydrate = useCallback((nextPayload: PartnerPayload) => {
    setPayload(nextPayload);
    setProfileDraft(nextPayload.collaboration_profile);

    const nextDrafts: Record<string, RelationshipDraft> = {};
    for (const relationship of nextPayload.owner_relationships) {
      nextDrafts[relationship.id] = buildRelationshipDraft(relationship);
    }
    setRelationshipDrafts(nextDrafts);
  }, []);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setStatus("");

    const { res, data } = await apiFetchJson(partnersEndpoint);
    if (!res.ok) {
      setPayload(null);
      setStatus(getErrorMessage(data, "Impossible de charger les partenaires"));
      setLoading(false);
      return;
    }

    hydrate(parsePartnerPayload(data));
    setLoading(false);
  }, [hydrate, partnersEndpoint]);

  useEffect(() => {
    queueMicrotask(() => void loadPartners());
  }, [loadPartners]);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedPartnerOrganizationId("");
      setCreateCapabilities(createEmptyPartnerCapabilities());
      setShowCreateModal(false);
    });
  }, [configurationEndpoint, partnersEndpoint]);

  const ownerRelationships = useMemo(
    () => payload?.owner_relationships ?? [],
    [payload?.owner_relationships],
  );
  const inboundRelationships = useMemo(
    () => payload?.partner_relationships ?? [],
    [payload?.partner_relationships],
  );
  const createCapabilityCount = useMemo(
    () => PARTNER_CAPABILITY_KEYS.filter((key) => createCapabilities[key]).length,
    [createCapabilities],
  );
  const activeProfileOption = useMemo(
    () =>
      COLLABORATION_PROFILE_OPTIONS.find(
        (option) => option.value === payload?.collaboration_profile,
      ) ?? COLLABORATION_PROFILE_OPTIONS[0],
    [payload?.collaboration_profile],
  );

  const canCreateRelationship =
    payload?.integrated_collaboration_supported === true &&
    payload?.can_manage_partner_relationships === true;

  async function handleSaveProfile() {
    if (!payload) return;

    setProfilePending(true);
    setStatus("");

    const { res, data } = await apiFetchJson(configurationEndpoint, {
      method: "PATCH",
      body: JSON.stringify({ collaborationProfile: profileDraft }),
    });

    setProfilePending(false);

    if (!res.ok) {
      setStatus(getErrorMessage(data, "Impossible d'enregistrer le profil"));
      return;
    }

    await loadPartners();
    setStatus("Profil de collaboration mis à jour.");
  }

  async function handleCreateRelationship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPartnerOrganizationId) {
      setStatus("Sélectionnez une organisation partenaire.");
      return;
    }

    setCreatePending(true);
    setStatus("");

    const { res, data } = await apiFetchJson(partnersEndpoint, {
      method: "POST",
      body: JSON.stringify({
        partnerOrganizationId: selectedPartnerOrganizationId,
        capabilities: createCapabilities,
      }),
    });

    setCreatePending(false);

    if (!res.ok) {
      setStatus(getErrorMessage(data, "Impossible de créer la relation"));
      return;
    }

    setSelectedPartnerOrganizationId("");
    setCreateCapabilities(createEmptyPartnerCapabilities());
    setShowCreateModal(false);
    await loadPartners();
    setStatus("Partenaire ajouté.");
  }

  async function handleUpdateRelationship(relationshipId: string) {
    const draft = relationshipDrafts[relationshipId];
    if (!draft) return;

    setRelationshipPendingById((prev) => ({ ...prev, [relationshipId]: true }));
    setStatus("");

    const { res, data } = await apiFetchJson(`${partnersEndpoint}/${relationshipId}`, {
      method: "PATCH",
      body: JSON.stringify({
        state: draft.state,
        capabilities: draft.capabilities,
        terminationReason: draft.terminationReason.trim() || null,
      }),
    });

    setRelationshipPendingById((prev) => ({ ...prev, [relationshipId]: false }));

    if (!res.ok) {
      setStatus(getErrorMessage(data, "Impossible de mettre à jour la relation"));
      return;
    }

    await loadPartners();
    setStatus("Relation partenaire mise à jour.");
  }

  function renderProfileSection() {
    if (!payload) return null;

    return (
      <section className="dashboard-subpanel">
        <div className="dashboard-subpanel__header">
          <span className="dashboard-subpanel__eyebrow">1. Positionnement</span>
          <h3>Définir le rôle de l&apos;organisation</h3>
          <p>
            Choisissez si cette organisation pilote d&apos;autres structures, reçoit des délégations, ou
            cumule les deux rôles.
          </p>
        </div>

        {!payload.integrated_collaboration_supported ? (
          <DashboardInlineFeedback tone="warning">
            Cette extension est réservée au mode intégré.
          </DashboardInlineFeedback>
        ) : (
          <form className="admin-form admin-partners__stack" onSubmit={(event) => event.preventDefault()}>
            <label className="admin-field">
              <span>Rôle cible</span>
              <select
                value={profileDraft}
                onChange={(event) => setProfileDraft(event.target.value as CollaborationProfile)}
                disabled={profilePending}
              >
                {COLLABORATION_PROFILE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="admin-partners__summaryList">
              {COLLABORATION_PROFILE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`admin-partners__summaryItem${
                    option.value === payload.collaboration_profile ? " is-active" : ""
                  }`}
                >
                  <strong>{option.label}</strong>
                  <p>{option.description}</p>
                </div>
              ))}
            </div>

            <div className="admin-partners__formActions">
              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={profilePending || profileDraft === payload.collaboration_profile}
              >
                {profilePending ? "Enregistrement..." : "Enregistrer le profil"}
              </button>
            </div>
          </form>
        )}
      </section>
    );
  }

  function renderCreateSection() {
    return (
      <section className="dashboard-subpanel">
        <div className="dashboard-subpanel__header">
          <span className="dashboard-subpanel__eyebrow">2. Délégation</span>
          <h3>Créer un lien partenaire</h3>
          <p>Choisissez une organisation partenaire puis cochez ce que vous lui déléguez.</p>
        </div>

        {!payload?.integrated_collaboration_supported ? (
          <DashboardInlineFeedback tone="warning">
            Le mode intégré est requis pour activer la collaboration inter-organisations.
          </DashboardInlineFeedback>
        ) : !canCreateRelationship ? (
          <DashboardInlineFeedback tone="warning">
            Passez le profil à owner ou hybride pour autoriser la création de liens sortants.
          </DashboardInlineFeedback>
        ) : (payload.candidate_organizations?.length ?? 0) === 0 ? (
          <DashboardInlineFeedback>
            Aucune organisation compatible n&apos;est disponible à l&apos;association pour le moment.
          </DashboardInlineFeedback>
        ) : (
          <div className="admin-partners__stack">
            <div className="admin-partners__summaryItem">
              <strong>Créer un lien quand vous êtes prêt</strong>
              <p>L&apos;organisation propriétaire définit exactement le périmètre délégué.</p>
            </div>
            <p className="admin-partners__hint">
              {payload.candidate_organizations.length} organisation
              {payload.candidate_organizations.length > 1 ? "s" : ""} disponible
              {payload.candidate_organizations.length > 1 ? "s" : ""}.
            </p>
            <div className="admin-partners__formActions">
              <button type="button" onClick={() => setShowCreateModal(true)}>
                Ajouter un partenaire
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  function renderOwnerRelationshipsSection() {
    return (
      <section className="dashboard-subpanel">
        <div className="dashboard-subpanel__header">
          <span className="dashboard-subpanel__eyebrow">3. Pilotage</span>
          <h3>Relations pilotées</h3>
          <p>Partenaires mandatés et paramètres actifs pour chacun.</p>
        </div>

        {ownerRelationships.length === 0 ? (
          <DashboardStateMessage
            tone="info"
            title="Aucun partenaire configuré"
            description="Créez une première relation sortante pour déléguer un périmètre métier."
          />
        ) : (
          <div className="admin-partners__relationshipList">
            {ownerRelationships.map((relationship) => {
              const draft =
                relationshipDrafts[relationship.id] ?? buildRelationshipDraft(relationship);
              const isPending = relationshipPendingById[relationship.id] === true;

              return (
                <article key={relationship.id} className="admin-partners__relationshipCard">
                  <div className="admin-partners__relationshipHeader">
                    <div>
                      <span className="admin-partners__eyebrow">Partenaire</span>
                      <h4>{relationship.related_organization.name}</h4>
                      <p>Activée le {formatPartnerDate(relationship.activated_at)}</p>
                    </div>
                    <span className={relationshipStateChipClass(relationship.state)}>
                      {RELATIONSHIP_STATE_LABELS[relationship.state]}
                    </span>
                  </div>

                  <div className="admin-partners__metrics">
                    <span>{relationship.active_custody_count} véhicule(s) confié(s)</span>
                    <span>{relationship.active_service_request_count} demande(s) active(s)</span>
                  </div>

                  <div className="admin-partners__capabilities">
                    {PARTNER_CAPABILITY_KEYS.map((key) => (
                      <label key={key} className="admin-inline-toggle">
                        <input
                          type="checkbox"
                          checked={draft.capabilities[key]}
                          onChange={(event) =>
                            setRelationshipDrafts((prev) => ({
                              ...prev,
                              [relationship.id]: {
                                ...draft,
                                capabilities: {
                                  ...draft.capabilities,
                                  [key]: event.target.checked,
                                },
                              },
                            }))
                          }
                          disabled={isPending}
                        />
                        <span>{PARTNER_CAPABILITY_LABELS[key]}</span>
                      </label>
                    ))}
                  </div>

                  <div className="admin-partners__relationshipForm">
                    <label className="admin-field">
                      <span>État</span>
                      <select
                        value={draft.state}
                        onChange={(event) =>
                          setRelationshipDrafts((prev) => ({
                            ...prev,
                            [relationship.id]: {
                              ...draft,
                              state: event.target.value as PartnerRelationshipState,
                            },
                          }))
                        }
                        disabled={isPending}
                      >
                        {Object.entries(RELATIONSHIP_STATE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field">
                      <span>Motif</span>
                      <input
                        type="text"
                        value={draft.terminationReason}
                        onChange={(event) =>
                          setRelationshipDrafts((prev) => ({
                            ...prev,
                            [relationship.id]: {
                              ...draft,
                              terminationReason: event.target.value,
                            },
                          }))
                        }
                        placeholder="Optionnel"
                        disabled={isPending}
                      />
                    </label>
                  </div>

                  <div className="admin-partners__formActions">
                    <button
                      type="button"
                      onClick={() => void handleUpdateRelationship(relationship.id)}
                      disabled={isPending}
                    >
                      {isPending ? "Enregistrement..." : "Enregistrer cette relation"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  function renderInboundRelationshipsSection() {
    return (
      <section className="dashboard-subpanel">
        <div className="dashboard-subpanel__header">
          <span className="dashboard-subpanel__eyebrow">4. Réception</span>
          <h3>Collaborations reçues</h3>
          <p>Vue en lecture seule des organisations propriétaires qui délèguent déjà un périmètre.</p>
        </div>

        {inboundRelationships.length === 0 ? (
          <DashboardStateMessage
            tone="info"
            title="Aucune collaboration entrante"
            description="Aucune organisation propriétaire ne délègue actuellement de périmètre."
          />
        ) : (
          <div className="admin-partners__relationshipList">
            {inboundRelationships.map((relationship) => (
              <article key={relationship.id} className="admin-partners__relationshipCard">
                <div className="admin-partners__relationshipHeader">
                  <div>
                    <span className="admin-partners__eyebrow">Propriétaire</span>
                    <h4>{relationship.related_organization.name}</h4>
                    <p>Dernière mise à jour le {formatPartnerDate(relationship.updated_at)}</p>
                  </div>
                  <span className={relationshipStateChipClass(relationship.state)}>
                    {RELATIONSHIP_STATE_LABELS[relationship.state]}
                  </span>
                </div>
                <div className="admin-partners__metrics">
                  <span>{relationship.active_custody_count} véhicule(s) confié(s)</span>
                  <span>{relationship.active_service_request_count} demande(s) active(s)</span>
                </div>
                <div className="admin-partners__chipList">
                  {PARTNER_CAPABILITY_KEYS.filter((key) => relationship.capabilities[key]).map(
                    (key) => (
                      <span key={key} className="admin-partners__chip">
                        {PARTNER_CAPABILITY_LABELS[key]}
                      </span>
                    ),
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="admin-partners admin-partners--governance">
      <div className={rootClassName(surface)}>
        {loading ? (
          <PartnerGovernanceManagerSkeleton />
        ) : showHeader ? (
          <div className="dashboard-panel__header">
            <h2>Collaboration inter-organisations</h2>
          </div>
        ) : null}

        {!loading ? (
          <div className={surface === "panel" ? "dashboard-panel__body" : undefined}>
            {status ? <DashboardInlineFeedback>{status}</DashboardInlineFeedback> : null}

            {!payload ? (
              <DashboardStateMessage
                tone="warning"
                title="Aucune donnée partenaire disponible"
                description="Le panneau de gouvernance n'a pas pu charger de configuration exploitable."
              />
            ) : (
              <>
                <div className="admin-partners__stack">
                  <div className="admin-partners__summaryList admin-partners__summaryList--metrics">
                    <div className="admin-partners__summaryItem is-active">
                      <strong>{activeProfileOption.label}</strong>
                      <p>{activeProfileOption.description}</p>
                    </div>
                    <div className="admin-partners__summaryItem">
                      <strong>
                        {payload.can_manage_partner_relationships
                          ? "Pilotage partenaire activé"
                          : "Pilotage partenaire désactivé"}
                      </strong>
                      <p>
                        {payload.can_manage_partner_relationships
                          ? `${ownerRelationships.length} relation(s) sortante(s).`
                          : "Passez le profil à owner ou hybride pour déléguer un périmètre."}
                      </p>
                    </div>
                    <div className="admin-partners__summaryItem">
                      <strong>
                        {payload.can_act_as_partner
                          ? "Peut recevoir des délégations"
                          : "Ne reçoit pas de délégations"}
                      </strong>
                      <p>{inboundRelationships.length} collaboration(s) entrante(s) visible(s).</p>
                    </div>
                  </div>

                  {renderProfileSection()}
                  {renderCreateSection()}
                  {renderOwnerRelationshipsSection()}
                  {renderInboundRelationshipsSection()}
                </div>

                {showCreateModal ? (
                  <Modal
                    onClose={() => setShowCreateModal(false)}
                    pending={createPending}
                    pendingLabel="Création de la relation..."
                  >
                    <ModalHero
                      eyebrow="Collaboration"
                      title="Créer un lien partenaire"
                      description="Choisissez une organisation partenaire puis cochez les capacités déléguées."
                    />

                    <form className="admin-form admin-partners__stack" onSubmit={handleCreateRelationship}>
                      <ModalSection>
                        <label className="admin-field">
                          <span>Organisation partenaire</span>
                          <select
                            value={selectedPartnerOrganizationId}
                            onChange={(event) =>
                              setSelectedPartnerOrganizationId(event.target.value)
                            }
                            required
                          >
                            <option value="">Choisir une organisation</option>
                            {payload.candidate_organizations.map((organization) => (
                              <option key={organization.id} value={organization.id}>
                                {organization.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="admin-partners__capabilities">
                          {PARTNER_CAPABILITY_KEYS.map((key) => (
                            <label key={key} className="admin-inline-toggle">
                              <input
                                type="checkbox"
                                checked={createCapabilities[key]}
                                onChange={(event) =>
                                  setCreateCapabilities((prev) => ({
                                    ...prev,
                                    [key]: event.target.checked,
                                  }))
                                }
                              />
                              <span>{PARTNER_CAPABILITY_LABELS[key]}</span>
                            </label>
                          ))}
                        </div>

                        <p className="admin-partners__hint">
                          {createCapabilityCount} capacité(s) sélectionnée(s).
                        </p>
                      </ModalSection>

                      <ModalActions>
                        <button type="submit" disabled={createPending}>
                          {createPending ? "Création..." : "Créer la relation"}
                        </button>
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--secondary"
                          disabled={createPending}
                          onClick={() => setShowCreateModal(false)}
                        >
                          Fermer
                        </button>
                      </ModalActions>
                    </form>
                  </Modal>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
