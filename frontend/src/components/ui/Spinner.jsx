import './Spinner.css';

export function Spinner({
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'Loading',
}) {
  const classNames = [`spinner`, `spinner--${size}`, className].filter(Boolean).join(' ');

  return (
    <span
      className={classNames}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <svg className="spinner__svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          className="spinner__track"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          className="spinner__indicator"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </svg>
      <span className="sr-only">{ariaLabel}</span>
    </span>
  );
}

export function InlineSpinner({ className = '', 'aria-label': ariaLabel = 'Loading' }) {
  return (
    <span className={`inline-spinner ${className}`} role="status" aria-label={ariaLabel} aria-live="polite">
      <svg className="inline-spinner__svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          className="inline-spinner__track"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          className="inline-spinner__indicator"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </svg>
      <span className="sr-only">{ariaLabel}</span>
    </span>
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <Spinner size="lg" aria-label={message} />
      <p className="page-loader__message">{message}</p>
    </div>
  );
}