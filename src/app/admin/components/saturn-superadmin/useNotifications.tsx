"use client";

import { useCallback, useState } from "react";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  tone: "success" | "error" | "info" | "warning";
};

export function useTransientNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const pushNotification = useCallback(
    (input: {
      title: string;
      message?: string;
      tone?: "success" | "error" | "info" | "warning";
      durationMs?: number;
    }) => {
      const id = crypto.randomUUID();
      const nextNotification: Notification = {
        id,
        title: input.title,
        message: input.message?.trim() || null,
        tone: input.tone ?? "info",
      };

      setNotifications((current) => [...current, nextNotification].slice(-3));
      window.setTimeout(() => dismissNotification(id), input.durationMs ?? 7000);
    },
    [dismissNotification],
  );

  return { notifications, pushNotification, dismissNotification };
}

export function NotificationToasts({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="saturn-superadmin-toasts" role="status" aria-live="polite">
      {notifications.map((notification) => (
        <button
          type="button"
          key={notification.id}
          className={`saturn-superadmin-toast saturn-superadmin-toast--${notification.tone}`}
          onClick={() => onDismiss(notification.id)}
        >
          <strong>{notification.title}</strong>
          {notification.message ? <span>{notification.message}</span> : null}
        </button>
      ))}
    </div>
  );
}
