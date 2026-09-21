import { useState, useEffect, useCallback } from 'react';
import './Toast.css';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 3000;

let toastId = 0;
const listeners = [];
const memoryState = { toasts: [] };

function dispatch(action) {
  memoryState.toasts = reducer(memoryState.toasts, action);
  listeners.forEach((listener) => listener(memoryState.toasts));
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TOAST':
      return [action.toast, ...state].slice(0, TOAST_LIMIT);
    case 'UPDATE_TOAST':
      return state.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t));
    case 'DISMISS_TOAST': {
      const { toastId } = action;
      if (toastId) {
        return state.map((t) => (t.id === toastId ? { ...t, open: false } : t));
      }
      return state.map((t) => ({ ...t, open: false }));
    }
    case 'REMOVE_TOAST':
      return state.filter((t) => t.id !== action.toastId);
    default:
      return state;
  }
}

function genId() {
  toastId = (toastId + 1) % Number.MAX_SAFE_INTEGER;
  return toastId.toString();
}

export function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast: useCallback((props) => {
      const id = genId();
      const toast = { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismissToast(id); } };
      dispatch({ type: 'ADD_TOAST', toast });
      return { id, dismiss: () => dismissToast(id), update: (props) => dispatch({ type: 'UPDATE_TOAST', toast: { ...props, id } }) };
    }, []),
    dismiss: useCallback((toastId) => dispatch({ type: 'DISMISS_TOAST', toastId }), []),
  };
}

function dismissToast(toastId) {
  dispatch({ type: 'DISMISS_TOAST', toastId });
  setTimeout(() => dispatch({ type: 'REMOVE_TOAST', toastId }), TOAST_REMOVE_DELAY);
}

export function ToastProvider({ children }) {
  const { toasts } = useToast();

  return (
    <>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </>
  );
}

function Toast({ id, title, description, variant = 'default', open, onOpenChange, action }) {
  if (!open) return null;

  return (
    <div className={`toast toast--${variant}`} data-toast-id={id}>
      <div className="toast__content">
        <div className="toast__icon">
          {getIcon(variant)}
        </div>
        <div className="toast__text">
          {title && <div className="toast__title">{title}</div>}
          {description && <div className="toast__description">{description}</div>}
        </div>
        <button
          type="button"
          className="toast__close"
          onClick={() => onOpenChange(false)}
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {action && <div className="toast__action">{action}</div>}
      <div className="toast__progress" />
    </div>
  );
}

function getIcon(variant) {
  switch (variant) {
    case 'success':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'error':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case 'warning':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

// Convenience hooks
export function useToastHelpers() {
  const { toast, dismiss } = useToast();

  const success = useCallback((title, description) => toast({ title, description, variant: 'success' }), [toast]);
  const error = useCallback((title, description) => toast({ title, description, variant: 'error' }), [toast]);
  const warning = useCallback((title, description) => toast({ title, description, variant: 'warning' }), [toast]);
  const info = useCallback((title, description) => toast({ title, description, variant: 'default' }), [toast]);

  return { toast, dismiss, success, error, warning, info };
}