import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  tone?: 'blue' | 'cyan' | 'green' | 'orange' | 'violet';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  blue: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
  cyan: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100',
  green: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  orange: 'border-orange-300/25 bg-orange-400/10 text-orange-100',
  violet: 'border-violet-300/25 bg-violet-400/10 text-violet-100'
};

export function Badge({ children, tone = 'blue' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
