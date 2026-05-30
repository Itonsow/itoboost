import { AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import type { CleanupId, CleanupTask } from '../../types/cleanup';

interface CleanupTaskRowProps {
  task: CleanupTask;
  isSelected: boolean;
  isRunning: boolean;
  onToggle: (id: CleanupId) => void;
  formatBytes: (value: number | null) => string;
}

export function CleanupTaskRow({ task, isSelected, isRunning, onToggle, formatBytes }: CleanupTaskRowProps) {
  return (
    <div className="group flex min-h-[88px] items-center justify-between gap-5 border-b border-white/[0.06] px-6 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-white">{task.title}</h3>
          {task.riskLevel === 'high' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-300/25 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-100">
              <AlertTriangle size={12} />
              Perigoso
            </span>
          )}
          {task.requiresAdmin && (
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/25 bg-orange-400/10 px-2 py-0.5 text-[11px] font-semibold text-orange-100">
              <ShieldAlert size={12} />
              Admin
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-slate-500">{task.description}</p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-cyan-100/60">
          Estimado: {formatBytes(task.estimatedBytes)}
        </p>
      </div>

      <button
        aria-checked={isSelected}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          isSelected ? 'border-cyan-300/45 bg-cyan-400/25' : 'border-white/[0.10] bg-slate-950/60'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        disabled={isRunning}
        onClick={() => onToggle(task.id)}
        role="switch"
        type="button"
      >
        <span
          className={`absolute top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-900 shadow-lg transition ${
            isSelected ? 'left-6' : 'left-1'
          }`}
        >
          {isSelected && <Check size={12} />}
        </span>
      </button>
    </div>
  );
}
