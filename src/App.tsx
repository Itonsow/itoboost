import { memo, useCallback, useMemo, useState, useTransition } from 'react';
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

interface PageSlotProps {
  page: PageKey;
  activePage: PageKey;
  children: JSX.Element;
}

const PageSlot = memo(function PageSlot({ page, activePage, children }: PageSlotProps) {
  const isActive = page === activePage;

  return (
    <section
      aria-hidden={!isActive}
      className={isActive ? 'block' : 'hidden'}
      data-page={page}
    >
      {children}
    </section>
  );
});

export function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [visitedPages, setVisitedPages] = useState<Set<PageKey>>(() => new Set(['dashboard']));
  const [, startTransition] = useTransition();

  const handleNavigate = useCallback((page: PageKey) => {
    startTransition(() => {
      setActivePage(page);
      setVisitedPages((current) => {
        if (current.has(page)) return current;
        const next = new Set(current);
        next.add(page);
        return next;
      });
    });
  }, []);

  const mountedPages = useMemo(() => Array.from(visitedPages), [visitedPages]);

  return (
    <AppShell activePage={activePage} onNavigate={handleNavigate}>
      {mountedPages.map((page) => (
        <PageSlot activePage={activePage} key={page} page={page}>
          {pages[page]}
        </PageSlot>
      ))}
    </AppShell>
  );
}
