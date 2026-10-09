import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * OrganizationModuleHeader - Shared header component for all Organization modules
 * (Departments, Positions, Shifts, Levels)
 * 
 * Features:
 * - Consistent sizing and spacing across all modules
 * - Integrated tab navigation inside header box
 * - Breadcrumb and title with stats subtitle
 * - Responsive design
 * 
 * @param {string} moduleName - Name of the module (e.g., "Departments", "Positions")
 * @param {string} activeTab - Current active tab key
 * @param {function} onTabChange - Callback when tab is changed
 * @param {Array} tabs - Array of tab objects: [{ key: 'overview', label: 'Overview' }]
 * @param {string} subtitle - Subtitle text showing stats or description
 * @param {ReactNode} action - Optional action button (for Overview tab only)
 */

const C = {
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
  primary: '#0F766E',
  textLight: '#E8F0EE',
  textMuted: 'rgba(232,240,238,0.45)',
  textSubtle: 'rgba(232,240,238,0.6)',
  textTab: 'rgba(232,240,238,0.7)',
};

const OrganizationModuleHeader = ({ 
  moduleName, 
  activeTab, 
  onTabChange, 
  tabs = [], 
  subtitle = '',
  action = null 
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Get current tab display name
  const getTabDisplayName = () => {
    const currentTab = tabs.find(t => t.key === activeTab);
    return currentTab ? currentTab.label : '';
  };

  return (
    <div style={{ 
      background: C.headerBg, 
      borderRadius: 14, 
      padding: isMobile ? '18px 20px' : '22px 28px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      marginBottom: 20,
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Top Section: Breadcrumb, Title, Stats/Subtitle, and Action Button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between', 
        flexWrap: isMobile ? 'wrap' : 'nowrap', 
        gap: 16,
        marginBottom: 16
      }}>
        {/* Left side: Breadcrumb, Title, Subtitle */}
        <div style={{ flex: isMobile ? '1 1 100%' : '0 1 auto', minWidth: 0 }}>
          <p style={{ 
            margin: '0 0 4px', 
            fontSize: '0.7rem', 
            color: C.textMuted, 
            letterSpacing: '0.04em',
            fontWeight: 500
          }}>
            {moduleName} › {getTabDisplayName()}
          </p>
          <h1 style={{ 
            margin: 0, 
            fontSize: isMobile ? '1.1rem' : '1.3rem', 
            fontWeight: 800, 
            color: C.textLight,
            lineHeight: 1.2
          }}>
            {moduleName}
          </h1>
          <p style={{ 
            margin: '4px 0 0', 
            fontSize: '0.76rem', 
            color: C.textSubtle,
            fontWeight: 500
          }}>
            {subtitle}
          </p>
        </div>

        {/* Right side: Optional Action Button */}
        {action && (
          <div style={{ 
            flex: isMobile ? '1 1 100%' : '0 0 auto',
            display: 'flex',
            justifyContent: isMobile ? 'flex-start' : 'flex-end'
          }}>
            {action}
          </div>
        )}
      </div>

      {/* Bottom Section: Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: 6, 
        background: 'rgba(0,0,0,0.15)', 
        borderRadius: 10, 
        padding: 4,
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                padding: isMobile ? '7px 12px' : '8px 16px',
                borderRadius: 7,
                border: 'none',
                background: isActive ? 'rgba(232,240,238,0.95)' : 'transparent',
                color: isActive ? C.primary : C.textTab,
                fontSize: isMobile ? '0.74rem' : '0.78rem',
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontFamily: 'Poppins, sans-serif',
                flex: isMobile ? '1 1 auto' : '0 0 auto'
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(232,240,238,0.1)';
                  e.currentTarget.style.color = C.textLight;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = C.textTab;
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OrganizationModuleHeader;
