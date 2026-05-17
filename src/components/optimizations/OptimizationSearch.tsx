import { Search } from 'lucide-react';

interface OptimizationSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function OptimizationSearch({ value, onChange }: OptimizationSearchProps) {
  return (
    <label className="relative block w-full max-w-md">
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
      <input
        className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] pl-11 pr-4 text-sm font-medium text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-white/[0.065] focus:ring-2 focus:ring-cyan-300/15"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar otimização..."
        type="search"
        value={value}
      />
    </label>
  );
}
