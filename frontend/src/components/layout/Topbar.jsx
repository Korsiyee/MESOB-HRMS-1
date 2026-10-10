import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, User, CheckCheck, X, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import apiClient from '../../api/apiClient';

/* ── tiny helpers ──────────────────────────────────────────────── */
const fmtTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
};

const TYPE_META = {
  LEAVE_REQUEST_SUBMITTED:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Leave Request'  },
  LEAVE_DEPT_APPROVED:      { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Leave Approved' },
  LEAVE_DEPT_REJECTED:      { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Leave Rejected' },
  LEAVE_HR_APPROVED:        { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Leave Approved' },
  LEAVE_HR_REJECTED:        { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Leave Rejected' },
  LETTER_REQUEST_SUBMITTED: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)', label: 'Letter Request' },
  LETTER_APPROVED:          { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Letter Approved'},
  LETTER_REJECTED:          { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Letter Rejected'},
};

const getTypeMeta = (type) =>
  TYPE_META[type] || { color: '#64748B', bg: 'rgba(100,116,139,0.10)', label: 'Notification' };

/* ── NotificationPanel ─────────────────────────────────────────── */
const NotificationPanel = ({ panelRef, onClose }) => {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = async (n) => {
    if (!n.is_read) await markRead(n.uuid);
    onClose();
    if (n.redirect_url) navigate(n.redirect_url);
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 12px)',
        right: 0,
        width: 400,
        maxWidth: 'calc(100vw - 24px)',
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.10)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
        zIndex: 9999,
        overflow: 'hidden',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px 14px',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        background: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={18} color="#14B8A6" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ background: '#EF4444', color: '#fff', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', lineHeight: 1 }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} title="Mark all as read"
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, color: '#14B8A6', display: 'flex', alignItems: 'center', gap: 5, transition: 'background 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>Loading…</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Bell size={36} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8', fontWeight: 500 }}>All caught up — no unread notifications</p>
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#CBD5E1' }}>Past notifications are in history</p>
          </div>
        ) : (
          notifications.map((n, i) => {
            const meta = getTypeMeta(n.notification_type);
            const isUnread = !n.is_read;
            return (
              <div key={n.uuid} onClick={() => handleClick(n)}
                style={{ display: 'flex', gap: 12, padding: '14px 18px', cursor: n.redirect_url ? 'pointer' : 'default', background: isUnread ? 'rgba(15,118,110,0.04)' : '#fff', borderBottom: i < notifications.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', transition: 'background 0.15s', position: 'relative' }}
                onMouseEnter={(e) => { if (n.redirect_url) e.currentTarget.style.background = 'rgba(15,118,110,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? 'rgba(15,118,110,0.04)' : '#fff'; }}
              >
                {isUnread && <span style={{ position: 'absolute', top: 18, left: 6, width: 6, height: 6, borderRadius: '50%', background: '#0F766E' }} />}
                <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <Bell size={17} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: isUnread ? 700 : 600, color: '#1A2332', lineHeight: 1.3 }}>{n.title}</span>
                    <span style={{ flexShrink: 0, fontSize: '0.6rem', fontWeight: 600, color: meta.color, background: meta.bg, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>{meta.label}</span>
                  </div>
                  <p style={{ margin: '0 0 5px', fontSize: '0.72rem', color: '#475569', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.message}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {n.sender_name && (
                      <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 500 }}>
                        From: {n.sender_name.trim() || n.sender_role || '—'}{n.sender_role ? ` · ${n.sender_role.replace(/_/g, ' ')}` : ''}
                      </span>
                    )}
                    <span style={{ fontSize: '0.62rem', color: '#CBD5E1', marginLeft: 'auto' }}>{fmtTime(n.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
          {notifications.length === 0 ? 'No unread notifications' : `${notifications.length} unread notification${notifications.length !== 1 ? 's' : ''}`}
        </span>
        <button onClick={() => { onClose(); navigate('/notifications'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: '#0F766E', padding: '2px 4px', textDecoration: 'underline' }}>
          View history →
        </button>
      </div>
    </div>
  );
};

/* ── Topbar ────────────────────────────────────────────────────── */
const Topbar = ({ title = 'Dashboard', sidebarWidth = 240, onHamburger, isMobile = false, isTablet = false }) => {
  const { user, logout } = useAuth();
  const { unreadCount, panelOpen, togglePanel, closePanel } = useNotifications();
  const navigate = useNavigate();

  const [dropOpen, setDropOpen] = useState(false);
  const [empInfo,  setEmpInfo]  = useState(null);
  const dropRef  = useRef(null);
  const bellRef  = useRef(null);
  const panelRef = useRef(null);

  /* Close user dropdown on outside click */
  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Close notification panel on outside click */
  useEffect(() => {
    const h = (e) => {
      if (panelOpen && panelRef.current && !panelRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [panelOpen, closePanel]);

  /* Fetch employee record to get full name */
  useEffect(() => {
    if (!user?.employee_uuid) return;
    
    // Use centralized apiClient for automatic authentication token injection
    apiClient.get(`/employees/${encodeURIComponent(user.employee_uuid)}`)
      .then(response => {
        // apiClient returns { data: payload } format
        if (response.data) {
          setEmpInfo(response.data);
        }
      })
      .catch(err => {
        console.error('[Topbar] Failed to fetch employee data:', err);
        // Don't block UI or trigger logout on employee fetch failure
      });
  }, [user?.employee_uuid]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  /* Build display values — full name from employee record */
  const fullName = empInfo
    ? [empInfo.first_name, empInfo.middle_name, empInfo.last_name].filter(Boolean).join(' ')
    : (user?.full_name || user?.username || 'Admin');
  const mesobId = empInfo?.mesob_id || '';

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: sidebarWidth,
        right: 0,
        height: 64,
        zIndex: 30,
        background: "linear-gradient(180deg, #1e3a37 0%, #162e2b 100%)",
        borderBottom: "2px solid rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        transition: "left 0.3s ease",
        fontFamily: "Poppins, sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* Left — Hamburger (mobile/tablet) + Amharic text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>

        {/* Hamburger — only on mobile/tablet */}
        {(isMobile || isTablet) && (
          <button
            onClick={onHamburger}
            aria-label="Open menu"
            style={{
              width: 40, height: 40, borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <Menu size={20} />
          </button>
        )}

        {/* Amharic + English text — hidden on small mobile */}
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <p style={{ margin: 0, fontSize: isTablet ? '0.85rem' : '1.05rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700, letterSpacing: 0.4, whiteSpace: 'nowrap', fontFamily: "'Nokia Pure Headline', 'Poppins', sans-serif" }}>
              የኢትዮጵያ ፌደራል ዴሞክራቲክ ሪፐብሊክ የመሶብ አገልግሎት
            </p>
            {!isTablet && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500, letterSpacing: 0.3, whiteSpace: 'nowrap', fontFamily: 'Poppins, sans-serif', lineHeight: 1.2 }}>
                Federal Democratic Republic of Ethiopia Mesob Service
              </p>
            )}
          </div>
        )}
      </div>

      {/* Center — HRMS title */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Poppins, sans-serif', letterSpacing: 2, lineHeight: 1 }}>HRMS</h1>
      </div>

      {/* Right — Bell / Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Bell */}
        <div style={{ position: "relative" }} ref={bellRef}>
          <button
            onClick={togglePanel}
            style={{
              position: "relative",
              width: 40,
              height: 40,
              border: `1px solid ${panelOpen ? "#14B8A6" : "rgba(255,255,255,0.2)"}`,
              borderRadius: 8,
              background: panelOpen
                ? "rgba(20,184,166,0.15)"
                : "rgba(255,255,255,0.1)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.9)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              e.currentTarget.style.borderColor = "#14B8A6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = panelOpen
                ? "rgba(20,184,166,0.15)"
                : "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = panelOpen
                ? "#14B8A6"
                : "rgba(255,255,255,0.2)";
            }}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  padding: "0 4px",
                  background: "#EF4444",
                  border: "2px solid #162e2b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {panelOpen && (
            <NotificationPanel panelRef={panelRef} onClose={closePanel} />
          )}
        </div>

        {/* Avatar dropdown */}
        <div style={{ position: "relative" }} ref={dropRef}>
          <button
            onClick={() => setDropOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 12px 6px 6px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              e.currentTarget.style.borderColor = "#14B8A6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
          >
            <Avatar imageUrl={user?.profile_photo_url} name={fullName} size={36} borderColor="rgba(255,255,255,0.2)" borderWidth="2px" />
            {/* Full name + role — hide on mobile */}
            {!isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>{fullName}</span>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{(user?.role?.name || 'USER').replace(/_/g, ' ')}</span>
              </div>
            )}
            {!isMobile && (
              <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.7)', transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 4 }} />
            )}
          </button>

          {dropOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 10px)",
                width: 240,
                borderRadius: 14,
                overflow: "hidden",
                zIndex: 50,
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.1)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
              }}
            >
              {/* Dropdown header */}
              <div
                style={{
                  padding: "16px 18px",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  background:
                    "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "#1a2332",
                  }}
                >
                  {fullName}
                </p>
                {mesobId && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.7rem",
                      color: "#0F766E",
                      fontWeight: 600,
                    }}
                  >
                    {mesobId}
                  </p>
                )}
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.72rem",
                    color: "#6c757d",
                  }}
                >
                  {user?.email || (user?.role?.name || "").replace(/_/g, " ")}
                </p>
              </div>

              {/* Profile — Settings removed */}
              <button
                onClick={() => {
                  setDropOpen(false);
                  navigate("/my-account");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 18px",
                  background: "none",
                  border: "none",
                  fontSize: "0.82rem",
                  color: "#1a2332",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f8f9fa")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <User size={16} /> Profile
              </button>

              <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }} />

              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 18px",
                  background: "none",
                  border: "none",
                  fontSize: "0.82rem",
                  color: "#DC2626",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 600,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#FEF2F2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
