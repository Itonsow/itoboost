import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

export function HeroBanner() {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-400/20 via-cyan-500/15 to-blue-600/20 p-7 shadow-panel"
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="absolute -right-12 -top-14 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-32 w-72 bg-gradient-to-l from-emerald-300/20 to-transparent blur-2xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
            <Zap size={14} />
            Boost Ready
          </div>
          <h2 className="font-display text-4xl font-bold text-white">Otimize seu PC</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-cyan-50/75">
            Aplique ajustes de desempenho e aumente a velocidade do seu sistema
          </p>
        </div>

        <button
          className="group inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/12 px-5 text-sm font-bold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200/35 hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-emerald-200/40"
          type="button"
        >
          Abrir Ajustes
          <ArrowRight className="transition duration-300 group-hover:translate-x-1" size={18} />
        </button>
      </div>
    </motion.section>
  );
}
