import { Cpu, HardDrive, MemoryStick, MonitorUp, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { HeroBanner } from '../components/dashboard/HeroBanner';
import { InfoCard } from '../components/dashboard/InfoCard';
import { OptimizationStatus } from '../components/dashboard/OptimizationStatus';
import { SystemInfoPanel } from '../components/dashboard/SystemInfoPanel';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { formatBytes, formatCores, formatGpuMemory, textFallback } from '../utils/formatters';

export function Dashboard() {
  const { data, error, isLoading, refetch } = useSystemInfo();

  const cards = [
    {
      title: 'Processador',
      value: data ? textFallback(data.cpu.brand) : 'Carregando CPU',
      detail: data ? `${formatCores(data.cpu.cores)} ${data.cpu.speedGhz ? `• ${data.cpu.speedGhz.toFixed(1)} GHz` : ''}` : '',
      badge: 'CPU',
      icon: Cpu,
      tone: 'blue' as const
    },
    {
      title: 'Gráficos',
      value: data ? textFallback(data.gpu.model) : 'Carregando GPU',
      detail: data ? formatGpuMemory(data.gpu.vramMb) : '',
      badge: 'GPU',
      icon: MonitorUp,
      tone: 'violet' as const
    },
    {
      title: 'Memória',
      value: data ? formatBytes(data.memory.totalBytes) : 'Carregando RAM',
      detail: 'Memória total instalada',
      badge: 'RAM',
      icon: MemoryStick,
      tone: 'green' as const
    },
    {
      title: 'Armazenamento',
      value: data ? formatBytes(data.storage.sizeBytes) : 'Carregando disco',
      detail: data ? textFallback(data.storage.type, 'Tipo indisponível') : '',
      badge: 'DISK',
      icon: HardDrive,
      tone: 'orange' as const
    }
  ];

  return (
    <div className="mx-auto max-w-[1560px] space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold text-white"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            Fala, ItoBoost
          </motion.h1>
          <p className="mt-2 text-base text-slate-400">Visão Geral do Sistema e Métricas de Desempenho</p>
        </div>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/25 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void refetch()}
          type="button"
        >
          <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={16} />
          Atualizar dados
        </button>
      </div>

      {error && (
        <div className="rounded-3xl border border-orange-300/20 bg-orange-400/10 px-5 py-4 text-sm text-orange-100">
          Não foi possível carregar os dados reais do computador. {error}
        </div>
      )}

      <HeroBanner />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <InfoCard delay={index * 0.06} isLoading={isLoading} key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SystemInfoPanel data={data} isLoading={isLoading} />
        <OptimizationStatus />
      </section>
    </div>
  );
}
