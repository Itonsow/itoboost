import { Check, Clipboard, Crosshair, Radar, Shield } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/ui/Card';

const commandGroups = [
  {
    id: 'radar',
    title: 'Radar',
    description: 'Configura o radar para mostrar melhor o mapa sem centralizar sempre no jogador.',
    icon: Radar,
    commands: ['cl_radar_always_centered false', 'cl_radar_scale 0.4', 'cl_radar_rotate true']
  },
  {
    id: 'safezone',
    title: 'Safezone',
    description: 'Ajusta a área segura da HUD para aproximar elementos da interface.',
    icon: Shield,
    commands: ['safezonex 0.9', 'sefezoney 0.9']
  }
];

type CommandGroupId = (typeof commandGroups)[number]['id'];

export function Csgo() {
  const [copiedId, setCopiedId] = useState<CommandGroupId | 'all' | null>(null);

  const copyText = async (id: CommandGroupId | 'all', text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const allCommands = commandGroups.flatMap((group) => group.commands).join('\n');

  return (
    <div className="mx-auto max-w-[1560px] space-y-7">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">
            <Crosshair size={14} />
            Config rápido
          </div>
          <h1 className="font-display text-4xl font-bold text-white">CSGO</h1>
          <p className="mt-2 text-base text-slate-400">Comandos prontos para copiar e colar no console ou na CFG.</p>
        </div>

        <button
          className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-5 text-sm font-bold text-cyan-50 shadow-glow transition hover:bg-cyan-400/25"
          onClick={() => void copyText('all', allCommands)}
          type="button"
        >
          {copiedId === 'all' ? <Check size={17} /> : <Clipboard size={17} />}
          {copiedId === 'all' ? 'Copiado' : 'Copiar tudo'}
        </button>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {commandGroups.map((group) => {
          const Icon = group.icon;
          const text = group.commands.join('\n');
          const isCopied = copiedId === group.id;

          return (
            <Card className="overflow-hidden p-6" interactive key={group.id}>
              <div className="mb-6 flex items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-[52px] w-[52px] place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{group.title}</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{group.description}</p>
                  </div>
                </div>

                <button
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-bold text-slate-200 transition hover:border-cyan-300/25 hover:bg-cyan-400/10 hover:text-cyan-100"
                  onClick={() => void copyText(group.id, text)}
                  type="button"
                >
                  {isCopied ? <Check size={16} /> : <Clipboard size={16} />}
                  {isCopied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <pre className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/25 p-5 font-mono text-sm leading-7 text-cyan-50">
                <code>{text}</code>
              </pre>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
