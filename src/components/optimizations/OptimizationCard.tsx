import {
  AlertTriangle,
  BotOff,
  Bug,
  CheckCircle2,
  Clock3,
  CloudOff,
  Gamepad2,
  Gauge,
  HardDrive,
  LightbulbOff,
  ListX,
  Loader2,
  MapPinOff,
  Moon,
  MousePointer2,
  Network,
  PanelLeft,
  PanelsTopLeft,
  PowerOff,
  Cpu,
  RotateCcw,
  ShieldOff,
  Siren,
  Star,
  Store,
  TimerOff,
  TimerReset,
  Trash2,
  Menu,
  Settings2,
  Terminal,
  WifiOff,
  Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { OptimizationStatusBadge } from './OptimizationStatusBadge';
import type { OptimizationId, OptimizationViewModel } from '../../types/optimization';

interface OptimizationCardProps {
  optimization: OptimizationViewModel;
  pendingAction: 'apply' | 'revert' | undefined;
  isRunning: boolean;
  isAdmin: boolean;
  message?: { tone: 'success' | 'error' | 'info'; text: string };
  onPendingChange: (id: OptimizationId, action: 'apply' | 'revert' | null) => void;
  onRun: (optimization: OptimizationViewModel, action: 'apply' | 'revert') => void;
}

const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  'panel-left': PanelLeft,
  bug: Bug,
  store: Store,
  'bot-off': BotOff,
  'shield-off': ShieldOff,
  siren: Siren,
  'timer-off': TimerOff,
  'power-off': PowerOff,
  gamepad: Gamepad2,
  'moon-off': Moon,
  'map-pin-off': MapPinOff,
  'lightbulb-off': LightbulbOff,
  'mouse-pointer': MousePointer2,
  'wifi-off': WifiOff,
  moon: Moon,
  'list-x': ListX,
  gpu: Cpu,
  clock: Clock3,
  'window-game': PanelsTopLeft,
  'timer-reset': TimerReset,
  network: Network,
  trash: Trash2,
  'cloud-off': CloudOff,
  menu: Menu,
  'hard-drive': HardDrive,
  terminal: Terminal,
  cog: Settings2,
  gauge: Gauge
};

function OptimizationCardComponent({
  optimization,
  pendingAction,
  isRunning,
  isAdmin,
  message,
  onPendingChange,
  onRun
}: OptimizationCardProps) {
  const Icon = iconMap[optimization.icon] ?? Zap;
  const isActive = optimization.status === 'active';
  const isChecked = pendingAction ? pendingAction === 'apply' : isActive;
  const hasAdminWarning = optimization.requiresAdmin && !isAdmin;
  const showApply = pendingAction === 'apply';
  const showRevert = pendingAction === 'revert' || (isActive && optimization.isReversible);

  const handleToggle = () => {
    if (isRunning) return;

    if (isChecked) {
      onPendingChange(optimization.id, isActive ? 'revert' : null);
    } else {
      onPendingChange(optimization.id, 'apply');
    }
  };

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-panel backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.065]"
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="absolute right-0 top-0 h-32 w-32 bg-cyan-300/[0.06] blur-3xl transition group-hover:bg-cyan-300/[0.12]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {optimization.categories.slice(0, 3).map((category) => (
            <span
              className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100"
              key={category}
            >
              {category}
            </span>
          ))}
        </div>

        <button
          aria-checked={isChecked}
          className={`relative h-7 w-12 rounded-full border transition ${
            isChecked ? 'border-cyan-300/45 bg-cyan-400/25' : 'border-white/[0.10] bg-slate-950/60'
          }`}
          onClick={handleToggle}
          role="switch"
          type="button"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition ${
              isChecked ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      <div className="relative mt-6 flex items-start gap-4">
        <div className="grid h-[52px] w-[52px] place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-cyan-100">
          <Icon size={23} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-xl font-bold leading-7 text-white">{optimization.title}</h3>
            {optimization.isFavorite && <Star className="mt-1 shrink-0 fill-orange-300 text-orange-300" size={16} />}
            {optimization.riskLevel === 'high' && <AlertTriangle className="mt-1 shrink-0 text-red-200" size={16} />}
          </div>
          <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-slate-400">{optimization.description}</p>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <OptimizationStatusBadge type="status" status={optimization.status} />
        <OptimizationStatusBadge type="risk" risk={optimization.riskLevel} />
        {optimization.requiresAdmin && <OptimizationStatusBadge type="meta" label="Admin" />}
        {optimization.requiresRestart && <OptimizationStatusBadge type="meta" label="Reinício" />}
        {optimization.requiresExplorerRestart && <OptimizationStatusBadge type="meta" label="Explorer" />}
      </div>

      {hasAdminWarning && (
        <div className="relative mt-4 rounded-2xl border border-orange-300/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
          Este ajuste precisa do ItoBoost aberto como administrador.
        </div>
      )}

      {message && (
        <div
          className={`relative mt-4 rounded-2xl border px-4 py-3 text-sm ${
            message.tone === 'success'
              ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
              : message.tone === 'error'
                ? 'border-red-300/20 bg-red-500/10 text-red-100'
                : 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="relative mt-5 flex flex-wrap items-center gap-3">
        {showApply && (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 text-sm font-bold text-cyan-50 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRunning}
            onClick={() => onRun(optimization, 'apply')}
            type="button"
          >
            {isRunning ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            Aplicar
          </button>
        )}

        {showRevert && (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.045] px-4 text-sm font-bold text-slate-200 transition hover:border-orange-300/25 hover:bg-orange-400/10 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRunning}
            onClick={() => onRun(optimization, 'revert')}
            type="button"
          >
            {isRunning && pendingAction === 'revert' ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
            Reverter
          </button>
        )}

        {pendingAction && (
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">Alteração pendente</span>
        )}
      </div>
    </motion.article>
  );
}

export const OptimizationCard = memo(OptimizationCardComponent);
