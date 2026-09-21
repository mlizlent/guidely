import './Button.css';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) {
  const classNames = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    disabled || loading ? 'btn--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      <span className={loading ? 'btn__text--hidden' : ''}>{children}</span>
      {loading && <span className="btn__loading-text">Loading...</span>}
    </button>
  );
}

export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) {
  const classNames = [
    'icon-btn',
    `icon-btn--${variant}`,
    `icon-btn--${size}`,
    disabled ? 'icon-btn--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classNames}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}