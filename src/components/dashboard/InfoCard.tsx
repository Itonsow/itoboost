import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '../ui/Badge';

interface InfoCardProps {
  title: string;
  value: string;
  detail: string;
  badge: string;
  icon: LucideIcon;
  tone: 'blue' | 'cyan' | 'green' | 'orange' | 'violet';
  delay?: number;
  isLoading?: boolean;
}

const toneClasses: Record<InfoCardProps['tone'], string> = {
  blue: 'from-blue-500/16 to-cyan-400/5 text-blue-100',
  cyan: 'from-cyan-400/16 to-blue-500/5 text-cyan-100',
  green: 'from-emerald-400/16 to-cyan-400/5 text-emerald-100',
  orange: 'from-orange-400/16 to-violet-400/5 text-orange-100',
  violet: 'from-violet-400/16 to-cyan-400/5 text-violet-100'
};

export function InfoCard({
  title,
  value,
  detail,
  badge,
  icon: Icon,
  tone,
  delay = 0,
  isLoading = false
}: InfoCardProps) {
  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={`group relative min-h-[190px] overflow-hidden rounded-[1.65rem] border border-white/[0.08] bg-gradient-to-br ${toneClasses[tone]} p-5 shadow-panel backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.07]`}
      initial={{ opacity: 0, y: 16 }}
      transition={{ delay, duration: 0.38, ease: 'easeOut' }}
    >
      <div className="absolute right-0 top-0 h-28 w-28 bg-white/[0.05] blur-2xl transition group-hover:bg-cyan-300/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.07]">
          <Icon size={22} />
        </div>
        <Badge tone={tone}>{badge}</Badge>
      </div>

      <div className="relative mt-7">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            <div className="h-6 w-4/5 animate-pulse rounded-full bg-white/[0.10]" />
            <div className="h-4 w-3/5 animate-pulse rounded-full bg-white/[0.07]" />
          </div>
        ) : (
          <>
            <h3 className="mt-3 line-clamp-2 min-h-[3.5rem] text-xl font-bold leading-7 text-white">{value}</h3>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-slate-400">{detail}</p>
          </>
        )}
      </div>
    </motion.article>
  );
}
