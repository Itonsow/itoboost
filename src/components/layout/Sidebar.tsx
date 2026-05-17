import { Github, MessageCircle, Twitch } from 'lucide-react';
import { motion } from 'framer-motion';
import { navigationItems, type PageKey } from '../../constants/navigation';

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-white/[0.07] bg-booster-void/80 px-5 py-6 backdrop-blur-2xl">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-xl shadow-glow">
          ⚡
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-white">ItoBoost</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/60">Windows Booster</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <motion.button
              animate={{ opacity: 1, x: 0 }}
              className={`group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition duration-200 ${
                isActive
                  ? 'border border-cyan-300/25 bg-blue-500/15 text-white shadow-glow'
                  : 'border border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.045] hover:text-slate-100'
              }`}
              initial={{ opacity: 0, x: -12 }}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              transition={{ delay: index * 0.035, duration: 0.28, ease: 'easeOut' }}
              type="button"
            >
              {isActive && (
                <motion.span
                  className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-cyan-300"
                  layoutId="active-sidebar-rail"
                />
              )}
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                  isActive
                    ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100'
                    : 'border-white/[0.06] bg-white/[0.035] text-slate-400 group-hover:text-cyan-100'
                }`}
              >
                <Icon size={18} />
              </span>
              {item.label}
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/[0.07] bg-white/[0.04] p-4">
        <div className="mb-4 flex items-center gap-2 text-slate-400">
          {[Github, Twitch, MessageCircle].map((Icon, index) => (
            <button
              aria-label="Social decorativo"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.04] transition hover:border-cyan-300/25 hover:text-cyan-100"
              key={index}
              type="button"
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
          <span className="text-xs font-medium text-slate-500">Versão</span>
          <span className="font-mono text-xs font-semibold text-cyan-100">V.1</span>
        </div>
      </div>
    </aside>
  );
}
