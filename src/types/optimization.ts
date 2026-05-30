export type OptimizationCategory =
  | 'Todos'
  | 'Desempenho'
  | 'Gaming'
  | 'Privacidade'
  | 'Rede'
  | 'Aparência'
  | 'Geral'
  | 'Sistema'
  | 'Segurança'
  | 'GPU'
  | 'Avançado';

export type OptimizationRiskLevel = 'low' | 'medium' | 'high';

export type OptimizationStatus = 'active' | 'inactive' | 'unknown';

export type OptimizationId =
  | 'ultimate-performance'
  | 'taskbar-left'
  | 'detailed-bsod'
  | 'disable-store-background-apps'
  | 'disable-copilot'
  | 'disable-core-isolation'
  | 'disable-defender-realtime'
  | 'disable-dynamic-tick'
  | 'disable-fast-startup'
  | 'disable-game-bar'
  | 'disable-hibernation'
  | 'disable-location-tracking'
  | 'disable-lock-screen-tips'
  | 'disable-mouse-acceleration'
  | 'disable-wifi-sense'
  | 'enable-dark-mode'
  | 'enable-end-task-context-menu'
  | 'enable-game-mode'
  | 'enable-hags'
  | 'enable-hpet'
  | 'enable-windowed-game-optimizations'
  | 'remove-menu-delay'
  | 'optimize-network-settings'
  | 'optimize-nvidia-settings'
  | 'remove-gaming-apps'
  | 'remove-onedrive'
  | 'classic-context-menu'
  | 'run-disk-cleanup'
  | 'set-powershell7-default'
  | 'set-services-manual'
  | 'set-time-utc'
  | 'configure-win32-priority-separation';

export interface OptimizationDefinition {
  id: OptimizationId;
  title: string;
  description: string;
  categories: OptimizationCategory[];
  icon: string;
  riskLevel: OptimizationRiskLevel;
  requiresAdmin: boolean;
  requiresRestart: boolean;
  requiresExplorerRestart: boolean;
  isReversible: boolean;
  isFavorite: boolean;
  warningMessage?: string;
  applyAction: OptimizationId;
  revertAction: OptimizationId;
  checkStatusAction: OptimizationId;
}

export interface OptimizationViewModel extends OptimizationDefinition {
  status: OptimizationStatus;
}

export interface OptimizationActionResult {
  success: boolean;
  message: string;
  requiresRestart: boolean;
  requiresExplorerRestart: boolean;
}

export interface OptimizationStatusResult {
  id: OptimizationId;
  status: OptimizationStatus;
  message?: string;
}

export interface OptimizationListResult {
  optimizations: OptimizationViewModel[];
}

export interface CreateRestorePointResult {
  success: boolean;
  message: string;
}
