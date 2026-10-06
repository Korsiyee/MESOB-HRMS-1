/**
 * Design System
 * 
 * Centralized design tokens for consistent styling across the app
 */

export const COLORS = {
  // Primary
  primary: '#0F766E',
  primaryHover: '#0d6961',
  primaryLight: '#14B8A6',
  
  // Background
  background: '#C5CECC',
  surface: '#FFFFFF',
  surfaceHover: '#f3f4f6',
  
  // Text
  text: '#1e3a37',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textInverse: '#ffffff',
  
  // Borders
  border: '#e5e7eb',
  borderDark: '#d1d5db',
  
  // States
  error: '#EF4444',
  errorHover: '#dc2626',
  success: '#10B981',
  successHover: '#059669',
  warning: '#F59E0B',
  warningHover: '#d97706',
  info: '#3B82F6',
  infoHover: '#2563eb',
  
  // Semantic
  danger: '#EF4444',
  dangerHover: '#dc2626',
  
  // Sidebar
  sidebarBg: 'linear-gradient(180deg, #1e3a37 0%, #162e2b 100%)',
  sidebarText: 'rgba(255,255,255,0.65)',
  sidebarActive: 'rgba(20,184,166,0.15)',
  sidebarHover: 'rgba(255,255,255,0.06)',
  
  // Chart colors
  chartPrimary: '#0F766E',
  chartSecondary: '#14B8A6',
  chartTertiary: '#5EEAD4',
  chartQuaternary: '#99F6E4',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const FONT_WEIGHT = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const LINE_HEIGHT = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
};

export const TRANSITIONS = {
  fast: '0.15s ease',
  base: '0.2s ease',
  slow: '0.3s ease',
  slideIn: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  wide: 1536,
};

export const Z_INDEX = {
  dropdown: 10,
  sticky: 20,
  modal: 30,
  backdrop: 999,
  slidePanel: 1000,
  tooltip: 1100,
  notification: 1200,
};

// Helper functions
export const getSpacing = (...values) => {
  return values.map(v => `${SPACING[v] || v}px`).join(' ');
};

export const getFontStyle = (size, weight = 'normal') => ({
  fontSize: FONT_SIZE[size] || size,
  fontWeight: FONT_WEIGHT[weight] || weight,
});

export const getBorderStyle = (color = 'border', width = 1) => ({
  border: `${width}px solid ${COLORS[color] || color}`,
});

export const getCardStyle = () => ({
  backgroundColor: COLORS.surface,
  borderRadius: BORDER_RADIUS.lg,
  boxShadow: SHADOWS.base,
});

export const getButtonStyle = (variant = 'primary') => {
  const variants = {
    primary: {
      background: COLORS.primary,
      color: COLORS.textInverse,
      hoverBackground: COLORS.primaryHover,
    },
    secondary: {
      background: COLORS.surface,
      color: COLORS.primary,
      hoverBackground: COLORS.surfaceHover,
      border: `1px solid ${COLORS.border}`,
    },
    danger: {
      background: COLORS.danger,
      color: COLORS.textInverse,
      hoverBackground: COLORS.dangerHover,
    },
  };
  
  return variants[variant] || variants.primary;
};

export default {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  SHADOWS,
  TRANSITIONS,
  BREAKPOINTS,
  Z_INDEX,
  getSpacing,
  getFontStyle,
  getBorderStyle,
  getCardStyle,
  getButtonStyle,
};
