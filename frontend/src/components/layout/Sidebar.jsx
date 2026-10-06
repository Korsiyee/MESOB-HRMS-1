import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  ChevronDown,
} from "lucide-react";
import logo from "../../../assets/Logo.png";
import { useAuth } from "../../context/AuthContext";
import { useModulePermissions } from "../../hooks/useModulePermissions";

/* Continuous spin lives in index.css as @keyframes continuousSpin */
const SPIN_STYLE = {
  animation: "continuousSpin 8s linear infinite",
  filter: "drop-shadow(0 0 10px rgba(20,184,166,0.55))",
};

/* 
 * Module-based navigation structure matching requirements
 * Uses existing professional pages - no stubs
 */
const NAV_CONFIG = [
  {
    group: "HOME",
    items: [
      { label: "Home", icon: LayoutDashboard, to: "/", module: "HOME" },
    ],
  },
  {
    group: "MODULES",
    items: [
      {
        label: "Employees",
        icon: Users,
        to: "/employees",
        module: "EMPLOYEES",
        children: [
          { label: "Employee List", to: "/employees" },
          { label: "Register Employee", to: "/employees/register" },
        ],
      },
      {
        label: "Organization",
        icon: Building2,
        to: "/departments",
        module: "ORGANIZATION",
        children: [
          { label: "Departments", to: "/departments" },
          { label: "Positions", to: "/positions" },
          { label: "Levels", to: "/levels" },
        ],
      },
      {
        label: "Attendance",
        icon: Clock,
        to: "/attendance",
        module: "ATTENDANCE",
        children: [
          { label: "Attendance Records", to: "/attendance" },
          { label: "Attendance Analytics", to: "/attendance-overview" },
        ],
      },
      {
        label: "Shifts",
        icon: Layers,
        to: "/shifts",
        module: "SHIFTS",
      },
      {
        label: "Letters",
        icon: FileText,
        to: "/letters",
        module: "LETTERS",
      },
      {
        label: "Leave",
        icon: CalendarDays,
        to: "/leave",
        module: "LEAVE",
        badgeKey: "pending",
        children: [
          { label: "Leave Requests", to: "/leave/manage" },
          { label: "My Leave", to: "/leave/my-requests" },
        ],
      },
    ],
  },
  {
    group: "PERSONAL SPACE",
    items: [
      { label: "My Attendance", icon: Clock, to: "/attendance/my", alwaysShow: true },
      { label: "My Letters", icon: FileText, to: "/letters/my", alwaysShow: true },
      { label: "My Leaves", icon: CalendarDays, to: "/leave/my-requests", alwaysShow: true },
      { label: "My Account", icon: UserCircle, to: "/my-account", alwaysShow: true },
    ],
  },
];

function resolveActiveRoute(pathname, navGroups) {
  const allKnownRoutes = new Set();
  for (const { items } of navGroups) {
    for (const item of items) {
      allKnownRoutes.add(item.to);
      if (item.children) {
        for (const c of item.children) allKnownRoutes.add(c.to);
      }
    }
  }

  if (allKnownRoutes.has(pathname)) return pathname;

  let bestMatch = null;
  let bestLen = 0;
  for (const route of allKnownRoutes) {
    if (route === "/") continue;
    if (pathname.startsWith(route + "/") || pathname.startsWith(route)) {
      if (route.length > bestLen) {
        bestLen = route.length;
        bestMatch = route;
      }
    }
  }
  return bestMatch;
}

const Sidebar = ({ collapsed, onToggle, pendingCount = 0, mobileOpen = false, isMobile = false, isTablet = false }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { hasModule } = useModulePermissions();

  const filteredNav = NAV_CONFIG.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.alwaysShow) return true;
      if (item.module) return hasModule(item.module);
      return true;
    })
  })).filter(group => group.items.length > 0);

  const w = collapsed ? 72 : 240;
  const activeRouteTo = resolveActiveRoute(location.pathname, filteredNav);

  const [openFolders, setOpenFolders] = useState(() => {
    const active = new Set();
    filteredNav.forEach(({ items }) => {
      items.forEach((item) => {
        if (item.children?.some((c) => c.to === activeRouteTo)) {
          active.add(item.to);
        }
      });
    });
    return active;
  });

  useEffect(() => {
    filteredNav.forEach(({ items }) => {
      items.forEach((item) => {
        if (item.children?.some((c) => c.to === activeRouteTo)) {
          setOpenFolders((prev) => new Set([...prev, item.to]));
        }
      });
    });
  }, [activeRouteTo]);

  const toggleFolder = (to) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(to)) next.delete(to);
      else next.add(to);
      return next;
    });
  };

  const sidebarStyle = isMobile
    ? {
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, zIndex: 39,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }
    : {
        position: 'fixed', top: 0, left: 0, bottom: 0, width: w, zIndex: 40,
        transition: 'width 0.3s ease',
      };

  return (
    <aside style={{
      ...sidebarStyle, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #1e3a37 0%, #162e2b 100%)',
      borderRight: '1px solid rgba(255,255,255,0.05)', overflowX: 'hidden',
      fontFamily: 'Poppins, sans-serif', boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
    }}>
      <div style={{
        padding: collapsed && !isMobile ? '20px 0 16px' : '24px 16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: collapsed && !isMobile ? 'none' : 1 }}>
          <img src={logo} alt="MESOB Logo" style={{
            width: collapsed && !isMobile ? 44 : 64,
            height: collapsed && !isMobile ? 44 : 64,
            objectFit: 'contain', flexShrink: 0, ...SPIN_STYLE,
          }} />
        </div>
        <button onClick={onToggle} style={{
          width: 28, height: 28, borderRadius: 8, border: 'none',
          background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.5)', flexShrink: 0, transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        aria-label={isMobile ? 'Close menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {isMobile ? <ChevronLeft size={14} /> : collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {filteredNav.map(({ group, items }) => (
          <div key={group}>
            {(!collapsed || isMobile) && (
              <p style={{ margin: '14px 0 4px', padding: '0 16px', fontSize: 10, fontWeight: 600, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
                {group}
              </p>
            )}
            {collapsed && !isMobile && <div style={{ margin: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }} />}

            {items.map(({ label, icon: Icon, to, badgeKey, children }) => {
              const hasChildren = children && children.length > 0;
              const isActive = activeRouteTo === to;
              const isChildActive = hasChildren && children.some((c) => activeRouteTo === c.to);
              const isOpen = openFolders.has(to);
              const showChildren = hasChildren && (!collapsed || isMobile) && (isOpen || isChildActive);

              const parentBg = isActive ? 'rgba(20,184,166,0.15)' : isChildActive ? 'rgba(20,184,166,0.06)' : 'transparent';
              const parentShadow = isActive ? 'inset 2px 0 0 #14B8A6' : isChildActive ? 'inset 2px 0 0 rgba(20,184,166,0.35)' : 'none';
              const parentIconColor = isActive ? '#14B8A6' : isChildActive ? 'rgba(20,184,166,0.7)' : 'rgba(255,255,255,0.5)';
              const parentTextColor = isActive ? 'white' : isChildActive ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.65)';
              const count = badgeKey === 'pending' ? pendingCount : 0;
              const showLabel = !collapsed || isMobile;

              const itemStyle = {
                width: '100%', display: 'flex', alignItems: 'center', gap: showLabel ? 10 : 0,
                margin: '1px 8px', padding: (collapsed && !isMobile) ? '11px 0' : '10px 12px',
                borderRadius: 10, textDecoration: 'none',
                justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
                background: parentBg, boxShadow: parentShadow, transition: 'background 0.15s',
                position: 'relative', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
              };

              return (
                <div key={to}>
                  {hasChildren ? (
                    <button onClick={() => toggleFolder(to)}
                      title={(collapsed && !isMobile) ? label : undefined} style={itemStyle}
                      onMouseEnter={(e) => { if (!isActive && !isChildActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={(e) => { if (!isActive && !isChildActive) e.currentTarget.style.background = 'transparent'; }}>
                      <Icon size={18} style={{ flexShrink: 0, color: parentIconColor }} />
                      {showLabel && (<>
                        <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: parentTextColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
                        <ChevronDown size={14} style={{ flexShrink: 0, color: parentTextColor, transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} />
                      </>)}
                      {showLabel && count > 0 && (
                        <span style={{ marginLeft: 'auto', minWidth: 20, height: 20, borderRadius: 99, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', padding: '0 5px' }}>{count}</span>
                      )}
                      {!showLabel && count > 0 && (
                        <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />
                      )}
                    </button>
                  ) : (
                    <NavLink to={to} title={(collapsed && !isMobile) ? label : undefined}
                      style={{ ...itemStyle, display: 'flex' }}
                      onMouseEnter={(e) => { if (!isActive && !isChildActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={(e) => { if (!isActive && !isChildActive) e.currentTarget.style.background = 'transparent'; }}>
                      <Icon size={18} style={{ flexShrink: 0, color: parentIconColor }} />
                      {showLabel && (
                        <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: parentTextColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
                      )}
                      {showLabel && count > 0 && (
                        <span style={{ marginLeft: 'auto', minWidth: 20, height: 20, borderRadius: 99, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', padding: '0 5px' }}>{count}</span>
                      )}
                      {!showLabel && count > 0 && (
                        <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />
                      )}
                    </NavLink>
                  )}

                  {showChildren && (
                    <div style={{ marginLeft: 16, marginBottom: 2, animation: 'fadeSubIn 0.15s ease-out' }}>
                      <style>{`@keyframes fadeSubIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
                      {children.map((child) => {
                        const childActive = activeRouteTo === child.to;
                        return (
                          <NavLink key={child.to} to={child.to} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            margin: '1px 8px 1px 0', padding: '8px 12px', borderRadius: 8,
                            textDecoration: 'none',
                            background: childActive ? 'rgba(20,184,166,0.18)' : 'transparent',
                            boxShadow: childActive ? 'inset 2px 0 0 #14B8A6' : 'none',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { if (!childActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                          onMouseLeave={(e) => { if (!childActive) e.currentTarget.style.background = 'transparent'; }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: childActive ? '#14B8A6' : 'rgba(255,255,255,0.25)' }} />
                            <span style={{ fontSize: 12, fontWeight: childActive ? 600 : 400, color: childActive ? 'white' : 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                              {child.label}
                            </span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: (collapsed && !isMobile) ? '12px 0' : '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: (collapsed && !isMobile) ? 'center' : 'flex-start', flexShrink: 0 }}>
        {(!collapsed || isMobile) && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Poppins, sans-serif' }}>FDRE Mesob HRMS</span>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
