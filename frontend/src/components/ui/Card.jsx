const paddingMap = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
  ...props
}) {
  const classNames = [
    'bg-[#1a1728] border border-[#2d2840] rounded-[16px] overflow-hidden transition-all duration-250 ease',
    variant === 'elevated' ? 'shadow-md' : '',
    variant === 'filled' ? 'bg-[#1e1b2e] border-transparent' : '',
    paddingMap[padding] || paddingMap.md,
    hover ? 'hover:border-[#3d3654] hover:shadow-lg hover:-translate-y-2' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ].filter(Boolean).join(' ');

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={classNames}
      onClick={onClick}
      {...(onClick ? { type: 'button' } : {})}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  children,
  className = '',
  action,
  title,
  subtitle,
}) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 pb-4 border-b border-[#2d2840] ${className}`}>
      <div className="flex-1 min-w-0">
        {title && <h3 className="text-base font-semibold text-[#f0ebfa] mb-1 leading-[1.4]">{title}</h3>}
        {subtitle && <p className="text-sm text-[#b8b0cc] mb-0 leading-[1.5]">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '', divided = true }) {
  return (
    <div className={`flex items-center justify-end gap-3 pt-4 mt-2 ${divided ? 'border-t border-[#2d2840]' : ''} ${className}`}>
      {children}
    </div>
  );
}