import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Persist sidebar collapse state
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [window.location.pathname]);

  const handleResize = () => {
    if (window.innerWidth > 1024) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0d0b14]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[99] ${sidebarOpen ? 'block' : 'hidden'} lg:hidden`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <div
        className="flex-1 flex flex-col min-w-0 transition-[margin-left] duration-250 ease"
        style={{ marginLeft: sidebarCollapsed ? '72px' : '260px' }}
      >
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={!sidebarCollapsed ? 'Guidely' : null}
        />
        <main className="flex-1 p-6 max-w-[1200px] w-full mx-auto" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}