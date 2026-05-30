import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import type { PageKey } from './constants/navigation';
import { Apps } from './pages/Apps';
import { Auth } from './pages/Auth';
import { Cleanup } from './pages/Cleanup';
import { Csgo } from './pages/Csgo';
import { Dashboard } from './pages/Dashboard';
import { Optimizations } from './pages/Optimizations';
import { Restore } from './pages/Restore';
import { Settings } from './pages/Settings';

const pages: Record<PageKey, JSX.Element> = {
  dashboard: <Dashboard />,
  optimizations: <Optimizations />,
  cleanup: <Cleanup />,
  csgo: <Csgo />,
  restore: <Restore />,
  apps: <Apps />,
  settings: <Settings />,
  auth: <Auth />
};

export function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {pages[activePage]}
    </AppShell>
  );
}
