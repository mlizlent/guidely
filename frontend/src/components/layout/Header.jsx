import { useState, useRef, useEffect } from 'react';
import { Button, IconButton } from '../ui/Button';
import { Input } from '../ui/Input';
import './Header.css';

export function Header({ onMenuClick, title, children }) {
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
    <header className="header" role="banner">
      <div className="header__left">
        <button
          type="button"
          className="header__menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle menu"
          aria-expanded="false"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {title && <h1 className="header__title">{title}</h1>}
      </div>

      <div className="header__center">
        <div className={`header__search ${searchFocused ? 'header__search--focused' : ''}`}>
          <svg className="header__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            className="header__search-input"
            placeholder="Search documents... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Search documents"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              type="button"
              className="header__search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <kbd className="header__search-hint">⌘K</kbd>
        </div>
      </div>

      <div className="header__right">
        {children}
        <div className="header__divider" aria-hidden="true" />
        <IconButton
          variant="ghost"
          size="md"
          aria-label="Notifications"
          onClick={() => {}}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </IconButton>
        <div className="header__avatar" aria-label="User menu">
          <span>U</span>
        </div>
      </div>
    </header>
  );
}

export function PageHeader({ title, subtitle, action, children }) {
  return (
    <div className="page-header">
      <div className="page-header__content">
        <div>
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        <div className="page-header__actions">
          {action}
          {children}
        </div>
      </div>
    </div>
  );
}