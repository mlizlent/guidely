const variantClasses = {
  primary: 'bg-gradient-to-br from-[#c084fc] to-[#a855f7] text-[#0d0b14] shadow-sm hover:shadow-md hover:shadow-[rgba(192,132,252,0.4)] hover:-translate-y-px active:translate-y-0 active:shadow-sm',
  secondary: 'bg-[#1e1b2e] text-[#f0ebfa] border border-[#2d2840] hover:bg-[#242038] hover:border-[#3d3654]',
  ghost: 'bg-transparent text-[#b8b0cc] hover:bg-[rgba(192,132,252,0.12)] hover:text-[#c084fc]',
  danger: 'bg-[rgba(248,113,113,0.12)] text-[#f87171] border border-[rgba(248,113,113,0.3)] hover:bg-[#f87171] hover:text-[#0d0b14] hover:border-[#f87171] hover:shadow-[0_0_16px_rgba(248,113,113,0.3)]',
  success: 'bg-[rgba(52,211,153,0.12)] text-[#34d399] border border-[rgba(52,211,153,0.3)] hover:bg-[#34d399] hover:text-[#0d0b14] hover:border-[#34d399] hover:shadow-[0_0_16px_rgba(52,211,153,0.3)]',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs h-8',
  md: 'px-4 py-2 text-sm h-10',
  lg: 'px-6 py-3 text-base h-12',
};

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
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-medium border-none rounded-[10px] cursor-pointer transition-all duration-150 ease whitespace-nowrap relative overflow-hidden ${variantClasses[variant] || ''} ${sizeClasses[size] || ''} ${fullWidth ? 'w-full' : ''} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="absolute w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" aria-hidden="true" />}
      <span className={loading ? 'invisible' : ''}>{children}</span>
      {loading && <span className="absolute text-inherit">Loading...</span>}
    </button>
  );
}

const iconButtonVariantClasses = {
  ghost: 'text-[#b8b0cc] hover:bg-[rgba(192,132,252,0.12)] hover:text-[#c084fc]',
  primary: 'bg-[rgba(192,132,252,0.12)] text-[#c084fc] hover:bg-[#c084fc] hover:text-[#0d0b14]',
  danger: 'text-[#f87171] hover:bg-[rgba(248,113,113,0.12)] hover:text-[#f87171]',
};

const iconButtonSizeClasses = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
};

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
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center border-none rounded-[10px] cursor-pointer transition-all duration-150 ease text-[#b8b0cc] bg-transparent flex-shrink-0 ${iconButtonVariantClasses[variant] || ''} ${iconButtonSizeClasses[size] || ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}