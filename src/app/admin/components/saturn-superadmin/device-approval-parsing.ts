"use client";

import type {
  SaturnAccount,
  SaturnAccountDevice,
  SaturnDeviceApprovalItem,
  SaturnDeviceApprovalStatus,
} from "@/app/admin/components/saturn-superadmin/types";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

export function isDeviceApprovalStatus(value: unknown): value is SaturnDeviceApprovalStatus {
  return value === "pending" || value === "approved" || value === "denied" || value === "revoked";
}

function isRole(value: unknown): SaturnAccount["role"] {
  if (
    value === "admin" ||
    value === "seller" ||
    value === "transporter" ||
    value === "driver" ||
    value === "manager_vo" ||
    value === "manager_vn"
  ) {
    return value;
  }

  return null;
}

export function parseSaturnAccount(value: unknown): SaturnAccount | null {
  const row = asRecord(value);
  const userId = asString(row.user_id);
  const organizationId = asString(row.organization_id);
  if (!userId || !organizationId) return null;

  return {
    user_id: userId,
    organization_id: organizationId,
    organization_name: asString(row.organization_name),
    organization_slug: asString(row.organization_slug),
    email: asString(row.email),
    role: isRole(row.role),
    first_name: asString(row.first_name),
    last_name: asString(row.last_name),
    site_id: asString(row.site_id),
    created_at: asString(row.created_at),
    last_sign_in_at: asString(row.last_sign_in_at),
    banned_until: asString(row.banned_until),
    deleted_at: asString(row.deleted_at),
    is_disabled: asBoolean(row.is_disabled),
  };
}

export function parseSaturnAccountDevice(value: unknown): SaturnAccountDevice | null {
  const row = asRecord(value);
  const id = asString(row.id);
  if (!id) return null;

  return {
    id,
    approval_status: isDeviceApprovalStatus(row.approval_status)
      ? row.approval_status
      : isDeviceApprovalStatus(row.status)
        ? row.status
        : "pending",
    platform: asString(row.platform),
    device_label: asString(row.device_label),
    user_agent: asString(row.user_agent),
    first_ip: asString(row.first_ip),
    last_ip: asString(row.last_ip),
    first_location: asRecord(row.first_location),
    last_location: asRecord(row.last_location),
    first_seen_at: asString(row.first_seen_at),
    last_seen_at: asString(row.last_seen_at),
    approved_at: asString(row.approved_at),
    approved_by_user_id: asString(row.approved_by_user_id),
    denied_at: asString(row.denied_at),
    denied_by_user_id: asString(row.denied_by_user_id),
    revoked_at: asString(row.revoked_at),
    revoked_by_user_id: asString(row.revoked_by_user_id),
    last_decision_reason: asString(row.last_decision_reason),
  };
}

export function parseSaturnDeviceApprovalItem(value: unknown): SaturnDeviceApprovalItem | null {
  const row = asRecord(value);
  const device = parseSaturnAccountDevice(row.device);
  if (!device) return null;

  return {
    device,
    account: parseSaturnAccount(row.account),
  };
}

export function formatDeviceApprovalStatus(status: SaturnDeviceApprovalStatus): string {
  switch (status) {
    case "approved":
      return "Approuvé";
    case "denied":
      return "Refusé";
    case "revoked":
      return "Révoqué";
    case "pending":
      return "En attente";
  }
}

export function formatDeviceLocation(device: SaturnAccountDevice): string {
  const location = device.last_location;
  const city = asString(location.city);
  const region = asString(location.region);
  const country = asString(location.country);
  const place = [city, region, country].filter(Boolean).join(", ");

  return place || device.last_ip || device.first_ip || "Localisation inconnue";
}
