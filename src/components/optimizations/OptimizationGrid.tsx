import type { OptimizationId, OptimizationViewModel } from '../../types/optimization';
import { OptimizationCard } from './OptimizationCard';

interface OptimizationGridProps {
  optimizations: OptimizationViewModel[];
  pendingActions: Partial<Record<OptimizationId, 'apply' | 'revert'>>;
  runningId: OptimizationId | null;
  isAdmin: boolean;
  messages: Partial<Record<OptimizationId, { tone: 'success' | 'error' | 'info'; text: string }>>;
  onPendingChange: (id: OptimizationId, action: 'apply' | 'revert' | null) => void;
  onRun: (optimization: OptimizationViewModel, action: 'apply' | 'revert') => void;
}

export function OptimizationGrid({
  optimizations,
  pendingActions,
  runningId,
  isAdmin,
  messages,
  onPendingChange,
  onRun
}: OptimizationGridProps) {
  if (optimizations.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-10 text-center text-slate-400">
        Nenhuma otimização encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
      {optimizations.map((optimization) => (
        <OptimizationCard
          isAdmin={isAdmin}
          isRunning={runningId === optimization.id}
          key={optimization.id}
          message={messages[optimization.id]}
          onPendingChange={onPendingChange}
          onRun={onRun}
          optimization={optimization}
          pendingAction={pendingActions[optimization.id]}
        />
      ))}
    </section>
  );
}
