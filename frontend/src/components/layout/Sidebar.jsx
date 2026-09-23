import { NavLink, useLocation } from 'react-router-dom';

const navigation = [
  { key: 'documents', label: 'Documents', href: '/documents' },
  { key: 'search', label: 'Search', href: '/search' },
  { key: 'indexing', label: 'Indexing', href: '/indexing' },
  { key: 'metrics', label: 'Metrics', href: '/metrics' },
];

export function Sidebar({ collapsed = false, onToggle }) {
  const location = useLocation();

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 w-[260px] bg-[#161320] border-r border-[#2d2840] flex flex-col z-[100] transition-[width] duration-250 ease overflow-hidden ${collapsed ? 'w-[72px]' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between h-[64px] px-4 border-b border-[#2d2840] flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 flex-shrink-0 rounded-[10px] shadow-sm" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" className="w-full h-full" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="url(#grad)" />
                <path d="M10 16l4 4 8-8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-[1.125rem] font-bold text-[#f0ebfa] whitespace-nowrap overflow-hidden text-ellipsis">Guidely</span>
          </div>
        )}
        <button
          type="button"
          className="flex items-center justify-center w-9 h-9 border-none bg-[#1e1b2e] rounded-[10px] text-[#b8b0cc] cursor-pointer transition-all duration-150 ease flex-shrink-0"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Navigation">
        <ul className="list-none p-0 m-0 flex flex-col gap-1" role="list">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  className={`flex items-center px-3.5 py-2.5 rounded-[10px] text-[#b8b0cc] no-underline transition-all duration-150 ease whitespace-nowrap overflow-hidden ${isActive ? 'bg-[rgba(192,132,252,0.12)] text-[#c084fc] font-medium' : ''} ${collapsed ? 'justify-center' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  {!collapsed && <span className="text-sm overflow-hidden text-ellipsis">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-[#2d2840] flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.3)] rounded-[10px]">
            <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" aria-hidden="true"></div>
            <span className="text-sm font-medium text-[#34d399] whitespace-nowrap overflow-hidden text-ellipsis">System Online</span>
          </div>
        )}
      </div>
    </aside>
  );
}
