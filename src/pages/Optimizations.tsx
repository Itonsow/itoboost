import { motion } from 'framer-motion';
import { Activity, RefreshCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { OptimizationConfirmModal } from '../components/optimizations/OptimizationConfirmModal';
import { OptimizationFilters } from '../components/optimizations/OptimizationFilters';
import { OptimizationGrid } from '../components/optimizations/OptimizationGrid';
import { OptimizationSearch } from '../components/optimizations/OptimizationSearch';
import { ActionProgressPopup } from '../components/ui/ActionProgressPopup';
import { Card } from '../components/ui/Card';
import { useActionProgress } from '../hooks/useActionProgress';
import { useOptimizations } from '../hooks/useOptimizations';
import type { OptimizationViewModel } from '../types/optimization';

interface ConfirmationState {
  optimization: OptimizationViewModel;
  action: 'apply' | 'revert';
}

export function Optimizations() {
  const {
    categories,
    optimizations,
    allOptimizations,
    counts,
    isLoading,
    isAdmin,
    error,
    query,
    setQuery,
    category,
    setCategory,
    pendingActions,
    setPendingAction,
    runningId,
    messages,
    runAction,
    refresh
  } = useOptimizations();
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const runningOptimization = runningId
    ? allOptimizations.find((optimization) => optimization.id === runningId)
    : null;
  const runningAction = runningId ? pendingActions[runningId] : undefined;
  const actionProgress = useActionProgress(Boolean(runningId));

  const handleRun = (optimization: OptimizationViewModel, action: 'apply' | 'revert') => {
    const needsConfirmation =
      optimization.riskLevel === 'medium' ||
      optimization.riskLevel === 'high' ||
      optimization.requiresExplorerRestart;

    if (needsConfirmation) {
      setConfirmation({ optimization, action });
      return;
    }

    void runAction(optimization.id, action);
  };

  return (
    <div className="mx-auto max-w-[1560px] space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold text-white"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            Otimizações
          </motion.h1>
          <p className="mt-2 text-base text-slate-400">
            Ajustes avançados para desempenho, privacidade, aparência e sistema
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <OptimizationSearch onChange={setQuery} value={query} />
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/25 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Ajustes disponíveis</p>
              <p className="mt-2 font-mono text-3xl font-bold text-white">{counts.available}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <SlidersHorizontal size={22} />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Ajustes ativos</p>
              <p className="mt-2 font-mono text-3xl font-bold text-white">{counts.active}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
              <Activity size={22} />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Modo administrador</p>
              <p className="mt-2 text-lg font-bold text-white">{isAdmin ? 'Ativo' : 'Inativo'}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-orange-300/20 bg-orange-400/10 text-orange-100">
              <ShieldCheck size={22} />
            </div>
          </div>
        </Card>
      </section>

      <OptimizationFilters activeCategory={category} categories={categories} onChange={setCategory} />

      {error && (
        <div className="rounded-3xl border border-orange-300/20 bg-orange-400/10 px-5 py-4 text-sm text-orange-100">
          {error}
        </div>
      )}

      {isLoading ? (
        <section className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="h-[360px] animate-pulse rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045]"
              key={index}
            />
          ))}
        </section>
      ) : (
        <OptimizationGrid
          isAdmin={isAdmin}
          messages={messages}
          onPendingChange={setPendingAction}
          onRun={handleRun}
          optimizations={optimizations}
          pendingActions={pendingActions}
          runningId={runningId}
        />
      )}

      {confirmation && (
        <OptimizationConfirmModal
          action={confirmation.action}
          onCancel={() => setConfirmation(null)}
          onConfirm={(options) => {
            const { optimization, action } = confirmation;
            setConfirmation(null);
            void runAction(optimization.id, action, {
              createRestorePointFirst: options.createRestorePointFirst && action === 'apply'
            });
          }}
          optimization={confirmation.optimization}
        />
      )}

      <ActionProgressPopup
        description={
          actionProgress.isComplete
            ? 'Ajuste concluído.'
            : runningOptimization
            ? `${runningAction === 'revert' ? 'Revertendo' : 'Aplicando'}: ${runningOptimization.title}`
            : 'Executando ajuste selecionado.'
        }
        isVisible={actionProgress.isVisible}
        progress={actionProgress.progress}
        title="Otimização em andamento"
      />
    </div>
  );
}
