import { useEffect, useRef } from 'react';

const modalSizeClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
  full: 'max-w-[100%] max-h-[100%]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  footer,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-[fadeIn_0.2s_ease]"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`bg-[#1a1728] border border-[#2d2840] rounded-[24px] shadow-lg w-full max-h-[90vh] flex flex-col animate-[slideUp_0.25s_ease] overflow-hidden ${modalSizeClasses[size] || ''} ${className}`}
        tabIndex={-1}
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-5 border-b border-[#2d2840]">
              {title && <h2 id="modal-title" className="text-[1.125rem] font-semibold text-[#f0ebfa] mb-0">{title}</h2>}
              {showCloseButton && (
                <button
                  type="button"
                  className="flex items-center justify-center w-8 h-8 border-none bg-transparent rounded-[10px] text-[#7a748c] cursor-pointer transition-all duration-150 ease flex-shrink-0"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="p-6 overflow-y-auto flex-1">
            {children}
          </div>
          {footer && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#2d2840] bg-[#161320]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3 w-full justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 font-medium border-none rounded-[10px] cursor-pointer transition-all duration-150 ease whitespace-nowrap bg-transparent text-[#b8b0cc] hover:bg-[rgba(192,132,252,0.12)] hover:text-[#c084fc] h-10 px-4 py-2"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 font-medium border-none rounded-[10px] cursor-pointer transition-all duration-150 ease whitespace-nowrap h-10 px-4 py-2 ${variant === 'danger' ? 'bg-[rgba(248,113,113,0.12)] text-[#f87171] border border-[rgba(248,113,113,0.3)] hover:bg-[#f87171] hover:text-[#0d0b14] hover:border-[#f87171]' : 'bg-gradient-to-br from-[#c084fc] to-[#a855f7] text-[#0d0b14]'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      }
    >
      <p className="mb-0 text-[#b8b0cc] leading-[1.6]">{message}</p>
    </Modal>
  );
}
