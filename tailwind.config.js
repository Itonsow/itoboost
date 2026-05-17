/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'monospace']
      },
      colors: {
        booster: {
          void: '#050814',
          panel: '#0a1020',
          panel2: '#0d1629',
          line: 'rgba(125, 211, 252, 0.14)',
          cyan: '#22d3ee',
          blue: '#3b82f6',
          green: '#22c55e',
          violet: '#8b5cf6',
          orange: '#f97316'
        }
      },
      boxShadow: {
        glow: '0 0 42px rgba(34, 211, 238, 0.12)',
        panel: '0 18px 60px rgba(0, 0, 0, 0.28)'
      },
      backgroundImage: {
        grid:
          'linear-gradient(rgba(34, 211, 238, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.06) 1px, transparent 1px)'
      }
    }
  },
  plugins: []
};
