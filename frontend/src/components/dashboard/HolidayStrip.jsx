import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';

const cardStyle = {
  background: 'linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)',
  borderRadius: 18,
  border: '1px solid rgba(0, 80, 60, 0.1)',
  padding: '22px 24px',
  boxShadow: '0 4px 20px -2px rgba(0, 50, 40, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
  position: 'relative',
  overflow: 'hidden',
};

const TYPE_COLORS = {
  PUBLIC: {
    bg: 'rgba(15, 118, 110, 0.08)',
    color: '#0F766E',
    border: 'rgba(15, 118, 110, 0.2)',
  },
  NATIONAL: {
    bg: 'rgba(15, 118, 110, 0.08)',
    color: '#0F766E',
    border: 'rgba(15, 118, 110, 0.2)',
  },
  RELIGIOUS: {
    bg: 'rgba(217, 119, 6, 0.08)',
    color: '#B45309',
    border: 'rgba(217, 119, 6, 0.2)',
  },
  SPECIAL: {
    bg: 'rgba(37, 99, 235, 0.08)',
    color: '#1D4ED8',
    border: 'rgba(37, 99, 235, 0.2)',
  },
  ETHIOPIAN: {
    bg: 'rgba(124, 58, 237, 0.08)',
    color: '#6D28D9',
    border: 'rgba(124, 58, 237, 0.2)',
  },
};

const formatDate = (str) => {
  if (!str) return { day: '—', month: '', raw: null };
  const d = new Date(str);
  if (isNaN(d)) return { day: '—', month: '', raw: null };
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    raw: d,
  };
};

const getDaysDiff = (targetDate) => {
  if (!targetDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today!';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1) return `In ${diffDays} days`;
  return null;
};

const Skeleton = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        style={{
          width: 130,
          height: 120,
          borderRadius: 14,
          background: 'linear-gradient(90deg, rgba(238,241,240,0.8) 0%, rgba(255,255,255,0.9) 50%, rgba(238,241,240,0.8) 100%)',
          backgroundSize: '200% 100%',
          animation: 'skshimmer 1.4s infinite ease-in-out',
          flexShrink: 0,
          border: '1px solid rgba(0, 80, 60, 0.08)',
        }}
      />
    ))}
  </div>
);

const HolidayStrip = ({ holidays = [], loading }) => {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });

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
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(124, 58, 237, 0.1)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7C3AED',
            }}
          >
            <Calendar size={19} />
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
              Upcoming Holidays
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#2E6058', fontWeight: 500 }}>
              Official schedule for the next 60 days
            </p>
          </div>
        </div>

        {/* Scroll arrows */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            [-1, ChevronLeft],
            [1, ChevronRight],
          ].map(([dir, Icon]) => (
            <button
              key={dir}
              onClick={() => scroll(dir)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                border: '1px solid rgba(0, 80, 60, 0.12)',
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1A3530',
                transition: 'all 0.18s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 118, 110, 0.1)';
                e.currentTarget.style.borderColor = '#0F766E';
                e.currentTarget.style.color = '#0F766E';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.borderColor = 'rgba(0, 80, 60, 0.12)';
                e.currentTarget.style.color = '#1A3530';
              }}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : holidays.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#2E6058' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>
            No upcoming holidays in the next 60 days
          </p>
        </div>
      ) : (
        <div
          ref={ref}
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
          }}
        >
          {holidays.map((h, i) => {
            const dateObj = formatDate(h.gregorianDate || h.date);
            const countdown = getDaysDiff(dateObj.raw);
            const type = (h.type || 'PUBLIC').toUpperCase();
            const tc = TYPE_COLORS[type] || TYPE_COLORS.PUBLIC;

            return (
              <div
                key={h.uuid || i}
                style={{
                  flexShrink: 0,
                  width: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '14px 12px',
                  borderRadius: 14,
                  border: `1px solid ${tc.border}`,
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0, 50, 40, 0.04)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease',
                  cursor: 'default',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 10px 24px -4px ${tc.border}, 0 2px 6px rgba(0,0,0,0.04)`;
                  e.currentTarget.style.borderColor = tc.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 50, 40, 0.04)';
                  e.currentTarget.style.borderColor = tc.border;
                }}
              >
                {/* Date Block */}
                <div
                  style={{
                    background: tc.bg,
                    border: `1px solid ${tc.border}`,
                    borderRadius: 10,
                    padding: '4px 10px',
                    textAlign: 'center',
                    width: '100%',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: tc.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {dateObj.month}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: tc.color,
                      lineHeight: 1.1,
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    {dateObj.day}
                  </span>
                </div>

                {/* Holiday Name */}
                <p
                  style={{
                    margin: '0 0 6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#1A2E2B',
                    lineHeight: 1.25,
                    textAlign: 'center',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    height: 28,
                  }}
                >
                  {h.name}
                </p>

                {/* Countdown / Type pill */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', width: '100%' }}>
                  {countdown && (
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        color: tc.color,
                        background: tc.bg,
                        padding: '2px 7px',
                        borderRadius: 99,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Sparkles size={9} />
                      {countdown}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: '#2A5C54',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {h.type || 'Holiday'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HolidayStrip;
