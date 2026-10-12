import React from 'react';
import { UserPlus, CheckSquare, FileText, RefreshCw, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const cardStyle = {
  background: 'linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)',
  borderRadius: 18,
  border: '1px solid rgba(0, 80, 60, 0.1)',
  padding: '22px 24px',
  boxShadow: '0 4px 20px -2px rgba(0, 50, 40, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
  position: 'relative',
  overflow: 'hidden',
};

const ACTIONS = [
  {
    label: 'Add Employee',
    desc: 'Register new personnel',
    icon: UserPlus,
    to: '/employees/register',
    bg: 'rgba(15, 118, 110, 0.1)',
    color: '#0F766E',
    hoverBorder: '#0F766E',
  },
  {
    label: 'Approve Leaves',
    desc: 'Review pending requests',
    icon: CheckSquare,
    to: '/leave/manage',
    bg: 'rgba(5, 150, 105, 0.1)',
    color: '#059669',
    hoverBorder: '#059669',
  },
  {
    label: 'Generate Letter',
    desc: 'Issue official documents',
    icon: FileText,
    to: '/letters',
    bg: 'rgba(37, 99, 235, 0.1)',
    color: '#2563EB',
    hoverBorder: '#2563EB',
  },
  {
    label: 'Rebuild Balances',
    desc: 'Sync leave policies',
    icon: RefreshCw,
    to: '/policies',
    bg: 'rgba(234, 88, 12, 0.1)',
    color: '#EA580C',
    hoverBorder: '#EA580C',
  },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <Zap size={19} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#1A2E2B',
                fontFamily: 'Poppins, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              Quick Actions
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#2E6058', fontWeight: 500 }}>
              Frequent management operations
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {ACTIONS.map(({ label, desc, icon: Icon, to, bg, color, hoverBorder }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '14px 14px',
              borderRadius: 14,
              border: '1px solid rgba(0, 80, 60, 0.08)',
              background: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              textAlign: 'left',
              gap: 10,
              boxShadow: '0 2px 8px rgba(0, 50, 40, 0.03)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = hoverBorder;
              e.currentTarget.style.boxShadow = `0 10px 24px -4px rgba(0, 60, 45, 0.12), 0 0 0 1px ${hoverBorder}`;
              const arrow = e.currentTarget.querySelector('.action-arrow');
              if (arrow) arrow.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(0, 80, 60, 0.08)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 50, 40, 0.03)';
              const arrow = e.currentTarget.querySelector('.action-arrow');
              if (arrow) arrow.style.transform = 'none';
            }}
          >
            {/* Top row: Icon and chevron */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                }}
              >
                <Icon size={18} />
              </div>

              <div
                className="action-arrow"
                style={{
                  color: '#94A3B8',
                  transition: 'transform 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Label and micro-copy */}
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#1A2E2B',
                  lineHeight: 1.25,
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: '0.66rem',
                  color: '#2A5C54',
                  fontWeight: 500,
                  marginTop: 2,
                  lineHeight: 1.2,
                }}
              >
                {desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
