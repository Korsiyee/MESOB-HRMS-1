import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { NotificationApi } from "../api/notificationApi";

const POLL_INTERVAL_MS = 30_000; // poll every 30 seconds

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [panelOpen, setPanelOpen]         = useState(false);
  const intervalRef = useRef(null);

  // ── Fetch unread list for the bell panel ─────────────────────────
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setLoading(true);
    try {
      // Only fetch unread notifications for the bell panel
      const res = await NotificationApi.getNotifications(50, 0);
      const all = res?.data?.notifications || [];
      // Keep only unread in the bell list
      setNotifications(all.filter((n) => !n.is_read));
      setUnreadCount(res?.data?.unreadCount ?? 0);
    } catch (err) {
      console.error("[Notifications] fetch failed:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Lightweight count poll ─────────────────────────────────────────
  const pollCount = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await NotificationApi.getUnreadCount();
      setUnreadCount(res?.data?.unreadCount ?? 0);
    } catch {
      // ignore
    }
  }, []); // no deps — reads token from localStorage directly

  // Start / stop polling when auth changes
  useEffect(() => {
    if (!isAuthenticated) {
      clearInterval(intervalRef.current);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    // Initial fetch of count as soon as authenticated
    pollCount();
    intervalRef.current = setInterval(pollCount, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch full list when panel opens
  useEffect(() => {
    if (panelOpen) fetchNotifications();
  }, [panelOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────
  const markRead = useCallback(async (uuid) => {
    try {
      await NotificationApi.markRead(uuid);
      // Remove immediately from bell list (bell only shows unread)
      setNotifications((prev) => prev.filter((n) => n.uuid !== uuid));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("[Notifications] markRead failed:", err.message);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await NotificationApi.markAllRead();
      // Clear bell list entirely — all are now read
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("[Notifications] markAllRead failed:", err.message);
    }
  }, []);

  const openPanel  = useCallback(() => setPanelOpen(true),  []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        panelOpen,
        openPanel,
        closePanel,
        togglePanel,
        markRead,
        markAllRead,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
