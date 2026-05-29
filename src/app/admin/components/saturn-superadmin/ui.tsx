"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

export type DashboardMessageTone = "neutral" | "info" | "warning" | "error" | "success";

export function DashboardStateMessage({
  title,
  description,
  tone = "neutral",
}: {
  title?: ReactNode;
  description?: ReactNode;
  tone?: DashboardMessageTone;
}) {
  return (
    <div
      className={`dashboard-state-message dashboard-state-message--${tone}`}
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
    >
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function DashboardInlineFeedback({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: DashboardMessageTone;
}) {
  return (
    <p
      className={`dashboard-inline-feedback dashboard-inline-feedback--${tone}`}
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export function Skeleton({
  className = "",
  width,
  height,
}: {
  className?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}) {
  return (
    <span
      className={`ui-skeleton${className ? ` ${className}` : ""}`}
      style={{ width, height }}
    />
  );
}

export function SuperAdminDirectorySkeleton({ includeHeader = true }: { includeHeader?: boolean }) {
  const rows = (
    <div className="super-admin-org-directory" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`super-admin-org-card${index === 0 ? " is-selected" : ""}`}>
          <div className="super-admin-org-card__top">
            <Skeleton width="10rem" height="1rem" />
            <Skeleton className="ui-skeleton--chip" width="5rem" height="1.6rem" />
          </div>
          <div className="super-admin-org-card__meta">
            <Skeleton width="7rem" height="0.9rem" />
            <Skeleton width="5rem" height="0.9rem" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!includeHeader) return rows;

  return (
    <div className="super-admin-panel super-admin-panel--directory" aria-hidden="true">
      <div className="super-admin-dir-header">
        <div className="ui-skeleton-stack">
          <Skeleton width="8rem" height="1.4rem" />
          <Skeleton width="10rem" height="0.92rem" />
        </div>
        <div className="super-admin-dir-actions">
          <Skeleton className="ui-skeleton--chip" width="2.5rem" height="2.5rem" />
          <Skeleton width="6rem" height="2.8rem" />
        </div>
      </div>
      {rows}
    </div>
  );
}

export function SuperAdminInspectorSkeleton({
  includeSummaryCard = true,
}: {
  includeSummaryCard?: boolean;
}) {
  return (
    <div className="super-admin-detail" aria-hidden="true">
      {includeSummaryCard ? (
        <div className="super-admin-focus-card">
          <div className="super-admin-focus-card__header">
            <div className="ui-skeleton-stack">
              <Skeleton width="12rem" height="1.2rem" />
              <Skeleton width="8rem" height="0.92rem" />
            </div>
            <Skeleton className="ui-skeleton--chip" width="5rem" height="1.7rem" />
          </div>
          <div className="super-admin-focus-card__facts">
            <Skeleton className="ui-skeleton--chip" width="8rem" height="1.8rem" />
          </div>
        </div>
      ) : null}

      <div className="super-admin-inspector-shell">
        <aside className="admin-dashboard-sidebar super-admin-inspector-shell__aside">
          <div className="admin-sidebar-card super-admin-inspector-shell__drawerCard">
            <Skeleton width="8rem" height="0.8rem" />
            <Skeleton width="11rem" height="1.4rem" />
            <nav className="admin-sidebar-nav">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={`admin-sidebar-link${index === 0 ? " is-active" : ""}`}>
                  <Skeleton width="5rem" height="0.8rem" />
                  <Skeleton width="8rem" height="1rem" />
                  <Skeleton width="100%" height="0.82rem" />
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <div className="super-admin-inspector-shell__content">
          {Array.from({ length: 2 }).map((_, index) => (
            <section className="dashboard-subpanel" key={index}>
              <div className="dashboard-subpanel__header">
                <div className="ui-skeleton-stack">
                  <Skeleton width="7rem" height="0.8rem" />
                  <Skeleton width="12rem" height="1.25rem" />
                  <Skeleton width="100%" height="0.92rem" />
                </div>
              </div>
              <div className="admin-form ui-skeleton-stack">
                <Skeleton width="100%" height="3rem" />
                <Skeleton width="8rem" height="2.9rem" />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PartnerGovernanceManagerSkeleton() {
  return (
    <div className="admin-partners__stack" aria-hidden="true">
      <div className="dashboard-panel__header">
        <Skeleton width="16rem" height="1.4rem" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <section className="dashboard-subpanel" key={index}>
          <div className="dashboard-subpanel__header">
            <Skeleton width="8rem" height="0.8rem" />
            <Skeleton width="14rem" height="1.25rem" />
            <Skeleton width="100%" height="0.9rem" />
          </div>
          <Skeleton width="100%" height="4.5rem" />
        </section>
      ))}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function Modal({
  children,
  className = "",
  onClose,
  pending = false,
  pendingLabel = "Envoi en cours...",
}: {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  pending?: boolean;
  pendingLabel?: string;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !pending && onClose()}>
      <div
        className={`modal${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-busy={pending}
        data-pending={pending ? "true" : "false"}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={pending}
          aria-label="Fermer"
        >
          <CloseIcon />
        </button>
        <div className="modal-pending" data-active={pending ? "true" : "false"}>
          <span className="modal-pending__spinner" aria-hidden="true" />
          <p className="modal-pending__label">{pendingLabel}</p>
        </div>
        <div className="modal__scroll">
          <div className="modal__body">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ModalHero({
  eyebrow,
  title,
  description,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`modal-hero${className ? ` ${className}` : ""}`}>
      <div className="modal-hero__copy">
        {eyebrow ? <p className="modal-hero__eyebrow">{eyebrow}</p> : null}
        <h2 className="modal-hero__title">{title}</h2>
        {description ? <p className="modal-hero__description">{description}</p> : null}
      </div>
    </header>
  );
}

export function ModalSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`modal-section${className ? ` ${className}` : ""}`}>{children}</section>;
}

export function ModalActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`modal-actions${className ? ` ${className}` : ""}`}>{children}</div>;
}
