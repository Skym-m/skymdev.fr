export type LogisticsMode = "legacy" | "integrated";
export type LogisticsModeSource = "explicit" | "default";
export type CollaborationProfile = "standard" | "owner" | "partner" | "hybrid";
export type PartnerRelationshipState =
  | "active"
  | "suspended"
  | "revoking"
  | "revoked"
  | "archived";

export const PARTNER_CAPABILITY_KEYS = [
  "can_hold_stock",
  "can_execute_interventions",
  "can_receive_transport",
  "can_confirm_field_events",
] as const;

export type PartnerCapabilityKey = (typeof PARTNER_CAPABILITY_KEYS)[number];
export type PartnerCapabilities = Record<PartnerCapabilityKey, boolean>;

export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  admin_count: number;
};

export type OrganizationAdmin = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

export type OrganizationCompany = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  code: string | null;
  is_active: boolean;
  is_default: boolean;
};

export type OrganizationDetail = {
  organization: OrganizationSummary;
  feature_flags: Record<string, boolean>;
  settings: Record<string, unknown>;
  logistics_mode: LogisticsMode;
  logistics_mode_source: LogisticsModeSource;
  collaboration_profile: CollaborationProfile;
  collaboration_enabled: boolean;
  can_manage_partner_relationships: boolean;
  can_act_as_partner: boolean;
  relationship_counts: {
    owner_total: number;
    owner_active: number;
    partner_total: number;
    partner_active: number;
  };
  admins: OrganizationAdmin[];
  companies: OrganizationCompany[];
};

export type SaturnAccountRole =
  | "admin"
  | "seller"
  | "transporter"
  | "driver"
  | "manager_vo"
  | "manager_vn";

export type SaturnAccount = {
  user_id: string;
  organization_id: string;
  organization_name: string | null;
  organization_slug: string | null;
  email: string | null;
  role: SaturnAccountRole | null;
  first_name: string | null;
  last_name: string | null;
  site_id: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  deleted_at: string | null;
  is_disabled: boolean;
};

export type SaturnAccountSession = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  refreshed_at: string | null;
  not_after: string | null;
  ip_address: string | null;
  user_agent: string | null;
  aal: string | null;
};

export type SaturnDeviceApprovalStatus = "pending" | "approved" | "denied" | "revoked";

export type SaturnAccountDevice = {
  id: string;
  approval_status: SaturnDeviceApprovalStatus;
  platform: string | null;
  device_label: string | null;
  user_agent: string | null;
  first_ip: string | null;
  last_ip: string | null;
  first_location: Record<string, unknown>;
  last_location: Record<string, unknown>;
  first_seen_at: string | null;
  last_seen_at: string | null;
  approved_at: string | null;
  approved_by_user_id: string | null;
  denied_at: string | null;
  denied_by_user_id: string | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  last_decision_reason: string | null;
};

export type SaturnDeviceApprovalItem = {
  device: SaturnAccountDevice;
  account: SaturnAccount | null;
};

export type SaturnAccountActivityEvent = {
  id: string;
  source: "saturn" | "supabase_auth";
  event_type: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  location: Record<string, unknown>;
  payload: Record<string, unknown>;
  created_at: string | null;
};

export type SaturnAccountDetail = {
  account: SaturnAccount;
  sessions: SaturnAccountSession[];
  devices: SaturnAccountDevice[];
  activity: SaturnAccountActivityEvent[];
};

export type CandidateOrganization = {
  id: string;
  slug: string | null;
  name: string;
  is_active: boolean;
  logistics_mode: LogisticsMode;
  collaboration_profile: CollaborationProfile;
};

export type RelatedOrganization = {
  id: string;
  slug: string | null;
  name: string;
  is_active: boolean;
};

export type PartnerRelationship = {
  id: string;
  direction: "owner" | "partner";
  owner_organization_id: string;
  partner_organization_id: string;
  related_organization: RelatedOrganization;
  state: PartnerRelationshipState;
  capabilities: PartnerCapabilities;
  activated_at: string | null;
  suspended_at: string | null;
  revoking_at: string | null;
  revoked_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  termination_reason: string | null;
  active_custody_count: number;
  active_service_request_count: number;
};

export type PartnerPayload = {
  logistics_mode: LogisticsMode;
  collaboration_profile: CollaborationProfile;
  collaboration_enabled: boolean;
  can_manage_partner_relationships: boolean;
  can_act_as_partner: boolean;
  integrated_collaboration_supported: boolean;
  owner_relationships: PartnerRelationship[];
  partner_relationships: PartnerRelationship[];
  candidate_organizations: CandidateOrganization[];
};

export type RelationshipDraft = {
  state: PartnerRelationshipState;
  capabilities: PartnerCapabilities;
  terminationReason: string;
};

export function createEmptyPartnerCapabilities(): PartnerCapabilities {
  return {
    can_hold_stock: false,
    can_execute_interventions: false,
    can_receive_transport: false,
    can_confirm_field_events: false,
  };
}
