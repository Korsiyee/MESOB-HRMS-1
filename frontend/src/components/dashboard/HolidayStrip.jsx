import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_COLORS = {
  PUBLIC:    { bg: 'rgba(15,118,110,0.1)',  color: '#0A5C55', border: 'rgba(15,118,110,0.2)'  },
  NATIONAL:  { bg: 'rgba(15,118,110,0.1)',  color: '#0A5C55', border: 'rgba(15,118,110,0.2)'  },
  RELIGIOUS: { bg: 'rgba(180,83,9,0.1)',    color: '#7C3A00', border: 'rgba(180,83,9,0.2)'    },
  SPECIAL:   { bg: 'rgba(29,78,216,0.1)',   color: '#1035A0', border: 'rgba(29,78,216,0.2)'   },
  ETHIOPIAN: { bg: 'rgba(109,40,217,0.1)',  color: '#5B21B6', border: 'rgba(109,40,217,0.2)'  },
};

const formatDate = str => {
  if (!str) return { day: '—', month: '' };
  const d = new Date(str);
  if (isNaN(d)) return { day: '—', month: '' };
  return { day: d.getDate(), month: d.toLocaleDateString('en-US', { month: 'short' }) };
};

const Skeleton = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    {[1,2,3,4,5].map(i => (
      <div key={i} style={{ width: 115, height: 100, borderRadius: 12, background: 'rgba(0,80,60,0.07)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
    ))}
  </div>
);

const HolidayStrip = ({ holidays = [], loading }) => {
  const ref = useRef(null);
  const scroll = dir => ref.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });

  return (
    <div style={{
      background: '#EEF1F0', borderRadius: 16,
      border: '1px solid rgba(0,80,60,0.09)', padding: 22,
      boxShadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1A2E2B', fontFamily: 'Poppins, sans-serif' }}>
            Upcoming Holidays
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: '#1E4A42', fontFamily: 'Poppins, sans-serif' }}>
            Next 60 days
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[[-1, ChevronLeft],[1, ChevronRight]].map(([dir, Icon]) => (
            <button key={dir} onClick={() => scroll(dir)} style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid rgba(0,80,60,0.15)',
              background: 'rgba(0,80,60,0.07)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1A3530', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,80,60,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,80,60,0.07)'; }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {loading ? <Skeleton /> : holidays.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1E4A42', textAlign: 'center', padding: '16px 0', fontFamily: 'Poppins, sans-serif' }}>
          No upcoming holidays in the next 60 days
        </p>
      ) : (
        <div ref={ref} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {holidays.map((h, i) => {
            const { day, month } = formatDate(h.gregorianDate || h.date);
            const type = (h.type || 'PUBLIC').toUpperCase();
            const tc = TYPE_COLORS[type] || TYPE_COLORS.PUBLIC;
            return (
              <div key={h.uuid || i} style={{
                flexShrink: 0, minWidth: 115,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6, padding: '14px 12px',
                borderRadius: 12, border: `1px solid ${tc.border}`,
                background: tc.bg, textAlign: 'center',
                transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,60,45,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: tc.color, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>{day}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.65rem', fontWeight: 700, color: tc.color, textTransform: 'uppercase', letterSpacing: 1.5 }}>{month}</p>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: '#1A2E2B', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {h.name}
                </p>
                <span style={{
                  padding: '2px 9px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                  background: 'rgba(255,255,255,0.6)', color: tc.color,
                  border: `1px solid ${tc.border}`, fontFamily: 'Poppins, sans-serif',
                }}>
                  {h.type || 'PUBLIC'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HolidayStrip;
