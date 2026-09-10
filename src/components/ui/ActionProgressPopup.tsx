import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

type ActionProgressStatus = 'running' | 'success' | 'error';

interface ActionProgressPopupProps {
  isVisible: boolean;
  progress: number;
  title: string;
  description: string;
  status: ActionProgressStatus;
}

export function ActionProgressPopup({ isVisible, progress, title, description, status }: ActionProgressPopupProps) {
  if (!isVisible) return null;
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const StatusIcon = isSuccess ? CheckCircle2 : isError ? XCircle : Loader2;
  const statusLabel = isSuccess ? 'Concluído' : isError ? 'Falhou' : 'Em andamento';
  const accentClass = isSuccess
    ? 'border-emerald-300/25 bg-emerald-400/15 text-emerald-100'
    : isError
      ? 'border-red-300/25 bg-red-500/15 text-red-100'
      : 'border-cyan-300/25 bg-cyan-400/15 text-cyan-100';
  const progressClass = isSuccess ? 'bg-emerald-300/85' : isError ? 'bg-red-300/85' : 'bg-cyan-300/85';

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-40 w-[min(420px,calc(100vw-2rem))] rounded-[1.5rem] border border-cyan-300/25 bg-[#07111f]/95 p-4 text-cyan-50 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${accentClass}`}>
          <StatusIcon className={status === 'running' ? 'animate-spin' : ''} size={21} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-white">{title}</p>
            <span className={`font-mono text-xs font-bold ${isError ? 'text-red-100' : isSuccess ? 'text-emerald-100' : 'text-cyan-100'}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-300">{description}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ease-out ${progressClass}`}
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
