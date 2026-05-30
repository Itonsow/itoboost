import {
  AppWindow,
  Crosshair,
  Gauge,
  KeyRound,
  LucideIcon,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'optimizations'
  | 'cleanup'
  | 'csgo'
  | 'restore'
  | 'apps'
  | 'settings'
  | 'auth';

export interface NavigationItem {
  id: PageKey;
  label: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Painel', icon: Gauge },
  { id: 'optimizations', label: 'Otimizações', icon: Sparkles },
  { id: 'cleanup', label: 'Limpeza', icon: Trash2 },
  { id: 'csgo', label: 'CSGO', icon: Crosshair },
  { id: 'restore', label: 'Restauração', icon: RotateCcw },
  { id: 'apps', label: 'Apps', icon: AppWindow },
  { id: 'settings', label: 'Configurações', icon: Settings },
  { id: 'auth', label: 'Autenticação', icon: KeyRound }
];

export const pageTitles: Record<PageKey, string> = {
  dashboard: 'Painel',
  optimizations: 'Otimizações',
  cleanup: 'Limpeza',
  csgo: 'CSGO',
  restore: 'Restauração',
  apps: 'Apps',
  settings: 'Configurações',
  auth: 'Autenticação'
};

export const pageSubtitles: Record<PageKey, string> = {
  dashboard: 'Visão Geral do Sistema e Métricas de Desempenho',
  optimizations: 'Central de ajustes de desempenho em preparação',
  cleanup: 'Ferramentas de limpeza segura em preparação',
  csgo: 'Comandos prontos para copiar e colar',
  restore: 'Pontos de restauração e reversão em preparação',
  apps: 'Gerenciamento de aplicativos em preparação',
  settings: 'Preferências do ItoBoost em preparação',
  auth: 'Conta e autenticação em preparação'
};
