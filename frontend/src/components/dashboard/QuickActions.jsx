import React from 'react';
import { UserPlus, CheckSquare, FileText, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  { label: 'Add Employee',     icon: UserPlus,    to: '/employees', bg: 'rgba(15,118,110,0.1)',  color: '#0F766E', hoverBorder: '#14B8A6' },
  { label: 'Approve Leaves',   icon: CheckSquare, to: '/leave',     bg: 'rgba(5,150,105,0.1)',   color: '#059669', hoverBorder: '#10B981' },
  { label: 'Generate Letter',  icon: FileText,    to: '/letters',   bg: 'rgba(37,99,235,0.1)',   color: '#1D4ED8', hoverBorder: '#3B82F6' },
  { label: 'Rebuild Balances', icon: RefreshCw,   to: '/policies',  bg: 'rgba(234,88,12,0.1)',   color: '#B45309', hoverBorder: '#F59E0B' },
];

/* Card bg matches the new palette */
const CARD_BG    = '#EEF1F0';
const BTN_BG     = '#E2E7E6';
const BTN_BORDER = 'rgba(0,80,60,0.12)';

const QuickActions = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      background: CARD_BG, borderRadius: 16,
      border: '1px solid rgba(0,80,60,0.09)', padding: 20,
      boxShadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#1A2E2B', fontFamily: 'Poppins, sans-serif' }}>
        Quick Actions
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {ACTIONS.map(({ label, icon: Icon, to, bg, color, hoverBorder }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 8, padding: '16px 8px',
              borderRadius: 12, border: `2px solid ${BTN_BORDER}`,
              background: BTN_BG, cursor: 'pointer',
              transition: 'all 0.15s', fontSize: '0.75rem',
              fontWeight: 600, color, fontFamily: 'Poppins, sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = bg;
              e.currentTarget.style.borderColor = hoverBorder;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,60,45,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = BTN_BG;
              e.currentTarget.style.borderColor = BTN_BORDER;
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 11,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={19} color={color} />
            </div>
            <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
