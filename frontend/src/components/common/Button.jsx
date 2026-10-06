/**
 * Button Component
 * 
 * Reusable button with consistent styling and variants
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: {
    background: '#0F766E',
    color: '#ffffff',
    hoverBackground: '#0d6961',
    border: 'none'
  },
  secondary: {
    background: '#ffffff',
    color: '#0F766E',
    hoverBackground: '#f3f4f6',
    border: '1px solid #d1d5db'
  },
  danger: {
    background: '#EF4444',
    color: '#ffffff',
    hoverBackground: '#dc2626',
    border: 'none'
  },
  ghost: {
    background: 'transparent',
    color: '#6b7280',
    hoverBackground: '#f3f4f6',
    border: 'none'
  }
};

const SIZES = {
  sm: {
    padding: '6px 12px',
    fontSize: '13px',
    height: '32px'
  },
  md: {
    padding: '10px 16px',
    fontSize: '14px',
    height: '40px'
  },
  lg: {
    padding: '12px 20px',
    fontSize: '16px',
    height: '48px'
  }
};

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  type = 'button',
  className = '',
  style = {}
}) => {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  const sizeStyle = SIZES[size] || SIZES.md;
  
  const isDisabled = disabled || loading;

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 500,
    borderRadius: '8px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    opacity: isDisabled ? 0.6 : 1,
    ...variantStyle,
    ...sizeStyle,
    ...style
  };

  const handleMouseEnter = (e) => {
    if (!isDisabled) {
      e.currentTarget.style.background = variantStyle.hoverBackground;
    }
  };

  const handleMouseLeave = (e) => {
    if (!isDisabled) {
      e.currentTarget.style.background = variantStyle.background;
    }
  };

  const handleClick = (e) => {
    if (!isDisabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      style={buttonStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={isDisabled}
      className={className}
    >
      {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
      {!loading && Icon && iconPosition === 'left' && <Icon size={16} />}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && <Icon size={16} />}
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};

export default Button;
