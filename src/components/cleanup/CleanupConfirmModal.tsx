import { AlertTriangle, Brush, X } from 'lucide-react';
import type { CleanupTask } from '../../types/cleanup';

interface CleanupConfirmModalProps {
  tasks: CleanupTask[];
  isRunning: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CleanupConfirmModal({ tasks, isRunning, onCancel, onConfirm }: CleanupConfirmModalProps) {
  const hasHighRisk = tasks.some((task) => task.riskLevel === 'high');

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#070b16] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-11 w-11 place-items-center rounded-2xl border ${
                hasHighRisk
                  ? 'border-red-300/25 bg-red-500/12 text-red-100'
                  : 'border-cyan-300/25 bg-cyan-400/12 text-cyan-100'
              }`}
            >
              {hasHighRisk ? <AlertTriangle size={22} /> : <Brush size={22} />}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Confirmação</p>
              <h2 className="text-xl font-bold text-white">Executar limpeza selecionada</h2>
            </div>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:text-white"
            disabled={isRunning}
            onClick={onCancel}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6">
          <p className="leading-7 text-slate-400">
            O ItoBoost vai executar apenas as limpezas selecionadas. Itens marcados como perigosos podem remover
            arquivos permanentemente.
          </p>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3" key={task.id}>
                <p className="font-semibold text-white">{task.title}</p>
                {task.warningMessage && <p className="mt-1 text-sm text-slate-400">{task.warningMessage}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-6 py-5">
          <button
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white disabled:opacity-60"
            disabled={isRunning}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-2.5 text-sm font-bold text-cyan-50 transition hover:bg-cyan-400/25 disabled:opacity-60"
            disabled={isRunning}
            onClick={onConfirm}
            type="button"
          >
            <Brush size={16} />
            Confirmar limpeza
          </button>
        </div>
      </div>
    </div>
  );
}
