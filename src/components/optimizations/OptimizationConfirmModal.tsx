import { AlertTriangle, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import type { OptimizationViewModel } from '../../types/optimization';

interface OptimizationConfirmModalProps {
  optimization: OptimizationViewModel;
  action: 'apply' | 'revert';
  onCancel: () => void;
  onConfirm: (options: { createRestorePointFirst: boolean }) => void;
}

export function OptimizationConfirmModal({
  optimization,
  action,
  onCancel,
  onConfirm
}: OptimizationConfirmModalProps) {
  const [createRestorePointFirst, setCreateRestorePointFirst] = useState(
    optimization.riskLevel === 'high' && action === 'apply'
  );
  const isHighRisk = optimization.riskLevel === 'high';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#070b16] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-11 w-11 place-items-center rounded-2xl border ${
                isHighRisk
                  ? 'border-red-300/25 bg-red-500/12 text-red-100'
                  : 'border-orange-300/25 bg-orange-400/12 text-orange-100'
              }`}
            >
              {isHighRisk ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Confirmação necessária
              </p>
              <h2 className="text-xl font-bold text-white">
                {action === 'apply' ? 'Aplicar ajuste sensível' : 'Reverter ajuste'}
              </h2>
            </div>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:text-white"
            onClick={onCancel}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <h3 className="text-lg font-bold text-white">{optimization.title}</h3>
            <p className="mt-2 leading-7 text-slate-400">
              {optimization.warningMessage ??
                'Este ajuste altera configurações do Windows. Revise as informações antes de continuar.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {optimization.requiresAdmin && (
              <div className="rounded-2xl border border-orange-300/20 bg-orange-400/10 p-4 text-sm text-orange-100">
                Requer execução como administrador.
              </div>
            )}
            {optimization.requiresRestart && (
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                Pode exigir reinicialização do PC.
              </div>
            )}
            {optimization.requiresExplorerRestart && (
              <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4 text-sm text-violet-100">
                O Explorer será reiniciado, não o PC.
              </div>
            )}
          </div>

          {isHighRisk && action === 'apply' && (
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-slate-200">
              <input
                checked={createRestorePointFirst}
                className="h-4 w-4 accent-cyan-300"
                onChange={(event) => setCreateRestorePointFirst(event.target.checked)}
                type="checkbox"
              />
              Criar ponto de restauração antes de aplicar
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-6 py-5">
          <button
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold text-white transition ${
              isHighRisk
                ? 'border-red-300/30 bg-red-500/20 hover:bg-red-500/30'
                : 'border-orange-300/30 bg-orange-400/20 hover:bg-orange-400/30'
            }`}
            onClick={() => onConfirm({ createRestorePointFirst })}
            type="button"
          >
            {action === 'revert' && <RotateCcw size={16} />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
