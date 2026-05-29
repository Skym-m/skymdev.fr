import {
  createEmptyPartnerCapabilities,
  PARTNER_CAPABILITY_KEYS,
  type CandidateOrganization,
  type CollaborationProfile,
  type LogisticsMode,
  type LogisticsModeSource,
  type OrganizationAdmin,
  type OrganizationCompany,
  type OrganizationDetail,
  type OrganizationSummary,
  type PartnerCapabilities,
  type PartnerRelationship,
  type PartnerRelationshipState,
  type PartnerPayload,
  type RelatedOrganization,
  type RelationshipDraft,
} from "@/app/admin/components/saturn-superadmin/types";

export const COLLABORATION_PROFILE_OPTIONS: Array<{
  value: CollaborationProfile;
  label: string;
  description: string;
}> = [
  {
    value: "standard",
    label: "Standard",
    description: "Organisation Saturn classique, sans collaboration externe.",
  },
  {
    value: "owner",
    label: "Owner",
    description: "Peut confier des véhicules et piloter des partenaires externes.",
  },
  {
    value: "partner",
    label: "Partner",
    description: "Peut recevoir et traiter les véhicules confiés par d'autres organisations.",
  },
  {
    value: "hybrid",
    label: "Hybride",
    description: "Peut agir à la fois comme propriétaire et comme partenaire.",
  },
];

export const PARTNER_CAPABILITY_LABELS: Record<keyof PartnerCapabilities, string> = {
  can_hold_stock: "Stock confié",
  can_execute_interventions: "Interventions",
  can_receive_transport: "Flux transport",
  can_confirm_field_events: "Confirmations terrain",
};

export const RELATIONSHIP_STATE_LABELS: Record<PartnerRelationshipState, string> = {
  active: "Active",
  suspended: "Suspendue",
  revoking: "Sortie en cours",
  revoked: "Révoquée",
  archived: "Archivée",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return null;
}

function parseLogisticsMode(value: unknown): LogisticsMode | null {
  return value === "legacy" || value === "integrated" ? value : null;
}

function parseLogisticsModeSource(value: unknown): LogisticsModeSource | null {
  return value === "explicit" || value === "default" ? value : null;
}

export function isCollaborationProfile(value: unknown): value is CollaborationProfile {
  return value === "standard" || value === "owner" || value === "partner" || value === "hybrid";
}

function isPartnerRelationshipState(value: unknown): value is PartnerRelationshipState {
  return (
    value === "active" ||
    value === "suspended" ||
    value === "revoking" ||
    value === "revoked" ||
    value === "archived"
  );
}

function parseFeatureFlags(value: unknown): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const [key, rawValue] of Object.entries(asRecord(value))) {
    const parsed = parseBoolean(rawValue);
    if (parsed !== null) flags[key] = parsed;
  }
  return flags;
}

export function parseOrganizationSummary(value: unknown): OrganizationSummary | null {
  const record = asRecord(value);
  const id = asString(record.id);
  const slug = asString(record.slug);
  const name = asString(record.name);
  if (!id || !slug || !name) return null;

  return {
    id,
    slug,
    name,
    is_active: record.is_active !== false,
    admin_count: typeof record.admin_count === "number" ? record.admin_count : 0,
  };
}

function parseOrganizationAdmin(value: unknown): OrganizationAdmin | null {
  const record = asRecord(value);
  const userId = asString(record.user_id);
  if (!userId) return null;

  return {
    user_id: userId,
    email: asString(record.email),
    first_name: asString(record.first_name),
    last_name: asString(record.last_name),
  };
}

function parseOrganizationCompany(value: unknown): OrganizationCompany | null {
  const record = asRecord(value);
  const id = asString(record.id);
  const organizationId = asString(record.organization_id);
  const slug = asString(record.slug);
  const name = asString(record.name);
  if (!id || !organizationId || !slug || !name) return null;

  return {
    id,
    organization_id: organizationId,
    slug,
    name,
    code: asString(record.code),
    is_active: record.is_active !== false,
    is_default: record.is_default === true,
  };
}

export function parseOrganizationDetail(value: unknown): OrganizationDetail | null {
  const record = asRecord(value);
  const organization = parseOrganizationSummary(record.organization);
  if (!organization) return null;

  const admins = Array.isArray(record.admins)
    ? record.admins
        .map((entry) => parseOrganizationAdmin(entry))
        .filter((entry): entry is OrganizationAdmin => entry !== null)
    : [];
  const companies = Array.isArray(record.companies)
    ? record.companies
        .map((entry) => parseOrganizationCompany(entry))
        .filter((entry): entry is OrganizationCompany => entry !== null)
    : [];

  const settings = asRecord(record.settings);
  const relationshipCounts = asRecord(record.relationship_counts);
  const logisticsMode =
    parseLogisticsMode(record.logistics_mode) ?? parseLogisticsMode(settings.logistics_mode);
  if (!logisticsMode || !isCollaborationProfile(record.collaboration_profile)) return null;

  return {
    organization,
    feature_flags: parseFeatureFlags(record.feature_flags),
    settings,
    logistics_mode: logisticsMode,
    logistics_mode_source: parseLogisticsModeSource(record.logistics_mode_source) ?? "default",
    collaboration_profile: record.collaboration_profile,
    collaboration_enabled: record.collaboration_enabled === true,
    can_manage_partner_relationships: record.can_manage_partner_relationships === true,
    can_act_as_partner: record.can_act_as_partner === true,
    relationship_counts: {
      owner_total:
        typeof relationshipCounts.owner_total === "number" ? relationshipCounts.owner_total : 0,
      owner_active:
        typeof relationshipCounts.owner_active === "number" ? relationshipCounts.owner_active : 0,
      partner_total:
        typeof relationshipCounts.partner_total === "number" ? relationshipCounts.partner_total : 0,
      partner_active:
        typeof relationshipCounts.partner_active === "number"
          ? relationshipCounts.partner_active
          : 0,
    },
    admins,
    companies,
  };
}

function asCapabilities(value: unknown): PartnerCapabilities {
  const capabilities = createEmptyPartnerCapabilities();
  const record = asRecord(value);
  for (const key of PARTNER_CAPABILITY_KEYS) {
    capabilities[key] = Boolean(record[key]);
  }
  return capabilities;
}

function parseCandidateOrganization(raw: unknown): CandidateOrganization | null {
  const row = asRecord(raw);
  const id = asString(row.id);
  const name = asString(row.name);
  const logisticsMode = parseLogisticsMode(row.logistics_mode);
  if (!id || !name || !logisticsMode || !isCollaborationProfile(row.collaboration_profile)) {
    return null;
  }

  return {
    id,
    slug: asString(row.slug),
    name,
    is_active: row.is_active !== false,
    logistics_mode: logisticsMode,
    collaboration_profile: row.collaboration_profile,
  };
}

function parseRelatedOrganization(raw: unknown): RelatedOrganization | null {
  const row = asRecord(raw);
  const id = asString(row.id);
  const name = asString(row.name);
  if (!id || !name) return null;

  return {
    id,
    slug: asString(row.slug),
    name,
    is_active: row.is_active !== false,
  };
}

function parsePartnerRelationship(raw: unknown): PartnerRelationship | null {
  const row = asRecord(raw);
  const id = asString(row.id);
  const direction = row.direction;
  const ownerOrganizationId = asString(row.owner_organization_id);
  const partnerOrganizationId = asString(row.partner_organization_id);
  const relatedOrganization = parseRelatedOrganization(row.related_organization);
  const state = row.state;
  if (
    !id ||
    (direction !== "owner" && direction !== "partner") ||
    !ownerOrganizationId ||
    !partnerOrganizationId ||
    !relatedOrganization ||
    !isPartnerRelationshipState(state)
  ) {
    return null;
  }

  return {
    id,
    direction,
    owner_organization_id: ownerOrganizationId,
    partner_organization_id: partnerOrganizationId,
    related_organization: relatedOrganization,
    state,
    capabilities: asCapabilities(row.capabilities),
    activated_at: asString(row.activated_at),
    suspended_at: asString(row.suspended_at),
    revoking_at: asString(row.revoking_at),
    revoked_at: asString(row.revoked_at),
    archived_at: asString(row.archived_at),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
    termination_reason: asString(row.termination_reason),
    active_custody_count:
      typeof row.active_custody_count === "number" ? row.active_custody_count : 0,
    active_service_request_count:
      typeof row.active_service_request_count === "number"
        ? row.active_service_request_count
        : 0,
  };
}

export function parsePartnerPayload(data: Record<string, unknown>): PartnerPayload {
  return {
    logistics_mode: data.logistics_mode === "integrated" ? "integrated" : "legacy",
    collaboration_profile: isCollaborationProfile(data.collaboration_profile)
      ? data.collaboration_profile
      : "standard",
    collaboration_enabled: data.collaboration_enabled === true,
    can_manage_partner_relationships: data.can_manage_partner_relationships === true,
    can_act_as_partner: data.can_act_as_partner === true,
    integrated_collaboration_supported: data.integrated_collaboration_supported === true,
    owner_relationships: Array.isArray(data.owner_relationships)
      ? data.owner_relationships
          .map(parsePartnerRelationship)
          .filter((value): value is PartnerRelationship => value !== null)
      : [],
    partner_relationships: Array.isArray(data.partner_relationships)
      ? data.partner_relationships
          .map(parsePartnerRelationship)
          .filter((value): value is PartnerRelationship => value !== null)
      : [],
    candidate_organizations: Array.isArray(data.candidate_organizations)
      ? data.candidate_organizations
          .map(parseCandidateOrganization)
          .filter((value): value is CandidateOrganization => value !== null)
      : [],
  };
}

export function buildRelationshipDraft(relationship: PartnerRelationship): RelationshipDraft {
  return {
    state: relationship.state,
    capabilities: { ...relationship.capabilities },
    terminationReason: relationship.termination_reason ?? "",
  };
}

export function toOrganizationSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function formatAdminName(admin: OrganizationAdmin): string {
  const fullName = [admin.first_name, admin.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();

  return fullName || admin.email || admin.user_id;
}

export function formatCollaborationProfile(profile: CollaborationProfile): string {
  switch (profile) {
    case "owner":
      return "Owner";
    case "partner":
      return "Partner";
    case "hybrid":
      return "Hybride";
    default:
      return "Standard";
  }
}

export function formatPartnerDate(value: string | null): string {
  if (!value) return "Non renseigné";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseigné";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function relationshipStateChipClass(state: PartnerRelationshipState): string {
  return `admin-partners__chip admin-partners__chip--${state}`;
}
