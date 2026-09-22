const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
};

export function Spinner({
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'Loading',
}) {
  return (
    <span
      className={`inline-flex items-center justify-center ${sizeMap[size] || ''} ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <svg
        className="w-full h-full"
        style={{ animation: 'rotate 1.5s linear infinite' }}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          style={{ animation: 'dash 1.5s ease-in-out infinite' }}
        />
      </svg>
      <span className="sr-only">{ariaLabel}</span>
    </span>
  );
}

export function InlineSpinner({ className = '', 'aria-label': ariaLabel = 'Loading' }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 align-middle ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <svg
        className="w-full h-full"
        style={{ animation: 'rotate 1.5s linear infinite' }}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          style={{ animation: 'dash 1.5s ease-in-out infinite' }}
        />
      </svg>
      <span className="sr-only">{ariaLabel}</span>
    </span>
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8" role="status" aria-live="polite">
      <Spinner size="lg" aria-label={message} />
      <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
    </div>
  );
}