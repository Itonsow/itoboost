import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className = '', interactive = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-3xl border border-white/[0.08] bg-white/[0.045] shadow-panel backdrop-blur-xl ${
        interactive ? 'transition duration-300 hover:border-cyan-300/25 hover:bg-white/[0.065]' : ''
      } ${className}`}
      {...props}
    />
  );
}
