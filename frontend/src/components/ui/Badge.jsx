import './Badge.css';

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const classNames = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
    dot ? 'badge--dot' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames} {...props}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      <span className="badge__text">{children}</span>
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