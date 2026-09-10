import { useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { PageKey } from '../../constants/navigation';
import { ActionProgressPopup } from '../ui/ActionProgressPopup';
import { useActionProgress } from '../../hooks/useActionProgress';
import {
  getOperationState,
  subscribeOperationState
} from '../../services/operationState';

interface AppShellProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  const operation = useSyncExternalStore(subscribeOperationState, getOperationState, getOperationState);
  const actionProgress = useActionProgress();
  const isNavigationBlocked = operation.status === 'running';
  const handleNavigate = useCallback(
    (page: PageKey) => {
      if (isNavigationBlocked) return;
      onNavigate(page);
    },
    [isNavigationBlocked, onNavigate]
  );

  return (
    <div className="relative flex h-screen overflow-hidden bg-booster-void text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_85%_18%,rgba(139,92,246,0.13),transparent_22%),radial-gradient(circle_at_75%_82%,rgba(34,197,94,0.10),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[length:42px_42px] opacity-[0.24]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-booster-void/45 to-booster-void" />

      <Sidebar activePage={activePage} isNavigationBlocked={isNavigationBlocked} onNavigate={handleNavigate} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto px-7 py-7" tabIndex={0}>
          {isNavigationBlocked && (
            <div
              aria-live="polite"
              className="mb-5 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50"
              role="status"
            >
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-glow" />
              <span>Ação em andamento. A navegação ficará disponível quando ela terminar.</span>
            </div>
          )}
          {children}
        </main>
      </div>

      <ActionProgressPopup
        description={actionProgress.description}
        isVisible={actionProgress.isVisible}
        progress={actionProgress.progress}
        status={actionProgress.status}
        title={actionProgress.title}
      />
    </div>
  );
}
