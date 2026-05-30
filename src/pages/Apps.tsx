import { motion } from 'framer-motion';
import {
  AppWindow,
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  Gamepad2,
  Globe2,
  Headphones,
  Loader2,
  MessageCircle,
  MonitorDown,
  Music2,
  RefreshCcw,
  ShieldAlert,
  Terminal,
  Wrench
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useInstallableApps } from '../hooks/useInstallableApps';
import type { AppCategory, AppInstallId, AppInstallItem } from '../types/apps';

const appIcons: Record<AppInstallId, LucideIcon> = {
  brave: Globe2,
  vscode: Code2,
  codex: Terminal,
  'nvidia-driver': MonitorDown,
  'amd-driver': MonitorDown,
  discord: MessageCircle,
  vencord: MessageCircle,
  spotify: Music2,
  steam: Gamepad2,
  idm: Download,
  'logitech-ghub': Wrench
};

const categoryTone: Record<AppCategory, string> = {
  Navegador: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100',
  Dev: 'border-blue-300/20 bg-blue-400/10 text-blue-100',
  Drivers: 'border-orange-300/20 bg-orange-400/10 text-orange-100',
  Comunicacao: 'border-violet-300/20 bg-violet-400/10 text-violet-100',
  Midia: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
  Gaming: 'border-red-300/20 bg-red-400/10 text-red-100',
  Utilitario: 'border-slate-300/20 bg-slate-300/10 text-slate-100'
};

function getActionLabel(app: AppInstallItem): string {
  if (app.installKind === 'external') return 'Abrir oficial';
  if (app.status === 'installed') return 'Reinstalar';
  return 'Instalar';
}

function AppInstallCard({
  app,
  isRunning,
  message,
  onInstall
}: {
  app: AppInstallItem;
  isRunning: boolean;
  message?: { success: boolean; message: string };
  onInstall: (id: AppInstallId) => void;
}) {
  const Icon = appIcons[app.id] ?? AppWindow;
  const isInstalled = app.status === 'installed';
  const isExternal = app.installKind === 'external';
  const canInstall = app.status !== 'unknown' || isExternal;

  return (
    <Card className="flex min-h-[300px] flex-col p-5" interactive>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${categoryTone[app.category]}`}>
            <Icon size={23} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-xl font-bold text-white">{app.name}</h2>
              {isInstalled && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                  <CheckCircle2 size={13} />
                  Instalado
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{app.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${categoryTone[app.category]}`}>
          {app.category}
        </span>
        {app.requiresAdmin && (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-100">
            <ShieldAlert size={13} />
            Pode pedir admin
          </span>
        )}
        {app.version && (
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-300">
            v{app.version}
          </span>
        )}
      </div>

      {app.note && <p className="mt-4 text-xs leading-5 text-slate-500">{app.note}</p>}

      <div className="mt-auto pt-5">
        {message && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm leading-5 ${
              message.success
                ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
                : 'border-orange-300/20 bg-orange-400/10 text-orange-100'
            }`}
          >
            {message.message}
          </div>
        )}

        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 text-sm font-bold text-cyan-50 shadow-glow transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isRunning || !canInstall}
          onClick={() => onInstall(app.id)}
          type="button"
        >
          {isRunning ? (
            <Loader2 className="animate-spin" size={16} />
          ) : isExternal ? (
            <ExternalLink size={16} />
          ) : (
            <Download size={16} />
          )}
          {isRunning ? 'Executando' : getActionLabel(app)}
        </button>
      </div>
    </Card>
  );
}

export function Apps() {
  const { apps, wingetAvailable, isLoading, runningId, error, messages, counts, refresh, runInstall } =
    useInstallableApps();

  return (
    <div className="mx-auto max-w-[1560px] space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold text-white"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            Apps
          </motion.h1>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-400">
            Instale ferramentas essenciais com winget ou abra o download oficial quando o pacote depende do hardware.
          </p>
        </div>

        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/25 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading || Boolean(runningId)}
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={16} />
          Atualizar
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Apps disponiveis</p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">{counts.total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Ja instalados</p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">{counts.installed}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Winget</p>
          <p className="mt-2 text-lg font-bold text-white">{wingetAvailable ? 'Pronto' : 'Indisponivel'}</p>
        </Card>
      </section>

      {!wingetAvailable && (
        <div className="rounded-3xl border border-orange-300/20 bg-orange-400/10 px-5 py-4 text-sm text-orange-100">
          O winget nao foi encontrado. Apps com instalacao automatica precisam do Gerenciador de Pacotes do Windows.
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-red-300/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {isLoading ? (
        <section className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="h-[300px] animate-pulse rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045]"
              key={index}
            />
          ))}
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {apps.map((app) => (
            <AppInstallCard
              app={app}
              isRunning={runningId === app.id}
              key={app.id}
              message={messages[app.id]}
              onInstall={(id) => void runInstall(id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
