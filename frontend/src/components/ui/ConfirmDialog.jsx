import React from 'react';

/**
 * Universal Confirmation Dialog Component
 * A reusable confirmation modal that matches the HRMS dashboard design language
 * 
 * Features:
 * - Four semantic variants: success, warning, delete, logout
 * - Action icons with proper styling
 * - Loading states with spinners
 * - Consistent spacing, typography, and shadows
 * - Optional info message with icon
 * - Prevents accidental actions with clear visual hierarchy
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is visible
 * @param {Function} props.onClose - Close/Cancel callback
 * @param {Function} props.onConfirm - Confirmation callback
 * @param {string} props.title - Dialog title
 * @param {string} props.description - Dialog description/message
 * @param {string} props.confirmText - Confirm button text (default: "Confirm")
 * @param {string} props.cancelText - Cancel button text (default: "Cancel")
 * @param {string} props.variant - "success" | "warning" | "delete" | "logout" (default: "success")
 * @param {boolean} props.loading - Show loading state
 * @param {boolean} props.hideCancel - Hide cancel button (for alert-style dialogs)
 * @param {string} props.infoMessage - Optional info message displayed below description
 * 
 * Example Usage:
 * <ConfirmDialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onConfirm={handleApprove}
 *   variant="success"
 *   title="Approve Leave Request?"
 *   description="The employee will be notified immediately."
 *   infoMessage="This action can be reverted later by administrators."
 *   confirmText="Confirm Approval"
 *   cancelText="Cancel"
 *   loading={loading}
 * />
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "success",
  loading = false,
  hideCancel = false,
  infoMessage,
}) => {
  if (!open) return null;

  // Variant configurations with icons and colors matching the dashboard design
  const variants = {
    success: {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#0F766E"/>
          <path d="M44 24L28 40L20 32" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      confirmBg: "#1e3a37",
      confirmHoverBg: "#0c1e1c",
      confirmText: "#FFFFFF",
      iconBg: "rgba(15, 118, 110, 0.1)",
    },
    warning: {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#F59E0B"/>
          <path d="M32 20V36M32 44H32.02" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      confirmBg: "#1e3a37",
      confirmHoverBg: "#0c1e1c",
      confirmText: "#FFFFFF",
      iconBg: "rgba(245, 158, 11, 0.1)",
    },
    delete: {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#DC2626"/>
          <path d="M24 26H40M38 26V42C38 42.5304 37.7893 43.0391 37.4142 43.4142C37.0391 43.7893 36.5304 44 36 44H28C27.4696 44 26.9609 43.7893 26.5858 43.4142C26.2107 43.0391 26 42.5304 26 42V26M28 26V24C28 23.4696 28.2107 22.9609 28.5858 22.5858C28.9609 22.2107 29.4696 22 30 22H34C34.5304 22 35.0391 22.2107 35.4142 22.5858C35.7893 22.9609 36 23.4696 36 24V26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M30 32V38M34 32V38" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      confirmBg: "#DC2626",
      confirmHoverBg: "#B91C1C",
      confirmText: "#FFFFFF",
      iconBg: "rgba(220, 38, 38, 0.1)",
    },
    logout: {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#0F766E"/>
          <path d="M28 20H24C23.4696 20 22.9609 20.2107 22.5858 20.5858C22.2107 20.9609 22 21.4696 22 22V42C22 42.5304 22.2107 43.0391 22.5858 43.4142C22.9609 43.7893 23.4696 44 24 44H28M34 38L40 32M40 32L34 26M40 32H28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      confirmBg: "#1e3a37",
      confirmHoverBg: "#0c1e1c",
      confirmText: "#FFFFFF",
      iconBg: "rgba(15, 118, 110, 0.1)",
    },
  };

  const config = variants[variant] || variants.success;

  const handleConfirm = async () => {
    if (loading) return;
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    if (loading) return;
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleCancel}
      className="confirm-dialog-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(26, 46, 43, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="confirm-dialog-card"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 20px 60px rgba(0, 60, 45, 0.2), 0 8px 28px rgba(0, 0, 0, 0.15)",
          border: "1px solid rgba(0, 80, 60, 0.1)",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleCancel}
          disabled={loading}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.4 : 0.6,
            transition: "all 0.2s ease",
            color: "#1A2E2B",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.backgroundColor = "rgba(0, 80, 60, 0.08)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.6";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Content */}
        <div style={{ padding: "40px 32px 32px", textAlign: "center" }}>
          {/* Icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "24px",
              animation: loading ? "none" : "iconPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s backwards",
            }}
          >
            {loading ? (
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  border: "4px solid rgba(15, 118, 110, 0.2)",
                  borderTopColor: "#0F766E",
                  animation: "continuousSpin 0.8s linear infinite",
                }}
              />
            ) : (
              config.icon
            )}
          </div>

          {/* Title */}
          <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: "20px",
              fontWeight: 600,
              lineHeight: "1.3",
              color: "#1A2E2B",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {loading ? `${title.replace('?', '')}...` : title}
          </h2>

          {/* Description */}
          {!loading && description && (
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#2A5C54",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {description}
            </p>
          )}

          {/* Loading Message */}
          {loading && (
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#2A5C54",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Please wait while we process your request...
            </p>
          )}

          {/* Info Message */}
          {!loading && infoMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "12px 16px",
                backgroundColor: "rgba(15, 118, 110, 0.08)",
                borderRadius: "10px",
                marginBottom: "8px",
                border: "1px solid rgba(15, 118, 110, 0.15)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0, marginTop: "1px" }}
              >
                <circle cx="9" cy="9" r="8" stroke="#0F766E" strokeWidth="1.5"/>
                <path d="M9 12V9M9 6H9.01" stroke="#0F766E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  lineHeight: "1.5",
                  color: "#0F766E",
                  textAlign: "left",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {infoMessage}
              </p>
            </div>
          )}

          {/* Loading State Additional Info */}
          {loading && (
            <p
              style={{
                margin: "0",
                fontSize: "12px",
                color: "#0F766E",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              This may take a few seconds.
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "0 32px 32px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              width: "100%",
              height: "48px",
              padding: "0 24px",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "Poppins, sans-serif",
              borderRadius: "12px",
              cursor: loading ? "not-allowed" : "pointer",
              backgroundColor: config.confirmBg,
              color: config.confirmText,
              border: "none",
              transition: "all 0.2s ease",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: loading ? "none" : "0 2px 8px rgba(0, 60, 45, 0.15)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = config.confirmHoverBg;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 60, 45, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = config.confirmBg;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = loading ? "none" : "0 2px 8px rgba(0, 60, 45, 0.15)";
            }}
          >
            {loading && (
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  borderTopColor: "#FFFFFF",
                  borderRadius: "50%",
                  animation: "continuousSpin 0.6s linear infinite",
                }}
              />
            )}
            {confirmText}
          </button>

          {/* Cancel Button */}
          {!hideCancel && (
            <button
              onClick={handleCancel}
              disabled={loading}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 24px",
                fontSize: "15px",
                fontWeight: 500,
                fontFamily: "Poppins, sans-serif",
                borderRadius: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                backgroundColor: "transparent",
                color: "#1A2E2B",
                border: "1.5px solid rgba(0, 80, 60, 0.2)",
                transition: "all 0.2s ease",
                opacity: loading ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "rgba(0, 80, 60, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(0, 80, 60, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "rgba(0, 80, 60, 0.2)";
              }}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes iconPop {
            from {
              opacity: 0;
              transform: scale(0.5) rotate(-10deg);
            }
            60% {
              transform: scale(1.08) rotate(3deg);
            }
            to {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }
          @keyframes continuousSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ConfirmDialog;
