const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "http://localhost:5000/api";

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = localStorage.getItem("authToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || "Request failed");
  return payload;
}

export const NotificationApi = {
  /** Fetch paginated notifications + unreadCount (all statuses) */
  getNotifications: (limit = 50, offset = 0) =>
    request(`/notifications?limit=${limit}&offset=${offset}&_=${Date.now()}`),

  /** Lightweight unread count poll */
  getUnreadCount: () =>
    request(`/notifications/count?_=${Date.now()}`),

  /** Mark a single notification read */
  markRead: (uuid) =>
    request(`/notifications/${encodeURIComponent(uuid)}/read`, { method: "PATCH" }),

  /** Mark all notifications read */
  markAllRead: () =>
    request(`/notifications/read-all`, { method: "PATCH" }),

  /** Delete ALL notifications for the current user */
  clearAllHistory: () =>
    request(`/notifications/history`, { method: "DELETE" }),

  /** Delete only READ notifications for the current user */
  clearReadHistory: () =>
    request(`/notifications/history/read`, { method: "DELETE" }),
};
