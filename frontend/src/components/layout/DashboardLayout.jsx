import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';

const PAGE_TITLES = {
  '/':                       'Dashboard',
  '/employees':              'Employee Management',
  '/employees/all':          'Employee Management',
  '/employees/management':   'Employee Management',
  '/employees/overview':     'Employee Management',
  '/employees/register':     'Employee Registration',
  '/employees/registration': 'Employee Registration',
  '/departments':            'Departments — Overview',
  '/departments/manage':     'Departments — Manage',
  '/departments/add':        'Departments — Manage',
  '/positions':              'Positions — Overview',
  '/positions/manage':       'Positions — Manage',
  '/levels':                 'Levels — Overview',
  '/levels/manage':          'Levels — Manage',
  '/attendance':             'Attendance — Overview',
  '/attendance/manage':      'Attendance — Manage',
  '/attendance/my':          'My Attendance',
  '/attendance-overview':    'Attendance — Overview',
  '/leave':                  'Leave Management',
  '/shifts':                 'Shifts — Overview',
  '/shifts/assignments':     'Shifts — Manage Assignments',
  '/letters':                'Letters',
  '/accounts':               'Accounts',
  '/logs':                   'Audit Logs',
  '/policies':               'Leave Policies',
  '/holidays':               'Day off',
  '/my-account':             'My Account',
  '/notifications':          'Notification History',
};

const SIDEBAR_W   = 240;
const SIDEBAR_COL = 72;
const TOPBAR_H    = 64;

// Breakpoints
const BP_TABLET = 1024;  // below this = tablet/mobile
const BP_MOBILE = 768;   // below this = mobile (hamburger)

const DashboardLayout = ({ pendingCount = 0 }) => {
  const [collapsed, setCollapsed]       = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [windowW, setWindowW]           = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const location = useLocation();

  // Track window width
  useEffect(() => {
    const onResize = () => setWindowW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isMobile = windowW < BP_MOBILE;
  const isTablet = windowW >= BP_MOBILE && windowW < BP_TABLET;

  // On mobile/tablet sidebar is a drawer — desktop uses the fixed sidebar
  const path = location.pathname;
  const title = PAGE_TITLES[path]
    || (path.startsWith('/employees/') && path !== '/employees/register' && path !== '/employees/registration' ? 'Employee Detail' : null)
    || Object.entries(PAGE_TITLES).find(([k]) => k !== '/' && path.startsWith(k))?.[1]
    || 'HRMS';

  // Effective sidebar width used to offset main content
  let sideW;
  if (isMobile) sideW = 0;           // drawer, no push
  else if (isTablet) sideW = SIDEBAR_COL; // always icon-only on tablet
  else sideW = collapsed ? SIDEBAR_COL : SIDEBAR_W; // desktop normal

  // Collapsed state passed to sidebar
  const sidebarCollapsed = isMobile ? false : isTablet ? true : collapsed;

  return (
    <div style={{ display: 'flex', background: '#C5CECC', fontFamily: 'Poppins, sans-serif', minHeight: '100vh' }}>

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 38,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar — always rendered; position & transform control visibility */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => {
          if (isMobile) setMobileOpen(v => !v);
          else setCollapsed(v => !v);
        }}
        pendingCount={pendingCount}
        mobileOpen={mobileOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      {/* Main content column */}
      <div style={{
        marginLeft: isMobile ? 0 : sideW,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'margin-left 0.3s ease',
      }}>
        <Topbar
          title={title}
          sidebarWidth={isMobile ? 0 : sideW}
          onHamburger={() => setMobileOpen(v => !v)}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        {/* Spacer below fixed topbar */}
        <div style={{ height: TOPBAR_H, flexShrink: 0 }} />

        <main style={{
          minHeight: `calc(100vh - ${TOPBAR_H}px + 1px)`,
          padding: isMobile ? '16px' : isTablet ? '20px' : '28px',
          minWidth: 0,
          overflowX: 'hidden',
          fontFamily: 'Poppins, sans-serif',
        }}>
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default DashboardLayout;
