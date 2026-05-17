import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

interface PlaceholderPageProps {
  title: string;
  icon: LucideIcon;
}

export function PlaceholderPage({ title, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1560px] items-center justify-center">
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        initial={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Card className="relative max-w-2xl overflow-hidden p-10 text-center">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-3xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-glow">
            <Icon size={28} />
          </div>
          <Badge tone="cyan">Em preparação</Badge>
          <h1 className="mt-5 font-display text-4xl font-bold text-white">{title}</h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Esta seção já está conectada à navegação visual do ItoBoost e pronta para receber as próximas funções reais.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
