import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'default' | 'danger';
}

export function IconButton({ children, className = '', tone = 'default', ...props }: IconButtonProps) {
  const toneClass =
    tone === 'danger'
      ? 'hover:border-red-400/35 hover:bg-red-500/15 hover:text-red-100'
      : 'hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-100';

  return (
    <button
      className={`no-drag grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.045] text-slate-300 transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 ${toneClass} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
