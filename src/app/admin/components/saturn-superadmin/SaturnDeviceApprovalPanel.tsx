"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetchJson, getErrorMessage } from "@/app/admin/components/saturn-superadmin/api";
import {
  formatDeviceLocation,
  parseSaturnDeviceApprovalItem,
} from "@/app/admin/components/saturn-superadmin/device-approval-parsing";
import {
  DashboardInlineFeedback,
  DashboardStateMessage,
} from "@/app/admin/components/saturn-superadmin/ui";
import type { SaturnDeviceApprovalItem } from "@/app/admin/components/saturn-superadmin/types";

type SaturnDeviceApprovalPanelProps = {
  onForbidden: () => void;
};

function formatDate(value: string | null): string {
  if (!value) return "Non daté";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatSecurityAccount(item: SaturnDeviceApprovalItem): string {
  const account = item.account;
  if (!account) return "Compte inconnu";

  const fullName = [account.first_name, account.last_name].filter(Boolean).join(" ").trim();
  return fullName || account.email || account.user_id;
}

export function SaturnDeviceApprovalPanel({ onForbidden }: SaturnDeviceApprovalPanelProps) {
  const requestIdRef = useRef(0);
  const [devices, setDevices] = useState<SaturnDeviceApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [decidingDeviceId, setDecidingDeviceId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setStatus("");

    const { res, data } = await apiFetchJson(
      "/api/platform/super-admin/device-approvals?status=pending&limit=80",
    );

    if (requestIdRef.current !== requestId) return;

    if (res.status === 403) {
      onForbidden();
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setStatus(getErrorMessage(data, "Impossible de charger les appareils en attente."));
      setLoading(false);
      return;
    }

    const nextDevices = (Array.isArray(data.devices) ? data.devices : [])
      .map((entry) => parseSaturnDeviceApprovalItem(entry))
      .filter((entry): entry is SaturnDeviceApprovalItem => entry !== null);

    setDevices(nextDevices);
    setLoading(false);
  }, [onForbidden]);

  useEffect(() => {
    queueMicrotask(() => void loadDevices());
  }, [loadDevices]);

  async function decideDevice(item: SaturnDeviceApprovalItem, action: "approve" | "deny") {
    if (!item.account) {
      setStatus("Impossible de décider sans compte Saturn résolu.");
      return;
    }

    setStatus("");
    setDecidingDeviceId(item.device.id);

    const { res, data } = await apiFetchJson(
      `/api/platform/super-admin/accounts/${item.account.user_id}/devices/${item.device.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          organizationId: item.account.organization_id,
          action,
          reason:
            action === "approve"
              ? "Nouvel appareil validé depuis skymdev.fr"
              : "Nouvel appareil refusé depuis skymdev.fr",
        }),
      },
    );

    if (res.status === 403) {
      onForbidden();
      setDecidingDeviceId(null);
      return;
    }

    if (!res.ok) {
      setStatus(getErrorMessage(data, "Décision appareil impossible."));
      setDecidingDeviceId(null);
      return;
    }

    setDecidingDeviceId(null);
    await loadDevices();
  }

  return (
    <section className="super-admin-panel super-admin-security">
      <div className="super-admin-dir-header">
        <div>
          <h2>Validation appareils</h2>
          <p>
            {devices.length} connexion{devices.length > 1 ? "s" : ""} en attente
          </p>
        </div>
        <button
          type="button"
          className="dashboard-button dashboard-button--secondary"
          onClick={() => void loadDevices()}
          disabled={loading}
          title="Rafraîchir les appareils en attente"
        >
          Rafraîchir
        </button>
      </div>

      {status ? <DashboardInlineFeedback tone="error">{status}</DashboardInlineFeedback> : null}

      {loading ? (
        <DashboardStateMessage
          tone="info"
          title="Chargement des appareils"
          description="Lecture des connexions en attente de validation."
        />
      ) : devices.length === 0 ? (
        <DashboardStateMessage
          tone="success"
          title="Aucun appareil en attente"
          description="Les nouvelles connexions apparaîtront ici avant tout accès aux données Saturn."
        />
      ) : (
        <div className="super-admin-security-list">
          {devices.map((item) => (
            <article key={item.device.id} className="super-admin-security-device">
              <div>
                <span className="super-admin-security-device__eyebrow">
                  {item.device.platform ?? "appareil"} · {formatDeviceLocation(item.device)}
                </span>
                <strong>{formatSecurityAccount(item)}</strong>
                <p>
                  {item.account?.organization_name ?? "Organisation inconnue"} ·{" "}
                  {item.account?.email ?? item.account?.user_id ?? "Compte non résolu"}
                </p>
                <small>Première vue le {formatDate(item.device.first_seen_at)}</small>
                {item.device.user_agent ? <small>{item.device.user_agent}</small> : null}
              </div>

              <div className="super-admin-security-device__actions">
                <button
                  type="button"
                  className="dashboard-button"
                  disabled={decidingDeviceId === item.device.id}
                  onClick={() => void decideDevice(item, "approve")}
                >
                  {decidingDeviceId === item.device.id ? "Décision..." : "Approuver"}
                </button>
                <button
                  type="button"
                  className="dashboard-button dashboard-button--secondary"
                  disabled={decidingDeviceId === item.device.id}
                  onClick={() => void decideDevice(item, "deny")}
                >
                  Refuser
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
