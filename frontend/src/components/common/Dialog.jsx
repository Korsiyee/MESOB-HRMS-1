import React from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info, AlertCircle } from 'lucide-react';

const C = {
  card: '#EEF1F0',
  cardBorder: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  border: 'rgba(0,80,60,0.12)',
  success: '#10B981',
  successBg: '#D1FAE5',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  info: '#3B82F6',
  infoBg: '#DBEAFE',
};

const dialogIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  confirm: AlertCircle,
};

const dialogColors = {
  success: { icon: C.success, bg: C.successBg },
  warning: { icon: C.warning, bg: C.warningBg },
  error: { icon: C.error, bg: C.errorBg },
  info: { icon: C.info, bg: C.infoBg },
  confirm: { icon: C.warning, bg: C.warningBg },
};

const Button = ({ children, onClick, variant = 'primary', disabled, style = {} }) => {
  const variants = {
    primary: {
      background: disabled ? '#8AADA6' : C.primary,
      color: '#fff',
      hoverBg: C.primaryHov,
    },
    secondary: {
      background: 'transparent',
      color: C.textSub,
      border: `1px solid ${C.border}`,
      hoverBg: 'rgba(0,80,60,0.05)',
    },
    danger: {
      background: disabled ? '#FCA5A5' : C.error,
      color: '#fff',
      hoverBg: '#DC2626',
    },
  };

  const v = variants[variant];
  const [hover, setHover] = React.useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 20px',
        borderRadius: 8,
        border: v.border || 'none',
        background: hover && !disabled ? v.hoverBg : v.background,
        color: v.color,
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'Poppins, sans-serif',
        transition: 'all 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

/**
 * Dialog Component
 * 
 * Props:
 * - isOpen: boolean - controls visibility
 * - onClose: function - called when dialog closes (X button, overlay click, or cancel)
 * - onConfirm: function - called when confirm button is clicked
 * - type: 'success' | 'warning' | 'error' | 'info' | 'confirm' - dialog type
 * - title: string - dialog title
 * - message: string - dialog message/content
 * - confirmText: string - text for confirm button (default: 'OK' or 'Confirm')
 * - cancelText: string - text for cancel button (default: 'Cancel')
 * - showCancel: boolean - whether to show cancel button (default: false for alerts, true for confirms)
 * - confirmVariant: 'primary' | 'danger' - confirm button variant (default: 'primary')
 * - size: 'sm' | 'md' | 'lg' - dialog size (default: 'md')
 * - showInput: boolean - whether to show input field for prompt dialogs
 * - inputValue: string - current input value
 * - inputPlaceholder: string - placeholder text for input field
 * - onInputChange: function - called when input value changes
 */
const Dialog = ({
  isOpen,
  onClose,
  onConfirm,
  type = 'info',
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  showCancel = type === 'confirm',
  confirmVariant = 'primary',
  size = 'md',
  showInput = false,
  inputValue = '',
  inputPlaceholder = '',
  onInputChange,
}) => {
  if (!isOpen) return null;

  const Icon = dialogIcons[type] || Info;
  const colors = dialogColors[type] || dialogColors.info;

  const sizes = {
    sm: 400,
    md: 480,
    lg: 600,
  };

  const defaultConfirmText = type === 'confirm' ? 'Confirm' : 'OK';

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
    if (type !== 'confirm') {
      onClose?.();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'Poppins, sans-serif',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={handleOverlayClick}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        style={{
          background: C.card,
          borderRadius: 14,
          width: '100%',
          maxWidth: sizes[size],
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          border: `1px solid ${C.cardBorder}`,
          animation: 'slideUp 0.2s ease-out',
          overflow: 'hidden',
        }}
      >
        {/* Header with icon and close button */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: colors.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={24} style={{ color: colors.icon }} />
          </div>

          {/* Title and close button */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: 700,
                color: C.textMain,
                lineHeight: 1.4,
              }}
            >
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textMuted,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: C.textSub,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message}
          </p>
          {showInput && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={inputPlaceholder}
              autoFocus
              style={{
                width: '100%',
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontSize: '0.875rem',
                color: C.textMain,
                background: '#fff',
                outline: 'none',
                fontFamily: 'Poppins, sans-serif',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = C.primary;
                e.target.style.boxShadow = `0 0 0 3px rgba(15,118,110,0.1)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = C.border;
                e.target.style.boxShadow = 'none';
              }}
            />
          )}
        </div>

        {/* Footer with action buttons */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          {showCancel && (
            <Button variant="secondary" onClick={onClose}>
              {cancelText}
            </Button>
          )}
          <Button variant={confirmVariant} onClick={handleConfirm}>
            {confirmText || defaultConfirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
