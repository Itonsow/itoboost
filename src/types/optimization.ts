export type OptimizationCategory =
  | 'Todos'
  | 'Desempenho'
  | 'Gaming'
  | 'Privacidade'
  | 'Aparência'
  | 'Geral'
  | 'Sistema'
  | 'Segurança'
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
  | 'disable-mouse-acceleration';

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
