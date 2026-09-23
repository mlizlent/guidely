import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
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

  return (
    <div className="flex min-h-screen bg-[#0d0b14]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className="flex-1 flex flex-col min-w-0 transition-[margin-left] duration-250 ease"
        style={{ marginLeft: sidebarCollapsed ? '72px' : '260px' }}
      >
        <Header
          title={!sidebarCollapsed ? 'Guidely' : null}
        />
        <main className="flex-1 p-6 max-w-[1200px] w-full mx-auto" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}