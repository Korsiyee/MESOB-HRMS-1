import React, { createContext, useContext, useState, useCallback } from 'react';

const DialogContext = createContext(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
};

export const DialogProvider = ({ children }) => {
  const [dialogs, setDialogs] = useState([]);

  const openDialog = useCallback((config) => {
    const dialogId = `dialog-${Date.now()}-${Math.random()}`;
    const dialog = {
      id: dialogId,
      ...config,
    };
    setDialogs((prev) => [...prev, dialog]);
    return dialogId;
  }, []);

  const closeDialog = useCallback((dialogId) => {
    setDialogs((prev) => prev.filter((d) => d.id !== dialogId));
  }, []);

  const closeAllDialogs = useCallback(() => {
    setDialogs([]);
  }, []);

  const confirm = useCallback((config) => {
    return new Promise((resolve) => {
      const dialogId = openDialog({
        type: 'confirm',
        title: config.title || 'Confirm Action',
        message: config.message || 'Are you sure?',
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        onConfirm: () => {
          closeDialog(dialogId);
          resolve(true);
        },
        onCancel: () => {
          closeDialog(dialogId);
          resolve(false);
        },
      });
    });
  }, [openDialog, closeDialog]);

  const alert = useCallback((config) => {
    return new Promise((resolve) => {
      const dialogId = openDialog({
        type: 'alert',
        title: config.title || 'Alert',
        message: config.message || '',
        confirmText: config.confirmText || 'OK',
        onConfirm: () => {
          closeDialog(dialogId);
          resolve(true);
        },
      });
    });
  }, [openDialog, closeDialog]);

  const prompt = useCallback((config) => {
    return new Promise((resolve) => {
      const dialogId = openDialog({
        type: 'prompt',
        title: config.title || 'Input Required',
        message: config.message || '',
        defaultValue: config.defaultValue || '',
        placeholder: config.placeholder || '',
        confirmText: config.confirmText || 'Submit',
        cancelText: config.cancelText || 'Cancel',
        onConfirm: (value) => {
          closeDialog(dialogId);
          resolve(value);
        },
        onCancel: () => {
          closeDialog(dialogId);
          resolve(null);
        },
      });
    });
  }, [openDialog, closeDialog]);

  const showSuccess = useCallback((message) => {
    return alert({
      title: 'Success',
      message: message,
      type: 'success',
    });
  }, [alert]);

  const showError = useCallback((message) => {
    return alert({
      title: 'Error',
      message: message,
      type: 'error',
    });
  }, [alert]);

  const showConfirm = useCallback((message, onConfirm, options = {}) => {
    return new Promise((resolve) => {
      const dialogId = openDialog({
        type: 'confirm',
        title: options.title || 'Confirm Action',
        message: message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: async () => {
          closeDialog(dialogId);
          if (onConfirm) {
            await onConfirm();
          }
          resolve(true);
        },
        onCancel: () => {
          closeDialog(dialogId);
          resolve(false);
        },
      });
    });
  }, [openDialog, closeDialog]);

  const showDeleteConfirm = useCallback((message, onConfirm, options = {}) => {
    return showConfirm(message, onConfirm, {
      title: options.title || 'Confirm Delete',
      confirmText: options.confirmText || 'Delete',
      cancelText: options.cancelText || 'Cancel',
      ...options,
      type: 'delete',
    });
  }, [showConfirm]);

  const value = {
    dialogs,
    openDialog,
    closeDialog,
    closeAllDialogs,
    confirm,
    alert,
    prompt,
    showSuccess,
    showError,
    showConfirm,
    showDeleteConfirm,
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      
      {/* Render dialogs */}
      {dialogs.map((dialog) => (
        <DialogModal key={dialog.id} dialog={dialog} />
      ))}
    </DialogContext.Provider>
  );
};

// Dialog Modal Component
const DialogModal = ({ dialog }) => {
  const [inputValue, setInputValue] = useState(dialog.defaultValue || '');

  const handleConfirm = () => {
    if (dialog.type === 'prompt') {
      dialog.onConfirm?.(inputValue);
    } else {
      dialog.onConfirm?.();
    }
  };

  const handleCancel = () => {
    dialog.onCancel?.();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        {dialog.title && (
          <h2
            style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
            }}
          >
            {dialog.title}
          </h2>
        )}

        {/* Message */}
        {dialog.message && (
          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.5',
            }}
          >
            {dialog.message}
          </p>
        )}

        {/* Prompt Input */}
        {dialog.type === 'prompt' && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={dialog.placeholder}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: '20px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            autoFocus
          />
        )}

        {/* Custom Content */}
        {dialog.content && <div style={{ marginBottom: '20px' }}>{dialog.content}</div>}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          {dialog.type !== 'alert' && (
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#E5E7EB')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#F3F4F6')}
            >
              {dialog.cancelText || 'Cancel'}
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0F766E',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#115E59')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#0F766E')}
          >
            {dialog.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
