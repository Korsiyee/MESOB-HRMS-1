import { useState, useCallback } from 'react';

/**
 * Custom hook for managing confirmation dialogs
 * Provides a cleaner API for using ConfirmDialog component
 * 
 * @returns {Array} [confirm, ConfirmDialogProps]
 * 
 * @example
 * const [confirm, confirmProps] = useConfirm();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: "Delete Item",
 *     message: "Are you sure you want to delete this item?",
 *     variant: "danger",
 *     confirmText: "Delete"
 *   });
 *   
 *   if (confirmed) {
 *     // Proceed with deletion
 *   }
 * };
 * 
 * // In JSX:
 * <ConfirmDialog {...confirmProps} />
 */
export const useConfirm = () => {
  const [dialogState, setDialogState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default',
    loading: false,
    hideCancel: false,
    resolveCallback: null,
  });

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        loading: false,
        hideCancel: options.hideCancel || false,
        resolveCallback: resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    setDialogState((prev) => ({ ...prev, loading: true }));
    
    // Allow async operations in onConfirm callback if provided
    if (dialogState.onConfirm) {
      try {
        await dialogState.onConfirm();
      } catch (error) {
        console.error('Confirm action failed:', error);
      }
    }
    
    if (dialogState.resolveCallback) {
      dialogState.resolveCallback(true);
    }
    
    setDialogState((prev) => ({
      ...prev,
      open: false,
      loading: false,
      resolveCallback: null,
    }));
  }, [dialogState]);

  const handleCancel = useCallback(() => {
    if (dialogState.resolveCallback) {
      dialogState.resolveCallback(false);
    }
    
    setDialogState((prev) => ({
      ...prev,
      open: false,
      loading: false,
      resolveCallback: null,
    }));
  }, [dialogState]);

  const confirmProps = {
    open: dialogState.open,
    title: dialogState.title,
    message: dialogState.message,
    confirmText: dialogState.confirmText,
    cancelText: dialogState.cancelText,
    variant: dialogState.variant,
    loading: dialogState.loading,
    hideCancel: dialogState.hideCancel,
    onConfirm: handleConfirm,
    onClose: handleCancel,
  };

  return [confirm, confirmProps];
};

export default useConfirm;
