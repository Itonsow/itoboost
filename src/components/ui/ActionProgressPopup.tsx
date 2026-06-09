import { Loader2 } from 'lucide-react';

interface ActionProgressPopupProps {
  isVisible: boolean;
  progress: number;
  title: string;
  description: string;
}

export function ActionProgressPopup({ isVisible, progress, title, description }: ActionProgressPopupProps) {
  if (!isVisible) return null;
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-40 w-[min(420px,calc(100vw-2rem))] rounded-[1.5rem] border border-cyan-300/25 bg-[#07111f]/95 p-4 text-cyan-50 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/15 text-cyan-100">
          <Loader2 className="animate-spin" size={21} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-white">{title}</p>
            <span className="font-mono text-xs font-bold text-cyan-100">{normalizedProgress}%</span>
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-300">{description}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-cyan-300/85 transition-[width] duration-300 ease-out"
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
