import { HardDrive, MonitorCog } from 'lucide-react';
import { Card } from '../ui/Card';
import type { SystemInfo } from '../../types/system';
import { formatBytes, textFallback } from '../../utils/formatters';

interface SystemInfoPanelProps {
  data: SystemInfo | null;
  isLoading: boolean;
}

export function SystemInfoPanel({ data, isLoading }: SystemInfoPanelProps) {
  const rows = [
    {
      label: 'SO',
      value: data ? textFallback(data.os.distro || data.os.platform) : 'Carregando'
    },
    {
      label: 'Versão',
      value: data ? `${textFallback(data.os.release)} ${data.os.arch ? `• ${data.os.arch}` : ''}` : 'Carregando'
    },
    {
      label: 'Modelo do Disco',
      value: data
        ? `${textFallback(data.storage.name)} ${data.storage.sizeBytes ? `• ${formatBytes(data.storage.sizeBytes)}` : ''}`
        : 'Carregando'
    }
  ];

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100/70">Painel 1</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Sistema Operacional</h3>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
          <MonitorCog size={22} />
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div
            className="flex items-center justify-between gap-5 rounded-2xl border border-white/[0.06] bg-black/15 px-4 py-4"
            key={row.label}
          >
            <div className="flex items-center gap-3">
              <HardDrive size={16} className="text-cyan-200/70" />
              <span className="text-sm font-medium text-slate-400">{row.label}</span>
            </div>
            {isLoading ? (
              <span className="h-4 w-36 animate-pulse rounded-full bg-white/[0.08]" />
            ) : (
              <span className="max-w-[62%] truncate text-right text-sm font-semibold text-slate-100">{row.value}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
