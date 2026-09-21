import './Card.css';

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
    'card',
    `card--${variant}`,
    `card--padding-${padding}`,
    hover ? 'card--hover' : '',
    onClick ? 'card--clickable' : '',
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
    <div className={`card__header ${className}`}>
      <div className="card__header-content">
        {title && <h3 className="card__title">{title}</h3>}
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="card__header-action">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`card__body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '', divided = true }) {
  return (
    <div className={`card__footer ${className} ${divided ? 'card__footer--divided' : ''}`}>
      {children}
    </div>
  );
}