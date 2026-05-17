import type { OptimizationCategory } from '../../types/optimization';

interface OptimizationFiltersProps {
  categories: OptimizationCategory[];
  activeCategory: OptimizationCategory;
  onChange: (category: OptimizationCategory) => void;
}

export function OptimizationFilters({ categories, activeCategory, onChange }: OptimizationFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const isActive = activeCategory === category;

        return (
          <button
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? 'border-cyan-300/35 bg-cyan-400/12 text-cyan-50 shadow-glow'
                : 'border-white/[0.08] bg-white/[0.035] text-slate-400 hover:border-white/[0.14] hover:text-slate-100'
            }`}
            key={category}
            onClick={() => onChange(category)}
            type="button"
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
