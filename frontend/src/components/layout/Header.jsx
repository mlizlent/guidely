import { useState, useRef, useEffect } from 'react';
import { Button, IconButton } from '../ui/Button';
import { Input } from '../ui/Input';

export function Header({ title, children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 h-16 bg-[rgba(13,11,20,0.8)] backdrop-blur-md border-b border-[#2d2840] flex items-center justify-between px-6 gap-6" role="banner">
      <div className="flex items-center gap-4 flex-shrink-0">
        {title && <h1 className="text-[1.125rem] font-semibold text-[#f0ebfa] whitespace-nowrap">{title}</h1>}
      </div>

      <div className="flex-1 flex justify-center max-w-[480px]">
        <div className={`relative w-full max-w-[400px] ${searchFocused ? '' : ''}`}>
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#7a748c] pointer-events-none transition-colors duration-150 ease" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            className="w-full h-10 pl-12 pr-12 text-sm font-sans text-[#f0ebfa] bg-[#181524] border border-[#2d2840] rounded-[10px] transition-all duration-150 ease"
            placeholder="Search documents... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Search documents"
            autoComplete="off"
            style={searchFocused ? { borderColor: '#c084fc', boxShadow: '0 0 0 3px rgba(192,132,252,0.12)' } : {}}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 border-none bg-transparent rounded-[6px] text-[#7a748c] cursor-pointer transition-all duration-150 ease"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.625rem] font-mono text-[#7a748c] bg-[#181524] px-1 py-0.5 rounded-[6px] pointer-events-none opacity-70"></kbd>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {children}
        <div className="w-px h-6 bg-[#2d2840]" aria-hidden="true" />
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Notifications"
          onClick={() => {}}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </IconButton>
      </div>
    </header>
  );
}

export function PageHeader({ title, subtitle, action, children }) {
  return (
    <div className="pb-6 border-b border-[#2d2840] mb-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#f0ebfa] mb-1.5">{title}</h1>
          {subtitle && <p className="text-sm text-[#b8b0cc]">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          {action}
          {children}
        </div>
      </div>
    </div>
  );
}