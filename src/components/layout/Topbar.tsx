import { Globe2, Maximize2, Minus, ScanLine, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IconButton } from '../ui/IconButton';

export function Topbar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    return window.itoBoost?.windowControls.onMaximizedChange(setIsMaximized);
  }, []);

  return (
    <header className="drag-region flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] bg-booster-void/55 px-6 backdrop-blur-2xl">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <div className="flex h-8 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3">
          <ScanLine size={15} className="text-cyan-200" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Core Monitor Online</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="no-drag flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-100"
          type="button"
        >
          <Globe2 size={15} />
          PT-BR
        </button>

        <div className="no-drag h-6 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-2">
          <IconButton aria-label="Minimizar" onClick={() => window.itoBoost?.windowControls.minimize()}>
            <Minus size={16} />
          </IconButton>
          <IconButton
            aria-label={isMaximized ? 'Restaurar' : 'Maximizar'}
            onClick={() => window.itoBoost?.windowControls.toggleMaximize()}
          >
            {isMaximized ? <Square size={14} /> : <Maximize2 size={15} />}
          </IconButton>
          <IconButton aria-label="Fechar" onClick={() => window.itoBoost?.windowControls.close()} tone="danger">
            <X size={16} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
