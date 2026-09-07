import React from 'react';
import { Wrench } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const PAGE_LABELS = {
  '/employees':   'Employees',
  '/departments': 'Departments',
  '/positions':   'Positions',
  '/attendance':  'Attendance',
  '/shifts':      'Shifts',
  '/letters':     'Letters',
  '/accounts':    'Accounts',
  '/logs':        'Audit Logs',
  '/policies':    'Leave Policies',
  '/holidays':    'Holidays',
  '/my-account':  'My Account',
};

const PlaceholderPage = () => {
  const { pathname } = useLocation();
  const label = PAGE_LABELS[pathname] || pathname.replace('/', '').replace(/-/g, ' ');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '55vh', textAlign: 'center',
      fontFamily: 'Poppins, sans-serif',
      padding: '40px 24px',
    }}>
      {/* Icon */}
      <div style={{
        width: 68, height: 68, borderRadius: 18, marginBottom: 20,
        background: 'rgba(15,118,110,0.1)',
        border: '1px solid rgba(15,118,110,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Wrench size={28} color="#0F766E" />
      </div>

      {/* Title */}
      <h2 style={{
        margin: 0, fontSize: '1.3rem', fontWeight: 700,
        color: '#1A2E2B', textTransform: 'capitalize',
      }}>
        {label}
      </h2>

      {/* Description */}
      <p style={{
        margin: '10px 0 0', maxWidth: 400, fontSize: '0.82rem',
        color: '#1E4A42', lineHeight: 1.7,
      }}>
        This section is connected to the backend API and ready for full implementation.
        The existing components — DataTable, forms, filters — can be wired in here.
      </p>

      {/* Route badge */}
      <div style={{
        marginTop: 24, padding: '8px 18px', borderRadius: 10,
        border: '1px solid rgba(0,80,60,0.12)',
        background: 'rgba(0,80,60,0.06)',
        fontSize: '0.72rem', color: '#1A3530',
        fontFamily: 'monospace',
      }}>
        Route: <span style={{ color: '#0F766E', fontWeight: 700 }}>{pathname}</span>
      </div>
    </div>
  );
};

export default PlaceholderPage;
