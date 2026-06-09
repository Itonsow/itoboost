import { Brush, Loader2, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CleanupConfirmModal } from '../components/cleanup/CleanupConfirmModal';
import { CleanupTaskRow } from '../components/cleanup/CleanupTaskRow';
import { ActionProgressPopup } from '../components/ui/ActionProgressPopup';
import { Card } from '../components/ui/Card';
import { useActionProgress } from '../hooks/useActionProgress';
import { useCleanup } from '../hooks/useCleanup';

function formatCleanupBytes(value: number | null): string {
  if (value === null) return 'Calculando';
  if (value <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatLastCleanup(value: string | null): string {
  if (!value) return 'Ainda não foi limpo';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function Cleanup() {
  const {
    tasks,
    selectedIds,
    selectedTasks,
    selectedBytes,
    lastCleanupAt,
    isLoading,
    isRunning,
    error,
    result,
    refresh,
    toggleTask,
    executeCleanup
  } = useCleanup();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const actionProgress = useActionProgress(isRunning);

  const needsConfirmation = useMemo(
    () =>
      selectedTasks.some(
        (task) => task.riskLevel !== 'low' || task.requiresAdmin || task.requiresExplorerRestart
      ),
    [selectedTasks]
  );

  const handleRun = () => {
    if (selectedIds.length === 0) return;

    if (needsConfirmation) {
      setIsConfirmOpen(true);
      return;
    }

    void executeCleanup();
  };

  return (
    <div className="mx-auto max-w-[1560px] space-y-6">
      <section
        className="rounded-[2rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-panel backdrop-blur-xl"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-glow">
              <Brush size={26} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">Limpeza do Sistema</h1>
              <p className="mt-1 text-sm font-medium text-slate-400">
                Última limpeza: {formatLastCleanup(lastCleanupAt)}
              </p>
            </div>
          </div>

          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/25 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || isRunning}
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={16} />
            Atualizar
          </button>
        </div>
      </section>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="h-[88px] animate-pulse border-b border-white/[0.06] bg-white/[0.025]" key={index} />
            ))}
          </div>
        ) : (
          tasks.map((task) => (
            <CleanupTaskRow
              formatBytes={formatCleanupBytes}
              isRunning={isRunning}
              isSelected={selectedIds.includes(task.id)}
              key={task.id}
              onToggle={toggleTask}
              task={task}
            />
          ))
        )}
      </Card>

      {error && (
        <div className="rounded-3xl border border-red-300/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm ${
            result.success
              ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
              : 'border-orange-300/20 bg-orange-400/10 text-orange-100'
          }`}
        >
          {result.message}
          {result.cleanedBytes !== null && ` Espaço estimado liberado: ${formatCleanupBytes(result.cleanedBytes)}.`}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          {selectedIds.length > 0
            ? `${selectedIds.length} selecionado(s), ${formatCleanupBytes(selectedBytes)} estimados`
            : 'Selecione uma ou mais limpezas para continuar'}
        </div>
        <button
          className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-cyan-300/25 bg-blue-500/35 px-5 text-sm font-bold text-white shadow-glow transition hover:bg-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selectedIds.length === 0 || isLoading || isRunning}
          onClick={handleRun}
          type="button"
        >
          {isRunning ? <Loader2 className="animate-spin" size={17} /> : <Brush size={17} />}
          Limpar Selecionados
        </button>
      </div>

      {isConfirmOpen && (
        <CleanupConfirmModal
          isRunning={isRunning}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            void executeCleanup();
          }}
          tasks={selectedTasks}
        />
      )}

      <ActionProgressPopup
        description={
          actionProgress.isComplete
            ? 'Limpeza concluída.'
            : `${selectedIds.length} limpeza(s) selecionada(s), ${formatCleanupBytes(selectedBytes)} estimados.`
        }
        isVisible={actionProgress.isVisible}
        progress={actionProgress.progress}
        title="Limpeza em andamento"
      />
    </div>
  );
}
