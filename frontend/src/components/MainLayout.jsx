import React, { useState } from "react";
import { AuthApi } from "../api/authApi";
import logo from "../../assets/Logo.png";
import {
  Clock,
  Calendar,
  DollarSign,
  Gift,
  CreditCard,
  Umbrella,
  Briefcase,
  FileText,
  Users,
  User,
  ScrollText,
  ChevronDown,
  ChevronUp,
  Globe,
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

const BRAND = "#0b5d4a";
const BRAND_DARK = "#083d30";
const BRAND_HOVER = "#0f6f58";
const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;

const NAV_ITEMS = [
  {
    key: "attendance",
    label: "Attendance",
    icon: Clock,
    children: [
      { key: "attendance-overview", label: "Overview" },
      { key: "attendance", label: "Attendance" },
    ],
  },
  { key: "shift", label: "Shift", icon: Calendar, children: [] },
  { key: "payroll", label: "Payroll", icon: DollarSign, children: [] },
  { key: "bonus", label: "Bonus", icon: Gift, children: [] },
  { key: "loans", label: "Loans", icon: CreditCard, children: [] },
  {
    key: "leaves",
    label: "Leaves",
    icon: Umbrella,
    children: [
      { key: "leaves-overview", label: "Overview" },
      { key: "leave", label: "Leave" },
    ],
  },
  { key: "letters", label: "Letters", icon: FileText, children: [] },
  { key: "accounts", label: "Accounts", icon: Users, children: [] },
  { key: "my-account", label: "My Account", icon: User, children: [] },
  { key: "logs", label: "Logs", icon: ScrollText, children: [] },
];

const MainLayout = ({ children, activePage, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({ leaves: true, attendance: true });
  const user = AuthApi.getStoredUser();

  const isAdmin =
    user?.role?.name === "HR_ADMIN" ||
    user?.role?.name === "SUPER_ADMIN" ||
    user?.role?.name === "HR_OFFICER";

  const portalLabel = isAdmin ? "HRMS Admin Portal" : "HRMS Employee Portal";

  const displayName =
    user?.full_name ||
    user?.username ||
    "User";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    try {
      await AuthApi.logout();
    } catch (_) {
      /* ignore */
    }
    window.location.reload();
  };

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f7f6" }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: sidebarW,
          minWidth: sidebarW,
          background: BRAND,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.22s ease",
          overflow: "hidden",
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* Logo area */}
        <div
          style={{
            padding: collapsed ? "20px 0" : "20px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: collapsed ? "center" : "flex-start",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <img
            src={logo}
            alt="MESOB"
            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
          />
          {!collapsed && (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 18,
                  fontFamily: "Outfit, sans-serif",
                  letterSpacing: 0.5,
                }}
              >
                MESOB
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 10,
                  lineHeight: 1.3,
                  marginTop: 2,
                }}
              >
                Modern Ethiopian Services
                <br />
                For Organized Benefits
              </div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isGroupOpen = openGroups[item.key];
            const isGroupActive =
              hasChildren &&
              item.children.some((c) => c.key === activePage);
            const isDirectActive = !hasChildren && activePage === item.key;

            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    if (hasChildren) {
                      if (!collapsed) toggleGroup(item.key);
                    } else {
                      onNavigate(item.key);
                    }
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: collapsed ? "10px 0" : "10px 16px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    background:
                      isDirectActive || isGroupActive
                        ? "rgba(255,255,255,0.15)"
                        : "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: 13.5,
                    fontWeight: isDirectActive || isGroupActive ? 600 : 400,
                    borderLeft:
                      isDirectActive || isGroupActive
                        ? "3px solid #fff"
                        : "3px solid transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isDirectActive && !isGroupActive)
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isDirectActive && !isGroupActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: "left" }}>
                        {item.label}
                      </span>
                      {hasChildren &&
                        (isGroupOpen ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        ))}
                    </>
                  )}
                </button>

                {/* Sub-items */}
                {hasChildren && isGroupOpen && !collapsed && (
                  <div style={{ background: "rgba(0,0,0,0.15)" }}>
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        onClick={() => onNavigate(child.key)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 16px 8px 44px",
                          background:
                            activePage === child.key
                              ? "rgba(255,255,255,0.18)"
                              : "transparent",
                          border: "none",
                          cursor: "pointer",
                          color:
                            activePage === child.key
                              ? "#fff"
                              : "rgba(255,255,255,0.75)",
                          fontSize: 13,
                          fontWeight: activePage === child.key ? 600 : 400,
                          borderLeft:
                            activePage === child.key
                              ? "3px solid #fff"
                              : "3px solid transparent",
                          textAlign: "left",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (activePage !== child.key)
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          if (activePage !== child.key)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{
            margin: "8px auto",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top header - Modern Design */}
        <header
          style={{
            background: "linear-gradient(135deg, #1a2332 0%, #2a3648 100%)",
            borderBottom: "3px solid #0b5d4a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            height: 72,
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {/* Left Section - Logo & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={logo}
                alt="MESOB"
                style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: "50%", 
                  objectFit: "cover",
                  border: "2px solid rgba(11, 93, 74, 0.4)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              />
              <div>
                <div
                  style={{
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 22,
                    fontFamily: "Outfit, sans-serif",
                    letterSpacing: 1.2,
                    lineHeight: 1.2,
                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  MESOB HRMS
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: 0.5,
                    marginTop: 2,
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  Human Resource Management System
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Date, Actions & User */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Current Date Display */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Calendar size={16} style={{ color: "#0b5d4a" }} />
              <span
                style={{
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "Outfit, sans-serif",
                  letterSpacing: 0.3,
                }}
              >
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 32,
                background: "rgba(255,255,255,0.15)",
              }}
            />

            {/* Language Toggle */}
            <button
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                width: 36,
                height: 36,
                cursor: "pointer",
                color: "rgba(255,255,255,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              title="Language"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "rgba(255,255,255,0.85)";
              }}
            >
              <Globe size={18} />
            </button>

            {/* Notifications */}
            <button
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                width: 36,
                height: 36,
                cursor: "pointer",
                color: "rgba(255,255,255,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "all 0.2s ease",
              }}
              title="Notifications"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "rgba(255,255,255,0.85)";
              }}
            >
              <Bell size={18} />
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  background: "#ef4444",
                  borderRadius: "50%",
                  border: "2px solid #1a2332",
                }}
              />
            </button>

            {/* User Profile */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 12px 6px 6px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={handleLogout}
              title="Click to logout"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0b5d4a 0%, #0f766e 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: "0 2px 8px rgba(11, 93, 74, 0.3)",
                  border: "2px solid rgba(255,255,255,0.2)",
                }}
              >
                {initials}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 13,
                    color: "#ffffff",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  {displayName}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 500,
                    letterSpacing: 0.3,
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  {user?.role?.name?.replace(/_/g, " ") || "Employee"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            padding: "28px 28px",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
