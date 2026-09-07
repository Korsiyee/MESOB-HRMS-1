import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { NotificationApi } from "../api/notificationApi";
import { useNotifications } from "../context/NotificationContext";
import Avatar from "../components/common/Avatar";

/* ── palette ── */
const C = {
  card:      '#EEF1F0',
  border:    'rgba(0,80,60,0.09)',
  shadow:    '0 2px 12px rgba(0,60,45,0.07)',
  primary:   '#0F766E',
  textMain:  '#1A2E2B',
  textMuted: '#2E6058',
  headerBg:  'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const TYPE_META = {
  LEAVE_REQUEST_SUBMITTED:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Leave Request'   },
  LEAVE_DEPT_APPROVED:      { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Dept Approved'   },
  LEAVE_DEPT_REJECTED:      { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Dept Rejected'   },
  LEAVE_HR_APPROVED:        { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Leave Approved'  },
  LEAVE_HR_REJECTED:        { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Leave Rejected'  },
  LETTER_REQUEST_SUBMITTED: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)', label: 'Letter Request'  },
  LETTER_APPROVED:          { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Letter Approved' },
  LETTER_REJECTED:          { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Letter Rejected' },
};
const getMeta = (t) =>
  TYPE_META[t] || { color: '#64748B', bg: 'rgba(100,116,139,0.10)', label: 'Notification' };

const fmtTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
};

/* ── Confirmation Dialog ── */
const ConfirmDialog = ({ open, title, message, confirmLabel, onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div
      onClick={() => { if (!loading) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(26,46,43,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460,
          boxShadow: '0 20px 60px rgba(0,60,45,0.2)',
          border: '1px solid rgba(0,80,60,0.1)',
          fontFamily: 'Poppins, sans-serif', padding: '32px 28px 24px',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(220,38,38,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <Trash2 size={26} color="#DC2626" />
        </div>

        <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700, color: '#1A2E2B' }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              border: '1.5px solid rgba(0,80,60,0.2)',
              background: 'transparent', color: '#1A2E2B',
              fontSize: '0.82rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              border: 'none',
              background: loading ? '#EF9A9A' : '#DC2626',
              color: '#fff',
              fontSize: '0.82rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Poppins, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#B91C1C'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#DC2626'; }}
          >
            {loading && (
              <span style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.6s linear infinite', display: 'inline-block',
              }} />
            )}
            {loading ? 'Clearing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const NotificationsPage = () => {
  const navigate = useNavigate();
  const { setUnreadCount: setBellCount } = (() => {
    try { return useNotifications(); } catch { return { setUnreadCount: () => {} }; }
  })();

  const [all, setAll]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  // Dialog state
  const [dialog, setDialog] = useState({
    open: false, type: null, loading: false,
  }); // type: 'all' | 'read'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await NotificationApi.getNotifications(100, 0);
      setAll(res?.data?.notifications || []);
    } catch (e) {
      console.error("[NotificationsPage] load failed:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── handlers ── */
  const handleClick = async (n) => {
    if (!n.is_read) {
      try {
        await NotificationApi.markRead(n.uuid);
        setAll((prev) => prev.map((x) => x.uuid === n.uuid ? { ...x, is_read: 1 } : x));
      } catch { /* ignore */ }
    }
    if (n.redirect_url) navigate(n.redirect_url);
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await NotificationApi.markAllRead();
      setAll((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
    } catch { /* ignore */ }
    finally { setMarkingAll(false); }
  };

  const openDialog = (type) => setDialog({ open: true, type, loading: false });
  const closeDialog = () => setDialog({ open: false, type: null, loading: false });

  const confirmClear = async () => {
    setDialog((d) => ({ ...d, loading: true }));
    try {
      if (dialog.type === 'all') {
        await NotificationApi.clearAllHistory();
        setAll([]);
        // Bell count also goes to 0 — no more unread
        try { setBellCount(0); } catch { /* context may not be available */ }
      } else {
        await NotificationApi.clearReadHistory();
        setAll((prev) => prev.filter((n) => !n.is_read));
      }
      closeDialog();
    } catch (e) {
      console.error("[NotificationsPage] clear failed:", e.message);
      closeDialog();
    }
  };

  /* ── derived ── */
  const unreadTotal  = all.filter((n) => !n.is_read).length;
  const readTotal    = all.length - unreadTotal;

  const displayed = all.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'READ')   return  n.is_read;
    return true;
  });

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{
        background: C.headerBg, borderRadius: 14, padding: '20px 26px',
        marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ color: '#E8F0EE', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Notification History
          </h1>
          <p style={{ color: 'rgba(232,240,238,0.6)', fontSize: '0.75rem', margin: '3px 0 0' }}>
            All notifications — unread and read
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Mark all read */}
          {unreadTotal > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, padding: '8px 16px',
                color: '#14B8A6', fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              }}
            >
              <CheckCheck size={15} />
              {markingAll ? 'Marking…' : `Mark all read (${unreadTotal})`}
            </button>
          )}

          {/* Clear read */}
          {readTotal > 0 && (
            <button
              onClick={() => openDialog('read')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.35)',
                borderRadius: 8, padding: '8px 16px',
                color: '#FCA5A5', fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; }}
            >
              <Trash2 size={14} />
              Clear Read ({readTotal})
            </button>
          )}

          {/* Clear all */}
          {all.length > 0 && (
            <button
              onClick={() => openDialog('all')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#DC2626',
                border: '1px solid #B91C1C',
                borderRadius: 8, padding: '8px 16px',
                color: '#fff', fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#B91C1C'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#DC2626'; }}
            >
              <Trash2 size={14} />
              Clear All History
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          { key: 'ALL',    label: `All (${all.length})` },
          { key: 'UNREAD', label: `Unread (${unreadTotal})` },
          { key: 'READ',   label: `Read (${readTotal})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '7px 18px', borderRadius: 20,
              border: `1.5px solid ${filter === key ? C.primary : C.border}`,
              background: filter === key ? C.primary : '#fff',
              color: filter === key ? '#fff' : C.textMuted,
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif', transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Notification list ── */}
      <div style={{
        background: '#fff', borderRadius: 14,
        border: `1px solid ${C.border}`, boxShadow: C.shadow, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
            Loading…
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '52px 20px', textAlign: 'center' }}>
            <Bell size={42} color="#CBD5E1" />
            <p style={{ margin: '12px 0 4px', fontSize: '0.88rem', color: '#94A3B8', fontWeight: 600 }}>
              {all.length === 0
                ? 'No notification history available.'
                : filter === 'UNREAD' ? 'No unread notifications'
                : filter === 'READ'   ? 'No read notifications yet'
                : 'No notifications'}
            </p>
          </div>
        ) : (
          displayed.map((n, i) => {
            const meta   = getMeta(n.notification_type);
            const unread = !n.is_read;
            return (
              <div
                key={n.uuid}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: 14, padding: '16px 20px',
                  background: unread ? 'rgba(15,118,110,0.04)' : '#fff',
                  borderBottom: i < displayed.length - 1 ? `1px solid ${C.border}` : 'none',
                  cursor: n.redirect_url ? 'pointer' : 'default',
                  transition: 'background 0.15s', position: 'relative',
                }}
                onMouseEnter={(e) => { if (n.redirect_url) e.currentTarget.style.background = 'rgba(15,118,110,0.07)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = unread ? 'rgba(15,118,110,0.04)' : '#fff'; }}
              >
                {/* Unread dot */}
                {unread && (
                  <span style={{
                    position: 'absolute', top: 20, left: 6,
                    width: 6, height: 6, borderRadius: '50%', background: C.primary,
                  }} />
                )}

                {/* Avatar */}
                <div style={{
                  flexShrink: 0, width: 42, height: 42, borderRadius: 12,
                  background: meta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 2,
                }}>
                  {n.sender_name ? (
                    <Avatar
                      imageUrl={n.sender_profile_photo_url}
                      name={n.sender_name}
                      size={42}
                      borderColor="transparent"
                      borderWidth="0"
                      fallbackBg={meta.bg}
                      fontSize="0.78rem"
                      style={{ background: meta.bg }}
                    />
                  ) : (
                    <Bell size={18} color={meta.color} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: unread ? 700 : 600, color: C.textMain, lineHeight: 1.3 }}>
                      {n.title}
                    </span>
                    <span style={{
                      flexShrink: 0, fontSize: '0.62rem', fontWeight: 700,
                      color: meta.color, background: meta.bg,
                      borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap',
                    }}>
                      {meta.label}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: '#475569', lineHeight: 1.55 }}>
                    {n.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {n.sender_name && (
                      <span style={{ fontSize: '0.67rem', color: '#94A3B8', fontWeight: 500 }}>
                        From: <strong style={{ color: C.textMuted }}>{n.sender_name.trim()}</strong>
                        {n.sender_role && (
                          <span style={{ color: '#94A3B8' }}> · {n.sender_role.replace(/_/g, ' ')}</span>
                        )}
                      </span>
                    )}
                    <span style={{ fontSize: '0.65rem', color: '#CBD5E1', marginLeft: 'auto' }}>
                      {fmtTime(n.created_at)}
                    </span>
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: unread ? 'rgba(15,118,110,0.1)' : 'rgba(100,116,139,0.08)',
                      color: unread ? C.primary : '#94A3B8',
                    }}>
                      {unread ? 'Unread' : 'Read'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Confirmation Dialog ── */}
      <ConfirmDialog
        open={dialog.open}
        loading={dialog.loading}
        title={dialog.type === 'all' ? 'Clear Notification History' : 'Clear Read Notifications'}
        message={
          dialog.type === 'all'
            ? 'Are you sure you want to permanently delete all notifications from your history? This action cannot be undone.'
            : `Are you sure you want to permanently delete all ${readTotal} read notification${readTotal !== 1 ? 's' : ''}? Unread notifications will be kept.`
        }
        confirmLabel={dialog.type === 'all' ? 'Clear All' : 'Clear Read'}
        onConfirm={confirmClear}
        onCancel={closeDialog}
      />
    </div>
  );
};

export default NotificationsPage;
