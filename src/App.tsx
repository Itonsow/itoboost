import { useCallback, useState } from 'react';
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
import { isOperationRunning } from './services/operationState';

type PageRenderer = (onNavigate: (page: PageKey) => void) => JSX.Element;

const pageRenderers: Record<PageKey, PageRenderer> = {
  dashboard: (onNavigate) => <Dashboard onOpenOptimizations={() => onNavigate('optimizations')} />,
  optimizations: () => <Optimizations />,
  cleanup: () => <Cleanup />,
  csgo: () => <Csgo />,
  restore: () => <Restore />,
  apps: () => <Apps />,
  settings: () => <Settings />,
  auth: () => <Auth />
};

export function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');

  const handleNavigate = useCallback((page: PageKey) => {
    if (isOperationRunning()) return;
    setActivePage((current) => (current === page ? current : page));
  }, []);

  return (
    <AppShell activePage={activePage} onNavigate={handleNavigate}>
      {pageRenderers[activePage](handleNavigate)}
    </AppShell>
  );
}
