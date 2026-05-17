import type { OptimizationRiskLevel, OptimizationStatus } from '../../types/optimization';

interface OptimizationStatusBadgeProps {
  type: 'risk' | 'status' | 'meta';
  label?: string;
  risk?: OptimizationRiskLevel;
  status?: OptimizationStatus;
}

const riskLabels: Record<OptimizationRiskLevel, string> = {
  low: 'Risco baixo',
  medium: 'Risco médio',
  high: 'Risco alto'
};

const statusLabels: Record<OptimizationStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  unknown: 'Desconhecido'
};

export function OptimizationStatusBadge({ type, label, risk, status }: OptimizationStatusBadgeProps) {
  const text = risk ? riskLabels[risk] : status ? statusLabels[status] : label;
  const tone =
    risk === 'high'
      ? 'border-red-300/25 bg-red-500/10 text-red-100'
      : risk === 'medium'
        ? 'border-orange-300/25 bg-orange-400/10 text-orange-100'
        : risk === 'low'
          ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
          : status === 'active'
            ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100'
            : status === 'unknown'
              ? 'border-slate-300/20 bg-slate-400/10 text-slate-200'
              : type === 'meta'
                ? 'border-violet-300/20 bg-violet-400/10 text-violet-100'
                : 'border-white/[0.08] bg-white/[0.045] text-slate-300';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {text}
    </span>
  );
}
