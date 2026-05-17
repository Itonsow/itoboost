import { Activity, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';

const stats = [
  { label: 'Ajustes Disponíveis', value: '33', icon: SlidersHorizontal, tone: 'text-cyan-100' },
  { label: 'Ajustes Ativos', value: '1', icon: Activity, tone: 'text-emerald-100' },
  { label: 'Nível de Otimização', value: '3%', icon: TrendingUp, tone: 'text-orange-100' }
];

export function OptimizationStatus() {
  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-100/70">Painel 2</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Status de Otimização</h3>
        </div>
        <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
          Simulado
        </div>
      </div>

      <div className="space-y-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/15 px-4 py-4"
              key={stat.label}
            >
              <div className="flex items-center gap-3">
                <span className={`grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.045] ${stat.tone}`}>
                  <Icon size={17} />
                </span>
                <span className="text-sm font-medium text-slate-400">{stat.label}</span>
              </div>
              <span className="font-mono text-xl font-bold text-white">{stat.value}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
