const badgeVariantClasses = {
  default: 'bg-[#1e1b2e] text-[#b8b0cc] border border-[#2d2840]',
  primary: 'bg-[rgba(192,132,252,0.12)] text-[#c084fc] border border-[rgba(192,132,252,0.3)]',
  success: 'bg-[rgba(52,211,153,0.12)] text-[#34d399] border border-[rgba(52,211,153,0.3)]',
  warning: 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border border-[rgba(251,191,36,0.3)]',
  error: 'bg-[rgba(248,113,113,0.12)] text-[#f87171] border border-[rgba(248,113,113,0.3)]',
  info: 'bg-[rgba(96,165,250,0.12)] text-[#60a5fa] border border-[rgba(96,165,250,0.3)]',
};

const badgeSizeClasses = {
  sm: 'px-2 py-0.5 text-[0.625rem] h-5',
  md: 'px-4 py-1 text-xs h-6',
  lg: 'px-6 py-1.5 text-sm h-7',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap transition-all duration-150 ease ${badgeVariantClasses[variant] || ''} ${badgeSizeClasses[size] || ''} ${className}`} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 animate-pulse" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

// Status-specific badges
export function StatusBadge({ status, className = '', ...props }) {
  const variantMap = {
    uploaded: 'info',
    indexing: 'warning',
    indexed: 'success',
    failed: 'error',
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    error: 'error',
  };

  const labelMap = {
    uploaded: 'Uploaded',
    indexing: 'Indexing',
    indexed: 'Indexed',
    failed: 'Failed',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    error: 'Error',
  };

  return (
    <Badge
      variant={variantMap[status] || 'default'}
      className={className}
      {...props}
    >
      {labelMap[status] || status}
    </Badge>
  );
}